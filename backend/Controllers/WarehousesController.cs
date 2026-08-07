using stok_takip.Constants;
using Microsoft.AspNetCore.Authorization;
using System.Reflection.Metadata.Ecma335;
using System.Xml;
using Microsoft.AspNetCore.Mvc;
using stok_takip.Attributes;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using stok_takip.Data;
using stok_takip.DTOs;
using stok_takip.Models;

namespace stok_takip.Controllers;

[ApiController]
[Route("api/warehouses")]
[Authorize] // Tüm eylemler için yetkilendirme gerektirir

public class WarehousesController : ControllerBase
{
    private readonly AppDbContext _context;

    public WarehousesController(AppDbContext context)
    {
        _context = context;
    }
    [RequirePermission(Policies.RequireWarehouseRead)]
    [HttpGet("{id}/stocks")]
    public async Task<IActionResult> GetWarehouseStocks(int id)
    {
        var stocks = await _context.StockLevels
            .Where(sl => sl.Location.WarehouseId == id && sl.Quantity > 0) // Sadece stoğu olan (0 olmayan) kayıtları getir
            .Select(sl => new 
            {
                Id = sl.ProductId,
                Name = sl.Product.Name,
                Barcode = sl.Product.Barcode,
                StockQuantity = sl.Quantity,
                GlobalStockQuantity = sl.Product.StockLevels.Sum(x => x.Quantity),
                MinStockLevel = sl.Product.MinStockLevel,
                LocationId = sl.LocationId, // Frontend'deki filtreleme için kritik!
                CategoryName = sl.Product.Category != null ? sl.Product.Category.Name : null
            })
            .ToListAsync();

        return Ok(stocks);
    }
    // GET /api/warehouses tüm depoları listeleme
    [RequirePermission(Policies.RequireWarehouseRead)]
    [HttpGet]
    [NormalizePagination]
    public async Task<IActionResult> GetAll([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
    {
        var query = _context.Warehouses.AsNoTracking();
        var totalRecords = await query.CountAsync();

        var warehouses = await query
            .OrderByDescending(w => w.Id)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new 
        {
            items = warehouses,
            totalRecords = totalRecords,
            currentPage = pageNumber,
            totalPages = (int)Math.Ceiling((double)totalRecords / pageSize)
        });
    }

    // GET /api/warehouses/5 tek bir depoyu getir
    [RequirePermission(Policies.RequireWarehouseRead)]
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var warehouse = await _context.Warehouses.FindAsync(id);
        if (warehouse == null)
            return NotFound();
        return Ok(new WarehouseResponseDto(warehouse.Id, warehouse.Name, warehouse.Address));
    }

    // POST /api/warehouses yeni depo ekleme
    [HttpPost]
    [RequirePermission(Policies.RequireWarehouseWrite)]
    [EnableRateLimiting(Policies.RequireWarehouseWrite)]
    public async Task<IActionResult> Create(CreateWarehouseDto dto)
    {
        var mevcut = await _context.Warehouses.FirstOrDefaultAsync(w=> w.Name == dto.Name && w.Address == dto.Address);

        if (mevcut != null)
        {
            return BadRequest(new { message = "Bu isim ve adrese sahip bir depo zaten var." });
        }


        var warehouse = new Warehouse
        {
            Name = dto.Name,
            Address = dto.Address
        };

        _context.Warehouses.Add(warehouse);
        await _context.SaveChangesAsync();

        return Ok(new WarehouseResponseDto(warehouse.Id, warehouse.Name, warehouse.Address));
    }

    //PUT /api/warehouse/5 mecvut depoyu güncelleme
    [HttpPut("{id}")]
    [RequirePermission(Policies.RequireWarehouseWrite)]
    [EnableRateLimiting(Policies.RequireWarehouseWrite)] // Sadece Admin rolüne sahip kullanıcılar depo güncelleyebilir
    public async Task<IActionResult> Update(int id, CreateWarehouseDto dto)
    {
        var warehouse = await _context.Warehouses.FindAsync(id);
        if(warehouse == null)
            return NotFound();

        var mevcut = await _context.Warehouses.FirstOrDefaultAsync(w => w.Name == dto.Name && w.Address == dto.Address && w.Id != id);
        if (mevcut != null)
        {
            return BadRequest(new { message = "Bu isim ve adrese sahip bir depo zaten var." });
        }

        warehouse.Name = dto.Name;
        warehouse.Address = dto.Address;

        await _context.SaveChangesAsync();
        return Ok(new WarehouseResponseDto(warehouse.Id, warehouse.Name, warehouse.Address));
    }

    //DELETE /api/warehouses/5 ürünü slime
    [HttpDelete("{id}")]
    [RequirePermission(Policies.RequireWarehouseWrite)]
    [EnableRateLimiting(Policies.RequireWarehouseWrite)] // Sadece Admin rolüne sahip kullanıcılar depo silebilir
    public async Task<IActionResult> Delete(int id)
    {
        var warehouse = await _context.Warehouses.FindAsync(id);
        if(warehouse == null)
            return NotFound();

        //Raf kontrolü
        var rafVarMi = await _context.Locations.AnyAsync(l => l.WarehouseId == id);
        if (rafVarMi)
        {
            return BadRequest(new { message = "Bu depoda raflar var. Önce onları silmelisiniz." });
        }

        warehouse.IsDeleted = true; // Soft delete
        await _context.SaveChangesAsync();
        return NoContent();
    }
    


}

