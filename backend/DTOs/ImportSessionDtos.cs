using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace stok_takip.DTOs
{
    public class ImportCommitDto
    {
        [Required] public Guid SessionId { get; set; }
        [Required] public Dictionary<string, string> ColumnMapping { get; set; } = new();
        public Dictionary<string, Dictionary<string, string>> ValueMappings { get; set; } = new();
        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "Geçerli bir hedef raf seçilmelidir.")]
        public int TargetLocationId { get; set; }
    }
}
