 using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using stok_takip.Data;
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
            .Select(s => new stok_takip.DTOs.SupplierResponseDto(s.Id, s.Name, s.ContactName, s.ContactEmail, s.ContactPhone, s.Address))
            .ToListAsync();
        return Ok(suppliers);
    }

    // Yeni Tedarikçi Ekle
    [HttpPost]
    [Authorize(Roles = "admin")] 
    public async Task<IActionResult> Create([FromBody] stok_takip.DTOs.CreateSupplierDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Tedarikçi adı boş olamaz." });

        var supplier = new Supplier
        {
            Name = dto.Name,
            ContactName = dto.ContactName,
            ContactEmail = dto.ContactEmail,
            ContactPhone = dto.ContactPhone,
            Address = dto.Address
        };

        _context.Suppliers.Add(supplier);
        await _context.SaveChangesAsync();
        return Ok(new stok_takip.DTOs.SupplierResponseDto(supplier.Id, supplier.Name, supplier.ContactName, supplier.ContactEmail, supplier.ContactPhone, supplier.Address));
    }
}
