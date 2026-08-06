using System.ComponentModel.DataAnnotations;

namespace stok_takip.DTOs;

public class CreateAppRoleDto
{
    [Required(ErrorMessage = "Rol adı boş bırakılamaz.")]
    [StringLength(50, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }
    [Range(0, 1000)]
    public int Level { get; set; } = 100;
    public List<int> PermissionIds { get; set; } = new();
}

public class UpdateAppRoleDto
{
    [Required(ErrorMessage = "Rol adı boş bırakılamaz.")]
    [StringLength(50, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }
    [Range(0, 1000)]
    public int Level { get; set; } = 100;
    public List<int> PermissionIds { get; set; } = new();
}

public class AppRoleResponseDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsSystemRole { get; set; }
    public int Level { get; set; }
    public int UserCount { get; set; }
    public List<int> PermissionIds { get; set; } = new();
}
