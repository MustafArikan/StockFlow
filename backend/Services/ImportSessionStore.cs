using System;
using System.Collections.Generic;
using Microsoft.Extensions.Caching.Memory;

namespace stok_takip.Services
{
    public class ProductImportSession
    {
        public Guid Id { get; set; }
        public int OwnerUserId { get; set; }          // 🔒 oturumu başlatan kullanıcı — başkası kullanamaz
        public byte[] FileBytes { get; set; } = Array.Empty<byte>();
        public List<string> ExcelHeaders { get; set; } = new();
        public List<Dictionary<string, string>> PreviewRows { get; set; } = new(); // ilk ~20 satır, önizleme için
        public int TotalRowCount { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class ImportSessionStore
    {
        private readonly IMemoryCache _cache;
        private static readonly TimeSpan Ttl = TimeSpan.FromMinutes(15); // 🔒 kısa ömürlü, sonsuza dek RAM'de kalmasın

        public ImportSessionStore(IMemoryCache cache) => _cache = cache;

        private static string Key(Guid id) => $"ProductImportSession_{id}";

        public void Save(ProductImportSession session)
            => _cache.Set(Key(session.Id), session, Ttl);

        public ProductImportSession? Get(Guid id, int requestingUserId)
        {
            if (_cache.TryGetValue(Key(id), out ProductImportSession? s) && s != null)
            {
                if (s.OwnerUserId != requestingUserId) return null; // 🔒 IDOR koruması: başkasının oturumunu okuyamaz
                return s;
            }
            return null;
        }

        public void Remove(Guid id) => _cache.Remove(Key(id));
    }
}
