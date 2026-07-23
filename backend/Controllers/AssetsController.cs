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

    [HttpPost]
    [Authorize(Roles = "admin")] 
    public async Task<IActionResult> CreateAsset([FromBody] CreateAssetDto dto)
    {
        var existingAsset = await _context.Assets
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.SerialNumber == dto.SerialNumber);
        if (existingAsset != null)
        {
            return BadRequest(new { message = "Bu seri numarasına/QR koda sahip bir varlık zaten kayıtlı." });
        }

        var product = await _context.Products
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == dto.ProductId);
        if (product == null)
        {
            return NotFound(new { message = "Belirtilen ürün modeli bulunamadı." });
        }
        
        var newAsset = new Asset
        {
            ProductId = dto.ProductId,
            SerialNumber = dto.SerialNumber,
            Notes = dto.Notes,
            Status = "Available"
        };
        
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        int? currentUserId = null;
        if (int.TryParse(userIdString, out int uid))
        {
            currentUserId = uid;
        }

        var historyRecord = new AssetHistory
        {
            Asset = newAsset,
            UserId = currentUserId,
            EventType = "Sisteme Giriş",
            Notes = "Ürün sisteme ilk kez eklendi."
        };

        _context.Assets.Add(newAsset);
        _context.AssetHistories.Add(historyRecord);

        await _context.SaveChangesAsync();

        return Ok(new { message = "Ürün başarıyla oluşturuldu.", assetId = newAsset.Id });
    } 

    [HttpPut("{id}/assign")]
    [Authorize(Roles = "admin")] 
    public async Task<IActionResult> AssignAsset(int id, [FromBody] AssignAssetDto dto)
    {
        var asset = await _context.Assets.FindAsync(id);
        if (asset == null)
        {
            return NotFound(new { message = "Belirtilen ürün bulunamadı." });
        }

        if (asset.Status == "In Use" || asset.AssignedToId != null)
        {
            return BadRequest(new { message = "Bu ürün zaten bir kullanıcıya zimmetlenmiş." });
        }

        var targetUser = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == dto.UserId);
        if (targetUser == null)
        {
            return NotFound(new { message = "Belirtilen kullanıcı bulunamadı." });
        }

        asset.AssignedToId = dto.UserId;
        asset.Status = "In Use";

        var currentUserIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        int? currentUserId = int.TryParse(currentUserIdString, out int uid) ? uid : null;

        var historyRecord = new AssetHistory
        {
            AssetId = asset.Id,
            UserId = currentUserId,
            EventType = "Zimmetlendi",
            Notes = $"{targetUser.Email} kullanıcısına zimmetlendi. Ek not: {dto.Notes}."
        };

        _context.AssetHistories.Add(historyRecord);

        await _context.SaveChangesAsync();

        return Ok(new { message = "Ürün başarıyla personele zimmetlendi." });
    }

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
                AssignedToName = a.AssignedTo != null ? a.AssignedTo.FirstName + " " + a.AssignedTo.LastName : "Zimmetli Değil",
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
            return NotFound(new {message = "Belirtilen seri numarasına/QR koda sahip ürün bulunamadı."});
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
        });

        return Ok(new
        {
            AssetInfo = new
            {
                Id = asset.Id,
                SerialNumber = asset.SerialNumber,
                ProductName = asset.Product != null ? asset.Product.Name : "Bilinmeyen Ürün",
                Status = asset.Status,
                AssignedTo = asset.AssignedTo != null ? $"{asset.AssignedTo.FirstName} {asset.AssignedTo.LastName}" : "Şu an Boşta",
                Notes = asset.Notes,
               },
            Timeline = timeline
        });
    }

    [HttpPut("{id}/return")]
    [Authorize(Roles = "admin")]

    public async Task<IActionResult> ReturnAsset(int id, [FromBody] ReturnAssetDto dto)
    {
        var asset = await _context.Assets.Include(a => a.AssignedTo).FirstOrDefaultAsync(a => a.Id ==id);
        if (asset == null || asset.AssignedToId == null)
        {
            return BadRequest(new {message = "Cihaz bulunamadı veya kimseye zimmetli değil."});
        }

        var historyRecord = new AssetHistory
        {
            AssetId = asset.Id,
            UserId = int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out int uid) ? uid : null,
            EventType = "İade Edildi",
            Notes = $"{asset.AssignedTo?.FirstName} {asset.AssignedTo?.LastName} tarafından iade edildi. Ek not: {dto.Notes}"
        };

        asset.AssignedToId = null;
        asset.Status = "Available";

        _context.AssetHistories.Add(historyRecord);
        await _context.SaveChangesAsync();
        return Ok(new {message = "Cihaz başarıyla teslim alındı."});
    }

    [HttpPut("{id}/breakdown")]
    [Authorize]
    public async Task <IActionResult> ReportBreakdown(int id, [FromBody] ReportBreakdownDto dto)
    {
        var asset = await _context.Assets.FindAsync(id);
        if (asset == null) return NotFound(new {message = "Cihaz bulunamadı."});

        asset.Status = "Broken"; 

        var historyRecord = new AssetHistory
        {
            AssetId = asset.Id,
            UserId = int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out int uid) ? uid : null,
            EventType = "Arıza Bildirildi",
            Notes = $"Arıza bildirildi: {dto.Description}"
        };

        _context.AssetHistories.Add(historyRecord);
        await _context.SaveChangesAsync();

        return Ok(new {message = "Arıza bildirimi başarıyla kaydedildi."});
    }

    [HttpPost("{id}/resolve")]
    [Authorize]
    public async Task<IActionResult> ResolveBreakdown(int id, [FromBody] ResolveBreakdownDto dto)
    {
        var asset = await _context.Assets.FindAsync(id);
        if (asset == null) return NotFound(new {message = "Cihaz bulunamadı."});

        asset.Status = asset.AssignedToId != null ? "In Use" : "Available";

        var historyRecord = new AssetHistory
        {
            AssetId = asset.Id,
            UserId = int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out int uid) ? uid : null,
            EventType = "Servis / Çözüm",
            Notes = $"Arıza çözümü: {dto.Solution}"
        };

        _context.AssetHistories.Add(historyRecord);
        await _context.SaveChangesAsync();

        return Ok(new {message = "Arıza çözümü başarıyla kaydedildi, cihaz aktif hale getirildi."});
    }
    
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
            UserId = int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out int uid) ? uid : null,
            EventType = "Bakım Yapıldı",
            Notes = dto.Details
        };

        _context.AssetHistories.Add(historyRecord);
        await _context.SaveChangesAsync();

        return Ok(new {message = "Bakım kaydı başarıyla eklendi."});
    }
}