using System.ComponentModel.DataAnnotations;
namespace stok_takip.DTOs;

public class CreateCategoryDto
{
    [Required(ErrorMessage = "Kategori adı boş bırakılamaz.")]
    [StringLength(50, MinimumLength = 2, ErrorMessage = "Kategori adı en az 2, en fazla 50 karakter olabilir.")]
    public string Name {get; set;} = string.Empty;
    public int? ParentId{get; set;}
}