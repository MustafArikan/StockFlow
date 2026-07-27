using stok_takip.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

    public AssetsController(AppDbContext context)
    {
        _context = context;
    }

    // --- 1. YENİ EKİPMAN KAYIT İŞLEMİ ---
    [HttpPost]
    [Authorize(Policy = Policies.AdminOnly)] 
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
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == dto.ProductId);
        if (product == null)
        {
            return NotFound(new { message = "Belirtilen ürün modeli bulunamadı." });
        }

        // Yeni Ekipman (Asset) nesnesinin oluşturulması
        var newAsset = new Asset
        {
            ProductId = dto.ProductId,
            SerialNumber = dto.SerialNumber,
            Notes = dto.Notes,
            Status = "Available" // İlk eklendiğinde durumu 'Müsait/Boşta' olur
        };

        // Ekipman eklendiğine dair ilk yaşam döngüsü logunun atılması
        var historyRecord = new AssetHistory
        {
            Asset = newAsset,
            UserId = GetCurrentUserId(), // Yardımcı metot kullanıldı
            EventType = "Sisteme Giriş",
            Notes = "Ekipman sisteme ilk kez eklendi."
        };

        _context.Assets.Add(newAsset);
        _context.AssetHistories.Add(historyRecord);

        // Transaction (İşlem) mantığı: İkisi de aynı anda kaydedilir
        await _context.SaveChangesAsync();

        return Ok(new { message = "Ekipman başarıyla oluşturuldu.", assetId = newAsset.Id });
    }

    [HttpPut("{id}/assign")]
    [Authorize(Policy = Policies.AdminOnly)] 
    public async Task<IActionResult> AssignAsset(int id, [FromBody] AssignAssetDto dto)
    {
        var asset = await _context.Assets.FindAsync(id);
        if (asset == null)
        {
            return NotFound(new { message = "Belirtilen Ekipman bulunamadı." });
        }

        // Ekipman zaten başkasındaysa veya arızalıysa engelleme
        if (asset.Status == "In Use" || asset.AssignedToId != null)
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
        asset.Status = "In Use";

        // Atama işlem logunun oluşturulması
        var historyRecord = new AssetHistory
        {
            AssetId = asset.Id,
            UserId = GetCurrentUserId(), // Yardımcı metot kullanıldı
            EventType = "Kullanıcıya Atandı",
            Notes = $"{targetUser.Email} kullanıcısına atandı. Ek not: {dto.Notes}."
        };

        _context.AssetHistories.Add(historyRecord);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Ekipman başarıyla kullanıcıya atandı." });
    }

    // --- 3. TÜM EKİPMANLARI LİSTELEME ---
    [HttpGet]
    public async Task<IActionResult> GetAllAssets([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
    {
        var query = _context.Assets
            .AsNoTracking()
            .Include(a => a.Product)
            .Include(a => a.AssignedTo);

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

                ProductId = a.ProductId,
                ProductName = a.Product != null ? a.Product.Name : "Bilinmeyen Ürün",

                AssignedToId = a.AssignedToId,
                AssignedToName = a.AssignedTo != null ? a.AssignedTo.FirstName + " " + a.AssignedTo.LastName : "Şu an Boşta",
                AssignedToEmail = a.AssignedTo != null ? a.AssignedTo.Email : ""
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
                SerialNumber = asset.SerialNumber,
                ProductName = asset.Product != null ? asset.Product.Name : "Bilinmeyen Ürün",
                Status = asset.Status,
                AssignedTo = asset.AssignedTo != null ? $"{asset.AssignedTo.FirstName} {asset.AssignedTo.LastName}" : "Şu an Boşta",
                Notes = asset.Notes
            },
            Timeline = timeline
        });
    }

    [HttpPut("{id}/return")]
    [Authorize(Policy = Policies.AdminOnly)]

    public async Task<IActionResult> ReturnAsset(int id, [FromBody] ReturnAssetDto dto)
    {
        var asset = await _context.Assets.Include(a => a.AssignedTo).FirstOrDefaultAsync(a => a.Id == id);
        if (asset == null || asset.AssignedToId == null)
        {
            return BadRequest(new { message = "Ekipman bulunamadı veya şu an kimseye atanmamış." });
        }

        var historyRecord = new AssetHistory
        {
            AssetId = asset.Id,
            UserId = GetCurrentUserId(), // Yardımcı metot kullanıldı
            EventType = "Teslim Alındı",
            Notes = $"{asset.AssignedTo?.FirstName} {asset.AssignedTo?.LastName} tarafından iade edildi. Ek not: {dto.Notes}"
        };

        asset.AssignedToId = null;
        asset.Status = "Available";

        _context.AssetHistories.Add(historyRecord);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Ekipman başarıyla teslim alındı." });
    }

    // --- 6. ARIZA BİLDİRİMİ İŞLEMİ ---
    [HttpPost("{id}/breakdown")]
    [Authorize]
    public async Task<IActionResult> ReportBreakdown(int id, [FromBody] ReportBreakdownDto dto)
    {
        var asset = await _context.Assets.FindAsync(id);
        if (asset == null) return NotFound(new { message = "Ekipman bulunamadı." });

        asset.Status = "Broken";

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
    [Authorize]
    public async Task<IActionResult> ResolveBreakdown(int id, [FromBody] ResolveBreakdownDto dto)
    {
        var asset = await _context.Assets.FindAsync(id);
        if (asset == null) return NotFound(new { message = "Ekipman bulunamadı." });

        // Eğer Ekipman bozulduğunda birindeyse statüsü tekrar "Kullanımda" olur, değilse "Boşta" olur.
        asset.Status = asset.AssignedToId != null ? "In Use" : "Available";

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
    [Authorize]
    public async Task<IActionResult> LogMaintenance(int id, [FromBody] LogMaintenanceDto dto)
    {
        var asset = await _context.Assets.FindAsync(id);
        if (asset == null) return NotFound();

        // Eğer yeni bir bakım tarihi seçildiyse varlığa (Asset) işle
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


    // YARDIMCI METOTLAR 
    // DRY Prensibi: Token içindeki giriş yapmış kullanıcının ID'sini döndürür
    private int? GetCurrentUserId()
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(userIdString, out int uid) ? uid : null;
    }
}