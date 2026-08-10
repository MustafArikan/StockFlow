using stok_takip.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using stok_takip.Attributes;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using stok_takip.Data;
using stok_takip.Models;
using stok_takip.DTOs;

namespace stok_takip.Controllers;

[ApiController]
[Route("api/units")]
[Authorize]
public class UnitsController : ControllerBase
{
    private readonly AppDbContext _context;
    public UnitsController(AppDbContext context) => _context = context;

    [RequirePermission(Policies.RequireUnitRead)]
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool includeInactive = false)
    {
        var query = _context.Units.AsNoTracking().Where(u => !u.IsDeleted);
        if (!includeInactive) query = query.Where(u => u.IsActive);

        var list = await query
            .OrderBy(u => u.Name)
            .Select(u => new UnitDto
            {
                Id = u.Id, Name = u.Name, ShortCode = u.ShortCode,
                AllowsDecimal = u.AllowsDecimal, IsActive = u.IsActive, IsSystemUnit = u.IsSystemUnit
            }).ToListAsync();

        return Ok(list);
    }

    [RequirePermission(Policies.RequireUnitWrite)]
    [EnableRateLimiting(Policies.RequireUnitWrite)]
    [HttpPost]
    public async Task<IActionResult> Create(CreateUnitDto dto)
    {
        var code = dto.ShortCode.Trim().ToUpperInvariant();
        var exists = await _context.Units.AnyAsync(u => u.ShortCode == code && !u.IsDeleted);
        if (exists)
            return BadRequest(new { message = "Bu kısa koda sahip bir birim zaten var." });

        var unit = new Unit
        {
            Name = dto.Name.Trim(),
            ShortCode = code,
            AllowsDecimal = dto.AllowsDecimal,
            IsActive = true,
            IsSystemUnit = false
        };
        _context.Units.Add(unit);
        await _context.SaveChangesAsync();
        return Ok(new UnitDto { Id = unit.Id, Name = unit.Name, ShortCode = unit.ShortCode, AllowsDecimal = unit.AllowsDecimal, IsActive = unit.IsActive, IsSystemUnit = unit.IsSystemUnit });
    }

    [RequirePermission(Policies.RequireUnitWrite)]
    [EnableRateLimiting(Policies.RequireUnitWrite)]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateUnitDto dto)
    {
        var unit = await _context.Units.FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted);
        if (unit == null) return NotFound();

        var code = dto.ShortCode.Trim().ToUpperInvariant();
        var clash = await _context.Units.AnyAsync(u => u.ShortCode == code && u.Id != id && !u.IsDeleted);
        if (clash) return BadRequest(new { message = "Bu kısa koda sahip başka bir birim var." });

        unit.Name = dto.Name.Trim();
        unit.ShortCode = code;
        unit.AllowsDecimal = dto.AllowsDecimal;
        unit.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Birim güncellendi." });
    }

    [RequirePermission(Policies.RequireUnitWrite)]
    [EnableRateLimiting(Policies.RequireUnitWrite)]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var unit = await _context.Units.FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted);
        if (unit == null) return NotFound();

        if (unit.IsSystemUnit)
            return BadRequest(new { message = "Sistem birimleri silinemez, sadece pasifleştirilebilir." });

        var inUse = await _context.Products.AnyAsync(p => p.UnitId == id && !p.IsDeleted);
        if (inUse)
            return BadRequest(new { message = "Bu birim ürünlerde kullanıldığı için silinemez. Önce pasifleştirin." });

        unit.IsDeleted = true;
        unit.IsActive = false;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Birim silindi." });
    }
}
