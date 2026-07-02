using System.Reflection.Metadata.Ecma335;
using System.Xml;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using stok_takip.Data;
using stok_takip.DTOs;
using stok_takip.Models;

namespace stok_takip.Controllers;

[ApiController]
[Route("api/warehouses")]
public class WarehousesController : ControllerBase
{
    private readonly AppDbContext _context;

    public WarehousesController(AppDbContext context)
    {
        _context = context;
    }

    // GET /api/warehouses tüm depoları listeleme
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var warehouses = await _context.Warehouses.ToListAsync();
        return Ok(warehouses);
    }

    // GET /api/warehouses/5 tek bir depoyu getir
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var warehouse = await _context.Warehouses.FindAsync(id);
        if(warehouse == null)
            return NotFound();
        return Ok(warehouse);
    }

    // POST /api/warehouses yeni depo ekleme
    [HttpPost]
    public async Task<IActionResult> Create(CreateWarehouseDto dto)
    {
        var warehouse = new Warehouse
        {
            Name = dto.Name,
            Address = dto.Address
        };

        _context.Warehouses.Add(warehouse);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new{id = warehouse.Id}, warehouse);
    }

    //PUT /api/warehouse/5 mecvut depoyu güncelleme
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, CreateWarehouseDto dto)
    {
        var warehouse = await _context.Warehouses.FindAsync(id);
        if(warehouse == null)
            return NotFound();

        warehouse.Name = dto.Name;
        warehouse.Address = dto.Address;

        await _context.SaveChangesAsync();
        return Ok(warehouse);
    }

    //DELETE /api/warehouses/5 ürünü slime
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var warehouse = await _context.Warehouses.FindAsync(id);
        if(warehouse == null)
            return NotFound();

        _context.Warehouses.Remove(warehouse);
        await _context.SaveChangesAsync();
        return NoContent();
    }



}