using Microsoft.EntityFrameworkCore;
using stok_takip.Models;
using System;
using System.Collections.Generic;
using System.Linq;

namespace stok_takip.Data;

public static class DbInitializer
{
    public static void Initialize(AppDbContext context, bool isDevelopment, string adminPassword)
    {
        context.Database.Migrate();

        if (!context.AppRoles.Any())
        {
            var roles = new List<AppRole>
            {
                new AppRole { Name = "superadmin", Description = "Süper Yönetici - Tüm yetkilere sahip", IsSystemRole = true, Level = 100 },
                new AppRole { Name = "admin", Description = "Yönetici - Sistem yöneticisi", IsSystemRole = true, Level = 90 },
                new AppRole { Name = "muhasebe", Description = "Muhasebe - Finans ve raporlama", IsSystemRole = true, Level = 50 },
                new AppRole { Name = "operator", Description = "Operatör - Stok hareketleri", IsSystemRole = true, Level = 40 },
                new AppRole { Name = "depo_sorumlusu", Description = "Depo Sorumlusu - Depo ve raf yönetimi", IsSystemRole = true, Level = 30 },
                new AppRole { Name = "viewer", Description = "Görüntüleyici - Sadece okuma", IsSystemRole = true, Level = 10 }
            };
            context.AppRoles.AddRange(roles);
            context.SaveChanges();
            
        }
        else
        {
            // Update existing roles that might have Level = 0 from before the migration
            var existingRoles = context.AppRoles.ToList();
            var updatesNeeded = false;
            
            var roleLevels = new Dictionary<string, int>
            {
                { "superadmin", 100 },
                { "admin", 90 },
                { "muhasebe", 50 },
                { "operator", 40 },
                { "depo_sorumlusu", 30 },
                { "viewer", 10 }
            };

            foreach (var role in existingRoles)
            {
                if (roleLevels.TryGetValue(role.Name, out int targetLevel) && role.Level != targetLevel)
                {
                    role.Level = targetLevel;
                    updatesNeeded = true;
                }
            }

            if (updatesNeeded)
            {
                context.SaveChanges();
            }
        }

        var permissions = new List<(string Name, string Description, string Module)>
        {
            ("Dashboard.View", "Ana sayfa ve özet istatistikleri görüntüleme", "Ana Sayfa"),
            ("Product.View", "Ürün listesini ve detaylarını görüntüleme", "Ürünler"),
            ("Product.Add", "Sisteme yeni ürün ekleme", "Ürünler"),
            ("Product.Edit", "Mevcut ürün bilgilerini ve fiyatlarını düzenleme", "Ürünler"),
            ("Product.Delete", "Ürünleri sistemden silme", "Ürünler"),
            ("Category.View", "Kategori listesini görüntüleme", "Kategoriler"),
            ("Category.Add", "Yeni kategori ekleme", "Kategoriler"),
            ("Category.Edit", "Mevcut kategorileri düzenleme", "Kategoriler"),
            ("Category.Delete", "Kategori silme", "Kategoriler"),
            ("Movement.View", "Stok geçmişini görüntüleme", "Stok Hareketleri"),
            ("Movement.Inbound", "Depoya mal girişi yapma (Mal Kabul)", "Stok Hareketleri"),
            ("Movement.Outbound", "Depodan mal çıkışı yapma (Sevkiyat)", "Stok Hareketleri"),
            ("Movement.Transfer", "Depolar arası transfer yapma", "Stok Hareketleri"),
            ("Movement.Edit", "Hatalı stok hareketlerini düzenleme", "Stok Hareketleri"),
            ("Movement.Cancel", "Stok hareketini iptal etme (Geri Alma)", "Stok Hareketleri"),
            ("Warehouse.View", "Depo listesi ve depo doluluk oranlarını görüntüleme", "Depolar"),
            ("Warehouse.Add", "Yeni depo tanımlama", "Depolar"),
            ("Warehouse.Edit", "Depo bilgilerini düzenleme", "Depolar"),
            ("Warehouse.Delete", "Depo silme", "Depolar"),
            ("Location.View", "Depo içi raf ve konumları görüntüleme", "Konumlar"),
            ("Location.Add", "Yeni raf/konum ekleme", "Konumlar"),
            ("Location.Edit", "Raf/konum bilgilerini düzenleme", "Konumlar"),
            ("Location.Delete", "Raf/konum silme", "Konumlar"),
            ("Supplier.View", "Tedarikçi firmaları görüntüleme", "Tedarikçiler"),
            ("Supplier.Add", "Yeni tedarikçi firması ekleme", "Tedarikçiler"),
            ("Supplier.Edit", "Tedarikçi firma bilgilerini düzenleme", "Tedarikçiler"),
            ("Supplier.Delete", "Tedarikçi silme", "Tedarikçiler"),
            ("Asset.View", "Demirbaş listesini görüntüleme", "Demirbaşlar"),
            ("Asset.Add", "Sisteme yeni demirbaş ekleme", "Demirbaşlar"),
            ("Asset.Edit", "Demirbaş bilgilerini düzenleme", "Demirbaşlar"),
            ("Asset.Delete", "Demirbaş silme veya hurdaya çıkarma", "Demirbaşlar"),
            ("Asset.Assign", "Demirbaşları personellere zimmetleme yetkisi", "Demirbaşlar"),
            ("Scanner.Use", "Kamera/Barkod okuyucu ile işlem yapma", "Sistem Araçları"),
            ("Report.View", "Sistem raporlarını görüntüleme", "Raporlar"),
            ("Report.Export", "Verileri Excel, PDF formatlarında dışa aktarma", "Raporlar"),
            ("Report.Import", "Excel/CSV ile sisteme toplu veri aktarma", "Raporlar"),
            ("User.View", "Sistemdeki kullanıcıları listeleme", "Kullanıcı Yönetimi"),
            ("User.Add", "Sisteme yeni personel ekleme", "Kullanıcı Yönetimi"),
            ("User.Edit", "Kullanıcı profil bilgilerini düzenleme", "Kullanıcı Yönetimi"),
            ("User.ResetPassword", "Kullanıcıların şifresini sıfırlama (Hassas İşlem)", "Kullanıcı Yönetimi"),
            ("User.Delete", "Kullanıcı hesabını silme veya askıya alma", "Kullanıcı Yönetimi"),
            ("Role.View", "Sistemdeki rolleri görüntüleme", "Yetkilendirme"),
            ("Role.Add", "Yeni rol oluşturma", "Yetkilendirme"),
            ("Role.Edit", "Rol yetkilerini (izinleri) düzenleme", "Yetkilendirme"),
            ("Role.Delete", "Rol silme", "Yetkilendirme"),
            ("Policy.View", "Yetki politikalarını (Rate Limit vb.) görüntüleme", "Yetkilendirme"),
            ("Policy.Edit", "Yetki politikalarını düzenleme", "Yetkilendirme"),
            ("Notification.View", "Sistem bildirimlerini görüntüleme", "Bildirimler"),
            ("Notification.ManageSettings", "Bildirim kurallarını ve ayarlarını yönetme", "Bildirimler"),
            ("Settings.View", "Sistem ayarlarını görüntüleme", "Sistem"),
            ("Settings.Edit", "Sistem ayarlarını değiştirme", "Sistem"),
            ("System.AuditLogs", "Sistemdeki tüm güvenlik loglarını görüntüleme", "Güvenlik"),
            ("Unit.View", "Birim listesini görüntüleme", "Birimler"),
            ("Unit.Add", "Yeni birim ekleme", "Birimler"),
            ("Unit.Edit", "Mevcut birimleri düzenleme", "Birimler"),
            ("Unit.Delete", "Birim pasifleştirme/silme", "Birimler")
        };

        var existingNames = context.AppPermissions
            .Select(p => p.Name)
            .ToList();

        var toInsert = permissions
            .Where(p => !existingNames.Contains(p.Name))
            .Select(p => new AppPermission
            {
                Name = p.Name,
                Description = p.Description,
                Module = p.Module,
                CreatedAt = DateTime.UtcNow,
                IsDeleted = false
            }).ToList();

        if (toInsert.Any())
        {
            context.AppPermissions.AddRange(toInsert);
            context.SaveChanges();
        }

        var policyDefs = new List<(string Key, string Description, int Limit, int Window, string[] Perms)>
        {
            ("RequireAssetWrite", "Demirbaş Ekleme ve Düzenleme Yetkisi", 30, 60, new[] { "Asset.Add", "Asset.Edit" }),
            ("RequireAuditLogRead", "Sistem Loglarını Okuma Yetkisi", 20, 60, new[] { "System.AuditLogs" }),
            ("RequireCategoryWrite", "Kategori Ekleme ve Düzenleme Yetkisi", 30, 60, new[] { "Category.Add", "Category.Edit" }),
            ("RequireLocationWrite", "Konum/Raf Ekleme Yetkisi", 30, 60, new[] { "Location.Add" }),
            ("RequireProductWrite", "Ürün Ekleme ve Düzenleme Yetkisi", 30, 60, new[] { "Product.Add", "Product.Edit" }),
            ("RequireProductSupplierWrite", "Ürün Tedarikçi Ekleme ve Düzenleme Yetkisi", 30, 60, new[] { "Supplier.Edit" }),
            ("RequireStockMovementWrite", "Stok Hareketi (Giriş, Çıkış, Transfer) Yetkisi", 20, 60, new[] { "Movement.Inbound", "Movement.Outbound", "Movement.Transfer" }),
            ("RequireSupplierWrite", "Tedarikçi Ekleme ve Düzenleme Yetkisi", 30, 60, new[] { "Supplier.Add", "Supplier.Edit" }),
            ("RequireWarehouseWrite", "Depo Ekleme ve Düzenleme Yetkisi", 30, 60, new[] { "Warehouse.Add", "Warehouse.Edit" }),
            ("RequireUserManage", "Kullanıcı Yönetim (Listele, Ekle, Düzenle, Sil) Yetkisi", 15, 60, new[] { "User.View", "User.Add", "User.Edit", "User.Delete" }),
            ("RequireAssetRead", "Demirbaş Görüntüleme Yetkisi", 50, 60, new[] { "Asset.View" }),
            ("RequireCategoryRead", "Kategori Görüntüleme Yetkisi", 50, 60, new[] { "Category.View" }),
            ("RequireLocationRead", "Konum/Raf Görüntüleme Yetkisi", 50, 60, new[] { "Location.View" }),
            ("RequireProductRead", "Ürün Görüntüleme Yetkisi", 50, 60, new[] { "Product.View" }),
            ("RequireStockMovementRead", "Stok Hareketi Görüntüleme Yetkisi", 50, 60, new[] { "Movement.View" }),
            ("RequireSupplierRead", "Tedarikçi Görüntüleme Yetkisi", 50, 60, new[] { "Supplier.View" }),
            ("RequireWarehouseRead", "Depo Görüntüleme Yetkisi", 50, 60, new[] { "Warehouse.View" }),
            ("RequireReportRead", "Rapor Görüntüleme Yetkisi", 20, 60, new[] { "Report.View" }),
            ("RequireDashboardRead", "Ana Sayfa Görüntüleme Yetkisi", 50, 60, new[] { "Dashboard.View" }),
            ("RequireNotificationRead", "Bildirim Görüntüleme Yetkisi", 50, 60, new[] { "Notification.View" }),
            ("RequireSettingsRead", "Ayarlar Görüntüleme Yetkisi", 50, 60, new[] { "Settings.View" }),
            ("RequireUnitWrite", "Birim Ekleme ve Düzenleme Yetkisi", 30, 60, new[] { "Unit.Add", "Unit.Edit", "Unit.Delete" }),
            ("RequireUnitRead", "Birim Görüntüleme Yetkisi", 50, 60, new[] { "Unit.View" })
        };

        var existingPolicies = context.AppAuthorizationPolicies.Select(p => p.Key).ToList();
        var policiesToInsert = policyDefs.Where(pd => !existingPolicies.Contains(pd.Key)).ToList();

        if (policiesToInsert.Any())
        {
            var dbPermissions = context.AppPermissions.ToList();

            foreach (var pDef in policiesToInsert)
            {
                var policy = new AppAuthorizationPolicy
                {
                    Key = pDef.Key,
                    Description = pDef.Description,
                    PermitLimit = pDef.Limit,
                    WindowSeconds = pDef.Window
                };
                context.AppAuthorizationPolicies.Add(policy);
                context.SaveChanges(); // Get Id

                foreach (var permName in pDef.Perms)
                {
                    var perm = dbPermissions.FirstOrDefault(p => p.Name == permName);
                    if (perm != null)
                    {
                        context.AppPolicyPermissions.Add(new AppPolicyPermission
                        {
                            PolicyId = policy.Id,
                            PermissionId = perm.Id
                        });
                    }
                }
            }
            context.SaveChanges();
        }

        if (!context.Users.Any())
        {
            var adminRoleId = context.AppRoles.First(r => r.Name == "admin").Id;
            var viewerRoleId = context.AppRoles.First(r => r.Name == "viewer").Id;

            var hasher = new Microsoft.AspNetCore.Identity.PasswordHasher<User>();
            var defaultUsers = new List<User>();

            if (isDevelopment)
            {
                var adminUser = new User
                {
                    FirstName = "Sistem",
                    LastName = "Yöneticisi",
                    Email = "admin@godeva.com.tr",
                    RoleId = adminRoleId,
                    IsEmailConfirmed = true
                };
                adminUser.PasswordHash = hasher.HashPassword(adminUser, "adminpassword23!");
                defaultUsers.Add(adminUser);

                var testUser = new User
                {
                    FirstName = "Test",
                    LastName = "Kullanıcı",
                    Email = "test@godeva.com.tr",
                    RoleId = viewerRoleId,
                    IsEmailConfirmed = true
                };
                testUser.PasswordHash = hasher.HashPassword(testUser, "testpassword23!");
                defaultUsers.Add(testUser);
            }
            else if (!string.IsNullOrEmpty(adminPassword))
            {
                var adminUser = new User
                {
                    FirstName = "Sistem",
                    LastName = "Yöneticisi",
                    Email = "admin@godeva.com.tr",
                    RoleId = adminRoleId,
                    IsEmailConfirmed = true
                };
                adminUser.PasswordHash = hasher.HashPassword(adminUser, adminPassword);
                defaultUsers.Add(adminUser);
            }

            if (defaultUsers.Any())
            {
                context.Users.AddRange(defaultUsers);
                context.SaveChanges();
            }
        }

        if (!context.Categories.Any())
        {
            var defaultCategories = new List<Category>
            {
                new Category { Name = "Bilgisayar Bileşenleri" },
                new Category { Name = "Depolama Birimleri" }
            };
            context.Categories.AddRange(defaultCategories);
            context.SaveChanges();
        }

        var units = new List<(string Name, string ShortCode, bool AllowsDecimal, bool IsSystemUnit)>
        {
            ("Adet", "ADET", false, true),
            ("Kilogram", "KG", true, true),
            ("Gram", "GR", true, false),
            ("Litre", "LT", true, true),
            ("Mililitre", "ML", true, false),
            ("Metre", "M", true, false),
            ("Metrekare", "M2", true, false),
            ("Metreküp", "M3", true, false),
            ("Koli", "KOLI", false, true),
            ("Paket", "PKT", false, false),
            ("Top", "TOP", false, false),
            ("Kasa", "KASA", false, false),
            ("Palet", "PLT", false, false),
            ("Çuval", "CUVAL", false, false),
            ("Rulo", "RULO", false, false),
            ("Demet", "DEMET", false, false),
            ("Kutu", "KUTU", false, false),
        };

        var existingUnitCodes = context.Units.Select(u => u.ShortCode).ToList();
        var unitsToInsert = units
            .Where(u => !existingUnitCodes.Contains(u.ShortCode))
            .Select(u => new Unit
            {
                Name = u.Name,
                ShortCode = u.ShortCode,
                AllowsDecimal = u.AllowsDecimal,
                IsSystemUnit = u.IsSystemUnit,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                IsDeleted = false
            }).ToList();

        if (unitsToInsert.Any())
        {
            context.Units.AddRange(unitsToInsert);
            context.SaveChanges();
        }

        if (!context.Warehouses.Any())
        {
            var merkezDepo = new Warehouse { Name = "Merkez Depo", Address = "Organize Sanayi Bölgesi, 1. Cadde" };
            context.Warehouses.Add(merkezDepo);
            context.SaveChanges();

            if (!context.Locations.Any())
            {
                context.Locations.AddRange(
                    new Location { WarehouseId = merkezDepo.Id, Code = "A1-RAF-01" },
                    new Location { WarehouseId = merkezDepo.Id, Code = "B2-RAF-05" }
                );
                context.SaveChanges();
            }
        }

        if (!context.Products.Any())
        {
            var bilesenKategori = context.Categories.First(c => c.Name == "Bilgisayar Bileşenleri").Id;
            var depolamaKategori = context.Categories.First(c => c.Name == "Depolama Birimleri").Id;

            var defaultProducts = new List<Product>
            {
                new Product { Barcode = "VGA-4090", Name = "NVIDIA GeForce RTX 4090 24GB", MinStockLevel = 5, CategoryId = bilesenKategori },
                new Product { Barcode = "CPU-7800", Name = "AMD Ryzen 7 7800X3D İşlemci", MinStockLevel = 10, CategoryId = bilesenKategori },
                new Product { Barcode = "RAM-C32", Name = "Corsair Vengeance 32GB DDR5", MinStockLevel = 15, CategoryId = bilesenKategori },
                new Product { Barcode = "SSD-1TB", Name = "Samsung 990 PRO 1TB M.2", MinStockLevel = 8, CategoryId = depolamaKategori }
            };
            context.Products.AddRange(defaultProducts);
            context.SaveChanges();
        }

        // Data migration for AttributeRule.AllowedValues -> AttributeAllowedValue
        if (!context.AttributeAllowedValues.Any() && context.AttributeRules.Any(r => r.AllowedValues != null && r.AllowedValues != "" && r.AllowedValues != "[]"))
        {
            var rulesToMigrate = context.AttributeRules.Where(r => r.AllowedValues != null && r.AllowedValues != "" && r.AllowedValues != "[]").ToList();
            foreach (var rule in rulesToMigrate)
            {
                if (string.IsNullOrEmpty(rule.AllowedValues) || rule.AllowedValues == "[]") continue;
                
                try 
                {
                    var parsed = System.Text.Json.JsonSerializer.Deserialize<List<string>>(rule.AllowedValues);
                    if (parsed != null)
                    {
                        int order = 1;
                        foreach (var p in parsed)
                        {
                            context.AttributeAllowedValues.Add(new AttributeAllowedValue { AttributeRuleId = rule.Id, Value = p, Label = p, DisplayOrder = order++ });
                        }
                    }
                } 
                catch
                {
                    var parts = rule.AllowedValues.Split(new[] {','}, StringSplitOptions.RemoveEmptyEntries);
                    int order = 1;
                    foreach (var p in parts)
                    {
                        context.AttributeAllowedValues.Add(new AttributeAllowedValue { AttributeRuleId = rule.Id, Value = p.Trim(), Label = p.Trim(), DisplayOrder = order++ });
                    }
                }
            }
            context.SaveChanges();
        }
    }
}