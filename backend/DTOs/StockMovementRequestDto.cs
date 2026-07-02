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
    }
}