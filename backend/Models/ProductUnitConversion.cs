using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace stok_takip.Models;

public class ProductUnitConversion : BaseEntity
{
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;

    public int AlternativeUnitId { get; set; }
    public Unit AlternativeUnit { get; set; } = null!;

    [MaxLength(30)]
    public string? Barcode { get; set; }
    public BarcodeType BarcodeType { get; set; } = BarcodeType.Unknown;

    [Column(TypeName = "decimal(18,4)")]
    public decimal ConversionFactor { get; set; }

    public bool IsDefault { get; set; } = false;
}
