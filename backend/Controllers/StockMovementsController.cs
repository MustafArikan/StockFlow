using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using stok_takip.Data;
using stok_takip.Models;
using stok_takip.DTOs;

namespace stok_takip.Controllers
{ 
    [ApiController]
    [Route("api/stock/movements")]

    public class StockMovementsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public StockMovementsController(AppDbContext context)
        {
            _context = context;
        }

        // 1. GET: Fetch all movements with optional filters (For frontend table)
        [HttpGet]
        public async Task<IActionResult> GetAllMovements([FromQuery] string? type, [FromQuery] string? search)
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

            var result = await query
                .OrderByDescending(m => m.Id) // Assuming BaseEntity has Id or CreatedAt
                .Select(m => new
                {
                    m.Id,
                    Tarih = m.CreatedAt, 
                    UrunKodu = m.Product.Barcode,
                    UrunAdı = m.Product.Name,
                    IslemTipi = m.MovementType,
                    m.Quantity,
                    Personel = m.User != null ? m.User.Email : "Bilinmeyen Personel",
                })
                .ToListAsync();

            return Ok(result);
        }

        // 2. POST: Create a new stock movement (IN, OUT, or TRANSFER)
        [HttpPost]
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

            // ACID Compliant Transaction for TRANSFER type
            if (upperType == "TRANSFER")
            {
                if (dto.SourceLocationId == null || dto.TargetLocationId == null)
                    return BadRequest(new { message = "Source and Target locations are required for transfer operations." });

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
                        Quantity = dto.Quantity,
                        Description = dto.Description ?? $"Transferred from Loc {dto.SourceLocationId} to Loc {dto.TargetLocationId}"
                    };

                    _context.StockMovements.Add(movement);
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync(); // Commit changes safely

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
                            Description = dto.Description ?? "Stock IN operation"
                        };

                        _context.StockMovements.Add(movement);
                        await _context.SaveChangesAsync();
                        await transaction.CommitAsync();

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
                        Description = dto.Description ?? "Stock OUT operation"
                    };

                    _context.StockMovements.Add(movement);
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    return Ok(new { message = "Stock successfully removed.", movementId = movement.Id });
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