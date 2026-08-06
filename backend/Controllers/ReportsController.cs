using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using stok_takip.Constants;
using stok_takip.Attributes;
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
        private readonly ILogger<ReportsController> _logger;

        public ReportsController(AppDbContext context, ILogger<ReportsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // DASHBOARD KARTLARI İÇİN ÖZET BİLGİLER 
        [RequirePermission(Policies.RequireDashboardRead)]
        [HttpGet("dashboard-summary")]
        public async Task<IActionResult> GetDashboardSummary()
        {
            try
            {
                var totalProducts = await _context.Products.AsNoTracking().Where(p => !p.IsDeleted).CountAsync();
                var totalWarehouses = await _context.Warehouses.AsNoTracking().Where(w => !w.IsDeleted).CountAsync();                
                var criticalAlertsCount = await _context.Notifications
                    .AsNoTracking()
                    .Where(n => !n.IsRead && !n.IsDeleted)
                    .CountAsync();

                var totalStockQuantity = await _context.StockLevels
                    .Include(sl => sl.Product)
                    .Include(sl => sl.Location).ThenInclude(l => l.Warehouse)
                    .AsNoTracking()
                    .Where(sl => !sl.IsDeleted 
                                 && sl.Product != null && !sl.Product.IsDeleted
                                 && sl.Location != null && !sl.Location.IsDeleted
                                 && sl.Location.Warehouse != null && !sl.Location.Warehouse.IsDeleted)
                    .SumAsync(sl => sl.Quantity);

                var totalWarehouseValue = await _context.StockLevels
                    .Include(sl => sl.Product)
                    .Include(sl => sl.Location).ThenInclude(l => l.Warehouse)
                    .AsNoTracking()
                    .Where(sl => !sl.IsDeleted 
                                 && sl.Product != null && !sl.Product.IsDeleted
                                 && sl.Location != null && !sl.Location.IsDeleted
                                 && sl.Location.Warehouse != null && !sl.Location.Warehouse.IsDeleted)
                    .SumAsync(sl => sl.Quantity * sl.Product.Cost);

                var transactionVolume = await _context.StockMovements
                    .Include(m => m.Product)
                    .AsNoTracking()
                    .Where(m => !m.IsDeleted && m.Product != null && !m.Product.IsDeleted)
                    .SumAsync(m => m.TotalPrice);

                return Ok(new
                {
                    totalProducts = totalProducts,
                    totalStockQuantity = totalStockQuantity,
                    totalWarehouses = totalWarehouses,
                    criticalAlertsCount = criticalAlertsCount,
                    totalWarehouseValue = totalWarehouseValue,
                    transactionVolume = transactionVolume
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Dashboard özet verileri alınamadı");
                return StatusCode(500, new { message = "Dashboard özet verileri alınamadı." });
            }
        }

        // SON 30 GÜNÜN HAREKET TRENDİ
        [RequirePermission(Policies.RequireReportRead)]
        [HttpGet("trend")]
        public async Task<IActionResult> GetTrend([FromQuery] int? productId)
        {
            try
            {
                var query = _context.StockMovements
                    .Include(m => m.Product)
                    .AsNoTracking()
                    .Where(m => !m.IsDeleted && m.Product != null && !m.Product.IsDeleted)
                    .AsQueryable();

                if (productId.HasValue && productId.Value > 0)
                {
                    query = query.Where(m => m.ProductId == productId.Value);
                }

                var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30); 

                var trend = await query
                    .Where(m => m.CreatedAt >= thirtyDaysAgo)
                    .GroupBy(m => m.CreatedAt.Date)
                    .Select(g => new
                    {
                        Tarih = g.Key,                        
                        GirisMiktari = g.Sum(x => (x.MovementType == "IN" || x.MovementType == "GIRIS") ? x.Quantity : 0),
                        CikisMiktari = g.Sum(x => (x.MovementType == "OUT" || x.MovementType == "CIKIS") ? x.Quantity : 0),
                        TransferMiktari = g.Sum(x => x.MovementType == "TRANSFER" ? x.Quantity : 0)
                    })
                    .OrderBy(x => x.Tarih)
                    .ToListAsync();

                return Ok(trend);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Trend verisi alınamadı");
                return StatusCode(500, new { message = "Trend verisi alınamadı." });
            }
        }

        // KATEGORİLERE GÖRE STOK DAĞILIMI
        [RequirePermission(Policies.RequireReportRead)]
        [HttpGet("by-category")]
        public async Task<IActionResult> GetByCategory()
        {
            try
            {
                var result = await _context.StockLevels
                    .Include(sl => sl.Product)
                    .ThenInclude(p => p.Category)
                    .Include(sl => sl.Location).ThenInclude(l => l.Warehouse)
                    .AsNoTracking()
                    .Where(sl => !sl.IsDeleted 
                                 && sl.Product != null && !sl.Product.IsDeleted
                                 && sl.Location != null && !sl.Location.IsDeleted
                                 && sl.Location.Warehouse != null && !sl.Location.Warehouse.IsDeleted)
                    .GroupBy(sl => sl.Product.Category != null && !sl.Product.Category.IsDeleted ? sl.Product.Category.Name : "Kategorisiz")
                    .Select(g => new
                    {
                        kategoriAdi = g.Key,
                        toplamStok = g.Sum(x => x.Quantity)
                    })
                    .OrderByDescending(x => x.toplamStok)
                    .ToListAsync();

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Kategori verileri alınırken bir hata oluştu");
                return StatusCode(500, new { message = "Kategori verileri alınırken bir hata oluştu." });
            }
        }

        // EN ÇOK HAREKET GÖREN ÜRÜNLER 
        [RequirePermission(Policies.RequireReportRead)]
        [HttpGet("top-products")]
        public async Task<IActionResult> GetTopProducts()
        {
            try
            {
                var result = await _context.StockMovements
                    .Include(m => m.Product)
                    .AsNoTracking()
                    .Where(m => !m.IsDeleted && m.Product != null && !m.Product.IsDeleted)
                    .GroupBy(m => new { m.Product.Barcode, m.Product.Name })
                    .Select(g => new
                    {                       
                        urunAdi = (g.Key.Name == null || g.Key.Name == "") ? "İsimsiz Ürün (" + g.Key.Barcode + ")" : g.Key.Name,
                        barkod = g.Key.Barcode,
                        toplamHareketMiktari = g.Sum(x => x.Quantity),
                        girisMiktari = g.Sum(x => (x.MovementType == "IN" || x.MovementType == "GIRIS") ? x.Quantity : 0),
                        cikisMiktari = g.Sum(x => (x.MovementType == "OUT" || x.MovementType == "CIKIS") ? x.Quantity : 0),
                        transferMiktari = g.Sum(x => x.MovementType == "TRANSFER" ? x.Quantity : 0)
                    })
                    .OrderByDescending(x => x.toplamHareketMiktari)
                    .Take(7)
                    .ToListAsync();

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "En çok hareket gören ürünler alınamadı");
                return StatusCode(500, new { message = "En çok hareket gören ürünler alınamadı." });
            }
        }

        // HAREKET ÖZETİ (Giriş/Çıkış/Transfer Toplamları)
        [RequirePermission(Policies.RequireReportRead)]
        [HttpGet("movement-summary")]
        public async Task<IActionResult> GetMovementSummary()
        {
            try
            {
                var summary = await _context.StockMovements
                    .Include(m => m.Product)
                    .AsNoTracking()
                    .Where(m => !m.IsDeleted && m.Product != null && !m.Product.IsDeleted)
                    .GroupBy(m => m.MovementType)
                    .Select(g => new
                    {
                        Type = g.Key,
                        TotalQuantity = g.Sum(m => m.Quantity)
                    })
                    .ToListAsync();

                return Ok(new
                {
                    Giris = summary.Where(x => x.Type == "IN" || x.Type == "GIRIS").Sum(x => x.TotalQuantity),
                    Cikis = summary.Where(x => x.Type == "OUT" || x.Type == "CIKIS").Sum(x => x.TotalQuantity),
                    Transfer = summary.Where(x => x.Type == "TRANSFER").Sum(x => x.TotalQuantity)
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Hareket özeti hesaplanamadı");
                return StatusCode(500, new { message = "Hareket özeti hesaplanamadı." });
            }
        }
    }
}
