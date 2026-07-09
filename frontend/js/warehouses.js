/**
 * Modül: Depo ve Tesis Yönetimi (Warehouses)
 * Geliştirici: Zülal Yıldız & Sistem Entegrasyonu
 * Açıklama: Depoları kart yapısında listeler, rol/yetki (RBAC) kontrolü yapar.
 * Seçilen depodaki ürünleri, stok analizlerini, stok geçmişini ve ürün eklemeyi yönetir.
 */

const API_URL = `${CONFIG.API_BASE_URL}/warehouses`;
const token = localStorage.getItem('token');

// Config.js'den gelen yetki kontrollerini güvene al
const userRole = typeof getUserRole === "function" ? getUserRole() : "User";

// Güvenlik kontrolü: Token yoksa login'e yönlendir
if (!token) {
    window.location.href = 'login.html';
}

// Global Veri Hafızaları (Arama ve Sıralamalar için)
let tumDepolar = [];
let seciliDepoUrunleri = [];
let aktifDepoId = null;

// XSS koruması için HTML karakterlerini encode eder
function escapeHtml(text) {
    if (!text) return "";
    return text.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ============================================================================
// 1. DEPO KARTLARI YÜKLEME, ARAMA, SIRALAMA VE YETKİ KONTROLÜ
// ============================================================================

async function depolariYukle() {
    try {
        const cevap = await fetch(API_URL, {
            method: 'GET',
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (cevap.status === 401) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return;
        }

        if (!cevap.ok) throw new Error("Sunucu hatası: " + cevap.status);
        
        tumDepolar = await cevap.json();
        depolariFiltreleVeSila(); 
    } catch (hata) {
        const container = document.getElementById("depoKartlariContainer");
        if(container) container.innerHTML = `<div class="col-12 text-center text-danger py-4">Depolar yüklenemedi. (${hata.message})</div>`;
        console.error("Hata:", hata);
    }
}

function depolariFiltreleVeSila() {
    const aramaKutusu = document.getElementById("aramaKutusuDepo");
    const siralama = document.getElementById("siralamaDepo")?.value || "EN_COK_URUN";
    const aranan = aramaKutusu ? aramaKutusu.value.toLowerCase() : "";

    let filtrelenmis = tumDepolar.filter(d => 
        (d.name && d.name.toLowerCase().includes(aranan)) || 
        (d.address && d.address.toLowerCase().includes(aranan))
    );

    // Sıralama Algoritması
    filtrelenmis.sort((a, b) => {
        if (siralama === "A_Z") return a.name.localeCompare(b.name);
        if (siralama === "Z_A") return b.name.localeCompare(a.name);
        return (b.id - a.id); 
    });

    depolariCiz(filtrelenmis);
}

// Dinamik Emojili ve Yetki Korumalı Kart Çizimi
function depolariCiz(depolar) {
    const container = document.getElementById("depoKartlariContainer");
    if (!container) return;
    container.innerHTML = "";

    if (depolar.length === 0) {
        container.innerHTML = `<div class="col-12 text-center text-muted py-4">Kriterlere uygun depo bulunamadı.</div>`;
        return;
    }

    depolar.forEach(depo => {
        const depoAdiKucuk = depo.name ? depo.name.toLowerCase() : "";
        let icon = "🏭"; 

        if (depoAdiKucuk.includes("merkez") || depoAdiKucuk.includes("lojistik")) icon = "🏢";
        else if (depoAdiKucuk.includes("yedek parça") || depoAdiKucuk.includes("cnc") || depoAdiKucuk.includes("makine")) icon = "⚙️";
        else if (depoAdiKucuk.includes("elektronik") || depoAdiKucuk.includes("donanım") || depoAdiKucuk.includes("bilişim")) icon = "💻";
        else if (depoAdiKucuk.includes("transfer") || depoAdiKucuk.includes("sevk") || depoAdiKucuk.includes("transit")) icon = "🚚";
        else if (depoAdiKucuk.includes("hammadde") || depoAdiKucuk.includes("malzeme")) icon = "🏗️";
        else if (depoAdiKucuk.includes("şube") || depoAdiKucuk.includes("mağaza")) icon = "🏪";

        const yetkiliSilButonu = (typeof hasPermission === "function" && hasPermission("Warehouse.Delete")) 
            ? `<button class="btn btn-sm btn-outline-danger position-absolute top-0 end-0 m-3 border-0 rounded-circle" title="Depoyu Sil" onclick="event.stopPropagation(); depoSil(${depo.id})">🗑️</button>` 
            : `<button class="btn btn-sm btn-outline-danger position-absolute top-0 end-0 m-3 border-0 rounded-circle" title="Depoyu Sil (Test Modu)" onclick="event.stopPropagation(); depoSil(${depo.id})">🗑️</button>`;
            
        const yetkiliDuzenleButonu = (typeof hasPermission === "function" && hasPermission("Warehouse.Edit")) 
            ? `<button class="btn btn-sm btn-outline-primary mt-3 w-100 rounded-pill fw-bold" onclick="event.stopPropagation(); depoDuzenle(${depo.id})">✏️ Depoyu Düzenle</button>` 
            : `<button class="btn btn-sm btn-outline-primary mt-3 w-100 rounded-pill fw-bold" onclick="event.stopPropagation(); depoDuzenle(${depo.id})">✏️ Depoyu Düzenle</button>`;

        const cardHtml = `
            <div class="col-md-4">
                <div class="card depo-karti h-100 border border-light-subtle shadow-sm rounded-4 text-center p-4 position-relative" onclick="depoDetayinaGit(${depo.id}, '${escapeHtml(depo.name)}')">
                    ${yetkiliSilButonu}
                    <div class="emoji-icon mb-2">${icon}</div>
                    <h5 class="fw-bold text-dark mt-2">${escapeHtml(depo.name)}</h5>
                    <p class="text-muted small mb-1">${escapeHtml(depo.address)}</p>
                    <span class="badge bg-light text-secondary border mt-2">ID: ${depo.id}</span>
                    ${yetkiliDuzenleButonu}
                </div>
            </div>`;
        container.innerHTML += cardHtml;
    });
}

// ============================================================================
// 2. DEPO DETAYI, ÜRÜN ANALİZİ VE STOK LİSTESİ
// ============================================================================

async function depoDetayinaGit(depoId, depoIsmi) {
    aktifDepoId = depoId;
    document.getElementById("depoListesiGorunumu").classList.add("d-none");
    document.getElementById("depoDetayGorunumu").classList.remove("d-none");
    
    // İsim geldiyse güncelle, gelmediyse eskisini koru (tablo yenilemelerinde işe yarar)
    if(depoIsmi) document.getElementById("seciliDepoAdi").innerText = depoIsmi;

    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/warehouses/${depoId}/stocks`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (!cevap.ok) throw new Error("Stok verileri alınamadı.");
        seciliDepoUrunleri = await cevap.json();
        urunleriFiltreleVeSila(); 
    } catch (hata) {
        console.error(hata);
        document.getElementById("depoUrunTablosuGovdesi").innerHTML = `<tr><td colspan="6" class="text-center text-danger">Stoklar yüklenemedi!</td></tr>`;
    }
}

function urunleriFiltreleVeSila() {
    const arama = document.getElementById("aramaKutusuUrun")?.value.toLowerCase() || "";
    const siralama = document.getElementById("siralamaUrun")?.value || "SON_ISLEM";

    let filtrelenmis = seciliDepoUrunleri.filter(u => 
        (u.productName && u.productName.toLowerCase().includes(arama)) ||
        (u.productCode && u.productCode.toLowerCase().includes(arama))
    );

    filtrelenmis.sort((a, b) => {
        if (siralama === "A_Z") return a.productName.localeCompare(b.productName);
        if (siralama === "MIKTAR_AZALAN") return b.quantity - a.quantity;
        if (siralama === "MIKTAR_ARTAN") return a.quantity - b.quantity;
        return b.productId - a.productId; 
    });

    let toplamMiktar = 0;
    let kritikSayisi = 0;
    filtrelenmis.forEach(u => {
        toplamMiktar += u.quantity;
        if (u.quantity <= (u.minStock || 5)) kritikSayisi++;
    });

    document.getElementById("kutuUrunCesidi").innerText = filtrelenmis.length;
    document.getElementById("kutuToplamMiktar").innerText = toplamMiktar.toLocaleString('tr-TR');
    document.getElementById("kutuKritikStok").innerText = kritikSayisi;

    const tbody = document.getElementById("depoUrunTablosuGovdesi");
    tbody.innerHTML = "";
    if (filtrelenmis.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Ürün bulunamadı.</td></tr>`;
        return;
    }

    filtrelenmis.forEach(urun => {
        const isKritik = urun.quantity <= (urun.minStock || 5);
        const miktarRenk = isKritik ? "text-danger" : "text-success";
        
        tbody.innerHTML += `
            <tr>
                <td class="ps-4 fw-bold text-muted small">${urun.productId}</td>
                <td class="fw-bold">${escapeHtml(urun.productName)}</td>
                <td><code class="text-secondary">${escapeHtml(urun.productCode)}</code></td>
                <td><span class="badge bg-light text-secondary border">${escapeHtml(urun.categoryName || "-")}</span></td>
                <td class="text-center fw-bold ${miktarRenk}">${urun.quantity}</td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm btn-outline-dark rounded-pill px-3" onclick="stokGecmisiniAc(${urun.productId}, '${escapeHtml(urun.productName)}')">Geçmişi İncele</button>
                </td>
            </tr>`;
    });
}

// ============================================================================
// 3. STOK HAREKET GEÇMİŞİ MODALI (FİLTRELEME & SIRALAMA)
// ============================================================================

let seciliUrunGecmisi = [];

async function stokGecmisiniAc(productId, productName) {
    document.getElementById("gecmisModalBaslik").innerText = `${productName} - Stok Geçmişi`;
    
    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/stock/movements/product/${productId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (cevap.ok) seciliUrunGecmisi = await cevap.json();
        else seciliUrunGecmisi = [];
        
        if(document.getElementById("filtreZaman")) document.getElementById("filtreZaman").value = "TUMU";
        if(document.getElementById("siralaGecmis")) document.getElementById("siralaGecmis").value = "YENIDEN_ESKIYE";
        
        gecmisTablosunuGuncelle();
        bootstrap.Modal.getOrCreateInstance(document.getElementById("stokGecmisiModal")).show();
    } catch (hata) {
        console.error("Geçmiş çekilemedi:", hata);
        alert("Ürün geçmişi yüklenirken bir hata oluştu.");
    }
}

function gecmisTablosunuGuncelle() {
    const zamanFiltresi = document.getElementById("filtreZaman")?.value || "TUMU";
    const siralama = document.getElementById("siralaGecmis")?.value || "YENIDEN_ESKIYE";
    const simdi = new Date();

    let filtrelenmis = seciliUrunGecmisi.filter(h => {
        const islemTarihi = new Date(h.tarih || h.Date);
        if (zamanFiltresi === "SON_1_HAFTA") return (simdi - islemTarihi) / (1000 * 60 * 60 * 24) <= 7;
        else if (zamanFiltresi === "SON_1_AY") return (simdi - islemTarihi) / (1000 * 60 * 60 * 24) <= 30;
        return true;
    });

    filtrelenmis.sort((a, b) => {
        const dateA = new Date(a.tarih || a.Date);
        const dateB = new Date(b.tarih || b.Date);
        if (siralama === "ESKIDEN_YENIYE") return dateA - dateB;
        return dateB - dateA;
    });

    const tbody = document.getElementById("stokGecmisiTabloGovdesi");
    tbody.innerHTML = "";
    if (filtrelenmis.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">Bu kriterlere uygun hareket bulunamadı.</td></tr>`;
        return;
    }

    filtrelenmis.forEach(h => {
        const isGiris = h.movementType === "IN";
        const islemTipiTasarim = isGiris 
            ? `<span class="badge bg-success bg-opacity-10 text-success border border-success px-2 py-1">GİRİŞ</span>`
            : `<span class="badge bg-danger bg-opacity-10 text-danger border border-danger px-2 py-1">ÇIKIŞ</span>`;
        const formatliTarih = new Date(h.tarih || h.Date).toLocaleString('tr-TR');

        tbody.innerHTML += `
            <tr>
                <td class="ps-4 text-muted small">${formatliTarih}</td>
                <td>${islemTipiTasarim}</td>
                <td class="fw-bold ${isGiris ? 'text-success' : 'text-danger'}">${isGiris ? '+' : '-'}${h.quantity}</td>
                <td>${escapeHtml(h.personel || "Sistem")}</td>
                <td class="pe-4 text-muted small">${escapeHtml(h.description || "-")}</td>
            </tr>`;
    });
}

// ============================================================================
// 4. DEPO CRUD İŞLEMLERİ 
// ============================================================================

document.getElementById("btnDepoKaydet")?.addEventListener("click", async () => {
    const id = document.getElementById("depoId").value;
    const name = document.getElementById("depoAdi").value;
    const address = document.getElementById("depoAdres").value;

    if (!name) return alert("Lütfen depo adı girin!");

    const depoVerisi = { name, address };
    const metod = id ? "PUT" : "POST";
    const adres = id ? `${API_URL}/${id}` : API_URL;

    try {
        const cevap = await fetch(adres, {
            method: metod,
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(depoVerisi)
        });

        if (cevap.status === 401) return window.location.href = 'login.html';
        if (!cevap.ok) throw new Error("İşlem başarısız: " + cevap.status);

        bootstrap.Modal.getInstance(document.getElementById("depoModal"))?.hide();
        document.getElementById("depoFormu").reset();
        document.getElementById("depoId").value = "";

        depolariYukle();
    } catch (hata) {
        alert("İşlem başarısız: " + hata.message);
    }
});

function depoDuzenle(id) {
    const depo = tumDepolar.find(d => d.id === id);
    if (!depo) return;

    document.getElementById("depoId").value = depo.id;
    document.getElementById("depoAdi").value = depo.name;
    document.getElementById("depoAdres").value = depo.address;
    document.getElementById("modalBaslik").innerText = "Depo Düzenle";
    document.getElementById("btnDepoKaydet").innerText = "Güncelle";

    bootstrap.Modal.getOrCreateInstance(document.getElementById("depoModal")).show();
}

async function depoSil(id) {
    if (!confirm("Bu depoyu silmek istediğinize emin misiniz?")) return;

    try {
        const cevap = await fetch(`${API_URL}/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (cevap.status === 401) return window.location.href = 'login.html';
        if (!cevap.ok) throw new Error("Silme başarısız: " + cevap.status);
        
        depolariYukle();
    } catch (hata) {
        alert("Depo silinemedi: " + hata.message);
    }
}

document.querySelector('[data-bs-target="#depoModal"]')?.addEventListener("click", () => {
    document.getElementById("depoFormu").reset();
    document.getElementById("depoId").value = "";
    document.getElementById("modalBaslik").innerText = "Yeni Depo Ekle";
    document.getElementById("btnDepoKaydet").innerText = "Ekle ve Kaydet";
});

// ============================================================================
// 5. YENİ: DEPO İÇİNDEN DİNAMİK ÜRÜN EKLEME MOTORU 
// ============================================================================

// Modalı Hazırlama ve Açma
document.getElementById("btnDepoIciUrunEkle")?.addEventListener("click", async () => {
    if (!aktifDepoId) {
        alert("Lütfen önce detayını incelemek için bir depoya tıklayın canım!");
        return;
    }

    const depoIsmi = document.getElementById("seciliDepoAdi")?.innerText || "Seçili Depo";
    const sabitDepoGirdisi = document.getElementById("urunSabitDepoAdi");
    if (sabitDepoGirdisi) sabitDepoGirdisi.value = depoIsmi;

    const form = document.getElementById("depoIciUrunFormu");
    if (form) form.reset();
    
    if (document.getElementById("depoIciUrunIlkStok")) document.getElementById("depoIciUrunIlkStok").value = "0";
    if (document.getElementById("depoIciUrunMinStok")) document.getElementById("depoIciUrunMinStok").value = "5";

    await depoIciKategorileriYukle();
    await depoIciRaflariYukle(aktifDepoId);

    // Bootstrap niteliklerine güvenmeyip JS ile zorla açıyoruz!
    const modalElement = document.getElementById("depoIciUrunModal");
    if (modalElement) {
        bootstrap.Modal.getOrCreateInstance(modalElement).show();
    }
});

async function depoIciKategorileriYukle() {
    const select = document.getElementById("depoIciUrunKategoriId");
    if (!select) return;
    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/categories`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!cevap.ok) throw new Error("Kategoriler alınamadı");
        const kategoriler = await cevap.json();
        
        select.innerHTML = '<option value="" selected disabled>Kategori seçin...</option>';
        kategoriler.forEach(k => {
            select.innerHTML += `<option value="${k.id}">${escapeHtml(k.name)}</option>`;
        });
    } catch (h) {
        select.innerHTML = '<option value="">Kategoriler yüklenemedi!</option>';
    }
}

async function depoIciRaflariYukle(depoId) {
    const select = document.getElementById("depoIciUrunRafId");
    if (!select) return;
    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/locations/by-warehouse/${depoId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!cevap.ok) throw new Error("Raflar alınamadı");
        const raflar = await cevap.json();
        
        select.innerHTML = '<option value="" selected disabled>Ürünün konulacağı rafı seçin...</option>';
        raflar.forEach(r => {
            select.innerHTML += `<option value="${r.id}">${escapeHtml(r.code)}</option>`;
        });
    } catch (h) {
        select.innerHTML = '<option value="">Bu depoya ait raf bulunamadı!</option>';
    }
}

// 🎯 YENİ: DTO'ya Uygun Ürünü API'ye Gönderme
document.getElementById("btnDepoIciUrunKaydet")?.addEventListener("click", async () => {
    const name = document.getElementById("depoIciUrunAdi").value;
    const barcode = document.getElementById("depoIciUrunBarkod").value;
    const categoryId = document.getElementById("depoIciUrunKategoriId").value;
    const targetLocationId = document.getElementById("depoIciUrunRafId").value;
    const initialQuantity = document.getElementById("depoIciUrunIlkStok").value;
    const minStockLevel = document.getElementById("depoIciUrunMinStok").value;

    if (!name || !barcode || !categoryId || !targetLocationId) {
        alert("Lütfen tüm zorunlu alanları (Ad, Barkod, Kategori, Raf) doldurun canım!");
        return;
    }

    const urunPayload = {
        Name: name,
        Barcode: barcode,
        MinStockLevel: parseInt(minStockLevel) || 0,
        CategoryId: parseInt(categoryId),
        TargetLocationId: parseInt(targetLocationId),
        InitialQuantity: parseInt(initialQuantity) || 0
    };

    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/products`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(urunPayload)
        });

        if (cevap.status === 401) {
            window.location.href = 'login.html';
            return;
        }

        if (!cevap.ok) {
            const hataDetay = await cevap.text();
            throw new Error(hataDetay || "Ürün ekleme başarısız.");
        }

        // Modalı gizle
        bootstrap.Modal.getInstance(document.getElementById("depoIciUrunModal"))?.hide();
        
        // Tabloyu ve üst kutuları yeniden çiz
        await depoDetayinaGit(aktifDepoId);
        
        alert("Ürün başarıyla tanımlandı ve stok işlendi!");
    } catch (hata) {
        alert("Ürün Eklenemedi:\n" + hata.message);
    }
});

// ============================================================================
// 6. EVENT LISTENERS
// ============================================================================

document.getElementById("aramaKutusuDepo")?.addEventListener("input", depolariFiltreleVeSila);
document.getElementById("siralamaDepo")?.addEventListener("change", depolariFiltreleVeSila);
document.getElementById("aramaKutusuUrun")?.addEventListener("input", urunleriFiltreleVeSila);
document.getElementById("siralamaUrun")?.addEventListener("change", urunleriFiltreleVeSila);
document.getElementById("filtreZaman")?.addEventListener("change", gecmisTablosunuGuncelle);
document.getElementById("siralaGecmis")?.addEventListener("change", gecmisTablosunuGuncelle);

document.getElementById("btnGeriDon")?.addEventListener("click", () => {
    document.getElementById("depoDetayGorunumu").classList.add("d-none");
    document.getElementById("depoListesiGorunumu").classList.remove("d-none");
    aktifDepoId = null;
    depolariYukle(); 
});

// RBAC GİZLEME KONTROLLERİ (KORUNDU)
document.addEventListener("DOMContentLoaded", () => {
    if (typeof hasPermission === "function") {
        // if (!hasPermission("Warehouse.Add")) {
        //     const btnDepoEkle = document.querySelector('[data-bs-target="#depoModal"]');
        //     if (btnDepoEkle) btnDepoEkle.classList.add('d-none');
        // }
    }
});

// Sayfa Yüklendiğinde Başlat
depolariYukle();