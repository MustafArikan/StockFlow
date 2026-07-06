using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using stok_takip.Data;
using stok_takip.DTOs;
using stok_takip.Models;

namespace stok_takip.Controllers;

[ApiController]
[Route("api/locations")]

public class LocationsController : ControllerBase
{
    private readonly AppDbContext _context;

    public LocationsController(AppDbContext context)
    {
        _context = context;
    }

    // GET /api/locations  tüm rafları listele
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var locations = await _context.Locations.ToListAsync();
        return Ok(locations);
    }

    // GET /api/locations/by-warehouse/5  belirli bir deponun raflarını getir
    [HttpGet("by-warehouse/{warehouseId}")]
    public async Task<IActionResult> GetByWarehouse(int warehouseId)
    {
        var locations = await _context.Locations
            .Where(l => l.WarehouseId == warehouseId)
            .ToListAsync();
        return Ok(locations);
    }

    // POST /api/locations  yeni raf ekle
    [HttpPost]
    public async Task<IActionResult> Create(CreateLocationDto dto)
    {
        var location = new Location
        {
            Code = dto.Code,
            WarehouseId = dto.WarehouseId
        };
        _context.Locations.Add(location);
        await _context.SaveChangesAsync();
        return Ok(location);
    }

    // DELETE /api/locations/5  rafı sil
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var location = await _context.Locations.FindAsync(id);
        if (location == null)
            return NotFound();

        _context.Locations.Remove(location);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}