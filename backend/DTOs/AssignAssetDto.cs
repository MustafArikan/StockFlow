using System.ComponentModel.DataAnnotations;

namespace stok_takip.DTOs;

public class AssignAssetDto
{
    [Required(ErrorMessage = "Atanacak kullanıcının ID'si zorunludur.")]
    [Range(1, int.MaxValue, ErrorMessage = "Geçerli bir kullanıcı ID'si seçilmelidir.")]
    public int UserId { get; set; }

    [MaxLength(500, ErrorMessage = "Not alanı en fazla 500 karakter olmalıdır.")]
    public string? Notes { get; set; }
}