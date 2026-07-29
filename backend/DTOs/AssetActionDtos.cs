using System.ComponentModel.DataAnnotations;

namespace stok_takip.DTOs;

public class ReturnAssetDto
{
    [MaxLength(500, ErrorMessage = "Not alanı en fazla 500 karakter olmalıdır.")]
    public string? Notes { get; set; }
}

public class ReportBreakdownDto
{
    [Required(ErrorMessage = "Arıza açıklaması zorunludur.")]
    [MaxLength(1000, ErrorMessage = "Arıza açıklaması en fazla 1000 karakter olmalıdır.")]
    public string Description { get; set; } = string.Empty;
}

public class ResolveBreakdownDto
{
    [Required(ErrorMessage = "Çözüm açıklaması zorunludur.")]
    [MaxLength(1000, ErrorMessage = "Çözüm açıklaması en fazla 1000 karakter olmalıdır.")]
    public string Solution { get; set; } = string.Empty;
}

public class LogMaintenanceDto
{
    [Required(ErrorMessage = "Yapılan bakımın detayı zorunludur.")]
    [MaxLength(1000, ErrorMessage = "Bakım detayları en fazla 1000 karakter olmalıdır.")]
    public string Details { get; set; } = string.Empty;

    // Gelecek bakım tarihini planlamak için
    public DateTime? NextMaintenanceDate { get; set; }
}