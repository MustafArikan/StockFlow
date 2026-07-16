using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
    [HttpGet]
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
    [HttpGet("by-warehouse/{warehouseId}")]
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
    public async Task<IActionResult> Create(CreateLocationDto dto)
    {
        var warehouseExists = await _context.Warehouses.AnyAsync(w => w.Id == dto.WarehouseId);
        if (!warehouseExists)
            return BadRequest(new { message = "Belirtilen depo bulunamadı." });

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
    public async Task<IActionResult> Delete(int id)
    {
        var location = await _context.Locations.FindAsync(id);
        if (location == null)
            return NotFound();

        location.IsDeleted = true; // Soft delete
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
