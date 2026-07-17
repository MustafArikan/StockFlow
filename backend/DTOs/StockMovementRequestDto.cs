using System.ComponentModel.DataAnnotations;

namespace stok_takip.DTOs
{
    public class StockMovementRequestDto
    {
        [Required]
        public string ProductBarcode { get; set; } = string.Empty; // Örn: "VGA-4090"
        
        [Required]
        [Range(1, 100000)]
        public int Quantity { get; set; }

        [Required]
        public string MovementType { get; set; } = string.Empty; // "IN", "OUT", "TRANSFER"
        
        public string? Description { get; set; }
        
        public int? SourceLocationId { get; set; }
        public int? TargetLocationId { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Birim fiyat negatif olamaz.")]
        public decimal UnitPrice { get; set; } = 0;

        public int? SupplierId { get; set; }

        [MaxLength(200)]
        public string? Destination { get; set; }

        [MaxLength(100)]
        public string? DocumentNumber { get; set; } // Fatura veya irsaliye no
    }
}