using System.Collections.Generic;

namespace stok_takip.DTOs;

public class AppPolicyResponseDto
{
    public int Id { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int PermitLimit { get; set; }
    public int WindowSeconds { get; set; }
    public List<int> PermissionIds { get; set; } = new List<int>();
}

public class UpdateAppPolicyDto
{
    public string Description { get; set; } = string.Empty;
    public int PermitLimit { get; set; }
    public int WindowSeconds { get; set; }
    public List<int> PermissionIds { get; set; } = new List<int>();
}
