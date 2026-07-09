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

        if (!context.Users.Any())
        {
            var defaultUsers = new List<User>
            {
                new User { Email = "admin@godeva.com.tr", PasswordHash = "adminpassword", Role = "admin", IsEmailConfirmed = true },
                new User { Email = "test@godeva.com.tr", PasswordHash = "adminpassword", Role = "admin", IsEmailConfirmed = true }
            };
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