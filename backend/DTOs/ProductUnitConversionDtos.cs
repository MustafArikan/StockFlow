using System.ComponentModel.DataAnnotations;

namespace stok_takip.DTOs;

public class ProductUnitConversionDto
{
    public int Id { get; set; }
    public int AlternativeUnitId { get; set; }
    public string AlternativeUnitName { get; set; } = string.Empty;
    public string AlternativeUnitShortCode { get; set; } = string.Empty;
    public string? Barcode { get; set; }
    public string BarcodeType { get; set; } = string.Empty;
    public decimal ConversionFactor { get; set; }
    public bool IsDefault { get; set; }
}

public class CreateProductUnitConversionDto
{
    [Required, Range(1, int.MaxValue, ErrorMessage = "Geçerli bir alternatif birim seçilmelidir.")]
    public int AlternativeUnitId { get; set; }

    public string? Barcode { get; set; }

    [Required]
    [Range(typeof(decimal), "0.0001", "1000000", ErrorMessage = "Çevrim katsayısı 0'dan büyük olmalıdır.")]
    public decimal ConversionFactor { get; set; }

    public bool IsDefault { get; set; } = false;
}
