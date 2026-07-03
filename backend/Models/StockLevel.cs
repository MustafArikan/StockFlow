using System.ComponentModel.DataAnnotations;
namespace stok_takip.Models;

public class StockLevel : BaseEntity
{
    public int ProductId { get; set; }
    public int LocationId { get; set; }
    public int Quantity { get; set; }
    [Timestamp]
    public byte[] RowVersion { get; set; } = null!;
    public Product Product { get; set; } = null!;
    public Location Location { get; set; } = null!;
}