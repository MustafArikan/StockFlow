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
}
