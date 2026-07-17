using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace stok_takip.Models;

public class StockMovement : BaseEntity
{
    public int ProductId { get; set; }
    public string MovementType { get; set; } = string.Empty; // IN, OUT, TRANSFER
    public int Quantity { get; set; }
    public string? Description { get; set; }
    public int? UserId { get; set; }
    public User? User { get; set; }
    public Product Product { get; set; } = null!;

    [Column(TypeName = "decimal(18,2)")]
    public decimal UnitPrice { get; set; } = 0; // Birim fiyat
    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalPrice { get; set; } = 0; // Toplam fiyat

    public int? SupplierId { get; set; }
    public Supplier? Supplier { get; set; }

    [MaxLength(200)]
    public string? Destination { get; set; }

    [MaxLength(100)]
    public string? DocumentNumber { get; set; } // Fatura veya irsaliye numarasý

}
