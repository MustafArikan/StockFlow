using System.ComponentModel.DataAnnotations;

namespace stok_takip.DTOs;

public class AssignAssetDto
{
    [Required(ErrorMessage = "Zimmetlenecek kullanıcının ID'si zorunludur.")]
    public int UserId { get; set; }

    public string? Notes { get; set; }
}