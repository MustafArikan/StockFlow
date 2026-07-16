using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using stok_takip.Data;

namespace stok_takip.Controllers
{
    [ApiController]
    [Route("api/reports")]

    public class ReportsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ReportsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("dashboard-summary")]
        public async Task<IActionResult> GetDasboardSummary()
        {
            var totalProducts = await _context.Products.AsNoTracking().Where(p => !p.IsDeleted).CountAsync();
            var totalWarehouses = await _context.Warehouses.AsNoTracking().Where(w => !w.IsDeleted).CountAsync();
            var criticalAlertsCount = await _context.Notifications
                .AsNoTracking()
                .Where(n => !n.IsRead && !n.IsDeleted)
                .CountAsync();

            var totalWarehouseValue = await _context.StockLevels
                .AsNoTracking()
                .Where(sl => !sl.IsDeleted && !sl.Product.IsDeleted)
                .SumAsync(sl => sl.Quantity * sl.Product.Cost);

            var transactionVolume = await _context.StockMovements
                .AsNoTracking()
                .Where(m => !m.IsDeleted)
                .SumAsync(m => m.TotalPrice);

            return Ok(new
            {
                totalProducts = totalProducts,
                totalWarehouses = totalWarehouses,
                criticalAlertsCount = criticalAlertsCount,
                totalWarehouseValue = totalWarehouseValue,
                transactionVolume = transactionVolume
            });
        }
    }
}