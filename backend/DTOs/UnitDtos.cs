using System.ComponentModel.DataAnnotations;

namespace stok_takip.DTOs;

public class UnitDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ShortCode { get; set; } = string.Empty;
    public bool AllowsDecimal { get; set; }
    public bool IsActive { get; set; }
    public bool IsSystemUnit { get; set; }
}

public class CreateUnitDto
{
    [Required(ErrorMessage = "Birim adı boş bırakılamaz.")]
    [StringLength(50, MinimumLength = 2, ErrorMessage = "Birim adı en az 2, en fazla 50 karakter olabilir.")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Kısa kod boş bırakılamaz.")]
    [StringLength(10, MinimumLength = 1, ErrorMessage = "Kısa kod en fazla 10 karakter olabilir.")]
    [RegularExpression(@"^[A-Za-zÇĞİÖŞÜçğıöşü0-9²³]+$", ErrorMessage = "Kısa kod sadece harf/rakam içerebilir.")]
    public string ShortCode { get; set; } = string.Empty;

    public bool AllowsDecimal { get; set; } = false;
}

public class UpdateUnitDto : CreateUnitDto
{
    public bool IsActive { get; set; } = true;
}
