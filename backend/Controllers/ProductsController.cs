using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using stok_takip.Data;
using stok_takip.DTOs;
using stok_takip.Models;
using System.Security.Claims;
using ClosedXML.Excel; // Excel kütüphanesi

namespace stok_takip.Controllers;

[ApiController]
[Route("api/products")]
[Authorize] // Tüm eylemler için yetkilendirme gerektirir
public class ProductsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ProductsController(AppDbContext context)
    {
        _context = context;
    }
    
    // GET /api/products : tüm ürünleri listele
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
    {
        var totalRecords = await _context.Products.CountAsync(p => !p.IsDeleted);

        var productsRaw = await _context.Products
            .AsNoTracking()
            .Where(p => !p.IsDeleted)
            .Include(p => p.Category)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new 
            {
                Id = p.Id,
                Name = p.Name,
                Barcode = p.Barcode,
                MinStockLevel = p.MinStockLevel,
                CategoryId = p.CategoryId,
                CategoryName = p.Category.Name,
                StockQuantity = p.StockLevels.Sum(sl => sl.Quantity),
                AttributesStr = p.Attributes
            })
            .ToListAsync();

        var products = productsRaw.Select(p => new ProductDto
        {
            Id = p.Id,
            Name = p.Name,
            Barcode = p.Barcode,
            MinStockLevel = p.MinStockLevel,
            CategoryId = p.CategoryId,
            CategoryName = p.CategoryName,
            StockQuantity = p.StockQuantity,
            Attributes = string.IsNullOrEmpty(p.AttributesStr) ? new List<ProductAttributeDto>() : System.Text.Json.JsonSerializer.Deserialize<List<ProductAttributeDto>>(p.AttributesStr)
        }).ToList();

        return Ok(new 
        {
            items = products,
            totalRecords = totalRecords,
            currentPage = pageNumber,
            totalPages = (int)Math.Ceiling((double)totalRecords / pageSize)
        });
    }

    //GET / api/products/5 : tek bir ürünü getir
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null)
            return NotFound();
        return Ok(new ProductResponseDto(product.Id, product.Name, product.Barcode, product.MinStockLevel, product.CategoryId, product.Attributes));
    }

    [HttpPost]
    [Authorize(Roles = "admin")] 
    public async Task<IActionResult> Create(CreateProductDto dto)
    {
        var mevcutUrun = await _context.Products.FirstOrDefaultAsync(p => p.Name == dto.Name || p.Barcode == dto.Barcode);
        if (mevcutUrun != null)
        {
            return BadRequest(new { message = "Bu isim veya barkoda sahip bir ürün zaten var." });
        }

        var categoryExists = await _context.Categories.AnyAsync(c => c.Id == dto.CategoryId);
        if (!categoryExists) 
            return BadRequest(new { message = "Belirtilen kategori bulunamadı." });

        var locationExists = await _context.Locations.AnyAsync(l => l.Id == dto.TargetLocationId);
        if (!locationExists) 
            return BadRequest(new { message = "Belirtilen raf/lokasyon bulunamadı." });

        var product = new Product {
            Name = dto.Name,
            Barcode = dto.Barcode,
            MinStockLevel = dto.MinStockLevel,
            CategoryId = dto.CategoryId,
            Attributes = dto.Attributes != null ? System.Text.Json.JsonSerializer.Serialize(dto.Attributes) : "[]"
        };
        _context.Products.Add(product);
        await _context.SaveChangesAsync(); // Önce ürünü kaydet ki ID oluşsun

        // 🎯 İlk Stoğu Oluştur (StockLevel tablosuna)
        var initialStock = new StockLevel {
            ProductId = product.Id,
            LocationId = dto.TargetLocationId,
            Quantity = dto.InitialQuantity
        };
        _context.StockLevels.Add(initialStock);
        
        // 🎯 İlk Stok Girişi Hareketi (StockMovement) Oluştur
        if (dto.InitialQuantity > 0)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int? currentUserId = null;
            if (!string.IsNullOrEmpty(userIdClaim) && int.TryParse(userIdClaim, out int parsedId))
            {
                currentUserId = parsedId;
            }

            var movement = new StockMovement
            {
                ProductId = product.Id,
                UserId = currentUserId,
                MovementType = "IN",
                Quantity = dto.InitialQuantity,
                Description = "Ürün ekleme ile başlangıç stoğu girişi"
            };
            _context.StockMovements.Add(movement);
        }

        await _context.SaveChangesAsync();

        return Ok(new ProductResponseDto(product.Id, product.Name, product.Barcode, product.MinStockLevel, product.CategoryId, product.Attributes));
    }

    // =========================================================================
    // 🎯 YENİ EKLENEN TOPLU İÇE AKTARMA (EXCEL) - YENİ DTO DOSYASI GEREKTİRMEZ
    // =========================================================================
    [HttpPost("import")]
    [Authorize] 
    public async Task<IActionResult> ImportExcel(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Geçerli bir dosya yükleyin." });

        if (!file.FileName.EndsWith(".xlsx"))
            return BadRequest(new { message = "Sadece .xlsx formatında dosyalar desteklenmektedir." });

        // Yeni DTO dosyası açmamak için değişkenleri burada tutuyoruz
        int totalRows = 0;
        int successCount = 0;
        int errorCount = 0;
        var errorsList = new List<object>();
        
        var existingBarcodes = new HashSet<string>(await _context.Products.Where(p => !p.IsDeleted).Select(p => p.Barcode).ToListAsync());
        var validCategories = await _context.Categories.ToDictionaryAsync(c => c.Name.ToLower(), c => c.Id);
        
        var newProducts = new List<Product>();
        
        using (var stream = new MemoryStream())
        {
            await file.CopyToAsync(stream);
            using (var workbook = new XLWorkbook(stream))
            {
                var worksheet = workbook.Worksheet(1); 
                var rows = worksheet.RangeUsed().RowsUsed().Skip(1); 

                int rowIndex = 2; 
                foreach (var row in rows)
                {
                    totalRows++;
                    var name = row.Cell(1).GetString().Trim();
                    var barcode = row.Cell(2).GetString().Trim();
                    var minStockStr = row.Cell(3).GetString().Trim();
                    var categoryName = row.Cell(4).GetString().Trim();

                    var rowErrors = new List<string>();

                    if (string.IsNullOrEmpty(name)) rowErrors.Add("Ürün adı boş olamaz.");
                    if (string.IsNullOrEmpty(barcode)) rowErrors.Add("Barkod boş olamaz.");
                    
                    if (existingBarcodes.Contains(barcode) || newProducts.Any(p => p.Barcode == barcode))
                        rowErrors.Add($"'{barcode}' barkodu sistemde veya excel içinde mükerrer.");

                    int categoryId = 0;
                    if (!validCategories.TryGetValue(categoryName.ToLower(), out categoryId))
                        rowErrors.Add($"'{categoryName}' adlı kategori sistemde tanımsız.");

                    if (!int.TryParse(minStockStr, out int minStock))
                        rowErrors.Add("Kritik stok seviyesi tam sayı olmalıdır.");

                    if (rowErrors.Any())
                    {
                        errorCount++;
                        errorsList.Add(new { RowNumber = rowIndex, Errors = rowErrors });
                    }
                    else
                    {
                        newProducts.Add(new Product 
                        { 
                            Name = name, 
                            Barcode = barcode, 
                            MinStockLevel = minStock, 
                            CategoryId = categoryId,
                            Attributes = "[]" 
                        });
                        successCount++;
                    }
                    rowIndex++;
                }
            }
        }

        if (newProducts.Any())
        {
            await _context.Products.AddRangeAsync(newProducts);
            await _context.SaveChangesAsync();
        }

        // Frontend'in okuyabileceği formatta DTO olmadan dinamik nesne dönüyoruz
        return Ok(new {
            TotalRows = totalRows,
            SuccessCount = successCount,
            ErrorCount = errorCount,
            Errors = errorsList
        });
    }

    // PUT /api/products/5 : mecvut ürünü güncelle 
    [HttpPut("{id}")]
    [Authorize(Roles = "admin")] 
    public async Task<IActionResult> Update(int id, UpdateProductDto dto)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null || product.IsDeleted)
            return NotFound();

        var mevcut = await _context.Products.FirstOrDefaultAsync(p => (p.Name == dto.Name || p.Barcode == dto.Barcode) && p.Id != id && !p.IsDeleted);
        if (mevcut != null)
        {
            return BadRequest("Bu isim veya barkoda sahip bir ürün zaten var.");
        }

        product.Name = dto.Name;
        product.Barcode = dto.Barcode;
        product.MinStockLevel = dto.MinStockLevel;
        product.CategoryId = dto.CategoryId;
        product.Attributes = dto.Attributes != null ? System.Text.Json.JsonSerializer.Serialize(dto.Attributes) : "[]";

        await _context.SaveChangesAsync();

        // 🎯 Kritik Stok Kontrolü (Limit güncellendiğinde geriye dönük tarama yapar)
        var totalStock = await _context.StockLevels
            .Where(sl => sl.ProductId == product.Id && !sl.IsDeleted)
            .SumAsync(sl => (int?)sl.Quantity) ?? 0;

        if (totalStock <= product.MinStockLevel)
        {
            double percentage = product.MinStockLevel > 0 ? ((double)totalStock / product.MinStockLevel) * 100 : 0;
            string severity = "INFO";
            string msg = $"Bilgi: {product.Name} (Barkod: {product.Barcode}) kritik stok sınırında. (Mevcut: {totalStock})";

            if (totalStock == 0)
            {
                severity = "EMPTY_STOCK";
                msg = $"DİKKAT: {product.Name} (Barkod: {product.Barcode}) tamamen tükendi!";
            }
            else if (percentage < 20)
            {
                severity = "DANGER";
                msg = $"Çok Kritik: {product.Name} (Barkod: {product.Barcode}) stok seviyesi %20'nin altına indi! (Mevcut: {totalStock})";
            }
            else if (percentage <= 50)
            {
                severity = "CRITICAL";
                msg = $"Kritik: {product.Name} (Barkod: {product.Barcode}) stok seviyesi %50'nin altına indi! (Mevcut: {totalStock})";
            }
            else if (percentage <= 80)
            {
                severity = "WARNING";
                msg = $"Ön Uyarı: {product.Name} (Barkod: {product.Barcode}) stok seviyesi %80'in altına indi. (Mevcut: {totalStock})";
            }

            // Aynı ürün ve aynı zorluk seviyesi için okunmamış bir bildirim zaten varsa spamlama yapma
            var existingUnread = await _context.Notifications
                .AnyAsync(n => n.Type == "CRITICAL_STOCK" && !n.IsRead && n.Message.Contains(product.Barcode) && n.Severity == severity && !n.IsDeleted);
            
            if (!existingUnread)
            {
                var notification = new Notification
                {
                    Message = msg,
                    Type = "CRITICAL_STOCK",
                    Severity = severity,
                    IsRead = false
                };
                _context.Notifications.Add(notification);
                await _context.SaveChangesAsync();
            }
        }

        return Ok(new ProductResponseDto(product.Id, product.Name, product.Barcode, product.MinStockLevel, product.CategoryId, product.Attributes));
    } 

    // DELETE /api/products/5 : ürünü sil
    [HttpDelete("{id}")]
    [Authorize(Roles = "admin")] 
    public async Task<IActionResult> Delete(int id)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null || product.IsDeleted)
            return NotFound();

        product.IsDeleted = true; // Soft delete

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("search")]
    public async Task<IActionResult> SearchProducts([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
        {
            return Ok(new List<object>()); // Boş veya kısa sorgular için boş liste döndür
        }

        var searchTerm = q.ToLower();

        var products = await _context.Products
            .AsNoTracking()
            .Where(p => !p.IsDeleted && 
                        (p.Name.ToLower().Contains(searchTerm) || 
                        p.Barcode.ToLower().Contains(searchTerm) ||
                        (p.Attributes != null && p.Attributes.ToLower().Contains(searchTerm))))
            .Take(5)
            .Select(p => new 
            {
                id = p.Id,
                name = p.Name,
                barcode = p.Barcode
            })
            .ToListAsync();    

        return Ok(products);    
    }
}