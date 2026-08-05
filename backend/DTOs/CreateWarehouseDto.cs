using System.ComponentModel.DataAnnotations;

namespace stok_takip.DTOs;

public class CreateWarehouseDto
{
    [Required(ErrorMessage = "Depo adı boş bırakılamaz.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Depo adı en az 2, en fazla 100 karakter olabilir.")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Depo adresi boş bırakılamaz.")]
    [StringLength(250, MinimumLength = 5, ErrorMessage = "Adres en az 5, en fazla 250 karakter olabilir.")]
    public string Address { get; set; } = string.Empty;

}
