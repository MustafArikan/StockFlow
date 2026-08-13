using System.ComponentModel.DataAnnotations;

namespace stok_takip.Models;

public class ProductBatch : BaseEntity
{
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;

    [Required, MaxLength(50)]
    public string LotNumber { get; set; } = string.Empty;

    public DateOnly? ManufactureDate { get; set; }
    public DateOnly? ExpiryDate { get; set; }

    public bool IsActive { get; set; } = true;
}
