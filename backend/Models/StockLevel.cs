using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace stok_takip.Models;

public class StockLevel : BaseEntity
{
    public int ProductId { get; set; }
    public int LocationId { get; set; }
    public int? BatchId { get; set; }
    public ProductBatch? Batch { get; set; }
    [Column(TypeName = "decimal(18,3)")]
    public decimal Quantity { get; set; }
    [Timestamp]
    public byte[] RowVersion { get; set; } = null!;
    public Product Product { get; set; } = null!;
    public Location Location { get; set; } = null!;
}
