using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

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
    [StringLength(250)]
    public string Description { get; set; } = string.Empty;

    [Range(1, 100000, ErrorMessage = "İzin verilen istek sayısı 1 ile 100000 arasında olmalıdır.")]
    public int PermitLimit { get; set; }

    [Range(1, 86400, ErrorMessage = "Zaman penceresi 1 saniye ile 24 saat (86400 sn) arasında olmalıdır.")]
    public int WindowSeconds { get; set; }
    public List<int> PermissionIds { get; set; } = new List<int>();
}
