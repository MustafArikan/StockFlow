using System.ComponentModel.DataAnnotations.Schema;

namespace stok_takip.Models;

public class PalletContent : BaseEntity
{
    public int PalletShipmentId { get; set; }
    public PalletShipment PalletShipment { get; set; } = null!;

    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;

    public int? BatchId { get; set; }
    public ProductBatch? Batch { get; set; }

    [Column(TypeName = "decimal(18,3)")]
    public decimal Quantity { get; set; }
}
