using Microsoft.EntityFrameworkCore;
using stok_takip.Models;
using System;
using System.Collections.Generic;
using System.Linq;

namespace stok_takip.Data;

public static class DbInitializer
{
    public static void Initialize(AppDbContext context)
    {
        context.Database.Migrate();

        if (!context.AppRoles.Any())
        {
            var roles = new List<AppRole>
            {
                new AppRole { Name = "superadmin", Description = "Süper Yönetici - Tüm yetkilere sahip", IsSystemRole = true },
                new AppRole { Name = "admin", Description = "Yönetici - Sistem yöneticisi", IsSystemRole = true },
                new AppRole { Name = "muhasebe", Description = "Muhasebe - Finans ve raporlama", IsSystemRole = true },
                new AppRole { Name = "operator", Description = "Operatör - Stok hareketleri", IsSystemRole = true },
                new AppRole { Name = "depo_sorumlusu", Description = "Depo Sorumlusu - Depo ve raf yönetimi", IsSystemRole = true },
                new AppRole { Name = "viewer", Description = "Görüntüleyici - Sadece okuma", IsSystemRole = true }
            };
            context.AppRoles.AddRange(roles);
            context.SaveChanges();
            
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
            ("Notification.View", "Sistem bildirimlerini görüntüleme", "Bildirimler"),
            ("Notification.ManageSettings", "Bildirim kurallarını ve ayarlarını yönetme", "Bildirimler"),
            ("Settings.View", "Sistem ayarlarını görüntüleme", "Sistem"),
            ("Settings.Edit", "Sistem ayarlarını değiştirme", "Sistem"),
            ("System.AuditLogs", "Sistemdeki tüm güvenlik loglarını görüntüleme", "Güvenlik")
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

        if (!context.Users.Any())
        {
            var adminRoleId = context.AppRoles.First(r => r.Name == "admin").Id;
            var viewerRoleId = context.AppRoles.First(r => r.Name == "viewer").Id;

            var hasher = new Microsoft.AspNetCore.Identity.PasswordHasher<User>();
            var adminUser = new User
            {
                FirstName = "Sistem",
                LastName = "Yöneticisi",
                Email = "admin@godeva.com.tr",
                RoleId = adminRoleId,
                IsEmailConfirmed = true
            };
            adminUser.PasswordHash = hasher.HashPassword(adminUser, "adminpassword23!");

            var testUser = new User
            {
                FirstName = "Test",
                LastName = "Kullanıcı",
                Email = "test@godeva.com.tr",
                RoleId = viewerRoleId,
                IsEmailConfirmed = true
            };
            testUser.PasswordHash = hasher.HashPassword(testUser, "testpassword23!");

            var defaultUsers = new List<User> { adminUser, testUser };

            context.Users.AddRange(defaultUsers);
            context.SaveChanges();
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
    }
}