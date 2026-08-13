using stok_takip.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using stok_takip.Attributes;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using stok_takip.Data;
using stok_takip.DTOs;
using stok_takip.Models;

namespace stok_takip.Controllers;

[ApiController]
[Route("api/locations")]
[Authorize]
public class LocationsController : ControllerBase
{
    private readonly AppDbContext _context;

    public LocationsController(AppDbContext context)
    {
        _context = context;
    }

    // GET /api/locations  tüm rafları listele
    [RequirePermission(Policies.RequireLocationRead)]
    [HttpGet]
    [NormalizePagination]
    public async Task<IActionResult> GetAll([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
    {
        var query = _context.Locations.AsNoTracking();
        var totalRecords = await query.CountAsync();

        var locations = await query
            .OrderByDescending(l => l.Id)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new
        {
            items = locations,
            totalRecords = totalRecords,
            currentPage = pageNumber,
            totalPages = (int)Math.Ceiling((double)totalRecords / pageSize)
        });
    }

    // GET /api/locations/by-warehouse/5  belirli bir deponun raflarını getir
    [RequirePermission(Policies.RequireLocationRead)]
    [HttpGet("by-warehouse/{warehouseId}")]
    [NormalizePagination]
    public async Task<IActionResult> GetByWarehouse(int warehouseId, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
    {
        var query = _context.Locations
            .AsNoTracking()
            .Where(l => l.WarehouseId == warehouseId);

        var totalRecords = await query.CountAsync();

        var locations = await query
            .Select(l => new 
            {
                l.Id,
                l.WarehouseId,
                l.Code,
                IsEmpty = !l.StockLevels.Any(sl => !sl.IsDeleted && sl.Quantity > 0)
            })
            .OrderByDescending(l => l.Id)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new
        {
            items = locations,
            totalRecords = totalRecords,
            currentPage = pageNumber,
            totalPages = (int)Math.Ceiling((double)totalRecords / pageSize)
        });
    }

    // POST /api/locations  yeni raf ekle
    [HttpPost]
    [RequirePermission(Policies.RequireLocationWrite)]
    [EnableRateLimiting(Policies.RequireLocationWrite)]
    public async Task<IActionResult> Create(CreateLocationDto dto)
    {
        var warehouseExists = await _context.Warehouses.AnyAsync(w => w.Id == dto.WarehouseId);
        if (!warehouseExists)
            return BadRequest(new { message = "Belirtilen depo bulunamadı." });

        var codeExists = await _context.Locations.AnyAsync(l => l.WarehouseId == dto.WarehouseId && l.Code == dto.Code && !l.IsDeleted);
        if (codeExists)
            return BadRequest(new { message = "Bu depoda aynı koda sahip bir raf zaten var." });

        var location = new Location
        {
            Code = dto.Code,
            WarehouseId = dto.WarehouseId
        };
        _context.Locations.Add(location);
        await _context.SaveChangesAsync();

        return Ok(new LocationResponseDto(location.Id, location.Code, location.WarehouseId));
    }

    // DELETE /api/locations/5  rafı sil
    [HttpDelete("{id}")]
    [RequirePermission(Policies.RequireLocationWrite)]
    [EnableRateLimiting(Policies.RequireLocationWrite)]
    public async Task<IActionResult> Delete(int id)
    {
        var location = await _context.Locations.FindAsync(id);
        if (location == null)
            return NotFound();

        // Yalnızca GERÇEKTEN ürün duran raflar korunur.
        // Daha önce miktarı sıfıra düşmüş stok satırları rafta kayıt olarak durmaya devam eder;
        // eski kontrol miktara bakmadığı için boş görünen raflar da silinemiyordu.
        var doluMu = await _context.StockLevels.AnyAsync(sl => sl.LocationId == id && sl.Quantity > 0);
        if (doluMu)
        {
            return BadRequest(new { message = "Bu rafta ürün (stok) var. Önce stokları boşaltmalısınız." });
        }

        // Rafla birlikte, miktarı sıfır olan artık stok satırları da temizlenir
        var bosStokSatirlari = await _context.StockLevels
            .Where(sl => sl.LocationId == id)
            .ToListAsync();
        foreach (var satir in bosStokSatirlari)
        {
            satir.IsDeleted = true;
        }

        location.IsDeleted = true; // Soft delete
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // Belirtilen kod değerine sahip aktif raf/lokasyon kaydını veritabanında arar ve bulursa geriye döndürür.
    [RequirePermission(Policies.RequireLocationRead)] // Güvenlik için okuma izni şartını ekledik
    [HttpGet("by-code/{code}")]
    public async Task<IActionResult> GetLocationByCode(string code)
    {
        // Boşlukları temizle ve küçük harfe çevirerek tam eşleşme ara
        var cleanCode = code.Trim().ToLower();

        // Sadece aktif (silinmemiş) ve kodu eşleşen rafı getir
        var location = await _context.Locations
            .FirstOrDefaultAsync(l => l.Code.ToLower() == cleanCode && !l.IsDeleted);

        if (location == null)
            return NotFound(new { Message = "Raf bulunamadı." });

        return Ok(location);
    }
}

