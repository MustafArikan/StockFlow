using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using stok_takip.Data;
using stok_takip.Models;
using stok_takip.Services;
using stok_takip.Attributes;
using stok_takip.Constants;

namespace stok_takip.Controllers;

[ApiController]
[Route("api/pallets")]
[Authorize]
public class PalletShipmentsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _config;
    public PalletShipmentsController(AppDbContext context, IConfiguration config)
    { _context = context; _config = config; }

    public class CreatePalletDto
    {
        public int? SourceWarehouseId { get; set; }
        public string? Description { get; set; }
    }

    [RequirePermission(Policies.RequireProductWrite)]
    [HttpPost]
    public async Task<IActionResult> Create(CreatePalletDto dto)
    {
        var companyPrefix = _config["Gs1Settings:CompanyPrefix"]
            ?? throw new InvalidOperationException("GS1 şirket prefiksi tanımlı değil.");

        int serialLength = 16 - companyPrefix.Length;
        var serial = (await _context.PalletShipments.CountAsync() + 1).ToString().PadLeft(serialLength, '0');
        var extensionDigit = "1";
        var body = extensionDigit + companyPrefix + serial;
        var checkDigit = Gs1CheckDigitCalculator.Calculate(body);
        var sscc = body + checkDigit;

        var pallet = new PalletShipment { Sscc = sscc, SourceWarehouseId = dto.SourceWarehouseId, Description = dto.Description };
        _context.PalletShipments.Add(pallet);
        await _context.SaveChangesAsync();

        return Ok(new { id = pallet.Id, sscc = pallet.Sscc });
    }

    public class AddContentDto { public int ProductId { get; set; } public int? BatchId { get; set; } public decimal Quantity { get; set; } }

    [RequirePermission(Policies.RequireProductWrite)]
    [HttpPost("{id}/contents")]
    public async Task<IActionResult> AddContent(int id, AddContentDto dto)
    {
        var pallet = await _context.PalletShipments.FindAsync(id);
        if (pallet == null) return NotFound();

        _context.PalletContents.Add(new PalletContent
        {
            PalletShipmentId = id, ProductId = dto.ProductId, BatchId = dto.BatchId, Quantity = dto.Quantity
        });
        await _context.SaveChangesAsync();
        return Ok(new { message = "Palet içeriğine eklendi." });
    }
    [RequirePermission(Policies.RequireProductRead)]
    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] int page = 1, [FromQuery] int pageSize = 50, [FromQuery] string search = "")
    {
        var query = _context.PalletShipments.AsQueryable();
        if (!string.IsNullOrEmpty(search))
        {
            query = query.Where(p => p.Sscc.Contains(search) || (p.Description != null && p.Description.Contains(search)));
        }

        var totalCount = await query.CountAsync();
        var items = await query
            .Include(p => p.SourceWarehouse)
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new
            {
                p.Id,
                p.Sscc,
                p.Description,
                Warehouse = p.SourceWarehouse != null ? p.SourceWarehouse.Name : "-",
                p.CreatedAt
            })
            .ToListAsync();

        return Ok(new { items, totalCount, page, pageSize, totalPages = (int)Math.Ceiling(totalCount / (double)pageSize) });
    }

    [RequirePermission(Policies.RequireProductRead)]
    [HttpGet("by-sscc/{sscc}")]
    public async Task<IActionResult> GetBySscc(string sscc)
    {
        var pallet = await _context.PalletShipments
            .Include(p => p.Contents)
                .ThenInclude(c => c.Product)
            .Include(p => p.Contents)
                .ThenInclude(c => c.Batch)
            .Include(p => p.SourceWarehouse)
            .FirstOrDefaultAsync(p => p.Sscc == sscc);

        if (pallet == null) return NotFound(new { message = "Palet bulunamadı." });

        return Ok(new
        {
            pallet.Id,
            pallet.Sscc,
            pallet.Description,
            Warehouse = pallet.SourceWarehouse?.Name,
            Contents = pallet.Contents.Select(c => new
            {
                c.Id,
                ProductId = c.ProductId,
                ProductName = c.Product.Name,
                ProductCode = c.Product.Barcode,
                BatchNumber = c.Batch?.LotNumber,
                c.Quantity
            })
        });
    }

    [RequirePermission(Policies.RequireProductRead)]
    [HttpGet("by-barcode/{barcode}")]
    public async Task<IActionResult> GetByBarcode(string barcode)
    {
        var conversion = await _context.ProductUnitConversions
            .Include(c => c.Product)
            .Include(c => c.AlternativeUnit)
            .FirstOrDefaultAsync(c => c.Barcode == barcode && !c.IsDeleted);

        if (conversion == null) return NotFound(new { message = "Palet barkodu bulunamadı." });

        return Ok(new
        {
            Id = 0,
            Sscc = conversion.Barcode,
            Description = $"Ürün Paketleme ({conversion.AlternativeUnit.Name})",
            Warehouse = "Genel Ürün",
            Contents = new[]
            {
                new {
                    Id = 0,
                    ProductId = conversion.ProductId,
                    ProductName = conversion.Product.Name,
                    ProductCode = conversion.Product.Barcode,
                    BatchNumber = "-",
                    Quantity = conversion.ConversionFactor
                }
            }
        });
    }
}
