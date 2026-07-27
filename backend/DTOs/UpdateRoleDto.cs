using System.ComponentModel.DataAnnotations;

namespace stok_takip.DTOs;

public class UpdateRoleDto
{
    [Required]
    public int RoleId { get; set;}
}