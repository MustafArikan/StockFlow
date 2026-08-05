using stok_takip.Constants;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using stok_takip.Attributes;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using stok_takip.Data;
using stok_takip.Models;
using stok_takip.DTOs;

namespace stok_takip.Controllers
{ 
    [ApiController]
    [Route("api/stock/movements")]

    [Authorize]
    public class StockMovementsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly stok_takip.Metrics.StockFlowMetrics _metrics;

        public StockMovementsController(AppDbContext context, stok_takip.Metrics.StockFlowMetrics metrics)
        {
            _context = context;
            _metrics = metrics;
        }

        // 1. GET: Fetch all movements with optional filters (For frontend table)
        [RequirePermission(Policies.RequireStockMovementRead)]
        [HttpGet]
        [NormalizePagination]
        public async Task<IActionResult> GetAllMovements([FromQuery] string? type, [FromQuery] string? search, [FromQuery] string? sort, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            var query = _context.StockMovements
                .AsNoTracking()
                .Include(m => m.Product)
                .Include(m => m.User)
                .AsQueryable();

            if (!string.IsNullOrEmpty(type))
            {
                query = query.Where(m => m.MovementType == type.ToUpper());
            }

            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(m => m.Product.Name.Contains(search) || 
                                         m.Product.Barcode.Contains(search) || 
                                         (m.Description != null && m.Description.Contains(search)));
            }

            var totalRecords = await query.CountAsync();

            var orderedQuery = sort == "asc" ? query.OrderBy(m => m.CreatedAt) : query.OrderByDescending(m => m.CreatedAt);

            var result = await orderedQuery
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(m => new
                {
                    m.Id,
                    Tarih = m.CreatedAt, 
                    UrunKodu = m.Product.Barcode,
                    UrunAdı = m.Product.Name,
                    IslemTipi = m.MovementType,
                    m.Quantity,
                    Personel = m.User != null ? m.User.Email : "Bilinmeyen Personel",
                    UserId = m.UserId,
                    PersonelName = m.User != null ? (m.User.FirstName + " " + m.User.LastName).Trim() : "Bilinmeyen Personel"
                })
                .ToListAsync();

            return Ok(new 
            {
                items = result,
                totalRecords = totalRecords,
                currentPage = pageNumber,
                totalPages = (int)Math.Ceiling((double)totalRecords / pageSize)
            });
        }

        // GET /api/stock/movements/product/{productId}
        [RequirePermission(Policies.RequireStockMovementRead)]
        [HttpGet("product/{productId}")]
        public async Task<IActionResult> GetMovementsByProduct(int productId)
        {
            var movements = await _context.StockMovements
                .AsNoTracking()
                .Include(m => m.User)
                .Where(m => m.ProductId == productId)
                .OrderByDescending(m => m.CreatedAt)
                .Select(m => new
                {
                    m.Id,
                    Date = m.CreatedAt, 
                    MovementType = m.MovementType,
                    Quantity = m.Quantity,
                    Personel = m.User != null ? m.User.Email : "Sistem",
                    Description = m.Description
                })
                .ToListAsync();

            return Ok(movements);
        }

        // 2. POST: Create a new stock movement (IN, OUT, or TRANSFER)
        [HttpPost]
        [RequirePermission(Policies.RequireStockMovementWrite)]
        [EnableRateLimiting(Policies.RequireStockMovementWrite)] 
        public async Task<IActionResult> CreateMovement([FromBody] StockMovementRequestDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int? currentUserId = null;
            if (!string.IsNullOrEmpty(userIdClaim) && int.TryParse(userIdClaim, out int parsedId))
            {
                currentUserId = parsedId;
            }
            var product = await _context.Products.FirstOrDefaultAsync(p => p.Barcode == dto.ProductBarcode);
            if (product == null) 
                return NotFound(new { message = "Product not found." });

            string upperType = dto.MovementType.ToUpper();
            
            bool isSuperAdmin = User.IsInRole("superadmin");
            if (upperType == "TRANSFER" && !User.HasClaim("Permission", "Movement.Transfer") && !isSuperAdmin)
                return StatusCode(403, new { message = "You do not have permission to perform stock transfers." });
            if (upperType == "IN" && !User.HasClaim("Permission", "Movement.Inbound") && !isSuperAdmin)
                return StatusCode(403, new { message = "You do not have permission to perform stock inbound operations." });
            if (upperType == "OUT" && !User.HasClaim("Permission", "Movement.Outbound") && !isSuperAdmin)
                return StatusCode(403, new { message = "You do not have permission to perform stock outbound operations." });

            if (dto.SourceLocationId.HasValue && !await _context.Locations.AnyAsync(l => l.Id == dto.SourceLocationId.Value && !l.IsDeleted))
                return BadRequest(new { message = "Belirtilen kaynak raf bulunamadı." });

            if (dto.TargetLocationId.HasValue && !await _context.Locations.AnyAsync(l => l.Id == dto.TargetLocationId.Value && !l.IsDeleted))
                return BadRequest(new { message = "Belirtilen hedef raf bulunamadı." });

            // ACID Compliant Transaction for TRANSFER type
            if (upperType == "TRANSFER")
            {
                if (dto.SourceLocationId == null || dto.TargetLocationId == null)
                    return BadRequest(new { message = "Source and Target locations are required for transfer operations." });

                if (dto.SourceLocationId == dto.TargetLocationId)
                    return BadRequest(new { message = "Kaynak ve hedef raf aynı olamaz." });

                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    // Deduct from source location
                    var sourceStock = await _context.StockLevels
                        .FirstOrDefaultAsync(s => s.ProductId == product.Id && s.LocationId == dto.SourceLocationId);

                    if (sourceStock == null || sourceStock.Quantity < dto.Quantity)
                        return BadRequest(new { message = "Insufficient stock at source location." });

                    sourceStock.Quantity -= dto.Quantity;

                    // Add to target location
                    var targetStock = await _context.StockLevels
                        .FirstOrDefaultAsync(s => s.ProductId == product.Id && s.LocationId == dto.TargetLocationId);

                    if (targetStock == null)
                    {
                        targetStock = new StockLevel 
                        { 
                            ProductId = product.Id, 
                            LocationId = dto.TargetLocationId.Value, 
                            Quantity = dto.Quantity 
                        };
                        _context.StockLevels.Add(targetStock);
                    }
                    else
                    {
                        targetStock.Quantity += dto.Quantity;
                    }

                    // Save movement log
                    var movement = new StockMovement
                    {
                        ProductId = product.Id,
                        UserId = currentUserId,
                        MovementType = "TRANSFER",
                        UnitPrice = dto.UnitPrice,
                        TotalPrice = dto.UnitPrice * dto.Quantity,
                        Quantity = dto.Quantity,
                        Description = dto.Description ?? $"Transferred from Loc {dto.SourceLocationId} to Loc {dto.TargetLocationId}"
                    };

                    _context.StockMovements.Add(movement);
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync(); // Commit changes safely

                    _metrics.StockMovementsTotal.WithLabels(movement.MovementType, "Transfer").Inc();
                    return Ok(new { message = "Stock transfer successfully completed.", movementId = movement.Id });
                }
                catch (DbUpdateConcurrencyException)
                {
                    await transaction.RollbackAsync();
                    return Conflict(new { message = "Stok transfer işlemi sırasında çakışma tespit edildi. Lütfen sayfayı yenileyip tekrar deneyin." });
                }
                catch (Exception)
                {
                    await transaction.RollbackAsync(); // Rollback if anything fails
                    return StatusCode(500, new { message = "An error occurred during the database transaction." });
                }
            }

            // Standard IN & OUT Operations
            if (upperType == "IN")
            {
                if (dto.TargetLocationId == null)
                    return BadRequest(new { message = "Target location is required for IN operations." });

                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    Supplier? supplier = null;
                    if (dto.SupplierId.HasValue)
                        supplier = await _context.Suppliers.FindAsync(dto.SupplierId.Value);
                    
                    var targetStock = await _context.StockLevels
                        .FirstOrDefaultAsync(s => s.ProductId == product.Id && s.LocationId == dto.TargetLocationId);

                        if (targetStock == null)
                        {
                            _context.StockLevels.Add(new StockLevel 
                            { 
                                ProductId = product.Id, 
                                LocationId = dto.TargetLocationId.Value, 
                                Quantity = dto.Quantity 
                            });
                        }
                        else
                        {
                            targetStock.Quantity += dto.Quantity;
                        }

                        var movement = new StockMovement
                        {
                            ProductId = product.Id,
                            UserId = currentUserId,
                            MovementType = "IN",
                            Quantity = dto.Quantity,
                            UnitPrice = dto.UnitPrice,
                            TotalPrice = dto.UnitPrice * dto.Quantity,
                            SupplierId = dto.SupplierId,
                            SupplierName = supplier?.Name,
                            SupplierTaxNumber = supplier?.TaxNumber,
                            DocumentNumber = dto.DocumentNumber,
                            Description = dto.Description ?? "Stock IN operation"
                        };

                        _context.StockMovements.Add(movement);
                        await _context.SaveChangesAsync();
                        await transaction.CommitAsync();

                        _metrics.StockMovementsTotal.WithLabels(movement.MovementType, "Giris").Inc();
                        return Ok(new { message = "Stock successfully added.", movementId = movement.Id });
                }
                catch (DbUpdateConcurrencyException)
                {
                    await transaction.RollbackAsync();
                    return Conflict(new { message = "Stok giriş işlemi sırasında çakışma tespit edildi. Lütfen sayfayı yenileyip tekrar deneyin." });
                }
                catch (Exception)
                {
                    await transaction.RollbackAsync();
                    return StatusCode(500, new { message = "An error occurred during the stock IN transaction." });
                }
            }
            
            if (upperType == "OUT")
            {
                if (dto.SourceLocationId == null)
                    return BadRequest(new { message = "Source location is required for OUT operations." });

                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var sourceStock = await _context.StockLevels
                        .FirstOrDefaultAsync(s => s.ProductId == product.Id && s.LocationId == dto.SourceLocationId);

                    if (sourceStock == null || sourceStock.Quantity < dto.Quantity)
                        return BadRequest(new { message = "Insufficient stock at source location." });

                    sourceStock.Quantity -= dto.Quantity;

                    var movement = new StockMovement
                    {
                        ProductId = product.Id,
                        UserId = currentUserId,
                        MovementType = "OUT",
                        Quantity = dto.Quantity,
                        UnitPrice = dto.UnitPrice,
                        TotalPrice = dto.UnitPrice * dto.Quantity,
                        Destination = dto.Destination,
                        DocumentNumber = dto.DocumentNumber,    
                        Description = dto.Description ?? "Stock OUT operation"
                    };

                    _context.StockMovements.Add(movement);
                    await _context.SaveChangesAsync();

                    // 🎯 Kritik Stok Kontrolü (Tüm depoların/rafların toplamını hesapla)
                    var totalStock = await _context.StockLevels
                        .Where(sl => sl.ProductId == product.Id && !sl.IsDeleted)
                        .SumAsync(sl => (int?)sl.Quantity) ?? 0;

                    if (totalStock <= product.MinStockLevel)
                    {
                        double percentage = product.MinStockLevel > 0 ? ((double)totalStock / product.MinStockLevel) * 100 : 0;
                        string severity = "INFO";
                        string msg = $"Bilgi: {product.Name} (Barkod: {product.Barcode}) kritik stok sınırında. (Mevcut: {totalStock})";

                        if (totalStock == 0)
                        {
                            severity = "EMPTY_STOCK";
                            msg = $"DİKKAT: {product.Name} (Barkod: {product.Barcode}) tamamen tükendi!";
                        }
                        else if (percentage < 20)
                        {
                            severity = "DANGER";
                            msg = $"Çok Kritik: {product.Name} (Barkod: {product.Barcode}) stok seviyesi %20'nin altına indi! (Mevcut: {totalStock})";
                        }
                        else if (percentage <= 50)
                        {
                            severity = "CRITICAL";
                            msg = $"Kritik: {product.Name} (Barkod: {product.Barcode}) stok seviyesi %50'nin altına indi! (Mevcut: {totalStock})";
                        }
                        else if (percentage <= 80)
                        {
                            severity = "WARNING";
                            msg = $"Ön Uyarı: {product.Name} (Barkod: {product.Barcode}) stok seviyesi %80'in altına indi. (Mevcut: {totalStock})";
                        }

                        // Aynı ürün ve aynı zorluk seviyesi için okunmamış bir bildirim zaten varsa spamlama yapma
                        var existingUnread = await _context.Notifications
                            .AnyAsync(n => n.Type == "CRITICAL_STOCK" && !n.IsRead && n.Message.Contains(product.Barcode) && n.Severity == severity && !n.IsDeleted);
                        
                        if (!existingUnread)
                        {
                            var notification = new Notification
                            {
                                Message = msg,
                                Type = "CRITICAL_STOCK",
                                Severity = severity,
                                IsRead = false
                            };
                            _context.Notifications.Add(notification);
                            await _context.SaveChangesAsync();
                        }
                    }

                    await transaction.CommitAsync();

                    _metrics.StockMovementsTotal.WithLabels(movement.MovementType, "Cikis").Inc();
                    return Ok(new { message = "Stock successfully deducted.", movementId = movement.Id });
                }
                catch (DbUpdateConcurrencyException)
                {
                    await transaction.RollbackAsync();
                    return Conflict(new { message = "Stok çıkış işlemi sırasında çakışma tespit edildi. Lütfen sayfayı yenileyip tekrar deneyin." });
                }
                catch (Exception)
                {
                    await transaction.RollbackAsync();
                    return StatusCode(500, new { message = "An error occurred during the stock OUT transaction." });
                }
            }

            return BadRequest(new { message = "Invalid movement type." });
        }
    }
}
