using System;

namespace stok_takip.DTOs
{
    public class AssetListDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string? ProductName { get; set; }
        public string? SerialNumber { get; set; }
        public string? Status { get; set; }
        public string? AssignedToName { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}