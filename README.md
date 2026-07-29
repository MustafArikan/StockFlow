# Stok Envanter Takip Sistemi (.NET & MSSQL & Bootstrap)

Tam kapsamlı, 5 geliştirici için tasarlanmış stok ve envanter yönetim uygulaması kılavuzu ve proje ilerleme durumu (.NET ve Bootstrap Sürümü).

---

## 🛠️ SISTEM MIMARISI

```
stok_takip/
├── backend/              ← K1: ASP.NET Core 10.0 Web API
│   ├── Controllers/      ← İş mantığı ve API endpoint tanımları
│   ├── Models/           ← DB Entity sınıf tanımları (EF Core)
│   ├── Data/
│   │   ├── AppDbContext.cs ← EF Core bağlantı yönetimi (DbContext pool)
│   │   └── DbInitializer.cs← Veritabanı şeması ve seed verileri (Code-First Migration)
│   ├── Dockerfile        ← API Docker imaj tanımı (.NET 10.0)
│   ├── backend.csproj    ← .NET 10.0 Proje dosyası
│   └── Program.cs        ← API giriş noktası ve servis kayıtları
├── frontend/             ← K2: Nginx Web Sunucusu + Bootstrap 5 (Statik İstemci)
│   ├── css/              ← Stil dosyaları
│   ├── js/               ← ApiService ve sayfa bazlı JS betikleri
│   ├── index.html        ← Ana Dashboard arayüzü
│   ├── login.html        ← Kullanıcı giriş sayfası
│   ├── products.html     ← Ürün yönetim sayfası
│   ├── movements.html    ← Stok hareketleri sayfası
│   ├── warehouses.html   ← Depo yönetim sayfası
│   └── notifications.html← Bildirim paneli sayfası
├── docker-compose.yml    ← K4: Altyapı (MSSQL + Backend + Frontend servisleri)
└── .gitignore            ← Git yoksayma kuralları
```

---

## 📊 Görev (Task) Bazlı Backlog ve İlerleme Durumu (Genel İlerleme: %90.4 - 57/63 Görev)

Bu proje, geleneksel kişi bazlı rol atamaları yerine tamamen **görev (task) bazlı** yönetilmektedir. 
* **Çalışma Prensibi:** Geliştiriciler (K1, K2, K3, K4 fark etmeksizin) backlog'dan istedikleri herhangi bir görevi (ön yüz ekranını, entegrasyonu veya API endpoint'ini) üzerine alıp geliştirebilir ve bitirdiğinde işaretleyebilir. Belirli bir alan kısıtlaması veya alan paylaşımı yoktur.

| Durum | Toplam Görev | Tamamlanan | Ertelenen | Kalan | Aktif İlerleme Yüzdesi |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Genel Proje Durumu** | **63** | **57** | **2** | **4** | **%93.4** |

*Not: Canlı ortam planlarındaki değişiklikler nedeniyle ertelenen 2 görev (Nginx SSL ve otomatik veritabanı yedekleme) genel yüzdenin dışındaki "Ertelenen" kısmında tutulmaktadır. Ertelenenler düşüldüğünde aktif görev ilerleme oranı **%93.4** (57/61) seviyesindedir.*

---

### 🔐 Modül 1: Kullanıcı Yönetimi & Yetkilendirme (Auth)
- [x] **Arayüz:** Kullanıcı Giriş Sayfası (`login.html` - Giriş formu ve JWT token saklama entegrasyonu)
- [x] **Arayüz:** Kullanıcı Kayıt Sayfası (`register.html` - Kayıt formu)
- [x] **API:** `POST /api/auth/register` (Kullanıcı kayıt ve parola hashleme endpoint'i)
- [x] **API:** `POST /api/auth/verify-email` (Kullanıcı e-posta onay kodu doğrulama endpoint'i)
- [x] **API:** `POST /api/auth/login` (Kullanıcı girişi, kimlik doğrulama ve JWT token üretim endpoint'i)
- [x] **API:** `POST /api/auth/logout` (Oturumu sonlandırma endpoint'i)
- [x] **API:** `GET /api/auth/me` (Aktif oturum açmış kullanıcının profil detayları endpoint'i)

### 📦 Modül 2: Ürün Kataloğu & Kategori Yönetimi
- [x] **Arayüz:** Ürün Listesi Sayfası (`products.html` - Arama, kategori filtreleme ve modal tetikleyicileri)
- [x] **Arayüz:** Ürün Ekleme/Düzenleme Form Modalı (Admin yetkisine özel ürün bilgileri formu)
- [x] **Arayüz:** Kategori Yönetim Modalı (Ürünler ekranından açılan hiyerarşik kategori ekleme/silme arayüzü)
- [x] **API:** `GET /api/products` (Ürünleri arama, kategoriye göre filtreleme, sayfalama ve listeleme endpoint'i)
- [x] **API:** `GET /api/products/{id}` (Belirli bir ürünün detaylarını getirme endpoint'i)
- [x] **API:** `POST /api/products` (Yeni ürün ekleme endpoint'i - Sadece Admin yetkili)
- [x] **API:** `PUT /api/products/{id}` (Mevcut ürünü güncelleme endpoint'i - Sadece Admin yetkili)
- [x] **API:** `DELETE /api/products/{id}` (Ürün silme endpoint'i - Sadece Admin yetkili)
- [x] **API:** `GET /api/categories` (Hiyerarşik kategori ağacını listeleme endpoint'i)
- [x] **API:** `POST /api/categories` (Yeni kategori oluşturma endpoint'i)

### 🏢 Modül 3: Depo & Lokasyon (Raf) Yönetimi
- [x] **Arayüz:** Depo Yönetim Sayfası (`warehouses.html` - Depoları ve ilişkili konumları listeleme ekranı)
- [x] **Arayüz:** Lokasyon/Raf Ekleme Modalı (Deponun içine raf, bölge veya kutu ekleme arayüzü)
- [x] **API:** `GET /api/warehouses` (Sistemdeki tüm depoları listeleme endpoint'i)
- [x] **API:** `POST /api/warehouses` (Yeni depo oluşturma endpoint'i)
- [x] **API:** `PUT /api/warehouses/{id}` (Depo bilgilerini güncelleme endpoint'i)
- [x] **API:** `DELETE /api/warehouses/{id}` (Depoyu silme endpoint'i)
- [x] **API:** `POST /api/locations` (Depo içerisine raf/lokasyon ekleme endpoint'i)

### 🔄 Modül 4: Stok Hareketleri & Okuyucu Entegrasyonu
- [x] **Arayüz:** Stok Hareketleri Sayfası (`movements.html` - Giriş/Çıkış işlem geçmişi listesi ve yeni hareket formu)
- [x] **Arayüz Yardımcısı:** Hibrit Kamera Tarayıcı Modülü (`scanner.js` ve `test-scanner.html` - html5-qrcode entegrasyonu)
- [x] **Arayüz Entegrasyonu:** Barkod/QR tarayıcı modülünün Stok Hareket formuna entegre edilmesi (Kamera ile ürün okutma)
- [x] **API:** `GET /api/stock/movements` (Tüm stok hareket geçmişini filtreli listeleme endpoint'i)
- [x] **API:** `POST /api/stock/movements/in` (Stok Giriş işlemi endpoint'i - Stok seviyesini artırır)
- [x] **API:** `POST /api/stock/movements/out` (Stok Çıkış işlemi endpoint'i - Stok seviyesini azaltır)
- [x] **API:** `POST /api/stock/movements/transfer` (Depolar arası stok transfer endpoint'i - ACID Uyumlu transaction)

### 🔔 Modül 5: Kritik Stok & Canlı Bildirimler
- [x] **Arayüz:** Canlı Bildirim Paneli Sayfası (`notifications.html` - Kritik stok alarmları ve okundu işaretleme)
- [x] **API:** `GET /api/notifications` (Kritik stok seviyesinin altına düşen aktif bildirimleri listeleme endpoint'i)
- [x] **API:** `PUT /api/notifications/{id}/read` (Bildirimi okundu olarak işaretleme endpoint'i)

### 📊 Modül 6: Dashboard, Raporlama & Analiz
- [x] **Arayüz:** Ana Dashboard Sayfası (`index.html` - Özet kartları, Chart.js grafik entegrasyonları)
- [X] **Arayüz Entegrasyonu:** Raporları PDF formatında dışa aktarma (`jsPDF` + `html2canvas`)
- [X] **Arayüz Entegrasyonu:** Raporları Excel/CSV formatında dışa aktarma
- [x] **API:** `GET /api/reports/dashboard-summary` (Toplam ürün, toplam depo değeri, kritik ürün sayısı kart verileri endpoint'i)
- [X] **API:** `GET /api/reports/trend` (Son 30 günlük günlük stok giriş/çıkış trend verileri endpoint'i)
- [X] **API:** `GET /api/reports/by-category` (Kategori bazlı stok miktarları dağılım verileri endpoint'i)
- [X] **API:** `GET /api/reports/top-products` (İşlem hacmi en yüksek ilk 5 ürün verisi endpoint'i)

### 🛠️ Modül 7: Altyapı, Yapılandırma & DevOps
- [x] **Kurulum:** Docker Compose ortamının kurulması (MSSQL + Backend + Frontend servisleri)
- [x] **Kurulum:** Production/Development ortamı `.env` değişkenleri yönetimi
- [x] **Kurulum:** Swagger/OpenAPI ve Scalar UI API dokümantasyonu entegrasyonu
- [x] **Kurulum:** Proje ana README ve kurulum kılavuzunun hazırlanması
- [ ] **Kurulum:** C# Birim Testleri (Unit Tests) ortamının kurulması (`xUnit` + `FluentAssertions` altyapısı)
- [ Ertelendi ] Canlı ortam Nginx tersine vekil (Reverse Proxy) ve SSL (HTTPS) sertifikası yapılandırması
- [ Ertelendi ] Canlı ortam otomatik veritabanı yedekleme ve arşivleme altyapısı
- [x] Prometheus & Grafana ile canlı/production öncesi izleme (monitoring) hazırlığı

### 🔮 Modül 8: Gelişmiş Özellikler & Demirbaş (Assets)
- [x] **Arayüz:** Zimmet & Cihaz Teknik Detay Kartı Sayfası (Mobil kameradan cihaz QR kodu okutulduğunda açılan ekran)
- [x] **API:** `POST /api/assets` (Seri no/QR bazlı tekil fiziksel cihaz ekleme endpoint'i)
- [x] **API:** `GET /api/assets/{serialNumber}` (Seri no/QR ile tekil cihaz bilgilerini getirme endpoint'i)
- [x] **API:** `POST /api/assets/{id}/assign` (Cihazı kullanıcıya zimmetleme endpoint'i)
- [x] **API:** `GET /api/assets/{id}/history` (Cihazın geçmiş tüm sahiplerini gösteren Zaman Çizelgesi / Timeline endpoint'i)
- [x] **API:** `GET /api/security/audit-logs` (Detaylı Güvenlik Denetim Günlüğü listeleme endpoint'i)

### 🏢 Modül 9: PIM (Ürün Bilgi Yönetimi) & Dinamik Özellikler (EAV)
- [x] **Altyapı:** Hibrit JSON Dinamik Özellik (EAV) Mimarisi Entegrasyonu
- [x] **API:** `GET /api/attribute-rules` (Kategori kuralları getirme endpoint'i)
- [x] **Arayüz:** Kategori Kuralları Drag & Drop (SortableJS) Sıralama
- [x] **Arayüz:** Ürün Ekleme Formu Cascading (Depo -> Raf) ve Dinamik Özellik (PIM) Form Render
- [x] **Arayüz:** Hiyerarşik Kategori Ağacı Görünümü (Tree View)

### 👥 Modül 10: Genişletilmiş Kullanıcı & Profil Yönetimi
- [x] **Arayüz:** Kişisel Profil Ekranı (`profile.html` - Kullanıcı kendi bilgilerini ve şifresini değiştirir)
- [x] **Arayüz:** Sistem Kullanıcıları Yönetim Paneli (`users.html` - Süper Admin ekranı)
- [x] **API:** `UsersController` (Kullanıcı Ekle/Sil/Düzenle tam CRUD operasyonları)

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
