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
[Route("api/suppliers")]
[Authorize]
public class SuppliersController : ControllerBase
{
    private readonly AppDbContext _context;

    public SuppliersController(AppDbContext context)
    {
        _context = context;
    }

    // Tedarikçileri Listele
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var suppliers = await _context.Suppliers
            .AsNoTracking()
            .Where(s => !s.IsDeleted)
            .Select(s => new stok_takip.DTOs.SupplierResponseDto(s.Id, s.Name, s.ContactName, s.ContactEmail, s.ContactPhone, s.Address, s.TaxNumber, s.CreatedAt))
            .ToListAsync();
        return Ok(suppliers);
    }

    // Yeni Tedarikçi Ekle
    [HttpPost]
    [RequirePermission(Policies.RequireSupplierWrite)]
    [EnableRateLimiting(Policies.RequireSupplierWrite)] //access token kontrolune cevir
    public async Task<IActionResult> Create([FromBody] stok_takip.DTOs.CreateSupplierDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Tedarikçi adı boş olamaz." });

        var mevcut = await _context.Suppliers.FirstOrDefaultAsync(s=> s.Name == dto.Name && s.Address == dto.Address && s.TaxNumber==dto.TaxNumber);

        if (mevcut != null)
        {
            return BadRequest("Bu isim, adres ve vergi numarasına sahip bir tedarikçi zaten var.");
        }

        var supplier = new Supplier
        {
            Name = dto.Name,
            ContactName = dto.ContactName,
            ContactEmail = dto.ContactEmail,
            ContactPhone = dto.ContactPhone,
            Address = dto.Address,
            TaxNumber = dto.TaxNumber
        };

        _context.Suppliers.Add(supplier);
        await _context.SaveChangesAsync();
        return Ok(new stok_takip.DTOs.SupplierResponseDto(supplier.Id, supplier.Name, supplier.ContactName, supplier.ContactEmail, supplier.ContactPhone, supplier.Address, supplier.TaxNumber, supplier.CreatedAt));
    }

    // PUT mevcut tedarikçiyi güncelleme
    [HttpPut("{id}")]
    [RequirePermission(Policies.RequireSupplierWrite)]
    [EnableRateLimiting(Policies.RequireSupplierWrite)]

    public async Task<IActionResult> Update(int id, CreateSupplierDto dto)
    {
        var supplier = await _context.Suppliers.FindAsync(id);
        if(supplier == null)
            return NotFound();

        supplier.Name = dto.Name;
        supplier.ContactName = dto.ContactName;
        supplier.ContactEmail = dto.ContactEmail;
        supplier.ContactPhone = dto.ContactPhone;
        supplier.Address = dto.Address;
        supplier.TaxNumber = dto.TaxNumber;

        await _context.SaveChangesAsync();
        return Ok(new SupplierResponseDto(supplier.Id, supplier.Name, supplier.ContactName, supplier.ContactEmail, supplier.ContactPhone, supplier.Address, supplier.TaxNumber, supplier.CreatedAt));
    }

    // DELETE tedarikçiyi silme
    [HttpDelete("{id}")]
    [RequirePermission(Policies.RequireSupplierWrite)]
    [EnableRateLimiting(Policies.RequireSupplierWrite)] 
    public async Task<IActionResult> Delete(int id)
    {
        var supplier = await _context.Suppliers.FindAsync(id);
        if(supplier == null)
            return NotFound();
        
        supplier.IsDeleted = true;
        await _context.SaveChangesAsync();
        return NoContent();
    }
    
}
