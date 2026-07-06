using System.ComponentModel.DataAnnotations;

namespace stok_takip.DTOs;

public class UpdateRoleDto
{
    [Required]
    [RegularExpression("^(admin|operator|viewer)$", ErrorMessage = "Rol sadece 'admin', 'operator' veya 'viewer' olabilir.")]
    public string Role { get; set;} = string.Empty;
}