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
                .Include(m => m.Product)
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
                    Tarih = m.Id, // Frontend expects date format, map your BaseEntity CreatedAt here if available
                    UrunKodu = m.Product.Barcode,
                    UrunAdı = m.Product.Name,
                    IslemTipi = m.MovementType,
                    m.Quantity,
                    Personel = "Zülal Yıldız" // Mocked until JWT setup
                })
                .ToListAsync();

            return Ok(result);
        }

        // 2. POST: Create a new stock movement (IN, OUT, or TRANSFER)
        [HttpPost]
        public async Task<IActionResult> CreateMovement([FromBody] StockMovementRequestDto dto)
        {
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
                        MovementType = "TRANSFER",
                        Quantity = dto.Quantity,
                        Description = dto.Description ?? $"Transferred from Loc {dto.SourceLocationId} to Loc {dto.TargetLocationId}"
                    };

                    _context.StockMovements.Add(movement);
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync(); // Commit changes safely

                    return Ok(new { message = "Stock transfer successfully completed.", movementId = movement.Id });
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

                // Hedef lokasyonda ürün var mı kontrol et, yoksa sıfırdan ekle, varsa miktarını artır
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
                    MovementType = "IN",
                    Quantity = dto.Quantity,
                    Description = dto.Description ?? "Stock IN operation"
                };
                
                _context.StockMovements.Add(movement);
                await _context.SaveChangesAsync();
                
                return Ok(new { message = "Stock successfully added.", movementId = movement.Id });
            }
            
            if (upperType == "OUT")
            {
                if (dto.SourceLocationId == null)
                    return BadRequest(new { message = "Source location is required for OUT operations." });

                // Kaynak lokasyondan stoğu düş, yeterli stok yoksa hata fırlat
                var sourceStock = await _context.StockLevels
                    .FirstOrDefaultAsync(s => s.ProductId == product.Id && s.LocationId == dto.SourceLocationId);

                if (sourceStock == null || sourceStock.Quantity < dto.Quantity)
                    return BadRequest(new { message = "Insufficient stock at source location." });

                sourceStock.Quantity -= dto.Quantity;

                var movement = new StockMovement
                {
                    ProductId = product.Id,
                    MovementType = "OUT",
                    Quantity = dto.Quantity,
                    Description = dto.Description ?? "Stock OUT operation"
                };
                
                _context.StockMovements.Add(movement);
                await _context.SaveChangesAsync();
                
                return Ok(new { message = "Stock successfully dispatched.", movementId = movement.Id });
            }

            return BadRequest(new { message = "Invalid movement type. Must be IN, OUT, or TRANSFER." });
        }
    }
}