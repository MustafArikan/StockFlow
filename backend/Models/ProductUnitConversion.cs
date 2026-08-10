using System.ComponentModel.DataAnnotations.Schema;

namespace stok_takip.Models;

public class ProductUnitConversion : BaseEntity
{
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;

    public int AlternativeUnitId { get; set; }
    public Unit AlternativeUnit { get; set; } = null!;

    [Column(TypeName = "decimal(18,4)")]
    public decimal ConversionFactor { get; set; }

    public bool IsDefault { get; set; } = false;
}
