using System.ComponentModel.DataAnnotations;

namespace stok_takip.DTOs
{
    public class StockMovementRequestDto
    {
        [Required, StringLength(50)]
        [RegularExpression(@"^[a-zA-Z0-9-]+$")]
        public string ProductBarcode { get; set; } = string.Empty; // Örn: "VGA-4090"
        
        [Required]
        [Range(typeof(decimal), "0.001", "100000", ErrorMessage = "Miktar 0'dan büyük ve 100.000'den küçük olmalıdır.")]
        public decimal Quantity { get; set; }

        [Required]
        [RegularExpression("^(IN|OUT|TRANSFER)$", ErrorMessage = "Hareket tipi IN, OUT veya TRANSFER olmalıdır.")]
        public string MovementType { get; set; } = string.Empty; // "IN", "OUT", "TRANSFER"
        
        [StringLength(500)]
        public string? Description { get; set; }
        
        [Range(1, int.MaxValue, ErrorMessage = "Geçerli bir kaynak raf seçilmelidir.")]
        public int? SourceLocationId { get; set; }
        
        [Range(1, int.MaxValue, ErrorMessage = "Geçerli bir hedef raf seçilmelidir.")]
        public int? TargetLocationId { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Birim fiyat negatif olamaz.")]
        public decimal UnitPrice { get; set; } = 0;

        public int? InputUnitId { get; set; }
        

        public int? SupplierId { get; set; }

        [MaxLength(200)]
        public string? Destination { get; set; }

        [MaxLength(100)]
        public string? DocumentNumber { get; set; } // Fatura veya irsaliye no
    }
}