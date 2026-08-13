using stok_takip.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using stok_takip.Attributes;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using stok_takip.Data;
using stok_takip.DTOs;
using stok_takip.Models;
using System.Security.Claims;

namespace stok_takip.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class AssetsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<AssetsController> _logger;

    public AssetsController(AppDbContext context, ILogger<AssetsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // --- 1. YENİ EKİPMAN KAYIT İŞLEMİ ---
    [HttpPost]
    [RequirePermission(Policies.RequireAssetWrite)]
    [EnableRateLimiting(Policies.RequireAssetWrite)]
    public async Task<IActionResult> CreateAsset([FromBody] CreateAssetDto dto)
    {
        // Aynı seri numarasına sahip Ekipman var mı kontrolü
        var existingAsset = await _context.Assets
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.SerialNumber == dto.SerialNumber);
        if (existingAsset != null)
        {
            return BadRequest(new { message = "Bu seri numarasına/QR koda sahip bir ekipman zaten kayıtlı." });
        }

        // Ekipmanın bağlı olduğu ürün (katalog) modelinin doğrulanması 
        var product = await _context.Products
            .FirstOrDefaultAsync(p => p.Id == dto.ProductId);

        if (product == null)
        {
            return NotFound(new { message = "Belirtilen ürün modeli bulunamadı." });
        }

        // STOK KONTROLÜ (Toplam Miktar Kontrolü)
        var totalStock = await _context.StockLevels
            .Where(sl => sl.ProductId == product.Id)
            .SumAsync(sl => sl.Quantity);

        if (totalStock < 1)
        {
            return BadRequest(new { message = $"Stok yetersiz! Depoda hiç '{product.Name}' bulunmuyor. Lütfen önce stok girişi yapın." });
        }

        // Belirtilen kaynak rafta (locationId) yeterli stok var mı kontrolü yapılıyor
        var stockLevel = await _context.StockLevels
            .FirstOrDefaultAsync(sl => sl.ProductId == product.Id && sl.LocationId == dto.LocationId);

        if (stockLevel == null || stockLevel.Quantity < 1)
        {
            return BadRequest(new { message = "Seçilen depoda/rafta bu ürün için yeterli stok bulunmuyor." });
        }

        // ACID Güvencesi İçin Transaction Başlatıyoruz (Hata olursa veritabanı yarıda kalmasın diye)
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // Belirtilen raftan 1 adet düşürür
            stockLevel.Quantity -= 1;

            // Stok hareketini kaydeder
            var stockMovement = new StockMovement
            {
                ProductId = product.Id,
                MovementType = "OUT", // Stok çıkışı
                Quantity = 1,
                SourceLocationId = dto.LocationId,
                Description = $"Ekipman Sisteme Kaydedildi (Seri No: {dto.SerialNumber})",
                CreatedAt = DateTime.UtcNow,
                UserId = GetCurrentUserId()
            };
            _context.StockMovements.Add(stockMovement);

            var newAsset = new Asset
            {
                ProductId = dto.ProductId,
                SerialNumber = dto.SerialNumber,
                Notes = dto.Notes,
                Attributes = dto.Attributes,
                Status = AssetStatuses.Available // İlk eklendiğinde durumu 'Müsait/Boşta' olur              

            };

            var historyNotes = "Ekipman sisteme eklendi ve stoka ait depodan 1 adet düşüldü.";

            if (dto.AssignedUserId.HasValue)
            {
                var assignedUser = await _context.Users.FindAsync(dto.AssignedUserId.Value);
                if (assignedUser != null)
                {
                    newAsset.AssignedToId = dto.AssignedUserId.Value;
                    newAsset.Status = AssetStatuses.InUse;
                    historyNotes += $" Ekipman oluşturulurken {assignedUser.FirstName} {assignedUser.LastName} adlı kullanıcıya atandı.";
                }
            }

            // Ekipman eklendiğine dair ilk yaşam döngüsü logunun atılması
            var historyRecord = new AssetHistory
            {
                Asset = newAsset,
                UserId = GetCurrentUserId(),
                EventType = dto.AssignedUserId.HasValue ? "Sisteme Giriş ve Atama" : "Sisteme Giriş",
                Notes = historyNotes
            };

            _context.Assets.Add(newAsset);
            _context.AssetHistories.Add(historyRecord);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync(); // Her şey yolundaysa onayla

            return Ok(new { message = "Ekipman başarıyla oluşturuldu ve stoktan düşüldü.", assetId = newAsset.Id });
        }
        catch (DbUpdateConcurrencyException ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Ekipman kaydedilirken eşzamanlılık hatası oluştu");
            return Conflict(new { message = "Stok bilgisi başka bir işlem tarafından değiştirildi. Lütfen tekrar deneyin." });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(); // Hata çıkarsa stok düşüşünü geri al
            _logger.LogError(ex, "Ekipman kaydedilirken hata oluştu");
            return StatusCode(500, new { message = "Ekipman kaydedilirken hata oluştu." });
        }
    }

    // --- 2. EKİPMAN ATAMA İŞLEMİ ---
    [HttpPut("{id}/assign")]
    [RequirePermission(Policies.RequireAssetWrite)]
    [EnableRateLimiting(Policies.RequireAssetWrite)]
    public async Task<IActionResult> AssignAsset(int id, [FromBody] AssignAssetDto dto)
    {
        var asset = await _context.Assets.FindAsync(id);
        if (asset == null)
        {
            return NotFound(new { message = "Belirtilen Ekipman bulunamadı." });
        }

        // Ekipman başkasındaysa engeller
        if (asset.Status == AssetStatuses.InUse || asset.AssignedToId != null)
        {
            return BadRequest(new { message = "Bu Ekipman zaten bir kullanıcıya atanmış." });
        }

        // Hedef kullanıcının kontrolü
        var targetUser = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == dto.UserId);
        if (targetUser == null)
        {
            return NotFound(new { message = "Belirtilen kullanıcı bulunamadı." });
        }

        asset.AssignedToId = dto.UserId;
        asset.Status = AssetStatuses.InUse;

        // Atama işlemi kaydının oluşturulması
        var historyRecord = new AssetHistory
        {
            AssetId = asset.Id,
            UserId = GetCurrentUserId(), // Yardımcı metot kullanıldı
            EventType = "Kullanıcıya Atandı",
            Notes = $"{targetUser.Email} kullanıcısına atandı.{FormatNotes(dto.Notes)}"
        };

        _context.AssetHistories.Add(historyRecord);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Ekipman başarıyla kullanıcıya atandı." });
    }

    // --- 3. TÜM EKİPMANLARI LİSTELEME ---
    [RequirePermission(Policies.RequireAssetRead)]
    [HttpGet]
    [NormalizePagination]
    public async Task<IActionResult> GetAllAssets(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] int? categoryId = null,
        [FromQuery] string? status = null,
        [FromQuery] string? dynamicAttributes = null)
    {
        var query = _context.Assets
            .AsNoTracking()
            .Include(a => a.Product)
            .Include(a => a.AssignedTo)
            .AsQueryable();

        if (categoryId.HasValue)
        {
            query = query.Where(a => a.Product != null && a.Product.CategoryId == categoryId.Value);
        }

        if (!string.IsNullOrEmpty(status))
        {
            query = query.Where(a => a.Status == status);
        }

        if (!string.IsNullOrEmpty(dynamicAttributes))
        {
            try
            {
                var dict = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(dynamicAttributes);
                if (dict != null)
                {
                    foreach (var kvp in dict)
                    {
                        var searchStr = $"\"{kvp.Key}\":\"{kvp.Value}\"";
                        query = query.Where(a => a.Attributes != null && a.Attributes.Contains(searchStr));
                    }
                }
            }
            catch { /* Ignore parsing errors */ }
        }

        var totalRecords = await query.CountAsync();

        var assets = await query
            .OrderByDescending(a => a.Id)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new
            {
                a.Id,
                a.SerialNumber,
                a.Status,
                a.Notes,
                a.Attributes,

                ProductId = a.ProductId,
                ProductName = a.Product != null ? a.Product.Name : "Bilinmeyen Ürün",

                AssignedToId = a.AssignedToId,
                AssignedToName = a.AssignedTo != null ? a.AssignedTo.FirstName + " " + a.AssignedTo.LastName : "Şu an Boşta",
                AssignedToEmail = a.AssignedTo != null ? a.AssignedTo.Email : "",
                CreatedAt = a.CreatedAt
            })
            .ToListAsync();

        return Ok(new
        {
            TotalRecords = totalRecords,
            PageNumber = pageNumber,
            PageSize = pageSize,
            Assets = assets
        });
    }

    // --- 4. ZAMAN ÇİZELGESİ (YAŞAM DÖNGÜSÜ) GETİRME ---
    [RequirePermission(Policies.RequireAssetRead)]
    [HttpGet("{serialNumber}/timeline")]
    public async Task<IActionResult> GetAssetTimeLine(string serialNumber)
    {
        var asset = await _context.Assets
            .Include(a => a.Product)
            .Include(a => a.AssignedTo)
            .Include(a => a.History)
                .ThenInclude(h => h.User)
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.SerialNumber == serialNumber);

        if (asset == null)
        {
            return NotFound(new { message = "Belirtilen seri numarasına/QR koda sahip Ekipman bulunamadı." });
        }

        var timeline = asset.History
            .OrderByDescending(h => h.CreatedAt)
            .Select(h => new
            {
                Id = h.Id,
                Date = h.CreatedAt,
                EventType = h.EventType,
                Notes = h.Notes,
                UserName = h.User != null ? $"{h.User.FirstName} {h.User.LastName}" : "Sistem",
            }).ToList();
        // Veriler filtrelendikten sonra .ToList() ile bellekte somut bir liste olarak alınır,
        // böylece JSON dönüştürücü hatasız çalışır.       

        return Ok(new
        {
            AssetInfo = new
            {
                Id = asset.Id,
                ProductId = asset.ProductId,
                SerialNumber = asset.SerialNumber,
                ProductName = asset.Product != null ? asset.Product.Name : "Bilinmeyen Ürün",
                Status = asset.Status,
                AssignedTo = asset.AssignedTo != null ? $"{asset.AssignedTo.FirstName} {asset.AssignedTo.LastName}" : "Şu an Boşta",
                Notes = asset.Notes,
                Attributes = asset.Attributes
            },
            Timeline = timeline
        });
    }

    // --- 5. EKİPMAN TESLİM ALMA İŞLEMİ ---
    [HttpPut("{id}/return")]
    [RequirePermission(Policies.RequireAssetWrite)]
    [EnableRateLimiting(Policies.RequireAssetWrite)]

    public async Task<IActionResult> ReturnAsset(int id, [FromBody] ReturnAssetDto dto)
    {
        var asset = await _context.Assets.Include(a => a.AssignedTo).FirstOrDefaultAsync(a => a.Id == id);
        if (asset == null || asset.AssignedToId == null)
        {
            return BadRequest(new { message = "Ekipman bulunamadı veya şu an kimseye atanmamış." });
        }

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var historyRecord = new AssetHistory
            {
                AssetId = asset.Id,
                UserId = GetCurrentUserId(), // Yardımcı metot kullanıldı
                EventType = "Teslim Alındı",
                Notes = $"{asset.AssignedTo?.FirstName} {asset.AssignedTo?.LastName} tarafından teslim alındı.{FormatNotes(dto.Notes)}"
            };

            asset.AssignedToId = null;
            asset.Status = AssetStatuses.Available;

            _context.AssetHistories.Add(historyRecord);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new { message = "Ekipman başarıyla teslim alındı." });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Ekipman teslim alınırken hata oluştu");
            return StatusCode(500, new { message = "Ekipman teslim alınırken hata oluştu." });
        }
    }

    // --- 6. ARIZA BİLDİRİMİ İŞLEMİ ---
    [HttpPost("{id}/breakdown")]
    [RequirePermission(Policies.RequireAssetWrite)]
    [EnableRateLimiting(Policies.RequireAssetWrite)]
    public async Task<IActionResult> ReportBreakdown(int id, [FromBody] ReportBreakdownDto dto)
    {
        var asset = await _context.Assets.FindAsync(id);
        if (asset == null) return NotFound(new { message = "Ekipman bulunamadı." });

        asset.Status = AssetStatuses.Broken;

        var historyRecord = new AssetHistory
        {
            AssetId = asset.Id,
            UserId = GetCurrentUserId(), // Yardımcı metot kullanıldı
            EventType = "Arıza Bildirildi",
            Notes = $"Arıza bildirildi: {dto.Description}"
        };

        _context.AssetHistories.Add(historyRecord);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Arıza bildirimi başarıyla kaydedildi." });
    }

    // --- 7. ARIZA ÇÖZÜMÜ / TAMİR İŞLEMİ ---
    [HttpPost("{id}/resolve")]
    [RequirePermission(Policies.RequireAssetWrite)]
    [EnableRateLimiting(Policies.RequireAssetWrite)]
    public async Task<IActionResult> ResolveBreakdown(int id, [FromBody] ResolveBreakdownDto dto)
    {
        var asset = await _context.Assets.FindAsync(id);
        if (asset == null) return NotFound(new { message = "Ekipman bulunamadı." });

        asset.Status = asset.AssignedToId != null ? AssetStatuses.InUse : AssetStatuses.Available;

        var historyRecord = new AssetHistory
        {
            AssetId = asset.Id,
            UserId = GetCurrentUserId(), // Yardımcı metot kullanıldı
            EventType = "Servis / Çözüm",
            Notes = $"Arıza çözümü: {dto.Solution}"
        };

        _context.AssetHistories.Add(historyRecord);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Arıza çözümü başarıyla kaydedildi, Ekipman aktif hale getirildi." });
    }

    // --- 8. BAKIM İŞLEME ---
    [HttpPost("{id}/maintenance")]
    [RequirePermission(Policies.RequireAssetWrite)]
    [EnableRateLimiting(Policies.RequireAssetWrite)]
    public async Task<IActionResult> LogMaintenance(int id, [FromBody] LogMaintenanceDto dto)
    {
        var asset = await _context.Assets.FindAsync(id);

        if (asset == null) return NotFound(new { message = "Ekipman bulunamadı." });

        if (dto.NextMaintenanceDate.HasValue)
        {
            asset.NextMaintenanceDate = dto.NextMaintenanceDate;
        }

        var historyRecord = new AssetHistory
        {
            AssetId = asset.Id,
            UserId = GetCurrentUserId(), // Yardımcı metot kullanıldı
            EventType = "Bakım Yapıldı",
            Notes = dto.Details
        };

        _context.AssetHistories.Add(historyRecord);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Bakım kaydı başarıyla eklendi." });
    }

    // --- 9. EKİPMAN SİLME VE İSTEĞE BAĞLI STOĞA GERİ EKLEME ---
    [HttpDelete("{id}")]
    [RequirePermission(Policies.RequireAssetWrite)]
    [EnableRateLimiting(Policies.RequireAssetWrite)]
    public async Task<IActionResult> DeleteAsset(int id, [FromQuery] int? returnLocationId)
    {
        var asset = await _context.Assets
            .Include(a => a.Product)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (asset == null)
            return NotFound(new { message = "İşlem yapılacak ekipman bulunamadı." });

        if (asset.Status == AssetStatuses.Retired)
            return BadRequest(new { message = "Bu ekipman zaten kullanımdan kaldırılmış." });

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // Stoka Geri Alma Rafı Seçildiyse Stoku Artırır ve Kaydeder
            if (returnLocationId.HasValue)
            {
                var targetLocation = await _context.Locations.FindAsync(returnLocationId.Value);
                if (targetLocation == null)
                    return BadRequest(new { message = "Belirtilen hedef raf sistemde bulunamadı." });

                var stockLevel = await _context.StockLevels
                    .FirstOrDefaultAsync(sl => sl.ProductId == asset.ProductId && sl.LocationId == returnLocationId.Value);

                if (stockLevel != null)
                {
                    stockLevel.Quantity += 1;
                }
                else
                {
                    _context.StockLevels.Add(new StockLevel
                    {
                        ProductId = asset.ProductId,
                        LocationId = returnLocationId.Value,
                        Quantity = 1
                    });
                }

                var stockMovement = new StockMovement
                {
                    ProductId = asset.ProductId,
                    MovementType = "IN",
                    Quantity = 1,
                    TargetLocationId = returnLocationId.Value,
                    Description = $"Kullanımdan Kaldırılan Ekipman Stoka Geri Alındı (Seri No: {asset.SerialNumber})",
                    CreatedAt = DateTime.UtcNow,
                    UserId = GetCurrentUserId()
                };
                _context.StockMovements.Add(stockMovement);
            }

            // Hard Delete yerine Soft Delete yapıyoruz
            asset.Status = AssetStatuses.Retired;
            asset.AssignedToId = null; // Ekipman pasife alındığı için kullanıcının ataması kaldırılır

            var historyRecord = new AssetHistory
            {
                AssetId = asset.Id,
                UserId = GetCurrentUserId(),
                EventType = "Kullanımdan Kaldırıldı",
                Notes = returnLocationId.HasValue
                    ? "Ekipman kullanımdan kaldırıldı ve stoka geri alındı."
                    : "Ekipman kullanımdan kaldırıldı ve hurdaya ayrıldı."
            };
            _context.AssetHistories.Add(historyRecord);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new { message = "Ekipman başarıyla kullanımdan kaldırıldı ve pasife alındı." });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Ekipman pasife alınırken bir hata oluştu");
            return StatusCode(500, new { message = "Ekipman pasife alınırken bir hata oluştu." });
        }
    }

    // YARDIMCI METOTLAR 
    private int? GetCurrentUserId()
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(userIdString, out int uid) ? uid : null;
    }

    private string FormatNotes(string? notes)
    {
        return !string.IsNullOrWhiteSpace(notes) ? $" Ek not: {notes.Trim()}" : string.Empty;
    }
}
