using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using stok_takip.Data;

namespace stok_takip.Controllers
{
    [ApiController]
    [Route("api/reports")]
    [Authorize]
    public class ReportsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ReportsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("dashboard-summary")]
        public async Task<IActionResult> GetDashboardSummary()
        {
            var totalProducts = await _context.Products.AsNoTracking().CountAsync();
            
            // Sadece depo sayısını değil, depolardaki toplam stok ADEDİNİ de dönüyoruz.
            var totalStockQuantity = await _context.StockLevels.AsNoTracking().SumAsync(sl => sl.Quantity);
            
            var totalWarehouses = await _context.Warehouses.AsNoTracking().CountAsync();
            
            var criticalAlertsCount = await _context.Notifications
                .AsNoTracking()
                .Where(n => !n.IsRead)
                .CountAsync();

            return Ok(new
            {
                totalProducts = totalProducts,
                totalStockQuantity = totalStockQuantity, 
                totalWarehouses = totalWarehouses,
                criticalAlertsCount = criticalAlertsCount
            });
        }

        // Son 30 günün her günü için toplam giriş/çıkış miktarını döner
        [HttpGet("trend")]
        public async Task<IActionResult> GetTrend()
        {
            var startDate = DateTime.UtcNow.Date.AddDays(-29);
            
            var groupedMovements = await _context.StockMovements
                .AsNoTracking()
                .Where(m => m.CreatedAt >= startDate && (m.MovementType == "IN" || m.MovementType == "OUT"))
                .GroupBy(m => m.CreatedAt.Date) 
                .Select(g => new
                {
                    Date = g.Key,
                    GirisMiktari = g.Where(x => x.MovementType == "IN").Sum(x => x.Quantity),
                    CikisMiktari = g.Where(x => x.MovementType == "OUT").Sum(x => x.Quantity)
                })
                .ToDictionaryAsync(g => g.Date, g => g);

            // Hiç hareket olmayan günleri de listeye 0 olarak ekler
            var result = new List<object>();
            for (var day = startDate; day <= DateTime.UtcNow.Date; day = day.AddDays(1))
            {
                groupedMovements.TryGetValue(day, out var values);
                result.Add(new
                {
                    tarih = day.ToString("yyyy-MM-dd"),
                    girisMiktari = values?.GirisMiktari ?? 0,
                    cikisMiktari = values?.CikisMiktari ?? 0
                });
            }

            return Ok(result);
        }

        // Her kategorideki toplam stok miktarını döner
        [HttpGet("by-category")]
        public async Task<IActionResult> GetByCategory()
        {
            var result = await _context.StockLevels
                .AsNoTracking()
                .GroupBy(sl => sl.Product.Category.Name)
                .Select(g => new
                {
                    kategoriAdi = g.Key,
                    toplamStok = g.Sum(x => x.Quantity)
                })
                .OrderByDescending(x => x.toplamStok)
                .ToListAsync();

            return Ok(result);
        }

        // Toplam hareket miktarına göre en çok işlem gören ilk 5 ürünü döner
        [HttpGet("top-products")]
        public async Task<IActionResult> GetTopProducts()
        {
            var result = await _context.StockMovements
                .AsNoTracking()
                .Where(m => m.MovementType == "IN" || m.MovementType == "OUT") // Sadece giriş çıkışları hesaba kat
                .GroupBy(m => new { m.ProductId, m.Product.Name, m.Product.Barcode })
                .Select(g => new
                {
                    urunAdi = g.Key.Name,
                    barkod = g.Key.Barcode,
                    toplamHareketMiktari = g.Sum(x => x.Quantity),
                    hareketSayisi = g.Count()
                })
                .OrderByDescending(x => x.toplamHareketMiktari)
                .Take(5)
                .ToListAsync();

            return Ok(result);
        }
    }
}