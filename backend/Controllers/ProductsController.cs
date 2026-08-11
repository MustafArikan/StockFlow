using stok_takip.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using stok_takip.Attributes;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using stok_takip.Data;
using stok_takip.DTOs;
using stok_takip.Models;
using System.Security.Claims;
using ClosedXML.Excel; // Excel kütüphanesi
using stok_takip.Services;

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
    [RequirePermission(Policies.RequireProductRead)]
    [HttpGet]
    [NormalizePagination]
    public async Task<IActionResult> GetAll([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
    {
        var totalRecords = await _context.Products.CountAsync(p => !p.IsDeleted);

        var productsRaw = await _context.Products
            .AsNoTracking()
            .Where(p => !p.IsDeleted)
            .Include(p => p.Category)
            .Include(p => p.Unit)
            .Include(p => p.ProductSuppliers).ThenInclude(ps => ps.Supplier)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new
            {
                Id = p.Id,
                Name = p.Name,
                Barcode = p.Barcode,
                BarcodeType = p.BarcodeType.ToString(),
                MinStockLevel = p.MinStockLevel,
                CategoryId = p.CategoryId,
                CategoryName = p.Category.Name,
                UnitId = p.UnitId,
                UnitName = p.Unit.Name,
                UnitShortCode = p.Unit.ShortCode,
                UnitAllowsDecimal = p.Unit.AllowsDecimal,
                StockQuantity = p.StockLevels.Sum(sl => sl.Quantity),
                AttributesStr = p.Attributes,
                Price = p.Price,
                ProductSuppliers = p.ProductSuppliers.Select(ps => new ProductSupplierResponseDto(
                    ps.Id, ps.SupplierId, ps.Supplier.Name, ps.PurchasePrice, ps.SupplierProductCode, ps.LeadTimeDays, ps.IsPreferred
                )).ToList(),
                UnitConversions = _context.ProductUnitConversions
                    .Where(c => c.ProductId == p.Id && !c.IsDeleted)
                    .Select(c => new ProductUnitConversionDto
                    {
                        Id = c.Id,
                        AlternativeUnitId = c.AlternativeUnitId,
                        AlternativeUnitName = c.AlternativeUnit.Name,
                        AlternativeUnitShortCode = c.AlternativeUnit.ShortCode,
                        Barcode = c.Barcode,
                        BarcodeType = c.BarcodeType.ToString(),
                        ConversionFactor = c.ConversionFactor,
                        IsDefault = c.IsDefault
                    }).ToList(),
                CreatedAt = p.CreatedAt
            })
            .ToListAsync();

        var products = productsRaw.Select(p => new ProductDto
        {
            Id = p.Id,
            Name = p.Name,
            Barcode = p.Barcode,
            BarcodeType = p.BarcodeType,
            MinStockLevel = p.MinStockLevel,
            CategoryId = p.CategoryId,
            CategoryName = p.CategoryName,
            UnitId = p.UnitId,
            UnitName = p.UnitName,
            UnitShortCode = p.UnitShortCode,
            UnitAllowsDecimal = p.UnitAllowsDecimal,
            StockQuantity = p.StockQuantity,
            Price = p.Price,
            ProductSuppliers = p.ProductSuppliers,
            UnitConversions = p.UnitConversions,
            CreatedAt = p.CreatedAt,
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
    [RequirePermission(Policies.RequireProductRead)]
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var product = await _context.Products
            .AsNoTracking()
            .Where(p => p.Id == id && !p.IsDeleted)
            .Select(p => new
            {
                Id = p.Id,
                Name = p.Name,
                Barcode = p.Barcode,
                BarcodeType = p.BarcodeType.ToString(),
                MinStockLevel = p.MinStockLevel,
                CategoryId = p.CategoryId,
                CategoryName = p.Category.Name,
                UnitId = p.UnitId,
                UnitName = p.Unit.Name,
                UnitShortCode = p.Unit.ShortCode,
                UnitAllowsDecimal = p.Unit.AllowsDecimal,
                StockQuantity = p.StockLevels.Sum(sl => sl.Quantity),
                AttributesStr = p.Attributes,
                UnitConversions = _context.ProductUnitConversions
                    .Where(c => c.ProductId == p.Id && !c.IsDeleted)
                    .Select(c => new ProductUnitConversionDto
                    {
                        Id = c.Id,
                        AlternativeUnitId = c.AlternativeUnitId,
                        AlternativeUnitName = c.AlternativeUnit.Name,
                        AlternativeUnitShortCode = c.AlternativeUnit.ShortCode,
                        Barcode = c.Barcode,
                        BarcodeType = c.BarcodeType.ToString(),
                        ConversionFactor = c.ConversionFactor,
                        IsDefault = c.IsDefault
                    }).ToList(),
                CreatedAt = p.CreatedAt
            }).FirstOrDefaultAsync();

        if (product == null)
            return NotFound();

        var dto = new ProductDto
        {
            Id = product.Id,
            Name = product.Name,
            Barcode = product.Barcode,
            BarcodeType = product.BarcodeType,
            MinStockLevel = product.MinStockLevel,
            CategoryId = product.CategoryId,
            CategoryName = product.CategoryName,
            UnitId = product.UnitId,
            UnitName = product.UnitName,
            UnitShortCode = product.UnitShortCode,
            UnitAllowsDecimal = product.UnitAllowsDecimal,
            StockQuantity = product.StockQuantity,
            UnitConversions = product.UnitConversions,
            CreatedAt = product.CreatedAt,
            Attributes = string.IsNullOrEmpty(product.AttributesStr)
                ? new List<ProductAttributeDto>()
                : System.Text.Json.JsonSerializer.Deserialize<List<ProductAttributeDto>>(product.AttributesStr)
        };

        return Ok(dto);

    }

    [HttpPost]
    [RequirePermission(Policies.RequireProductWrite)]
    [EnableRateLimiting(Policies.RequireProductWrite)]
    public async Task<IActionResult> Create(CreateProductDto dto)
    {
        var mevcutUrun = await _context.Products.FirstOrDefaultAsync(p => p.Barcode == dto.Barcode);
        if (mevcutUrun != null)
        {
            return BadRequest(new { message = "Bu barkoda sahip bir ürün zaten var." });
        }

        var detectedType = BarcodeTypeDetector.Detect(dto.Barcode);
        if (detectedType is BarcodeType.Gtin8_Ean8 or BarcodeType.Gtin12_UpcA or BarcodeType.Gtin13_Ean13 or BarcodeType.Gtin14_Itf14)
        {
            if (!Gs1CheckDigitCalculator.IsValid(dto.Barcode))
                return BadRequest(new { message = "Girilen barkodun kontrol hanesi hatalı görünüyor. Barkodu tekrar kontrol edin veya elle taratın." });
        }

        var categoryExists = await _context.Categories.AnyAsync(c => c.Id == dto.CategoryId);
        if (!categoryExists)
            return BadRequest(new { message = "Belirtilen kategori bulunamadı." });

        var locationExists = await _context.Locations.AnyAsync(l => l.Id == dto.TargetLocationId);
        if (!locationExists)
            return BadRequest(new { message = "Belirtilen raf/lokasyon bulunamadı." });

        var unit = await _context.Units.FirstOrDefaultAsync(u => u.Id == dto.UnitId && u.IsActive && !u.IsDeleted);
        if (unit == null)
            return BadRequest(new { message = "Belirtilen birim bulunamadı veya pasif durumda." });

        if (!stok_takip.Services.UnitValidationHelper.IsQuantityValidForUnit(dto.InitialQuantity, unit.AllowsDecimal))
            return BadRequest(new { message = $"{unit.Name} birimi ondalıklı miktar kabul etmez. Lütfen tam sayı girin." });

        if (dto.Attributes != null && dto.Attributes.Any())
        {
            var validationError = await ValidateAndNormalizeAttributesAsync(dto.Attributes, dto.CategoryId);
            if (validationError != null) return BadRequest(new { message = validationError });
        }

        var product = new Product
        {
            Name = dto.Name,
            Barcode = dto.Barcode,
            BarcodeType = detectedType,
            MinStockLevel = dto.MinStockLevel,
            CategoryId = dto.CategoryId,
            UnitId = dto.UnitId,
            Attributes = dto.Attributes != null ? System.Text.Json.JsonSerializer.Serialize(dto.Attributes) : "[]"
        };
        _context.Products.Add(product);
        try
        {
            await _context.SaveChangesAsync(); // Önce ürünü kaydet ki ID oluşsun
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "Bu barkoda sahip bir ürün zaten kaydedilmiş olabilir." });
        }

        // Çevrimleri Ekle (Eğer varsa)
        if (dto.UnitConversions != null && dto.UnitConversions.Any())
        {
            foreach (var conv in dto.UnitConversions)
            {
                if (conv.AlternativeUnitId == product.UnitId) continue;
                _context.ProductUnitConversions.Add(new ProductUnitConversion
                {
                    ProductId = product.Id,
                    AlternativeUnitId = conv.AlternativeUnitId,
                    ConversionFactor = conv.ConversionFactor,
                    IsDefault = conv.IsDefault
                });
            }
        }

        // 🎯 İlk Stoğu Oluştur (StockLevel tablosuna)
        var initialStock = new StockLevel
        {
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



    // PUT /api/products/5 : mecvut ürünü güncelle 
    [HttpPut("{id}")]
    [RequirePermission(Policies.RequireProductWrite)]
    [EnableRateLimiting(Policies.RequireProductWrite)]
    public async Task<IActionResult> Update(int id, UpdateProductDto dto)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null || product.IsDeleted)
            return NotFound();

        var mevcut = await _context.Products.FirstOrDefaultAsync(p => p.Barcode == dto.Barcode && p.Id != id && !p.IsDeleted);
        if (mevcut != null)
        {
            return BadRequest(new { message = "Bu barkoda sahip bir ürün zaten var." });
        }

        var detectedType = BarcodeTypeDetector.Detect(dto.Barcode);
        if (detectedType is BarcodeType.Gtin8_Ean8 or BarcodeType.Gtin12_UpcA or BarcodeType.Gtin13_Ean13 or BarcodeType.Gtin14_Itf14)
        {
            if (!Gs1CheckDigitCalculator.IsValid(dto.Barcode))
                return BadRequest(new { message = "Girilen barkodun kontrol hanesi hatalı görünüyor. Barkodu tekrar kontrol edin veya elle taratın." });
        }

        var categoryExists = await _context.Categories.AnyAsync(c => c.Id == dto.CategoryId);
        if (!categoryExists) return BadRequest(new { message = "Belirtilen kategori bulunamadı." });

        var unit = await _context.Units.FirstOrDefaultAsync(u => u.Id == dto.UnitId && u.IsActive && !u.IsDeleted);
        if (unit == null)
            return BadRequest(new { message = "Belirtilen birim bulunamadı veya pasif durumda." });

        if (dto.Attributes != null && dto.Attributes.Any())
        {
            var validationError = await ValidateAndNormalizeAttributesAsync(dto.Attributes, dto.CategoryId);
            if (validationError != null) return BadRequest(new { message = validationError });
        }

        product.Name = dto.Name;
        product.Barcode = dto.Barcode;
        product.BarcodeType = detectedType;
        product.MinStockLevel = dto.MinStockLevel;
        product.CategoryId = dto.CategoryId;
        product.UnitId = dto.UnitId;
        product.Attributes = dto.Attributes != null ? System.Text.Json.JsonSerializer.Serialize(dto.Attributes) : "[]";

        await _context.SaveChangesAsync();

        //  Kritik Stok Kontrolü (Limit güncellendiğinde geriye dönük tarama yapar)
        var totalStock = await _context.StockLevels
            .Where(sl => sl.ProductId == product.Id && !sl.IsDeleted)
            .SumAsync(sl => (decimal?)sl.Quantity) ?? 0m;

        if (totalStock <= product.MinStockLevel)
        {
            double percentage = product.MinStockLevel > 0 ? ((double)totalStock / product.MinStockLevel) * 100 : 0;
            string severity = "INFO";
            string msg = $"Bilgi: {product.Name} (Barkod: {product.Barcode}) kritik stok sınırında. (Mevcut: {totalStock:0.###})";

            if (totalStock == 0)
            {
                severity = "EMPTY_STOCK";
                msg = $"DİKKAT: {product.Name} (Barkod: {product.Barcode}) tamamen tükendi!";
            }
            else if (percentage < 20)
            {
                severity = "DANGER";
                msg = $"Çok Kritik: {product.Name} (Barkod: {product.Barcode}) stok seviyesi %20'nin altına indi! (Mevcut: {totalStock:0.###})";
            }
            else if (percentage <= 50)
            {
                severity = "CRITICAL";
                msg = $"Kritik: {product.Name} (Barkod: {product.Barcode}) stok seviyesi %50'nin altına indi! (Mevcut: {totalStock:0.###})";
            }
            else if (percentage <= 80)
            {
                severity = "WARNING";
                msg = $"Ön Uyarı: {product.Name} (Barkod: {product.Barcode}) stok seviyesi %80'in altına indi. (Mevcut: {totalStock:0.###})";
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
    [RequirePermission(Policies.RequireProductWrite)]
    [EnableRateLimiting(Policies.RequireProductWrite)]
    public async Task<IActionResult> Delete(int id)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null || product.IsDeleted)
            return NotFound();

        product.IsDeleted = true; // Soft delete

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [RequirePermission(Policies.RequireProductRead)]
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

    // =========================================================================
    // SKU (BARKOD) OTOMATİK ÜRETİM (Generate SKU)
    // =========================================================================
    [HttpPost("generate-sku")]
    [RequirePermission(Policies.RequireProductWrite)]
    [Authorize]
    public async Task<IActionResult> GenerateSku([FromBody] GenerateSkuDto dto)
    {
        var category = await _context.Categories.FindAsync(dto.CategoryId);
        if (category == null) return BadRequest(new { message = "Kategori bulunamadı." });

        // Ana (Level 2) kategoriyi bulmak için hiyerarşiyi çıkar
        var hierarchy = new List<Category> { category };
        var current = category;
        while (current.ParentId.HasValue)
        {
            var parent = await _context.Categories.FindAsync(current.ParentId.Value);
            if (parent == null) break;
            hierarchy.Add(parent);
            current = parent;
        }

        // Seçili olan kategorinin (leaf) doğrudan bir üstündeki ebeveynini baz al
        // (Eğer zaten tek seviyeli bir kategoriyse kendisini alır)
        var targetCategory = hierarchy.Count > 1 ? hierarchy[1] : hierarchy[0];

        // Kategori adından tamamen algoritmik ve evrensel prefix (Sessiz harfleri alarak: Örn: Telefon -> TLF, Giyim -> GYM, Laptop -> LPT)
        string prefix = ShortenValue(targetCategory.Name, 3);

        // SKU'da yer alması mantıklı olan temel nitelikleri frontend'den gelen veriden direkt filtrele
        var primaryKeywords = new[] { "marka", "model", "koleksiyon", "renk", "beden", "numara", "sezon" };

        var selectedAttrs = dto.Attributes
            .Where(a => primaryKeywords.Any(k => a.Key.ToLower(new System.Globalization.CultureInfo("tr-TR")).Contains(k) && !a.Key.ToLower(new System.Globalization.CultureInfo("tr-TR")).Contains("ekran")))
            .ToList();

        // Eğer hiçbir temel nitelik eşleşmediyse veya sayıca çok azsa (Örn: Sadece Marka varsa), en baştaki özellikleri ekleyerek tamamla
        if (selectedAttrs.Count < 2 && dto.Attributes.Any())
        {
            var additional = dto.Attributes.Where(a => !selectedAttrs.Contains(a)).Take(3 - selectedAttrs.Count);
            selectedAttrs.AddRange(additional);

            // Eğer display order'ı bozduysak tekrar orijinal sıraya göre diz
            selectedAttrs = dto.Attributes.Where(a => selectedAttrs.Contains(a)).ToList();
        }

        var parts = new List<string> { prefix };

        // Seçilen özellikleri kısaltarak ekle
        foreach (var attr in selectedAttrs)
        {
            if (!string.IsNullOrWhiteSpace(attr.Value))
            {
                // Uzun metinler yerine daha mantıklı bir kırpma
                parts.Add(ShortenValue(attr.Value, 4));
            }
        }

        // Parçaları birleştir (Örn: TLF-APPL-İ16P-SYH)
        string skuBase = string.Join("-", parts).ToUpper(new System.Globalization.CultureInfo("tr-TR"));
        if (string.IsNullOrEmpty(skuBase)) skuBase = "GEN";

        // Mükerrerliği önlemek için her zaman 4 haneli Sıra No ekle
        var latestProduct = await _context.Products
            .Where(p => p.Barcode.StartsWith(skuBase))
            .OrderByDescending(p => p.Barcode)
            .FirstOrDefaultAsync();

        int nextSiraNo = 1;
        if (latestProduct != null)
        {
            var existingParts = latestProduct.Barcode.Split('-');
            if (existingParts.Length > 0 && int.TryParse(existingParts.Last(), out int lastSiraNo))
            {
                nextSiraNo = lastSiraNo + 1;
            }
        }

        string generatedSku = $"{skuBase}-{nextSiraNo:D4}";

        return Ok(new { sku = generatedSku });
    }

    private string ShortenValue(string val, int maxLength = 4)
    {
        if (string.IsNullOrWhiteSpace(val)) return "XXX";
        val = val.Trim().ToUpper(new System.Globalization.CultureInfo("tr-TR"))
                 .Replace("İ", "I").Replace("Ş", "S").Replace("Ğ", "G")
                 .Replace("Ç", "C").Replace("Ö", "O").Replace("Ü", "U");

        if (val.Length <= maxLength) return val;

        string[] words = val.Split(new[] { ' ', '-' }, StringSplitOptions.RemoveEmptyEntries);
        var stopWords = new[] { "VE", "VEYA", "ILE", "ICIN", "&", "YADA" };
        var filteredWords = words.Where(w => !stopWords.Contains(w)).ToArray();

        // Eğer (ve, ile gibi kelimeler atıldıktan sonra) birden fazla kelime varsa, baş harfleri al
        if (filteredWords.Length > 1)
        {
            string initials = "";
            foreach (var w in filteredWords)
            {
                if (char.IsDigit(w[0]))
                {
                    string digits = new string(w.TakeWhile(char.IsDigit).ToArray());
                    initials += digits;
                }
                else
                {
                    initials += w[0];
                }
            }
            if (initials.Length <= maxLength) return initials;
            return initials.Substring(0, maxLength);
        }

        // Tek kelimeyse ilk harfi koru, sonrasındaki sesli harfleri at
        string singleWord = filteredWords.Length == 1 ? filteredWords[0] : words[0];

        char firstChar = singleWord[0];
        string rest = singleWord.Substring(1);
        string restNoVowels = new string(rest.Replace(" ", "").Where(c => !"AEIOU".Contains(c)).ToArray());
        string combined = firstChar + restNoVowels;

        if (combined.Length >= 3)
        {
            return combined.Length > maxLength ? combined.Substring(0, maxLength) : combined;
        }

        return singleWord.Substring(0, Math.Min(maxLength, singleWord.Length));
    }


    // =========================================================================
    // YENİ EKLENEN KURAL DENETİMLERİ 
    // =========================================================================

    private async Task<string?> ValidateAndNormalizeAttributesAsync(List<ProductAttributeDto> attributes, int categoryId)
    {
        var rules = await _context.AttributeRules
            .Where(r => (r.CategoryId == categoryId || r.CategoryId == null) && !r.IsDeleted)
            .ToListAsync();

        foreach (var attr in attributes)
        {
            if (string.IsNullOrWhiteSpace(attr.Value)) continue;

            var rule = rules.FirstOrDefault(r => r.Id == attr.RuleId);
            if (rule == null) continue;

            string uiType = rule.UiComponent ?? rule.DataType;

            if (uiType == "searchable_dropdown" || uiType == "discrete_slider" || uiType == "dropdown" || uiType == "radio" || uiType == "segmented_button")
            {
                if (!string.IsNullOrEmpty(rule.AllowedValues))
                {
                    try
                    {
                        var allowedList = JsonSerializer.Deserialize<List<string>>(rule.AllowedValues);
                        if (allowedList != null && allowedList.Any())
                        {
                            var normInput = NormalizeForCompare(attr.Value);
                            var match = allowedList.FirstOrDefault(o => NormalizeForCompare(o) == normInput);
                            if (match == null)
                            {
                                return $"'{rule.AttributeKey}' için geçersiz seçim yapıldı. Listede olmayan veri girilemez.";
                            }
                            attr.Value = match; // Orijinal doğru formata çevir.
                        }
                    }
                    catch { }
                }
            }
            else if (rule.DataType == "number" || rule.DataType == "integer" || uiType == "range_slider_integer")
            {
                var numStr = CoerceNumericString(attr.Value);
                if (!int.TryParse(numStr, out int n)) return $"'{rule.AttributeKey}' tam sayı olmalıdır.";
                if (rule.MinValue.HasValue && n < rule.MinValue.Value) return $"'{rule.AttributeKey}' minimum {rule.MinValue} olabilir.";
                if (rule.MaxValue.HasValue && n > rule.MaxValue.Value) return $"'{rule.AttributeKey}' maksimum {rule.MaxValue} olabilir.";
                attr.Value = n.ToString();
            }
            else if (rule.DataType == "decimal" || uiType == "range_slider" || uiType == "range_slider_decimal" || uiType == "slider")
            {
                var numStr = CoerceNumericString(attr.Value);
                if (!decimal.TryParse(numStr, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out decimal d))
                    return $"'{rule.AttributeKey}' geçerli bir ondalıklı sayı olmalıdır.";
                if (rule.MinValue.HasValue && d < (decimal)rule.MinValue.Value) return $"'{rule.AttributeKey}' minimum {rule.MinValue} olabilir.";
                if (rule.MaxValue.HasValue && d > (decimal)rule.MaxValue.Value) return $"'{rule.AttributeKey}' maksimum {rule.MaxValue} olabilir.";

                attr.Value = d.ToString(System.Globalization.CultureInfo.InvariantCulture);
            }
        }

        foreach (var rule in rules.Where(r => r.IsRequired))
        {
            var tl = rule.TargetLevel?.ToLower().Trim() ?? "";
            if (tl == "asset" || tl == "demirbaş" || tl == "demirbas") continue;

            var exists = attributes.Any(a => a.RuleId == rule.Id && !string.IsNullOrWhiteSpace(a.Value));
            if (!exists) return $"'{rule.AttributeKey}' zorunlu bir alandır, boş bırakılamaz.";
        }

        return null;
    }

    private static string NormalizeForCompare(string str)
    {
        if (string.IsNullOrWhiteSpace(str)) return "";
        return System.Text.RegularExpressions.Regex.Replace(str, @"\s+", " ")
              .Normalize(System.Text.NormalizationForm.FormC)
              .Trim()
              .ToLower(new System.Globalization.CultureInfo("tr-TR"));
    }

    private static string CoerceNumericString(string str)
    {
        if (string.IsNullOrWhiteSpace(str)) return "";
        str = str.Trim().Replace(",", ".");
        return System.Text.RegularExpressions.Regex.Replace(str, @"[^\d.\-]", "");
    }

    // Belirtilen kod değerine sahip okutulan barkod değerini baz alarak sistemdeki aktif ürünleri tarar
    [RequirePermission(Policies.RequireProductRead)]
    [HttpGet("by-barcode/{barcode}")]
    public async Task<IActionResult> GetProductByBarcode(string barcode)
    {
        // Boşlukları temizle ve küçük harfe çevir
        var cleanBarcode = barcode.Trim().ToLower();

        // Sadece aktif (silinmemiş) ve barkodu eşleşen ürünü getir
        var product = await _context.Products
            .FirstOrDefaultAsync(p => p.Barcode.ToLower() == cleanBarcode && !p.IsDeleted);

        if (product == null)
            return NotFound(new { Message = "Ürün bulunamadı." });

        return Ok(product);
    }
}
