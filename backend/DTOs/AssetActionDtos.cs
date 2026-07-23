    using System.ComponentModel.DataAnnotations;

    namespace stok_takip.DTOs;

    public class ReturnAssetDto
    {
        public string? Notes { get; set; }
    }

    public class ReportBreakdownDto
    {
        [Required(ErrorMessage = "Arıza açıklaması zorunludur.")]
        public string Description { get; set; } = string.Empty;
    }

    public class ResolveBreakdownDto
    {
        [Required(ErrorMessage = "Çözüm açıklaması zorunludur.")]
        public string Solution { get; set; } = string.Empty;
    }

    public class LogMaintenanceDto
    {
        [Required(ErrorMessage = "Yapılan bakımın detayı zorunludur.")]
        public string Details { get; set; } = string.Empty;

        // Gelecek bakım tarihini planlamak için
        public DateTime? NextMaintenanceDate { get; set; }
    }