# Stok Envanter Takip Sistemi (.NET & MSSQL & Bootstrap)

Tam kapsamlı, 4 geliştirici için tasarlanmış stok ve envanter yönetim uygulaması kılavuzu ve proje ilerleme durumu (.NET ve Bootstrap Sürümü).

---

## 🛠️ Sistem Mimarisi

```
stok_takip/
├── backend/              ← K1: ASP.NET Core 9.0 Web API
│   ├── Controllers/      ← İş mantığı ve API endpoint tanımları
│   ├── Models/           ← DB Entity sınıf tanımları (EF Core)
│   ├── Data/
│   │   ├── AppDbContext.cs ← EF Core bağlantı yönetimi (DbContext pool)
│   │   └── DbInitializer.cs← Veritabanı şeması ve seed verileri (Code-First Migration)
│   ├── Dockerfile        ← API Docker imaj tanımı (.NET 9.0)
│   ├── backend.csproj    ← .NET 9.0 Proje dosyası
│   └── Program.cs        ← API giriş noktası ve servis kayıtları
├── frontend/             ← K2: Nginx Web Sunucusu + Bootstrap 5 (Statik İstemci)
│   ├── css/              ← Stil dosyaları
│   ├── js/               ← ApiService ve sayfa bazlı JS betikleri
│   ├── index.html        ← Ana Dashboard arayüzü
│   ├── login.html        ← Kullanıcı giriş sayfası
│   ├── products.html     ← Ürün yönetim sayfası
│   ├── movements.html    ← Stok hareketleri sayfası
│   ├── warehouses.html   ← Depo yönetim sayfası
│   ├── notifications.html← Bildirim paneli sayfası
│   └── kanban.html       ← Kanban görev yönetim sayfası
├── docker-compose.yml    ← K4: Altyapı (MSSQL + Backend + Frontend servisleri)
└── .gitignore            ← Git yoksayma kuralları
```

---

## 📊 İş Paketi Dağılımı ve Tamamlanma Durumu (Genel İlerleme: %12.5 - 5/40 Görev)

| İş Paketi | Sorumluluk | Toplam Görev | Tamamlanan | Ertelenen | Kalan | Tamamlanma Yüzdesi |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **K1** | Backend & Veritabanı | 10 | 0 | 0 | 10 | **%0.0** |
| **K2** | Frontend Arayüz | 10 | 0 | 0 | 10 | **%0.0** |
| **K3** | Raporlama & Analitik | 9 | 0 | 0 | 9 | **%0.0** |
| **K4** | Altyapı, Entegrasyon & Test | 11 | 5 | 2 | 4 | **%45.5** |
| **GENEL**| **Tüm Proje İlerlemesi** | **40** | **5** | **2** | **33** | **%12.5** |

*Not: Ertelenen görevler (canlı ortam planlarındaki değişiklikler nedeniyle ertelenen Nginx SSL ve otomatik yedekleme altyapısı) genel yüzde hesaplamasına dahil edilmiştir. Ertelenenler düşüldüğünde aktif görev tamamlama oranı **%13.2** (5/38) seviyesindedir. Prometheus & Grafana izleme sistemi canlı/production öncesi hazırlık amacıyla aktif geliştirme kapsamına alınmıştır.*

### K1 — Backend & Veritabanı (Tamamlanma: %0.0 - 0/10)
- [ ] MSSQL şema tasarımı (EF Core Code-First DbContext ve Migration tanımları)
- [ ] Kullanıcı auth: kayıt, giriş, JWT(JSON web token), rol bazlı yetkilendirme (ASP.NET Core Identity altyapısı)
- [ ] Ürün CRUD API (`/api/products` - arama ve filtreleme parametreleri dahil)
- [ ] Kategori, depo, lokasyon API'leri (DbContext üzerinden MSSQL bağlantıları)
- [ ] Stok giriş/çıkış/transfer işlemleri + audit log (ACID uyumlu transaction işlemleri EF Core TransactionScope ile)
- [ ] Kritik stok uyarı sistemi (stok seviyesi düştüğünde otomatik DB bildirimi oluşturan DB trigger/service motoru)
- [ ] Rapor endpoint'leri (Dashboard özet, trend, kategori dağılımı, en aktif ürünler, kritik stok listesi)
- [ ] Dinamik QR/Seri no bazlı Zimmet DB veri yapısı ve API'leri (Yol Haritası)
- [ ] Detaylı Güvenlik Denetim Günlüğü (IP, User Agent ve işlem detaylı Audit Logs Interceptor) (Yol Haritası)
- [ ] Çoklu şube/depo yetkilendirme altyapısı (Multi-Tenant depo izinleri filtreleri) (Yol Haritası)

### K2 — Frontend Arayüz (Tamamlanma: %0.0 - 0/10)
- [ ] Proje kurulumu, Bootstrap 5, HTML Sayfaları (Bootstrap entegre edildi, Nginx ile sunum yapısı kuruldu)
- [ ] Giriş/kayıt sayfaları + auth token yönetimi (token HttpOnly Cookie üzerinde saklanır ve otomatik yenilenir)
- [ ] Sidebar layout, navbar, mobil uyumluluk (Bootstrap duyarlı mobil alt menü tasarımı)
- [ ] Ürün listeleme, arama/filtre (arama ve kategori filtrelemesi arayüzü)
- [ ] Ürün ekleme/düzenleme formları (Admin yetkisine özel modal form pencereleri)
- [ ] Stok giriş/çıkış ekranları (barkod desteğiyle — K4 kamera entegrasyonu aşamasında)
- [ ] Bildirim paneli ve kritik stok uyarıları (sol menüde canlı sayaç ve bildirim listesinde okundu işaretleme)
- [ ] Mobil kamera / QR kodu okutulduğunda ürün zimmet & teknik detay kartı gösteren sayfa (Yol Haritası)
- [ ] Admin panelinde ekibin sprint ve iş durumunu takip etmek için Kanban Task Board (Yol Haritası)
- [ ] Depo krokisi (2D/3D) ve ürün toplama rota çizimi arayüzü (Yol Haritası)

### K3 — Raporlama & Analitik (Tamamlanma: %0.0 - 0/9)
- [ ] Dashboard: özet kartlar (toplam ürün, stok değeri, kritik ürünler)
- [ ] Stok hareket trendi grafiği (C# Backend beslemeli Chart.js/Recharts entegrasyonu - son 30 gün veritabanına bağlandı)
- [ ] Kategori dağılımı pasta/bar grafiği (Bootstrap destekli grafik görselleştirilmesi)
- [ ] En aktif ürünler listesi (İşlem hacmi ve işlem adedine göre sıralı liste)
- [ ] Tarih aralığı filteri ile raporlama sayfası
- [ ] PDF export (`jsPDF` + `html2canvas`)
- [ ] Excel/CSV export (`ClosedXML` veya `EPPlus`)
- [ ] Backend rapor endpoint'leri (K1 ile koordineli)
- [ ] Kritik seviyeye düşen ürünler için otomatik Satın Alma Formu (PO) ve tedarikçi e-posta onay taslağı (Auto-Procurement) (Yol Haritası)

### K4 — Altyapı, Entegrasyon & Test (Tamamlanma: %45.5 - 5/11)
- [x] Docker Compose kurulumu (db/mssql + backend + frontend)
- [x] Barkod/QR okuma: kamera entegrasyonu (html5-qrcode)
- [ ] Depo içi lokasyon yönetimi modülü (konum bazlı stok yapısı ve DB entegrasyonu)
- [ ] Birim testler: auth, product CRUD, stok işlemleri (`xUnit + FluentAssertions`)
- [x] Swagger/OpenAPI ve Scalar UI dokümantasyonu
- [x] README ve kurulum kılavuzu (Güncellenmiş .NET sürümü)
- [x] Production ortamı `.env` yönetimi (Docker Compose environment parametreleri ile entegre edildi)
- [ ] Tekil cihazlar için seri numarası bazlı QR kod etiket oluşturma servisi (Yol Haritası)
- [ Ertelendi ] Canlı ortam Nginx tersine vekil (Reverse Proxy) ve SSL sertifikası yapılandırması
- [ Ertelendi ] Canlı ortam otomatik veritabanı yedekleme ve arşivleme altyapısı
- [ ] Prometheus & Grafana ile canlı/production öncesi izleme (monitoring) hazırlığı

---

## 📈 Planlanan İzleme Altyapısı (Prometheus & Grafana) [AKTİF HAZIRLIK]

*Bu altyapı, canlıya (live) geçiş öncesinde test edilip hazır hale getirilecek şekilde aktif geliştirme planına dahil edilmiştir:*

1. **Metrik Sağlayıcı (`prometheus-net`):** 
   * Backend sunucusuna `prometheus-net.AspNetCore` paketi eklenerek bellek, CPU kullanımı gibi varsayılan metriklerin yanı sıra `/api` istek hacmini sayan özel `http_requests_total` metriği `/metrics` adresi üzerinden Prometheus'a sunulacaktır.
2. **Prometheus Konfigürasyonu (`prometheus.yml`):**
   * Prometheus servisinin her 5 saniyede bir `backend:80/metrics` (veya ilgili port) adresini kazıyarak verileri kaydetmesi planlanmaktadır.
3. **Grafana Entegrasyonu (`Port 3002`):**
   * Grafana panellerinin admin panelindeki **Sistem İzleme** sekmesinde doğrudan görüntülenebilmesi için `docker-compose.yml` üzerinde `GF_SECURITY_ALLOW_EMBEDDING=true` ve `GF_AUTH_ANONYMOUS_ENABLED=true` özellikleri aktif edilerek entegre edilecektir.

---

## 🚀 Hızlı Başlangıç

### Docker ile Başlatma

```bash
# 1. Depoyu klonlayıp dizine gidin
cd stok_takip

# 2. Docker ile tüm servisleri başlatın
docker-compose up -d --build

# 3. Erişim Adresleri:
# Frontend → http://localhost:3000 (veya 80)
# Backend  → http://localhost:5000 (veya 80/api)
```

### Varsayılan Test Kullanıcıları

* **Yönetici 1 (Admin):** `admin@godeva.com.tr` / `adminpassword` *(Veritabanında doğrudan tanımlıdır. Tam yetkili)*
* **Yönetici 2 (Admin):** `test@godeva.com.tr` / `adminpassword` *(Veritabanında doğrudan tanımlıdır. Test amaçlı)*
* *Not: Frontend giriş ekranındaki placeholder önerileri (`newadmin@godeva.com.tr` ve `op1@godeva.com.tr`) yeni kayıt oluşturan kullanıcıları simüle etmektedir. Bu hesaplarla doğrudan giriş yapmak için önce frontend üzerindeki kayıt olma formundan üyelik oluşturulması gerekmektedir.*

---

## 🗄️ Veritabanı Şeması Detayları

| Durum | Tablo Adı | Açıklama | Önemli Kolonlar & İlişkiler |
| :---: | :--- | :--- | :--- |
| **Aktif** | `users` | Kullanıcı hesapları ve rolleri | `email` (UQ), `role` (admin, operator, viewer) |
| **Aktif** | `categories` | Ürün kategorileri (Ağaç yapısı) | `parent_id` (Self FK) |
| **Aktif** | `warehouses` | Depo tanımları | `name`, `address` |
| **Aktif** | `locations` | Depo içi raf/bölge konumları | `warehouse_id` (FK), `code` (UQ) |
| **Aktif** | `products` | Ürün tanımları ve kataloğu | `barcode` (UQ), `min_stock_level` |
| **Aktif** | `stock_levels` | Anlık stok miktarları | `product_id` (FK), `location_id` (FK) [Composite UQ] |
| **Aktif** | `stock_movements` | ACID uyumlu stok hareket logları | `product_id` (FK), `movement_type` (IN/OUT/TRANSFER) |
| **Aktif** | `notifications` | Kritik seviye stok bildirimleri | `message`, `type` (CRITICAL_STOCK), `is_read` |
| **Planlanan** | `assets` | Tekil cihaz takibi (Seri No/QR) | `product_id` (FK), `serial_number` (UQ), `status` |
| **Planlanan** | `asset_history` | Cihaz zimmet/bakım geçmişi | `asset_id` (FK), `user_id` (FK), `action_type` |
| **Planlanan** | `security_audit_logs`| Güvenlik ve kritik işlem denetim günlüğü | `user_id` (FK), `action`, `ip_address`, `user_agent` |
| **Planlanan** | `user_warehouses` | Depo bazlı çoklu şube yetkilendirmesi | `user_id` (FK), `warehouse_id` (FK) [Composite PK] |
| **Planlanan** | `kanban_tasks` | Sprint iş ve görev takip tablosu | `title`, `status` (todo/in_progress/review/done) |

*Açıklamalar: **UQ:** Unique Constraint, **FK:** Foreign Key, **PK:** Primary Key.*

---

## 🔮 Proje Yol Haritası ve Gelecek Vizyonu (Genişletme Fikirleri)

Sistemin ölçeklenebilirliğini artırmak, live/production ortamlarında güvenle barındırmak ve kurumsal bir WMS (Warehouse Management System) yapısına dönüştürmek amacıyla planlanan geliştirme modülleri:

### 1. 🏷️ Gelişmiş QR & Barkod Modülü [AKTİF PLANLAMA / ONAYLANDI]
* **Tekil Ürün (Seri Numarası) Takibi:** Genel stok miktar takibinin ötesinde, her fiziksel cihaza özel tekil seri numarası (QR) atanarak cihaz zimmet geçmişi, garanti bitiş süresi ve servis geçmişi detaylı takip edilecektir.
* **Dinamik Bilgi Kartları (QR Kapsamı):** Cihazların üzerine yapıştırılan QR kodlar herhangi bir kamera ile taratıldığında; cihazın zimmet durumu, teknik özellikleri ve PDF kullanım kılavuzu dinamik olarak görüntülenebilecektir.
* **Hibrit QR & Zaman Çizelgesi (Timeline):** QR kodlar çevrimdışı (offline) ortamlarda temel künye bilgilerini (Model, Seri No) doğrudan çözerken; internet bağlıyken (online) sistemden anlık konum, bakım durumu ve cihazın geçmiş tüm sahiplerinin kullanım sürelerini gösteren detaylı bir Zaman Çizelgesi (Timeline) sunacaktır.

### 2. 🌐 DevOps ve Canlı Ortam Hazırlığı (Production Infrastructure) [KISMEN ERTELENDİ / AKTİF HAZIRLIK]
* **İzleme Hazırlığı (Aktif):** Canlıya (live) geçiş yapıldığında izleme sisteminin doğrudan hazır olması için Prometheus ve Grafana altyapısı kurulacaktır.
* **Ertelenen Altyapılar:** Canlı/production ortamına özel harici Nginx tersine vekil, SSL sertifikaları, otomatik yedekleme senkronizasyonu ve Alertmanager dış alarm entegrasyonu (Discord/Slack) sonraki aşamalara ertelenmiştir.

### 3. ⚙️ Kurumsal Yönetim & Proje Yönetimi (PM) Modülleri [AKTİF PLANLAMA / ONAYLANDI]
* **Çoklu Şube / Çoklu Depo Yetki Ağacı (Multi-Tenancy):** Farklı şubelerdeki operatörlerin sadece kendi depolarını görebildiği, Proje Yöneticisinin (PM) ise tüm şubeleri tek bir çatıdan denetlediği yetkilendirme modeli.
* **Detaylı Güvenlik Denetim Günlüğü (Audit Logs):** Kimin, hangi IP adresinden, hangi saatte hangi veriyi değiştirdiğini veya sildiğini kaydeden denetim sistemi.
* **Yönetici İş Takip Paneli (Sprint/Kanban Board):** Ekipteki diğer geliştiricilerin görev durumunu, sprint ilerlemesini ve tamamlanma oranlarını doğrudan Admin panelinden izlemeyi sağlayan entegre Kanban tahtası.
