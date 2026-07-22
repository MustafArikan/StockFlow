// API adresi ve yetkilendirme token bilgisini ayarlar
const API_URL = `${CONFIG.API_BASE_URL}/stock/movements`;
const token = localStorage.getItem('token');

if (!token) window.location.href = 'login.html';

const MAX_ISLEM_ADEDI = 100000;

// XSS korumasý için özel HTML karakterlerini güvenli formata dönüþtürür
function escapeHtml(text) {
    if (!text) return "";
    return text.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// URL'den gelen filtre parametresini yakalar 
const urlParams = new URLSearchParams(window.location.search);
const urlFilter = urlParams.get('filter');

// GLOBAL DEÐÝÞKENLER
let stokHareketleri = [];
let tumUrunler = [];
let tumLokasyonlar = [];

const tabloGovdesi = document.getElementById("hareketTablosuGövdesi");
const aramaKutusu = document.getElementById("aramaKutusu");

// Sayfalama, Arama ve Sýralama Durumlarý
let currentPage = 1;
const pageSize = 10;
let aktifFiltre = urlFilter ? urlFilter : 'TUMU';
let aktifArama = '';
let siralamaSutunu = 'tarih';
let siralamaYonu = 'desc';

// ==========================================
// 1. ARAMA, FÝLTRELEME VE KUSURSUZ SIRALAMA
// ==========================================

// Tablo verilerini arama, filtreleme ve sýralama durumuna göre günceller
function veriyiGuncelle() {
    // 1. Buton Filtresi 
    let islenmisVeri = stokHareketleri;
    if (aktifFiltre !== 'TUMU') {
        if (aktifFiltre === 'GIRIS') {
            islenmisVeri = islenmisVeri.filter(h => (h.movementType || h.islemTipi) === 'IN' || (h.movementType || h.islemTipi) === 'GIRIS');
        } else if (aktifFiltre === 'CIKIS') {
            islenmisVeri = islenmisVeri.filter(h => (h.movementType || h.islemTipi) === 'OUT' || (h.movementType || h.islemTipi) === 'CIKIS');
        } else if (aktifFiltre === 'TRANSFER') {
            islenmisVeri = islenmisVeri.filter(h => (h.movementType || h.islemTipi) === 'TRANSFER');
        }
    }

    // 2. Arama Çubuðu
    if (aktifArama.trim() !== '') {
        islenmisVeri = islenmisVeri.filter(h =>
            ((h.urunAdý || h.urunAdi || h.productName || "").toLowerCase().includes(aktifArama)) ||
            ((h.urunKodu || "").toLowerCase().includes(aktifArama)) ||
            ((h.personel || "").toLowerCase().includes(aktifArama))
        );
    }

    // 3. Sýralama Motoru (Tarih, Sayý ve Türkçe A-Z)
    islenmisVeri.sort((a, b) => {
        let valA = a[siralamaSutunu];
        let valB = b[siralamaSutunu];

        if (siralamaSutunu === "urunAdi") {
            valA = a.urunAdi || a.urunAdý || a.productName || '';
            valB = b.urunAdi || b.urunAdý || b.productName || '';
        } else if (siralamaSutunu === "islemTipi") {
            valA = (a.islemTipi || a.movementType) === 'IN' || (a.islemTipi || a.movementType) === 'GIRIS' ? 'GIRIS' : 'CIKIS';
            valB = (b.islemTipi || b.movementType) === 'IN' || (b.islemTipi || b.movementType) === 'GIRIS' ? 'GIRIS' : 'CIKIS';
        } else {
            valA = valA != null ? valA : '';
            valB = valB != null ? valB : '';
        }

        if (siralamaSutunu === 'tarih') {
            const tarihA = new Date(valA).getTime() || 0;
            const tarihB = new Date(valB).getTime() || 0;
            return siralamaYonu === 'asc' ? tarihA - tarihB : tarihB - tarihA;
        }

        if (siralamaSutunu === 'quantity') {
            return siralamaYonu === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
        }

        valA = valA.toString();
        valB = valB.toString();
        return siralamaYonu === 'asc' ? valA.localeCompare(valB, 'tr') : valB.localeCompare(valA, 'tr');
    });

    // 4. Sayfalama Kesimi
    const toplamSayfa = Math.ceil(islenmisVeri.length / pageSize) || 1;
    if (currentPage > toplamSayfa) currentPage = toplamSayfa;

    const baslangic = (currentPage - 1) * pageSize;
    const bitis = baslangic + pageSize;
    const sayfadakiVeriler = islenmisVeri.slice(baslangic, bitis);

    tabloyuCiz(sayfadakiVeriler);
    sayfalamayiCiz(toplamSayfa, currentPage);
}

// Sütun baþlýðýna týklandýðýnda sýralama yönünü belirler ve veriyi günceller
function sirala(sutun) {
    if (siralamaSutunu === sutun) {
        siralamaYonu = siralamaYonu === 'asc' ? 'desc' : 'asc';
    } else {
        siralamaSutunu = sutun;
        siralamaYonu = 'asc';
    }

    const sutunlar = { tarih: 'tarihBaslik', urunKodu: 'thUrunKodu', urunAdi: 'thUrunAdi', islemTipi: 'thIslemTipi', quantity: 'thAdet', personel: 'thPersonel' };
    const metinler = { tarih: 'Tarih', urunKodu: 'Ürün Kodu', urunAdi: 'Ürün Adý', islemTipi: 'Ýþlem Tipi', quantity: 'Adet', personel: 'Personel' };

    Object.keys(sutunlar).forEach(key => {
        const el = document.getElementById(sutunlar[key]);
        if (el) {
            el.innerText = siralamaSutunu === key ? (siralamaYonu === 'asc' ? `${metinler[key]} ^` : `${metinler[key]} v`) : `${metinler[key]} |`;
        }
    });

    veriyiGuncelle();
}

// ==========================================
// 2. API'DEN TÜM VERÝYÝ ÇEKME
// ==========================================

// API üzerinden tüm stok hareketlerini çeker ve global diziye aktarýr
async function hareketleriYukle() {
    try {
        const adres = `${API_URL}?pageNumber=1&pageSize=10000`;
        const cevap = await fetch(adres, {
            method: 'GET',
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (cevap.status === 401) { localStorage.removeItem('token'); window.location.href = 'login.html'; return; }
        if (!cevap.ok) throw new Error("Stok hareketleri yüklenemedi");

        const sonuc = await cevap.json();
        stokHareketleri = sonuc.items || sonuc || [];

        veriyiGuncelle();
    } catch (hata) {
        tabloGovdesi.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Baðlantý Hatasý: ${hata.message}</td></tr>`;
        const paginationContainer = document.getElementById("paginationContainer");
        if (paginationContainer) paginationContainer.innerHTML = "";
    }
}

// ==========================================
// 3. TABLO ÇÝZÝMÝ VE SAYFALAMA 
// ==========================================
// JWT token içindeki payload kýsmýný çözer
function parseJwt(t) {
    try {
        return JSON.parse(decodeURIComponent(atob(t.split('.')[1]).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
    } catch (e) { return null; }
}
const currentPayload = parseJwt(token);
const isAdmin = currentPayload && currentPayload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] === "admin" || currentPayload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] === "superadmin";

// Gelen verileri HTML tablosuna satýr satýr ekler
function tabloyuCiz(veriListesi) {
    tabloGovdesi.innerHTML = "";
    if (veriListesi.length === 0) {
        tabloGovdesi.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Kayýt bulunamadý.</td></tr>`;
        return;
    }

    let satirlar = [];
    veriListesi.forEach(hareket => {
        let nType = hareket.movementType || hareket.islemTipi;
        let isGiris = nType === "IN" || nType === "GIRIS";

        let tipEtiketi = isGiris
            ? `<span class="badge bg-success bg-opacity-10 text-success border border-success px-2 py-1 rounded-pill">STOK GÝRÝÞÝ</span>`
            : nType === "TRANSFER"
                ? `<span class="badge bg-primary bg-opacity-10 text-primary border border-primary px-2 py-1 rounded-pill">STOK TRANSFERÝ</span>`
                : `<span class="badge bg-danger bg-opacity-10 text-danger border border-danger px-2 py-1 rounded-pill">STOK ÇIKIÞI</span>`;

        let adetRengi = isGiris ? "text-success" : nType === "TRANSFER" ? "text-primary" : "text-danger";
        let adetIsareti = isGiris ? "+" : nType === "TRANSFER" ? "?" : "-";

        const formatliTarih = new Date(hareket.tarih).toLocaleString('tr-TR');
        let pName = hareket.urunAdý || hareket.urunAdi || hareket.productName || '';

        let kisiIsmi = hareket.personelName || hareket.personel;
        let finalKisiHtml = "";

        if (isAdmin && hareket.userId) {
            finalKisiHtml = `<a href="#" onclick="kullaniciProfiliGoster(${hareket.userId}); return false;" class="text-decoration-none fw-bold text-primary"><i class="bi bi-person-badge me-1"></i>${escapeHtml(kisiIsmi)}</a><br><small class="text-muted">${escapeHtml(hareket.personel)}</small>`;
        } else {
            finalKisiHtml = `<span>${escapeHtml(kisiIsmi)}</span><br><small class="text-muted">${escapeHtml(hareket.personel)}</small>`;
        }

        const satir = `
            <tr>
                <td class="text-muted small align-middle fw-bold text-center">${escapeHtml(formatliTarih)}</td>
                <td class="fw-bold align-middle d-none d-md-table-cell text-center">${escapeHtml(hareket.urunKodu)}</td>
                <td class="align-middle">${escapeHtml(pName)}</td>
                <td class="text-center align-middle">${tipEtiketi}</td>
                <td class="fw-bold text-center align-middle ${adetRengi}">${adetIsareti}${hareket.quantity}</td>
                <td class="text-center align-middle">${finalKisiHtml}</td>
            </tr>`;
        satirlar.push(satir);
    });
    tabloGovdesi.innerHTML = satirlar.join("");
}

// Sayfalama butonlarýný oluþturur
function sayfalamayiCiz(totalPages, curPage) {
    const container = document.getElementById("paginationContainer");
    if (!container) return;
    if (totalPages <= 1) { container.innerHTML = ""; return; }

    let html = `<nav><ul class="pagination pagination-sm mb-0 shadow-sm justify-content-center mt-4">`;
    html += `<li class="page-item ${curPage === 1 ? 'disabled' : ''}"><a class="page-link page-action" href="#" data-page="${curPage - 1}">« Önceki</a></li>`;

    for (let i = 1; i <= totalPages; i++) {
        if (totalPages > 7) {
            if (i === 1 || i === totalPages || (i >= curPage - 1 && i <= curPage + 1)) {
                html += `<li class="page-item ${i === curPage ? 'active' : ''}"><a class="page-link page-action" href="#" data-page="${i}">${i}</a></li>`;
            } else if (i === 2 || i === totalPages - 1) {
                html += `<li class="page-item disabled"><span class="page-link text-muted">...</span></li>`;
            }
        } else {
            html += `<li class="page-item ${i === curPage ? 'active' : ''}"><a class="page-link page-action" href="#" data-page="${i}">${i}</a></li>`;
        }
    }

    html += `<li class="page-item ${curPage === totalPages ? 'disabled' : ''}"><a class="page-link page-action" href="#" data-page="${curPage + 1}">Sonraki »</a></li>`;
    html += `</ul></nav>`;
    container.innerHTML = html;
}

// ==========================================
// 4. EVENT LISTENER (DÝNLEYÝCÝLER)
// ==========================================
document.getElementById("paginationContainer").addEventListener("click", (e) => {
    e.preventDefault();
    const btn = e.target.closest(".page-action");
    if (btn) {
        const parentLi = btn.closest(".page-item");
        if (parentLi && (parentLi.classList.contains("disabled") || parentLi.classList.contains("active"))) return;

        const page = parseInt(btn.getAttribute("data-page"));
        if (!isNaN(page)) {
            currentPage = page;
            veriyiGuncelle();
        }
    }
});

// Aktif olan filtre butonunun rengini günceller
function aktifButonuGuncelle(aktifId) {
    const butonlar = ["btnTumu", "btnGirisler", "btnCikislar", "btnTransferler"];
    butonlar.forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;
        if (id === aktifId) {
            if (id === "btnTumu") btn.className = "btn btn-secondary btn-sm rounded-pill px-3 shadow-sm text-white filtre-elemani";
            else if (id === "btnGirisler") btn.className = "btn btn-success btn-sm rounded-pill px-3 shadow-sm text-white filtre-elemani";
            else if (id === "btnCikislar") btn.className = "btn btn-danger btn-sm rounded-pill px-3 shadow-sm text-white filtre-elemani";
            else if (id === "btnTransferler") btn.className = "btn btn-info btn-sm rounded-pill px-3 shadow-sm text-white filtre-elemani";
        } else {
            if (id === "btnTumu") btn.className = "btn btn-outline-secondary btn-sm rounded-pill px-3 shadow-sm filtre-elemani";
            else if (id === "btnGirisler") btn.className = "btn btn-outline-success btn-sm rounded-pill px-3 shadow-sm filtre-elemani";
            else if (id === "btnCikislar") btn.className = "btn btn-outline-danger btn-sm rounded-pill px-3 shadow-sm filtre-elemani";
            else if (id === "btnTransferler") btn.className = "btn btn-outline-info btn-sm rounded-pill px-3 shadow-sm filtre-elemani";
        }
    });
}

document.getElementById("btnTumu").addEventListener("click", () => {
    aktifFiltre = 'TUMU';
    aktifButonuGuncelle("btnTumu");
    currentPage = 1;
    // URL'yi tamamen temizler
    window.history.pushState({}, document.title, window.location.pathname);
    veriyiGuncelle();
});

document.getElementById("btnGirisler").addEventListener("click", () => {
    aktifFiltre = 'GIRIS';
    aktifButonuGuncelle("btnGirisler");
    currentPage = 1;
    // URL'ye filtre parametresini ekler
    window.history.pushState({}, document.title, `${window.location.pathname}?filter=GIRIS`);
    veriyiGuncelle();
});

document.getElementById("btnCikislar").addEventListener("click", () => {
    aktifFiltre = 'CIKIS';
    aktifButonuGuncelle("btnCikislar");
    currentPage = 1;
    // URL'ye filtre parametresini ekler
    window.history.pushState({}, document.title, `${window.location.pathname}?filter=CIKIS`);
    veriyiGuncelle();
});

document.getElementById("btnTransferler").addEventListener("click", () => {
    aktifFiltre = 'TRANSFER';
    aktifButonuGuncelle("btnTransferler");
    currentPage = 1;
    // URL'ye filtre parametresini ekler
    window.history.pushState({}, document.title, `${window.location.pathname}?filter=TRANSFER`);
    veriyiGuncelle();
});

document.getElementById("aramaKutusu").addEventListener("keyup", (event) => {
    aktifArama = event.target.value.toLowerCase();
    currentPage = 1;
    veriyiGuncelle();
});

// Sütun baþlýklarýna týklama olaylarýný dinler
if (document.getElementById("tarihBaslik")) document.getElementById("tarihBaslik").addEventListener("click", () => sirala("tarih"));
if (document.getElementById("thUrunKodu")) document.getElementById("thUrunKodu").addEventListener("click", () => sirala("urunKodu"));
if (document.getElementById("thUrunAdi")) document.getElementById("thUrunAdi").addEventListener("click", () => sirala("urunAdi"));
if (document.getElementById("thIslemTipi")) document.getElementById("thIslemTipi").addEventListener("click", () => sirala("islemTipi"));
if (document.getElementById("thAdet")) document.getElementById("thAdet").addEventListener("click", () => sirala("quantity"));
if (document.getElementById("thPersonel")) document.getElementById("thPersonel").addEventListener("click", () => sirala("personel"));

// ==========================================
// 5. DROPDOWNS VE YENÝ KAYIT FORMU (DEPO/RAF HÝYERARÞÝSÝ)
// ==========================================

// Ürünleri API'den çekip seçim kutusuna ekler
async function dropdownUrunleriYukle() {
    const urunSelect = document.getElementById("urunSecimi");
    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/products?pageSize=1000`, {
            method: 'GET',
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!cevap.ok) throw new Error("Ürünler alýnamadý.");

        const data = await cevap.json();
        tumUrunler = data.items || data;

        urunSelect.innerHTML = '<option value="" selected disabled>Lütfen bir ürün seçiniz...</option>';
        tumUrunler.forEach(urun => {
            const option = document.createElement("option");
            option.value = urun.barcode;
            option.textContent = `[${urun.barcode}] ${urun.name}`;
            urunSelect.appendChild(option);
        });
    } catch (hata) {
        if (urunSelect) urunSelect.innerHTML = '<option value="" selected disabled>Ürünler yüklenemedi!</option>';
    }
}

// Depolarý API'den çekip kaynak ve hedef depo seçim kutularýna ekler
async function dropdownIslemDepolariYukle() {
    const sourceSelect = document.getElementById("sourceWarehouseId");
    const targetSelect = document.getElementById("targetWarehouseId");

    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/warehouses?pageSize=1000`, {
            method: 'GET',
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!cevap.ok) throw new Error("Depolar alýnamadý.");

        const data = await cevap.json();
        const depolar = data.items || data;

        if (sourceSelect) sourceSelect.innerHTML = '<option value="" selected disabled>Önce depo seçiniz...</option>';
        if (targetSelect) targetSelect.innerHTML = '<option value="" selected disabled>Önce depo seçiniz...</option>';

        depolar.forEach(d => {
            if (sourceSelect) sourceSelect.innerHTML += `<option value="${d.id}">${escapeHtml(d.name)}</option>`;
            if (targetSelect) targetSelect.innerHTML += `<option value="${d.id}">${escapeHtml(d.name)}</option>`;
        });
    } catch (hata) {
        console.error("Depo yükleme hatasý:", hata);
    }
}

// Seçilen depoya ait raflarý getirir ve ilgili seçim kutusuna ekler
async function loadLocationsForWarehouse(warehouseId, targetDropdownId) {
    const select = document.getElementById(targetDropdownId);
    if (!select) return;

    if (!warehouseId) {
        select.innerHTML = '<option value="">Önce depo seçin...</option>';
        select.disabled = true;
        return;
    }

    select.innerHTML = '<option value="">Yükleniyor...</option>';
    select.disabled = false;

    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/locations/by-warehouse/${warehouseId}?pageSize=1000`, {
            method: 'GET',
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!cevap.ok) throw new Error("Raflar alýnamadý.");

        const data = await cevap.json();
        const raflar = data.items || data;

        select.innerHTML = '<option value="" selected disabled>Raf seçiniz...</option>';
        raflar.forEach(r => {
            select.innerHTML += `<option value="${r.id}">${escapeHtml(r.code)}</option>`;
        });
    } catch (hata) {
        select.innerHTML = '<option value="">Hata oluþtu!</option>';
    }
}

// Depo deðiþim olaylarýný dinler ve ilgili raf listesini günceller
const sWarehouseDropdown = document.getElementById("sourceWarehouseId");
const tWarehouseDropdown = document.getElementById("targetWarehouseId");
if (sWarehouseDropdown) sWarehouseDropdown.addEventListener("change", function () { loadLocationsForWarehouse(this.value, "sourceLocationId"); });
if (tWarehouseDropdown) tWarehouseDropdown.addEventListener("change", function () { loadLocationsForWarehouse(this.value, "targetLocationId"); });

// Formdaki zorunlu alanlarýn doluluðunu kontrol eder ve kaydet butonunu aktif/pasif yapar
function formuDenetle() {
    const tipElement = document.getElementById("islemTipi");
    const urunElement = document.getElementById("urunSecimi");
    const adetElement = document.getElementById("islemAdedi");
    const sourceLocElement = document.getElementById("sourceLocationId");
    const targetLocElement = document.getElementById("targetLocationId");
    const kaydetButonu = document.getElementById("btnKaydet");

    if (!kaydetButonu) return;

    const tip = tipElement ? tipElement.value : "";
    const urun = urunElement ? urunElement.value : "";
    const adet = adetElement ? adetElement.value : "";
    const sourceLoc = sourceLocElement ? sourceLocElement.value : "";
    const targetLoc = targetLocElement ? targetLocElement.value : "";

    let gecerli = (tip !== "" && urun !== "" && adet && parseInt(adet) > 0 && parseInt(adet) <= MAX_ISLEM_ADEDI);

    if (gecerli) {
        if (tip === "GIRIS" && targetLoc === "") gecerli = false;
        else if (tip === "CIKIS" && sourceLoc === "") gecerli = false;
        else if (tip === "TRANSFER" && (sourceLoc === "" || targetLoc === "" || sourceLoc === targetLoc)) gecerli = false;
    }
    kaydetButonu.disabled = !gecerli;
}

// Ýþlem tipine göre kaynak veya hedef lokasyon alanlarýný gösterir/gizler
const islemTipiDropdown = document.getElementById("islemTipi");
if (islemTipiDropdown) {
    islemTipiDropdown.addEventListener("change", (e) => {
        const tip = e.target.value;
        const sourceGroup = document.getElementById("sourceLocationGroup");
        const targetGroup = document.getElementById("targetLocationGroup");

        // Senin orijinal kodundaki ekstra gruplarý (varsa) bozmadan gizle/göster yapar
        const tGroup = document.getElementById("tedarikciGroup");
        const cGroup = document.getElementById("cikisNoktasiGroup");

        if (tip === "GIRIS") {
            if (targetGroup) targetGroup.classList.remove("d-none");
            if (sourceGroup) sourceGroup.classList.add("d-none");
            if (tGroup) tGroup.classList.remove("d-none");
            if (cGroup) cGroup.classList.add("d-none");

            const sLoc = document.getElementById("sourceLocationId");
            if (sLoc) sLoc.value = "";
        } else if (tip === "CIKIS") {
            if (sourceGroup) sourceGroup.classList.remove("d-none");
            if (targetGroup) targetGroup.classList.add("d-none");
            if (cGroup) cGroup.classList.remove("d-none");
            if (tGroup) tGroup.classList.add("d-none");

            const tLoc = document.getElementById("targetLocationId");
            if (tLoc) tLoc.value = "";
        } else if (tip === "TRANSFER") {
            if (sourceGroup) sourceGroup.classList.remove("d-none");
            if (targetGroup) targetGroup.classList.remove("d-none");
            if (tGroup) tGroup.classList.add("d-none");
            if (cGroup) cGroup.classList.add("d-none");
        }
        formuDenetle();
    });
}

// Alanlardaki deðiþiklikleri dinler
["urunSecimi", "islemAdedi", "sourceLocationId", "targetLocationId"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", formuDenetle);
});
const islemAdediInput = document.getElementById("islemAdedi");
if (islemAdediInput) islemAdediInput.addEventListener("input", formuDenetle);

// Form gönderildiðinde verileri toplayýp API'ye POST isteði atar
const stokIslemFormu = document.getElementById("stokIslemFormu");
if (stokIslemFormu) {
    stokIslemFormu.addEventListener("submit", async (e) => {
        e.preventDefault();

        const tip = document.getElementById("islemTipi").value;
        const barcode = document.getElementById("urunSecimi").value;
        const qty = parseInt(document.getElementById("islemAdedi").value);

        const sourceLocElement = document.getElementById("sourceLocationId");
        const targetLocElement = document.getElementById("targetLocationId");
        const sourceLocVal = sourceLocElement ? sourceLocElement.value : null;
        const targetLocVal = targetLocElement ? targetLocElement.value : null;

        const kaydetButonu = document.getElementById("btnKaydet");

        // Orijinal deðiþkenlerini korur, HTML'de yoksa null atanýr
        const bFiyatElement = document.getElementById("birimFiyat");
        const fNoElement = document.getElementById("faturaNo");
        const tIdElement = document.getElementById("tedarikciSecimi");
        const cNoktasiElement = document.getElementById("cikisNoktasi");

        const bFiyat = bFiyatElement ? parseFloat(bFiyatElement.value) || 0 : 0;
        const fNo = fNoElement ? fNoElement.value : null;
        const tId = tIdElement ? tIdElement.value : null;
        const cNoktasi = cNoktasiElement ? cNoktasiElement.value : null;

        const payload = {
            productBarcode: barcode,
            movementType: tip === "GIRIS" ? "IN" : tip === "CIKIS" ? "OUT" : "TRANSFER",
            quantity: qty,
            sourceLocationId: ((tip === "CIKIS" || tip === "TRANSFER") && sourceLocVal) ? parseInt(sourceLocVal) : null,
            targetLocationId: ((tip === "GIRIS" || tip === "TRANSFER") && targetLocVal) ? parseInt(targetLocVal) : null,
            description: tip === "GIRIS" ? "Stok Giriþi" : tip === "CIKIS" ? "Stok Çýkýþý" : "Raf Arasý Transfer",
            unitPrice: bFiyat,
            documentNumber: fNo ? fNo : null,
            supplierId: (tip === "GIRIS" && tId) ? parseInt(tId) : null,
            destinationId: (tip === "CIKIS" && cNoktasi) ? cNoktasi : null
        };

        try {
            const orjinalMetin = kaydetButonu.innerText;
            kaydetButonu.disabled = true;
            kaydetButonu.innerText = "Ýþleniyor...";

            const cevap = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (cevap.status === 401) { localStorage.removeItem('token'); window.location.href = 'login.html'; return; }
            if (cevap.status === 409) throw new Error("Stok çakýþmasý hatasý! Lütfen tekrar deneyin.");
            if (!cevap.ok) throw new Error(await cevap.text() || "Ýþlem kaydedilemedi.");

            const modalElement = document.getElementById("stokIslemModal");
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) modalInstance.hide();

            document.getElementById("stokIslemFormu").reset();

            const sourceGroup = document.getElementById("sourceLocationGroup");
            const targetGroup = document.getElementById("targetLocationGroup");
            if (sourceGroup) sourceGroup.classList.add("d-none");
            if (targetGroup) targetGroup.classList.add("d-none");

            await hareketleriYukle();
            kaydetButonu.innerText = orjinalMetin;
        } catch (hata) {
            alert("Hata: " + hata.message);
            kaydetButonu.disabled = false;
            kaydetButonu.innerText = "Ekle ve Onayla";
        }
    });
}

// Modal açýldýðýnda alanlarý temizler ve verileri günceller
const modalTrigger = document.querySelector('[data-bs-target="#stokIslemModal"]');
if (modalTrigger) {
    modalTrigger.addEventListener("click", () => {
        const form = document.getElementById("stokIslemFormu");
        if (form) form.reset();

        const sourceGroup = document.getElementById("sourceLocationGroup");
        const targetGroup = document.getElementById("targetLocationGroup");
        if (sourceGroup) sourceGroup.classList.add("d-none");
        if (targetGroup) targetGroup.classList.add("d-none");

        const btn = document.getElementById("btnKaydet");
        if (btn) btn.disabled = true;

        dropdownIslemDepolariYukle();
        dropdownUrunleriYukle();
    });
}

// ==========================================
// 6. KAMERA BARKOD OKUYUCU MANTIÐI
// ==========================================

const cameraArea = document.getElementById("kameraAlani");
const btnOpenCamera = document.getElementById("btnKameraAc");
const btnCloseCamera = document.getElementById("btnKameraKapat");
const productSelect = document.getElementById("urunSecimi");

// Kamera okuyucusunu baþlatýr ve taranan barkodu ürün listesinde arar
if (btnOpenCamera) {
    btnOpenCamera.addEventListener("click", () => {
        cameraArea.classList.remove("d-none");
        startScanner("reader", (scannedText) => {
            let isProductFound = false;
            if (productSelect) {
                for (let i = 0; i < productSelect.options.length; i++) {
                    if (productSelect.options[i].value === scannedText) {
                        productSelect.selectedIndex = i;
                        isProductFound = true;
                        break;
                    }
                }
            }
            if (isProductFound) {
                let audio = new Audio('https://www.soundjay.com/button/beep-07.wav');
                audio.play().catch(() => { });
                formuDenetle();
                closeCamera();
            } else {
                alert(`Taranan barkod (${scannedText}) bulunamadý!`);
            }
        }, () => { });
    });
}

if (btnCloseCamera) btnCloseCamera.addEventListener("click", closeCamera);

function closeCamera() {
    if (cameraArea) cameraArea.classList.add("d-none");
    stopScanner();
}

// ==========================================
// BAÞLATICI VE PROFÝL
// ==========================================

// Tedarikçileri API'den çeker ve listeye ekler
async function dropdownTedarikcileriYukle() {
    const tedarikciSelect = document.getElementById("tedarikciSecimi");
    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/suppliers`, {
            method: 'GET',
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!cevap.ok) throw new Error("Tedarikçiler alýnamadý.");
        const data = await cevap.json();

        if (tedarikciSelect) {
            tedarikciSelect.innerHTML = '<option value="" selected disabled>Tedarikçi seçiniz (Opsiyonel)</option>';
            data.forEach(t => {
                const option = document.createElement("option");
                option.value = t.id;
                option.textContent = t.name;
                tedarikciSelect.appendChild(option);
            });
        }
    } catch (hata) {
        if (tedarikciSelect) tedarikciSelect.innerHTML = '<option value="" selected disabled>Yüklenemedi!</option>';
    }
}

// Sayfa yüklendiðinde gerekli dropdown ve tablo verilerini baþlatýr
async function baslat() {
    await dropdownTedarikcileriYukle();
    await hareketleriYukle();

    // URL'den gelen filtreye göre ilgili butonun rengini aktif yapar
    if (aktifFiltre === 'GIRIS') {
        aktifButonuGuncelle("btnGirisler");
    } else if (aktifFiltre === 'CIKIS') {
        aktifButonuGuncelle("btnCikislar");
    } else if (aktifFiltre === 'TRANSFER') {
        aktifButonuGuncelle("btnTransferler");
    }
}
baslat();

// Seçilen kullanýcýnýn detaylý profil bilgisini modal içinde gösterir
async function kullaniciProfiliGoster(userId) {
    try {
        const yanit = await fetch(`${CONFIG.API_BASE_URL}/users/${userId}`, {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            }
        });
        if (!yanit.ok) throw new Error("Kullanýcý bilgileri alýnamadý.");
        const user = await yanit.json();

        document.getElementById('upmName').textContent = `${user.firstName || ''} ${user.lastName || ''}`;
        document.getElementById('upmEmail').textContent = user.email || '';
        document.getElementById('upmRole').textContent = user.role || 'viewer';
        document.getElementById('upmDate').textContent = new Date(user.createdAt).toLocaleDateString("tr-TR");

        const emailStatusSpan = document.getElementById('upmEmailStatus');
        if (user.isEmailConfirmed) {
            emailStatusSpan.innerHTML = '<span class="badge bg-success rounded-pill"><i class="bi bi-check-lg"></i> Onaylý</span>';
        } else {
            emailStatusSpan.innerHTML = '<span class="badge bg-danger rounded-pill">Onaysýz</span>';
        }

        bootstrap.Modal.getOrCreateInstance(document.getElementById('userProfileModal')).show();
    } catch (hata) {
        alert("Profil yüklenirken bir hata oluþtu: " + hata.message);
    }
}
