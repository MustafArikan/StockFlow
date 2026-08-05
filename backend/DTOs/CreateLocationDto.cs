using System.ComponentModel.DataAnnotations;

namespace stok_takip.DTOs;

public class CreateLocationDto
{
    [Required(ErrorMessage = "Raf kodu boş bırakılamaz.")]
    [StringLength(50, MinimumLength = 1, ErrorMessage = "Raf kodu en fazla 50 karakter olabilir.")]
    public string Code { get; set; } = string.Empty;

    [Range(1, int.MaxValue, ErrorMessage = "Geçerli bir depo seçilmelidir.")]
    public int WarehouseId { get; set; }
}