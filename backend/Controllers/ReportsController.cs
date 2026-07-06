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
            var totalProducts = await _context.Products.AsNoTracking().CountAsync();
            var totalWarehouses = await _context.Warehouses.AsNoTracking().CountAsync();
            var criticalAlertsCount = await _context.Notifications
                .AsNoTracking()
                .Where(n => !n.IsRead)
                .CountAsync();

            return Ok(new
            {
                totalProducts = totalProducts,
                totalWarehouses = totalWarehouses,
                criticalAlertsCount = criticalAlertsCount
            });
        }
    }
}