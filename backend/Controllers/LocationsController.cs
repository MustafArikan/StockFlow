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

var stokVarMi = await _context.StockLevels.AnyAsync(sl => sl.LocationId == id);
        if (stokVarMi)
        {
            return BadRequest("Bu rafta ürün (stok) var. Önce stokları boşaltmalısınız.");
        }

        location.IsDeleted = true; // Soft delete
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

