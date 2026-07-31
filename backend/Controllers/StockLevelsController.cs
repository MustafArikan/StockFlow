using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using stok_takip.Data;

namespace stok_takip.Controllers;

[Route("api/stock-levels")]
[ApiController]
[Authorize]
public class StockLevelsController : ControllerBase
{
    private readonly AppDbContext _context;

    public StockLevelsController(AppDbContext context)
    {
        _context = context;
    }

    // Ürün ID'sine göre stoku 0'dan büyük olan rafları ve depoları getirir
    [HttpGet("by-product/{productId}")]
    public async Task<IActionResult> GetStockByProduct(int productId)
    {
        var stockLevels = await _context.StockLevels
            .AsNoTracking()
            .Include(sl => sl.Location)
                .ThenInclude(l => l.Warehouse)
            .Where(sl => sl.ProductId == productId && sl.Quantity > 0 && !sl.IsDeleted)
            .Select(sl => new
            {
                LocationId = sl.LocationId,
                LocationCode = sl.Location.Code,
                WarehouseId = sl.Location.WarehouseId,
                WarehouseName = sl.Location.Warehouse.Name,
                Quantity = sl.Quantity
            })
            .ToListAsync();

        return Ok(stockLevels);
    }
}