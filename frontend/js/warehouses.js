const API_URL = `${CONFIG.API_BASE_URL}/warehouses`;
const token = localStorage.getItem('token');

const userRole = typeof getUserRole === "function" ? getUserRole() : "User";

if (!token) {
    window.location.href = 'login.html';
}

let tumDepolar = [];
let seciliRafUrunleri = [];
let aktifDepoId = null;
let aktifRafId = null;

let depoPage = 1;
const depoPageSize = 10;
let rafPage = 1;
const rafPageSize = 10;

let aktifArama = '';
let siralamaSutunu = 'id';
let siralamaYonu = 'asc';

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

function kullaniciBilgisiniDoldur() {
    try {
        const payloadBase64 = token.split('.')[1];
        const decodedPayload = JSON.parse(atob(payloadBase64));
        const email = decodedPayload.email || decodedPayload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] || "Kullanıcı";
        const userProfileElem = document.getElementById("userProfile");
        if(userProfileElem) userProfileElem.innerText = email;
    } catch (e) {
        const userProfileElem = document.getElementById("userProfile");
        if(userProfileElem) userProfileElem.innerText = "Yetkili";
    }
}

document.getElementById("btnNavbarLogout")?.addEventListener("click", () => {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
});

// ============================================================================
// 1. KATMAN: DEPO İŞLEMLERİ 
// ============================================================================

async function depolariYukle(page = 1) {
    try {
        const cevap = await fetch(`${API_URL}?pageNumber=${page}&pageSize=${depoPageSize}`, {
            method: 'GET',
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (cevap.status === 401) return window.location.href = 'login.html';
        if (!cevap.ok) throw new Error("Sunucu hatası: " + cevap.status);
        
        const sonuc = await cevap.json();
        tumDepolar = sonuc.items || sonuc;      
        depoPage = sonuc.currentPage || 1;

        depolariFiltreleVeCiz();
        sayfalamayiCizDepolar(sonuc.totalPages || 1, depoPage);
        yoneticileriYukle();
    } catch (hata) {
        const container = document.getElementById("depoKartlariContainer");
        if(container) container.innerHTML = `<div class="col-12 text-center text-danger py-4">Depolar yüklenemedi. (${hata.message})</div>`;
    }
}

function sayfalamayiCizDepolar(totalPages, currentPage) {
    const container = document.getElementById("depoPaginationContainer");
    if (!container) return;
    if (totalPages <= 1) { container.innerHTML = ""; return; }

    let html = `<nav><ul class="pagination pagination-sm m-0 justify-content-center mt-3">`;
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><button data-page="${currentPage - 1}" class="page-link text-dark btn-depo-page">Önceki</button></li>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<li class="page-item ${currentPage === i ? 'active' : ''}"><button data-page="${i}" class="page-link ${currentPage === i ? 'bg-dark border-dark text-white' : 'text-dark'} btn-depo-page">${i}</button></li>`;
    }
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><button data-page="${currentPage + 1}" class="page-link text-dark btn-depo-page">Sonraki</button></li>`;
    html += `</ul></nav>`;
    container.innerHTML = html;
}

function depolariFiltreleVeCiz() {
    const aramaKutusu = document.getElementById("aramaKutusuDepo") || document.getElementById("aramaKutusu");
    const siralama = document.getElementById("siralamaDepo")?.value || "URUN_COK";
    const aranan = aramaKutusu ? aramaKutusu.value.toLowerCase() : aktifArama;

    let filtrelenmis = tumDepolar.filter(d => 
        (d.name && d.name.toLowerCase().includes(aranan)) || 
        (d.address && d.address.toLowerCase().includes(aranan))
    );

    filtrelenmis.sort((a, b) => {
        const countA = a.productCount || 0; 
        const countB = b.productCount || 0;
        
        if (siralama === "URUN_COK") return countB - countA;
        if (siralama === "URUN_AZ") return countA - countB;
        if (siralama === "TARIH_YENI") return b.id - a.id;
        if (siralama === "TARIH_ESKI") return a.id - b.id;
        if (siralama === "A_Z") return a.name.localeCompare(b.name);
        if (siralama === "Z_A") return b.name.localeCompare(a.name);
        return b.id - a.id;
    });

    const container = document.getElementById("depoKartlariContainer");
    if (!container) return;
    container.innerHTML = "";

    if (filtrelenmis.length === 0) {
        container.innerHTML = `<div class="col-12 text-center text-muted py-4">Kriterlere uygun depo bulunamadı.</div>`;
        return;
    }

    filtrelenmis.forEach(depo => {
        const silİkonu = (typeof hasPermission === "function" && hasPermission("Warehouse.Delete")) 
            ? `<button class="btn btn-sm btn-light text-danger shadow-sm rounded-circle me-1 border btn-depo-sil" title="Depoyu Sil" data-id="${depo.id}" data-name="${escapeHtml(depo.name)}">🗑️</button>`
            : "";
            
        const duzenleİkonu = (typeof hasPermission === "function" && hasPermission("Warehouse.Edit")) 
            ? `<button class="btn btn-sm btn-light text-primary shadow-sm rounded-circle border btn-depo-duzenle" title="Düzenle" data-id="${depo.id}">✏️</button>`
            : "";

        let icon = "🏭"; 
        const depoAdiKucuk = depo.name.toLowerCase();
        if (depoAdiKucuk.includes("merkez") || depoAdiKucuk.includes("lojistik")) icon = "🏢";
        else if (depoAdiKucuk.includes("yedek parça") || depoAdiKucuk.includes("cnc") || depoAdiKucuk.includes("makine")) icon = "⚙️";
        else if (depoAdiKucuk.includes("elektronik") || depoAdiKucuk.includes("donanım") || depoAdiKucuk.includes("bilişim")) icon = "💻";
        else if (depoAdiKucuk.includes("transfer") || depoAdiKucuk.includes("sevk")) icon = "🚚";

        const cardHtml = `
            <div class="col-md-4">
                <div class="card h-100 border border-light-subtle shadow-sm rounded-4 text-center p-4 position-relative depo-karti" data-id="${depo.id}" data-name="${escapeHtml(depo.name)}">
                    <div class="position-absolute top-0 end-0 m-3 d-flex">
                        ${silİkonu} ${duzenleİkonu}
                    </div>
                    <div class="emoji-icon mb-2 emoji-icon-lg">${icon}</div>
                    <h5 class="fw-bold text-dark mt-2">${escapeHtml(depo.name)}</h5>
                    <p class="text-muted small mb-1">${escapeHtml(depo.address)}</p>
                    <span class="badge bg-light text-secondary border mt-2">ID: ${depo.id}</span>
                </div>
            </div>`;
        container.innerHTML += cardHtml;
    });
}

async function yoneticileriYukle() {
    const select = document.getElementById("depoYoneticiId");
    if(!select) return;
    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/users`, { headers: { "Authorization": `Bearer ${token}` } });
        if(cevap.ok) {
            const yoneticiler = await cevap.json();
            select.innerHTML = '<option value="">Yönetici Seçiniz...</option>';
            yoneticiler.forEach(y => {
                select.innerHTML += `<option value="${y.id}">${escapeHtml(y.email)}</option>`;
            });
        }
    } catch(e) {
        select.innerHTML = '<option value="">Yöneticiler Yüklenemedi (Opsiyonel)</option>';
    }
}

document.getElementById("btnDepoKaydet")?.addEventListener("click", async () => {
    const id = document.getElementById("depoId").value;
    const name = document.getElementById("depoAdi").value;
    const address = document.getElementById("depoAdres").value;
    const managerId = document.getElementById("depoYoneticiId")?.value;
    const btnKaydet = document.getElementById("btnDepoKaydet");

    if (!name) return alert("Lütfen depo adı girin!");

    const depoVerisi = { name, address, managerId: managerId || null };
    const metod = id ? "PUT" : "POST";
    const adres = id ? `${API_URL}/${id}` : API_URL;

    try {
        btnKaydet.disabled = true;
        btnKaydet.innerText = "Kaydediliyor...";

        const cevap = await fetch(adres, {
            method: metod,
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(depoVerisi)
        });

        if (cevap.status === 401) return window.location.href = 'login.html';
        if (!cevap.ok) throw new Error("İşlem başarısız: " + cevap.status);

        bootstrap.Modal.getInstance(document.getElementById("depoModal"))?.hide();
        document.getElementById("depoFormu").reset();
        document.getElementById("depoId").value = "";
        
        depolariYukle();
        btnKaydet.disabled = false;
        btnKaydet.innerText = id ? "Güncelle" : "Ekle ve Kaydet";
    } catch (hata) {
        alert("İşlem başarısız: " + hata.message);
        btnKaydet.disabled = false;
    }
});

function depoDuzenle(id) {
    const depo = tumDepolar.find(d => d.id == id);
    if (!depo) return;
    document.getElementById("depoId").value = depo.id;
    document.getElementById("depoAdi").value = depo.name;
    document.getElementById("depoAdres").value = depo.address;
    
    const yoneticiSelect = document.getElementById("depoYoneticiId");
    if(yoneticiSelect && depo.managerId) { yoneticiSelect.value = depo.managerId; }

    document.getElementById("modalBaslik").innerText = "Depo Düzenle";
    document.getElementById("btnDepoKaydet").innerText = "Güncelle";
    bootstrap.Modal.getOrCreateInstance(document.getElementById("depoModal")).show();
}

async function depoSil(id, depoAdi) {
    const onayMsg = `DİKKAT!\n\n"${depoAdi}" isimli depoyu sildiğinizde, bu depoya bağlı:\n- TÜM RAFLAR\n- RAFLARIN İÇİNDEKİ TÜM ÜRÜNLER\nve stok hareketleri kalıcı olarak silinecektir.\n\nBu işlem KESİNLİKLE geri alınamaz. Onaylıyor musunuz?`;
    if (!confirm(onayMsg)) return;

    try {
        const cevap = await fetch(`${API_URL}/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (cevap.status === 401) return window.location.href = 'login.html';
        if (!cevap.ok) throw new Error("Silme başarısız: " + cevap.status);
        
        alert("Depo ve içindeki tüm bileşenler veritabanından başarıyla temizlendi.");
        depolariYukle();
    } catch (hata) {
        alert("Depo silinemedi: " + hata.message);
    }
}

document.querySelector('[data-bs-target="#depoModal"]')?.addEventListener("click", () => {
    const formu = document.getElementById("depoFormu");
    if (formu) formu.reset();
    document.getElementById("depoId").value = "";
    document.getElementById("modalBaslik").innerText = "Yeni Depo Ekle";
    document.getElementById("btnDepoKaydet").innerText = "Ekle ve Kaydet";
});

// ============================================================================
// 2. KATMAN: RAFLAR LİSTESİ VE DROPWDOWN (DEPO SEÇİLDİĞİNDE)
// ============================================================================

async function raflariGoruntule(depoId, depoIsmi) {
    aktifDepoId = depoId;
    document.getElementById("depoListesiGorunumu").classList.add("d-none");
    document.getElementById("urunListesiGorunumu").classList.add("d-none");
    document.getElementById("rafListesiGorunumu").classList.remove("d-none");
    
    document.getElementById("seciliDepoAdiRaflaricin").innerText = depoIsmi;
    await raflariSayfaliYukle(depoId, 1);
    
    // 📊 Kutu İstatistiklerini Güncelle (Toplam Çeşit ve Kritik Stok)
    try {
        const depoCevap = await fetch(`${CONFIG.API_BASE_URL}/warehouses/${depoId}/stocks`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (depoCevap.ok) {
            const stocks = await depoCevap.json();
            
            // 1. Bu depodaki benzersiz (unique) ürün çeşidi sayısı
            const uniqueProductIds = new Set(stocks.map(s => s.id || s.productId));
            const kutuToplamUrun = document.getElementById("kutuToplamUrunDepo");
            if (kutuToplamUrun) kutuToplamUrun.innerText = uniqueProductIds.size;
            
            // 2. Bu depoda bulunan ürünlerden hangileri global olarak kritik seviyenin altında?
            let criticalCount = 0;
            const productMap = new Map();
            
            stocks.forEach(s => {
                let pid = s.id || s.productId;
                if (!productMap.has(pid)) {
                    let globalQty = s.globalStockQuantity !== undefined ? s.globalStockQuantity : (s.stockQuantity || s.quantity);
                    let minLvl = s.minStockLevel || 5;
                    productMap.set(pid, { globalStock: globalQty, minStock: minLvl });
                }
            });
            
            productMap.forEach(val => {
                if (val.globalStock <= val.minStock) {
                    criticalCount++;
                }
            });
            
            const kutuKritik = document.getElementById("kutuKritikStokDepo");
            if (kutuKritik) kutuKritik.innerText = criticalCount;
        }
    } catch(e) {
        console.error("Depo kutu istatistikleri yüklenirken hata:", e);
    }
}

async function raflariSayfaliYukle(depoId, page = 1) {
    const tbody = document.getElementById("rafTablosuGovdesi");
    const rafSelect = document.getElementById("rafAramaSelect");
    
    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/locations/by-warehouse/${depoId}?pageNumber=${page}&pageSize=${rafPageSize}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (cevap.status === 401) return window.location.href = 'login.html';
        if (!cevap.ok) throw new Error("Raflar alınamadı");

        const sonuc = await cevap.json();
        const raflar = sonuc.items || sonuc;
        rafPage = sonuc.currentPage || 1;

        const toplamRaf = document.getElementById("kutuToplamRaf");
        if (toplamRaf) toplamRaf.innerText = (sonuc.totalCount || raflar.length) || 0;

        if(rafSelect) {
            rafSelect.innerHTML = '<option value="">Raf Seçiniz (Tümünü Göster)</option>';
            raflar.forEach(r => {
                rafSelect.innerHTML += `<option value="${r.id}">${escapeHtml(r.code)}</option>`;
            });
        }

        tbody.innerHTML = "";
        if (raflar.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-4">Bu depoda henüz raf bulunmuyor.</td></tr>`;
            const paginationContainer = document.getElementById("rafSayfalamaContainer");
            if (paginationContainer) paginationContainer.innerHTML = "";
            return;
        }

        raflar.forEach(raf => {
            tbody.innerHTML += `
                <tr data-rafid="${raf.id}">
                    <td class="ps-4 fw-bold text-muted small">${raf.id}</td>
                    <td class="fw-bold text-primary">${escapeHtml(raf.code)}</td>
                    <td class="text-end pe-4">
                        <button class="btn btn-sm btn-outline-danger rounded-circle me-2 btn btn-sm btn-outline-danger rounded-circle me-2 btn-raf-sil" title="Rafı Sil" data-id="${raf.id}" data-code="${escapeHtml(raf.code)}" >🗑️</button>
                        <button data-id="${raf.id}" data-code="${escapeHtml(raf.code)}" class="btn btn-sm btn-dark rounded-pill px-3 shadow-sm fw-bold btn-raftaki-urunler">Raftaki Ürünleri Görüntüle ➔</button>
                    </td>
                </tr>`;
        });

        sayfalamayiCizRaflar(sonuc.totalPages || 1, rafPage, depoId);
    } catch (hata) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-danger py-4">Raflar yüklenemedi! (${hata.message})</td></tr>`;
    }
}

document.getElementById("rafAramaSelect")?.addEventListener("change", function() {
    const seciliId = this.value;
    const satirlar = document.querySelectorAll("#rafTablosuGovdesi tr");
    satirlar.forEach(satir => {
        if (!seciliId || satir.dataset.rafid === seciliId) satir.style.display = ""; 
        else satir.style.display = "none"; 
    });
});

function sayfalamayiCizRaflar(totalPages, currentPage, depoId) {
    const container = document.getElementById("rafSayfalamaContainer") || document.getElementById("rafSayfalamaContainer");
    if (!container) return;
    if (totalPages <= 1) { container.innerHTML = ""; return; }

    let html = `<nav><ul class="pagination pagination-sm m-0 justify-content-center mt-3">`;
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><button data-page="${currentPage - 1}" data-depoid="${depoId}" class="page-link text-dark btn-raf-page">Önceki</button></li>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<li class="page-item ${currentPage === i ? 'active' : ''}"><button data-page="${i}" data-depoid="${depoId}" class="page-link ${currentPage === i ? 'bg-dark border-dark text-white' : 'text-dark'} btn-raf-page">${i}</button></li>`;
    }
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><button data-page="${currentPage + 1}" data-depoid="${depoId}" class="page-link text-dark btn-raf-page">Sonraki</button></li>`;
    html += `</ul></nav>`;
    container.innerHTML = html;
}

async function rafSil(rafId, rafKodu) {
    const onayMsg = `DİKKAT!\n\n"${rafKodu}" kodlu rafı sildiğinizde, bu rafın içinde bulunan TÜM ÜRÜNLER ve stok kayıtları kalıcı olarak silinecektir.\n\nBu işlem KESİNLİKLE geri alınamaz. Onaylıyor musunuz?`;
    if (!confirm(onayMsg)) return;

    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/locations/${rafId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!cevap.ok) throw new Error("Raf silinemedi!");
        
        alert("Raf ve içindeki ürünler başarıyla temizlendi.");
        raflariSayfaliYukle(aktifDepoId, rafPage);
    } catch (hata) {
        alert(hata.message);
    }
}

const btnRafKaydetModal = document.getElementById("btnRafKaydetModal");
if (btnRafKaydetModal) {
    btnRafKaydetModal.addEventListener("click", async (e) => {
        const code = document.getElementById("modalRafKodu")?.value || document.getElementById("modalRafKodu")?.value;
        if (!code) return alert("Raf kodu giriniz!");

        try {
            const cevap = await fetch(`${CONFIG.API_BASE_URL}/locations`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ WarehouseId: aktifDepoId, Code: code })
            });
            if (!cevap.ok) throw new Error("Raf eklenemedi");

            const modalInstance = bootstrap.Modal.getInstance(document.getElementById("rafEkleModal")) || bootstrap.Modal.getInstance(document.getElementById("rafEkleModal"));
            if (modalInstance) modalInstance.hide();
            
            if (document.getElementById("modalRafKodu")) document.getElementById("modalRafKodu").value = "";
            if (document.getElementById("rafKodu")) document.getElementById("rafKodu").value = "";
            
            raflariSayfaliYukle(aktifDepoId, 1);
        } catch (h) {
            alert("Hata: " + h.message);
        }
    });
}

// ============================================================================
// 3. KATMAN: ÜRÜNLER (RAF SEÇİLDİĞİNDE)
// ============================================================================

async function raftakiUrunleriGoruntule(rafId, rafKodu) {
    aktifRafId = rafId;
    document.getElementById("rafListesiGorunumu").classList.add("d-none");
    document.getElementById("urunListesiGorunumu").classList.remove("d-none");
    document.getElementById("seciliRafKoduUrunlerIcin").innerText = rafKodu;

    try {
        const depoCevap = await fetch(`${CONFIG.API_BASE_URL}/warehouses/${aktifDepoId}/stocks`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (!depoCevap.ok) throw new Error("Stok verileri alınamadı.");
        
        const tumUrunler = await depoCevap.json();
        
        seciliRafUrunleri = tumUrunler.filter(u => 
            Number(u.locationId) === Number(rafId) || 
            Number(u.LocationId) === Number(rafId)
        );
        
        urunleriFiltreleVeSila(); 
    } catch (hata) {
        document.getElementById("urunTablosuGovdesi").innerHTML = `<tr><td colspan="6" class="text-center text-danger">Ürünler yüklenemedi! (${hata.message})</td></tr>`;
    }
}

function urunleriFiltreleVeSila() {
    const arama = document.getElementById("aramaKutusuUrun")?.value.toLowerCase() || "";
    const siralama = document.getElementById("siralamaUrun")?.value || "SON_ISLEM";

    let filtrelenmis = seciliRafUrunleri.filter(u => 
        ((u.name || u.productName) && (u.name || u.productName).toLowerCase().includes(arama)) ||
        ((u.barcode || u.productCode) && (u.barcode || u.productCode).toLowerCase().includes(arama))
    );

    filtrelenmis.sort((a, b) => {
        let nameA = a.name || a.productName || "";
        let nameB = b.name || b.productName || "";
        let qtyA = a.stockQuantity !== undefined ? a.stockQuantity : a.quantity;
        let qtyB = b.stockQuantity !== undefined ? b.stockQuantity : b.quantity;
        let idA = a.id || a.productId;
        let idB = b.id || b.productId;

        if (siralama === "A_Z") return nameA.localeCompare(nameB);
        if (siralama === "MIKTAR_AZALAN") return qtyB - qtyA;
        if (siralama === "MIKTAR_ARTAN") return qtyA - qtyB;
        return idB - idA; 
    });

    const tbody = document.getElementById("urunTablosuGovdesi");
    tbody.innerHTML = "";
    if (filtrelenmis.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Bu rafta henüz ürün bulunamadı.</td></tr>`;
        return;
    }

    filtrelenmis.forEach(urun => {
        let id = urun.id || urun.productId;
        let name = urun.name || urun.productName;
        let barcode = urun.barcode || urun.productCode;
        let categoryName = urun.categoryName;
        let stockQuantity = urun.stockQuantity !== undefined ? urun.stockQuantity : urun.quantity;
        let globalStock = urun.globalStockQuantity !== undefined ? urun.globalStockQuantity : stockQuantity;
        let minStockLevel = urun.minStockLevel || 5;

        // 🎯 Kritik Stok Kontrolü artık RAFTAKİ miktara göre değil, TÜM DEPOLARDAKİ (Global) toplam miktara göre yapılıyor!
        const isKritik = globalStock <= minStockLevel;
        const miktarRenk = isKritik ? "text-danger" : "text-success";
        
        tbody.innerHTML += `
            <tr>
                <td class="ps-4 fw-bold text-muted small">${id}</td>
                <td class="fw-bold">${escapeHtml(name)}</td>
                <td><code class="text-secondary">${escapeHtml(barcode)}</code></td>
                <td><span class="badge bg-light text-secondary border">${escapeHtml(categoryName || "-")}</span></td>
                <td class="text-center fw-bold ${miktarRenk}">${stockQuantity}</td>
                <td class="text-end pe-4">
                    <button data-id="${id}" data-name="${escapeHtml(name)}" class="btn btn-sm btn-outline-dark rounded-pill px-3 fw-bold btn-stok-gecmisi">Stok Hareketlerini Görüntüle</button>
                </td>
            </tr>`;
    });
}

// ============================================================================
// 4. STOK HAREKET GEÇMİŞİ MODALI
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
        alert("Ürün geçmişi yüklenirken hata oluştu.");
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
                <td class="align-middle">${islemTipiTasarim}</td>
                <td class="fw-bold align-middle ${isGiris ? 'text-success' : 'text-danger'}">${isGiris ? '+' : '-'}${h.quantity}</td>
                <td class="align-middle">${escapeHtml(h.personel || "Sistem")}</td>
                <td class="pe-4 text-muted small align-middle">${escapeHtml(h.description || "-")}</td>
            </tr>`;
    });
}

// ============================================================================
// 5. YENİ: DEPO İÇİNDEN DİNAMİK ÜRÜN EKLEME MOTORU 
// ============================================================================

// Formu Sıfırlamak için Ortak Fonksiyon
function modalIcinSifirla() {
    const form = document.getElementById("depoIciUrunFormu");
    if (form) form.reset();
    
    const katAlan = document.getElementById("yeniKategoriAlani");
    if(katAlan) { katAlan.classList.add("d-none"); document.getElementById("yeniKategoriAdi").value = ""; }
    
    const rafAlan = document.getElementById("yeniRafAlani");
    if(rafAlan) { rafAlan.classList.add("d-none"); document.getElementById("yeniRafKodu").value = ""; }
    
    if (document.getElementById("depoIciUrunIlkStok")) document.getElementById("depoIciUrunIlkStok").value = "0";
    if (document.getElementById("depoIciUrunMinStok")) document.getElementById("depoIciUrunMinStok").value = "5";
    
    const depoIsmi = document.getElementById("seciliDepoAdiRaflaricin")?.innerText || document.getElementById("seciliDepoAdiRaflaricin")?.innerText || "Seçili Depo";
    const sabitDepoGirdisi = document.getElementById("urunSabitDepoAdi");
    if (sabitDepoGirdisi) sabitDepoGirdisi.value = depoIsmi;
}

// 1. Durum: Depo Ekranından (+ Yeni Ürün Girişi) Butonuna Basıldığında
document.getElementById("btnDepoyaUrunEkleModalAc")?.addEventListener("click", async () => {
    if (!aktifDepoId) return alert("Lütfen önce bir depo seçin.");
    
    modalIcinSifirla();
    await depoIciKategorileriYukle();
    await depoIciRaflariYukle(aktifDepoId);

    // Raf Seçim Kutusunu Özgür Bırak
    const rafSelect = document.getElementById("depoIciUrunRafId");
    if (rafSelect) {
        rafSelect.disabled = false;
        rafSelect.value = "";
    }

    const modalElement = document.getElementById("depoIciUrunModal");
    if (modalElement) bootstrap.Modal.getOrCreateInstance(modalElement).show();
});

// 2. Durum: Raf Ekranından (+ Bu Rafa Ürün Ekle) Butonuna Basıldığında
document.getElementById("btnRafaUrunEkleModalAc")?.addEventListener("click", async () => {
    if (!aktifDepoId || !aktifRafId) return alert("Hata: Raf seçimi bulunamadı!");
    
    modalIcinSifirla();
    await depoIciKategorileriYukle();
    await depoIciRaflariYukle(aktifDepoId);

    // Raf Seçim Kutusunu Otomatik Seç ve KİLİTLE!
    const rafSelect = document.getElementById("depoIciUrunRafId");
    if (rafSelect) {
        rafSelect.value = aktifRafId;
        rafSelect.disabled = true; // Kullanıcı bu ekranda rafı değiştiremesin
    }

    const modalElement = document.getElementById("depoIciUrunModal");
    if (modalElement) bootstrap.Modal.getOrCreateInstance(modalElement).show();
});

async function depoIciKategorileriYukle() {
    const select = document.getElementById("depoIciUrunKategoriId");
    if (!select) return;
    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/categories?pageSize=1000`, { headers: { "Authorization": `Bearer ${token}` } });
        if (!cevap.ok) throw new Error("Kategoriler alınamadı");
        const sonuc = await cevap.json();
        const kategoriler = sonuc.items || sonuc;
        
        select.innerHTML = '<option value="" selected disabled>Kategori seçin...</option>';
        kategoriler.forEach(k => { select.innerHTML += `<option value="${k.id}">${escapeHtml(k.name)}</option>`; });
        select.innerHTML += `<option value="YENI_KATEGORI" class="text-success fw-bold">➕ Yeni Kategori Ekle</option>`;

        if (!document.getElementById("yeniKategoriAlani")) {
            const container = document.createElement("div");
            container.id = "yeniKategoriAlani";
            container.className = "input-group mt-2 d-none";
            container.innerHTML = `
                <input type="text" id="yeniKategoriAdi" class="form-control form-control-sm border-success" placeholder="Yeni kategori adını yazın...">
                <button class="btn btn-sm btn-success fw-bold" type="button" id="btnHizliKategoriKaydet">Kaydet</button>
                <button class="btn btn-sm btn-outline-secondary" type="button" id="btnHizliKategoriIptal">İptal</button>
            `;
            select.parentNode.insertBefore(container, select.nextSibling);

            select.addEventListener("change", function() {
                if (this.value === "YENI_KATEGORI") {
                    document.getElementById("yeniKategoriAlani")?.classList.remove("d-none");
                    document.getElementById("yeniKategoriAdi").focus();
                } else {
                    document.getElementById("yeniKategoriAlani")?.classList.add("d-none");
                }
            });
        }
    } catch (h) { select.innerHTML = '<option value="">Kategoriler yüklenemedi!</option>'; }
}

async function hizliKategoriKaydet() {
    const ad = document.getElementById("yeniKategoriAdi").value.trim();
    if(!ad) return alert("Kategori adı boş olamaz!");
    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/categories`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ Name: ad, ParentId: 0 }) 
        });
        if(!cevap.ok) throw new Error("Kategori eklenemedi");
        
        const data = await cevap.json();
        await depoIciKategorileriYukle();
        if(data.id) document.getElementById("depoIciUrunKategoriId").value = data.id; 
        document.getElementById("yeniKategoriAlani")?.classList.add("d-none");
    } catch(e) { alert("Hata: " + e.message); }
}

function hizliKategoriIptal() {
    document.getElementById("yeniKategoriAlani")?.classList.add("d-none");
    document.getElementById("depoIciUrunKategoriId").value = ""; 
}

async function depoIciRaflariYukle(depoId) {
    const select = document.getElementById("depoIciUrunRafId");
    if (!select) return;
    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/locations/by-warehouse/${depoId}?pageSize=1000`, { headers: { "Authorization": `Bearer ${token}` } });
        if (!cevap.ok) throw new Error("Raflar alınamadı");
        const sonuc = await cevap.json();
        const raflar = sonuc.items || sonuc;
        
        select.innerHTML = '<option value="" selected disabled>Ürünün konulacağı rafı seçin...</option>';
        raflar.forEach(r => { select.innerHTML += `<option value="${r.id}">${escapeHtml(r.code)}</option>`; });
        select.innerHTML += `<option value="YENI_RAF" class="text-success fw-bold">➕ Yeni Raf Ekle</option>`;

        if (!document.getElementById("yeniRafAlani")) {
            const container = document.createElement("div");
            container.id = "yeniRafAlani";
            container.className = "input-group mt-2 d-none";
            container.innerHTML = `
                <input type="text" id="yeniRafKodu" class="form-control form-control-sm border-success" placeholder="Örn: RAF-X1">
                <button class="btn btn-sm btn-success fw-bold" type="button" id="btnHizliRafKaydet">Kaydet</button>
                <button class="btn btn-sm btn-outline-secondary" type="button" id="btnHizliRafIptal">İptal</button>
            `;
            select.parentNode.insertBefore(container, select.nextSibling);

            select.addEventListener("change", function() {
                if (this.value === "YENI_RAF") {
                    document.getElementById("yeniRafAlani")?.classList.remove("d-none");
                    document.getElementById("yeniRafKodu").focus();
                } else {
                    document.getElementById("yeniRafAlani")?.classList.add("d-none");
                }
            });
        }
    } catch (h) { select.innerHTML = '<option value="">Raf bulunamadı!</option>'; }
}

async function hizliRafKaydet() {
    const kod = document.getElementById("yeniRafKodu").value.trim();
    if(!kod) return alert("Raf kodu boş olamaz!");
    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/locations`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ WarehouseId: aktifDepoId, Code: kod })
        });
        if(!cevap.ok) throw new Error("Raf eklenemedi");
        
        const data = await cevap.json();
        await depoIciRaflariYukle(aktifDepoId); 
        
        const rafSelect = document.getElementById("depoIciUrunRafId");
        if(data.id) rafSelect.value = data.id; 
        
        document.getElementById("yeniRafAlani")?.classList.add("d-none");
        raflariSayfaliYukle(aktifDepoId, rafPage);
    } catch(e) { alert("Hata: " + e.message); }
}

function hizliRafIptal() {
    document.getElementById("yeniRafAlani")?.classList.add("d-none");
    document.getElementById("depoIciUrunRafId").value = ""; 
}

document.getElementById("btnDepoIciUrunKaydet")?.addEventListener("click", async () => {
    const name = document.getElementById("depoIciUrunAdi").value;
    const barcode = document.getElementById("depoIciUrunBarkod").value;
    const categoryId = document.getElementById("depoIciUrunKategoriId").value;
    
    // Eğer select disabled ise value alamayabilir, bu yüzden aktifRafId'ye fallback atıyoruz!
    const rafSelectValue = document.getElementById("depoIciUrunRafId").value;
    const targetLocationId = rafSelectValue || aktifRafId; 
    
    const initialQuantity = document.getElementById("depoIciUrunIlkStok").value;
    const minStockLevel = document.getElementById("depoIciUrunMinStok").value;

    if (!name || !barcode || !categoryId || !targetLocationId || categoryId === "YENI_KATEGORI" || targetLocationId === "YENI_RAF") {
        return alert("Lütfen tüm zorunlu alanları eksiksiz doldurun!");
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
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(urunPayload)
        });

        if (cevap.status === 401) return window.location.href = 'login.html';
        if (!cevap.ok) throw new Error(await cevap.text() || "Ürün ekleme başarısız.");

        bootstrap.Modal.getInstance(document.getElementById("depoIciUrunModal"))?.hide();
        alert("Ürün başarıyla tanımlandı ve stok işlendi!");
        
        // Eğer Raf ekranındaysak, ürünleri otomatik yenileyelim
        if (aktifRafId) {
            raftakiUrunleriGoruntule(aktifRafId, document.getElementById("seciliRafKoduUrunlerIcin").innerText);
        }

    } catch (hata) { alert("Ürün Eklenemedi:\n" + hata.message); }

});

// ============================================================================
// GERİ DÖNÜŞ VE EVENT LİSTENER'LAR
// ============================================================================

document.getElementById("aramaKutusuDepo")?.addEventListener("input", depolariFiltreleVeCiz);
document.getElementById("siralamaDepo")?.addEventListener("change", depolariFiltreleVeCiz);
document.getElementById("aramaKutusuUrun")?.addEventListener("input", urunleriFiltreleVeSila);
document.getElementById("siralamaUrun")?.addEventListener("change", urunleriFiltreleVeSila);

document.getElementById("btnGeriDonDepolara")?.addEventListener("click", () => {
    document.getElementById("rafListesiGorunumu").classList.add("d-none");
    document.getElementById("urunListesiGorunumu").classList.add("d-none");
    document.getElementById("depoListesiGorunumu").classList.remove("d-none");
    aktifDepoId = null;
    depolariYukle(depoPage); 
});

document.getElementById("btnGeriDonRaflara")?.addEventListener("click", () => {
    document.getElementById("urunListesiGorunumu").classList.add("d-none");
    document.getElementById("rafListesiGorunumu").classList.remove("d-none");
    aktifRafId = null;
    
    // Raf listesine döndüğünde raf tablosunu da bir yenileyelim
    if(aktifDepoId) raflariSayfaliYukle(aktifDepoId, rafPage);
});

document.addEventListener("DOMContentLoaded", () => {
    kullaniciBilgisiniDoldur();
    depolariYukle();
});

// --- EVENT DELEGATION ---
document.addEventListener("DOMContentLoaded", () => {
    // 1. Depo Kartları ve Butonları
    const depoKartlariContainer = document.getElementById("depoKartlariContainer");
    if (depoKartlariContainer) {
        depoKartlariContainer.addEventListener("click", (e) => {
            const btnSil = e.target.closest(".btn-depo-sil");
            if (btnSil) {
                e.stopPropagation();
                depoSil(btnSil.getAttribute("data-id"), btnSil.getAttribute("data-name"));
                return;
            }
            const btnDuzenle = e.target.closest(".btn-depo-duzenle");
            if (btnDuzenle) {
                e.stopPropagation();
                depoDuzenle(btnDuzenle.getAttribute("data-id"));
                return;
            }
            const card = e.target.closest(".depo-karti");
            if (card) {
                raflariGoruntule(card.getAttribute("data-id"), card.getAttribute("data-name"));
            }
        });
    }

    // 2. Depo Sayfalama
    const depoPaginationContainer = document.getElementById("depoPaginationContainer");
    if (depoPaginationContainer) {
        depoPaginationContainer.addEventListener("click", (e) => {
            const btn = e.target.closest(".btn-depo-page");
            if (btn) {
                const parent = btn.parentElement;
                if (!parent.classList.contains("disabled") && !parent.classList.contains("active")) {
                    depolariYukle(parseInt(btn.getAttribute("data-page")));
                }
            }
        });
    }

    // 3. Raf Tablosu (Sil & Görüntüle)
    const rafTablosuGovdesi = document.getElementById("rafTablosuGovdesi");
    if (rafTablosuGovdesi) {
        rafTablosuGovdesi.addEventListener("click", (e) => {
            const btnSil = e.target.closest(".btn-raf-sil");
            if (btnSil) {
                rafSil(btnSil.getAttribute("data-id"), btnSil.getAttribute("data-code"));
                return;
            }
            const btnGoruntule = e.target.closest(".btn-raftaki-urunler");
            if (btnGoruntule) {
                raftakiUrunleriGoruntule(btnGoruntule.getAttribute("data-id"), btnGoruntule.getAttribute("data-code"));
            }
        });
    }

    // 4. Raf Sayfalama
    const rafSayfalamaContainer = document.getElementById("rafSayfalamaContainer");
    if (rafSayfalamaContainer) {
        rafSayfalamaContainer.addEventListener("click", (e) => {
            const btn = e.target.closest(".btn-raf-page");
            if (btn) {
                const parent = btn.parentElement;
                if (!parent.classList.contains("disabled") && !parent.classList.contains("active")) {
                    raflariSayfaliYukle(btn.getAttribute("data-depoid"), parseInt(btn.getAttribute("data-page")));
                }
            }
        });
    }

    // 5. Ürün Stok Geçmişi
    const seciliRafUrunleriTabloGovdesi = document.getElementById("urunTablosuGovdesi");
    if (seciliRafUrunleriTabloGovdesi) {
        document.getElementById("urunTablosuGovdesi").addEventListener("click", (e) => {
            const btnGecmis = e.target.closest(".btn-stok-gecmisi");
            if (btnGecmis) {
                stokGecmisiniAc(btnGecmis.getAttribute("data-id"), btnGecmis.getAttribute("data-name"));
            }
        });
    }

    // 6. Modal İçi Hızlı Kayıt Butonları
    document.body.addEventListener("click", (e) => {
        if (e.target.id === "btnHizliKategoriKaydet") hizliKategoriKaydet();
        if (e.target.id === "btnHizliKategoriIptal") hizliKategoriIptal();
        if (e.target.id === "btnHizliRafKaydet") hizliRafKaydet();
        if (e.target.id === "btnHizliRafIptal") hizliRafIptal();
    });
});


