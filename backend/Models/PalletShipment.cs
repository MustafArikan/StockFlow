using System.ComponentModel.DataAnnotations;

namespace stok_takip.Models;

public class PalletShipment : BaseEntity
{
    [Required, MaxLength(20)]
    public string Sscc { get; set; } = string.Empty;

    public int? SourceWarehouseId { get; set; }
    public Warehouse? SourceWarehouse { get; set; }

    [MaxLength(200)]
    public string? Description { get; set; }

    public ICollection<PalletContent> Contents { get; set; } = new List<PalletContent>();
}
