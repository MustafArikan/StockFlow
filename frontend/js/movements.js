// =========================================================================
// API VE TEMEL DEĞİŞKENLER
// =========================================================================
const API_URL = `${CONFIG.API_BASE_URL}/stock/movements`;
const token = localStorage.getItem('token');

if (!token) window.location.href = 'login.html';

const MAX_ISLEM_ADEDI = 100000;
const urlParams = new URLSearchParams(window.location.search);
const urlFilter = urlParams.get('filter');

let tumUrunler = [];
let aktifFiltre = urlFilter ? urlFilter : 'TUMU';

// =========================================================================
// TABLO (DATAVIEW) MOTORU VE RENDER İŞLEMLERİ
// =========================================================================
const hareketView = createDataView({
    containerId: "stokHareketleriGovdesi",
    paginationContainerId: "hareketSayfalamaContainer",
    mode: 'table',
    emptyColspan: 6,
    emptyMessage: "Kayıt bulunamadı.",
    pageSize: 10,
    fetchPage: async (page, size) => {
        const sd = document.getElementById('startDate')?.value || '';
        const ed = document.getElementById('endDate')?.value || '';

        let url = `/stock/movements?pageNumber=${page}&pageSize=${size}`;
        if (sd) url += `&startDate=${sd}`;
        if (ed) url += `&endDate=${ed}`;

        if (aktifFiltre !== 'TUMU') {
            url += `&type=${aktifFiltre === 'GIRIS' ? 'IN' : aktifFiltre === 'CIKIS' ? 'OUT' : 'TRANSFER'}`;
        }

        const arama = document.getElementById("aramaKutusu")?.value || "";
        if (arama) url += `&search=${encodeURIComponent(arama)}`;

        const response = await apiRequest(url, 'GET');
        return {
            items: response.items || response.data || response || [],
            totalItems: response.totalRecords || response.totalCount || (response.items ? response.items.length : response.length)
        };
    },
    renderRow: (hareket) => {
        let nType = hareket.movementType || hareket.islemTipi || hareket.type;
        let isGiris = nType === "IN" || nType === "GIRIS";

        let tipEtiketi = isGiris
            ? `<span class="badge bg-success bg-opacity-10 text-success border border-success px-2 py-1 rounded-pill">STOK GİRİŞİ</span>`
            : nType === "TRANSFER"
                ? `<span class="badge bg-primary bg-opacity-10 text-primary border border-primary px-2 py-1 rounded-pill">STOK TRANSFERİ</span>`
                : `<span class="badge bg-danger bg-opacity-10 text-danger border border-danger px-2 py-1 rounded-pill">STOK ÇIKIŞI</span>`;

        let adetRengi = isGiris ? "text-success" : nType === "TRANSFER" ? "text-primary" : "text-danger";
        let adetIsareti = isGiris ? "+" : nType === "TRANSFER" ? "⇄" : "-";

        const formatliTarih = new Date(hareket.tarih || hareket.createdAt || hareket.date || Date.now()).toLocaleString('tr-TR');

        let pCode = hareket.urunKodu || hareket.productCode || hareket.barcode || '-';
        let pName = hareket.urunAdi || hareket.urunAdı || hareket.productName || hareket.name || '-';

        let kisiIsmi = hareket.personelName || hareket.personel || hareket.userName || hareket.fullName || 'Sistem';
        let kisiMail = hareket.userEmail || hareket.email || '';
        let finalKisiHtml = "";

        let uId = hareket.userId || hareket.id;

        if (uId) {
            let kisiAdElementi = `<a href="#" class="text-decoration-none fw-bold text-primary" data-action="view-profile" data-user-id="${uId}">${escapeHtml(kisiIsmi)}</a>`;
            finalKisiHtml = `
            <div class="d-flex flex-column align-items-center justify-content-center">
                ${kisiAdElementi}
                ${kisiMail ? `<small class="text-muted text-truncate mw-150 fs-075rem">${escapeHtml(kisiMail)}</small>` : ''}
            </div>`;
        }

        // Tıklanabilir Ürün Detay Linki
        let pCodeHtml = (pCode && pCode !== '-')
            ? `<a href="products.html?viewProductBarcode=${encodeURIComponent(pCode)}" 
                  class="btn btn-sm btn-outline-secondary rounded-pill d-inline-flex align-items-center shadow-sm text-decoration-none cursor-pointer" 
                  title="Tıklayarak ürün detayına git">                 
                  <span class="fw-bold">${escapeHtml(pCode)}</span>
               </a>`
            : `<span class="text-muted">-</span>`;

        return `
            <tr>
                <td class="text-muted small align-middle fw-bold text-center">${escapeHtml(formatliTarih)}</td>
                <td class="align-middle text-center">${pCodeHtml}</td>
                <td class="align-middle">${escapeHtml(pName)}</td>
                <td class="text-center align-middle">${tipEtiketi}</td>
                <td class="fw-bold text-center align-middle ${adetRengi}">${adetIsareti}${hareket.quantity}</td>
                <td class="text-center align-middle">${finalKisiHtml}</td>
            </tr>`;
    }
});

// Profil Görüntüleme Olay Dinleyicisi
const tabloGovdesi = document.getElementById("stokHareketleriGovdesi");
tabloGovdesi?.addEventListener('click', (e) => {
    const profileLink = e.target.closest('[data-action="view-profile"]');
    if (profileLink) {
        e.preventDefault();
        const userId = profileLink.getAttribute('data-user-id');
        if (userId) {
            kullaniciProfiliGoster(userId);
        }
    }
});

// =========================================================================
// FİLTRELEME VE ARAMA KONTROLLERİ
// =========================================================================
function aktifButonuGuncelle(aktifId) {
    const butonlar = ["btnTumu", "btnGirisler", "btnCikislar", "btnTransferler"];
    butonlar.forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;

        btn.classList.remove("btn-secondary", "btn-success", "btn-danger", "btn-info", "text-white");
        btn.classList.remove("btn-outline-secondary", "btn-outline-success", "btn-outline-danger", "btn-outline-info");

        if (id === aktifId) {
            if (id === "btnTumu") btn.classList.add("btn-secondary", "text-white");
            else if (id === "btnGirisler") btn.classList.add("btn-success", "text-white");
            else if (id === "btnCikislar") btn.classList.add("btn-danger", "text-white");
            else if (id === "btnTransferler") btn.classList.add("btn-info", "text-white");
        } else {
            if (id === "btnTumu") btn.classList.add("btn-outline-secondary");
            else if (id === "btnGirisler") btn.classList.add("btn-outline-success");
            else if (id === "btnCikislar") btn.classList.add("btn-outline-danger");
            else if (id === "btnTransferler") btn.classList.add("btn-outline-info");
        }
    });
}

document.getElementById("btnTumu")?.addEventListener("click", () => {
    aktifFiltre = 'TUMU';
    aktifButonuGuncelle("btnTumu");
    window.history.pushState({}, document.title, window.location.pathname);
    hareketView.load(1);
});

document.getElementById("btnGirisler")?.addEventListener("click", () => {
    aktifFiltre = 'GIRIS';
    aktifButonuGuncelle("btnGirisler");
    window.history.pushState({}, document.title, `${window.location.pathname}?filter=GIRIS`);
    hareketView.load(1);
});

document.getElementById("btnCikislar")?.addEventListener("click", () => {
    aktifFiltre = 'CIKIS';
    aktifButonuGuncelle("btnCikislar");
    window.history.pushState({}, document.title, `${window.location.pathname}?filter=CIKIS`);
    hareketView.load(1);
});

document.getElementById("btnTransferler")?.addEventListener("click", () => {
    aktifFiltre = 'TRANSFER';
    aktifButonuGuncelle("btnTransferler");
    window.history.pushState({}, document.title, `${window.location.pathname}?filter=TRANSFER`);
    hareketView.load(1);
});

document.getElementById("startDate")?.addEventListener("change", () => hareketView.load(1));
document.getElementById("endDate")?.addEventListener("change", () => hareketView.load(1));

document.getElementById("btnFiltreleriTemizle")?.addEventListener("click", () => {
    document.getElementById("aramaKutusu").value = "";
    document.getElementById("startDate").value = "";
    document.getElementById("endDate").value = "";
    document.getElementById("btnTumu").click();
});

let aramaTimeout = null;
document.getElementById("aramaKutusu")?.addEventListener("input", (event) => {
    clearTimeout(aramaTimeout);
    aramaTimeout = setTimeout(() => {
        hareketView.load(1);
    }, 300);
});

// =========================================================================
// FİZİKSEL BARKOD OKUYUCU - ARAMA İÇİN
// =========================================================================
function initPhysicalScannerListener() {

    let scannerBuffer = "";
    let scannerTimer = null;
    const SCANNER_TIMEOUT_MS = 100; // Barkod okuyucunun tuş vuruş hızı
    const MIN_BARCODE_LENGTH = 1;   // Minimum geçerli barkod uzunluğu

    document.addEventListener("keydown", (e) => {
        // Kullanıcı bir input alanındaysa müdahale etme
        const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable;
        if (isInputFocused) return;

        // Barkod okuyucu işlemi bitirince cihaz tarafından "Enter" tuşu gönderilir
        if (e.key === "Enter") {
            if (scannerBuffer.length > MIN_BARCODE_LENGTH) {
                e.preventDefault();
                _uygulaFizikselArama(scannerBuffer); // İşlemi ayrı bir fonksiyona devret
            }
            scannerBuffer = "";
            clearTimeout(scannerTimer);
            return;
        }

        if (e.key.length === 1) {
            scannerBuffer += e.key;

            clearTimeout(scannerTimer);
            scannerTimer = setTimeout(() => {
                scannerBuffer = "";
            }, SCANNER_TIMEOUT_MS);
        }
    });

    // Sadece UI işlemlerini yapan özel fonksiyon
    function _uygulaFizikselArama(scannedText) {
        const aramaKutusu = document.getElementById("aramaKutusu");
        if (aramaKutusu) {
            aramaKutusu.value = scannedText;

            // "Tümü" filtresine geçir ve tabloyu yenile
            aktifFiltre = 'TUMU';
            if (typeof aktifButonuGuncelle === 'function') aktifButonuGuncelle("btnTumu");

            window.history.pushState({}, document.title, window.location.pathname);

            if (typeof hareketView !== 'undefined') hareketView.load(1);
            if (typeof basariToast === 'function') basariToast(`Barkod okundu: ${scannedText}`);
        }
    }
}


// =========================================================================
// KAMERA İLE ARAMA ENTEGRASYONU
// =========================================================================
function initMovementSearchCamera() {
    const btnKameraAcArama = document.getElementById("btnKameraAcArama");
    const scannerModalHareketlerEl = document.getElementById("scannerModalHareketler");

    if (btnKameraAcArama && scannerModalHareketlerEl) {
        let modalInstance = null;

        btnKameraAcArama.addEventListener("click", async () => {
            try {
                // Kamera izinlerini denetler
                if (typeof checkCameraPermission === 'function') {
                    await checkCameraPermission();
                }

                // Modalı oluştur ve göster
                if (!modalInstance) {
                    modalInstance = new bootstrap.Modal(scannerModalHareketlerEl);
                }
                modalInstance.show();

                document.getElementById("kameraDurumHareketler").classList.remove("d-none");


                let isProcessingQR = false; // Kilidi tanımlıyoruz

                // Kamerayı başlat ve barkod okunduğunda tetiklenecek fonksiyonu yazar
                await startScanner("readerHareketler", (scannedText) => {
                    // Eğer kilit kapalıysa diğer gelenleri yoksay
                    if (isProcessingQR) return;
                    isProcessingQR = true; // Kapıyı kilitle

                    // Modalın kapanma animasyonunu BEKLEMEDEN kamerayı durdur
                    if (typeof stopScanner === 'function') stopScanner();

                    const aramaKutusu = document.getElementById("aramaKutusu");
                    if (aramaKutusu) {
                        aramaKutusu.value = scannedText;

                        aktifFiltre = 'TUMU';
                        if (typeof aktifButonuGuncelle === 'function') aktifButonuGuncelle("btnTumu");
                        window.history.pushState({}, document.title, window.location.pathname);

                        if (typeof hareketView !== 'undefined') hareketView.load(1);
                        if (typeof basariToast === 'function') basariToast(`Barkod okundu: ${scannedText}`);
                    }

                    modalInstance.hide();

                    //  İşlem tamamen bittikten sonra kilidi geri aç
                    setTimeout(() => {
                        isProcessingQR = false;
                    }, 1000);

                }, () => { });
            } catch (error) {
                const hataMetni = error?.message ? error.message : "Kamera başlatılamadı.";
                if (typeof uyariGoster === "function") {
                    uyariGoster(hataMetni);
                } else {
                    alert(hataMetni);
                }
            }
        });

        // Modal kapandığında kamerayı serbest bırakır
        scannerModalHareketlerEl.addEventListener('hidden.bs.modal', () => {
            if (typeof stopScanner === 'function') stopScanner();
        });
    }
}

// =========================================================================
// YENİ İŞLEM (FORM) İŞLEMLERİ VE KAMERASI
// =========================================================================
async function dropdownUrunleriYukle() {
    const urunSelect = document.getElementById("urunSecimi");
    if (tumUrunler.length > 0 && urunSelect && urunSelect.options.length > 1) return;

    try {
        const data = await apiRequest('/products?pageSize=10000', 'GET');
        tumUrunler = data.items || data;

        if (urunSelect) {
            urunSelect.innerHTML = '<option value="" selected disabled>Lütfen bir ürün seçiniz...</option>';
            tumUrunler.forEach(urun => {
                const option = document.createElement("option");
                const uId = urun.id ?? urun.Id;
                const uBarcode = urun.barcode ?? urun.Barcode ?? '';
                const uName = urun.name ?? urun.Name ?? '';

                option.value = uId;
                option.textContent = `[${uBarcode}] ${uName}`;
                urunSelect.appendChild(option);
            });
        }
    } catch (hata) {
        if (urunSelect) urunSelect.innerHTML = '<option value="" selected disabled>Ürünler yüklenemedi!</option>';
    }
}

async function dropdownIslemDepolariYukle() {
    if (typeof StockUtils === 'undefined') return;

    const tip = document.getElementById("islemTipi")?.value;
    const selectedProductId = document.getElementById("urunSecimi")?.value;

    // İşlem tipi seçilmediyse kilitli tut
    if (!tip) {
        StockUtils._resetDropdown('sourceWarehouseId', 'Önce işlem tipi seçin...', true);
        StockUtils._resetDropdown('targetWarehouseId', 'Önce işlem tipi seçin...', true);
        return;
    }

    //  Ürün seçilmediyse HİÇBİR işlemi açma
    if (!selectedProductId) {
        StockUtils._resetDropdown('sourceWarehouseId', 'Önce ürün seçiniz...', true);
        StockUtils._resetDropdown('sourceLocationId', 'Önce depo seçiniz...', true);
        StockUtils._resetDropdown('targetWarehouseId', 'Önce ürün seçiniz...', true);
        StockUtils._resetDropdown('targetLocationId', 'Önce depo seçiniz...', true);
        return;
    }

    if (tip === "GIRIS" || tip === "IN") {
        await StockUtils.loadAllWarehouses('targetWarehouseId');
        StockUtils._resetDropdown('targetLocationId', 'Önce depo seçin...', true);
    }
    else if (tip === "CIKIS" || tip === "OUT") {
        await StockUtils.loadSmartWarehousesForProduct(selectedProductId, 'sourceWarehouseId', 'sourceLocationId');
    }
    else if (tip === "TRANSFER") {
        // TRANSFER işleminde hem ürüne ait Kaynak depolar hem de gideceği Tüm Hedef depolar yüklenmelidir
        await StockUtils.loadSmartWarehousesForProduct(selectedProductId, 'sourceWarehouseId', 'sourceLocationId');
        await StockUtils.loadAllWarehouses('targetWarehouseId');
        StockUtils._resetDropdown('targetLocationId', 'Önce depo seçin...', true);
    }
}

// Ürün Seçildiğinde Çalışacak Akıllı WMS Motoru
const urunSecimiEl = document.getElementById("urunSecimi");
if (urunSecimiEl) {
    urunSecimiEl.addEventListener("change", async function () {
        // Ürün değiştiğinde eski raf stok bilgisini ekrandan gizler
        document.getElementById("targetLocationStockInfo")?.classList.add("d-none");
        await dropdownIslemDepolariYukle();
        formuDenetle();
    });
}

// İşlem Tipi (GIRIS/CIKIS/TRANSFER) Değiştiğinde Tetikleyici
const islemTipiEl = document.getElementById("islemTipi");
if (islemTipiEl) {
    islemTipiEl.addEventListener("change", async function () {
        const tip = this.value;
        const sourceGroup = document.getElementById("sourceLocationGroup");
        const targetGroup = document.getElementById("targetLocationGroup");
        const tGroup = document.getElementById("tedarikciGroup");
        const cGroup = document.getElementById("cikisNoktasiGroup");

        formGruplariniGizle(); // İşlem gruplarını ve stok bilgisini temizler

        if (tip === "GIRIS") {
            targetGroup?.classList.remove("d-none");
            tGroup?.classList.remove("d-none");
            const sLoc = document.getElementById("sourceLocationId");
            if (sLoc) sLoc.value = "";
        } else if (tip === "CIKIS") {
            sourceGroup?.classList.remove("d-none");
            cGroup?.classList.remove("d-none");
            const tLoc = document.getElementById("targetLocationId");
            if (tLoc) tLoc.value = "";
        } else if (tip === "TRANSFER") {
            sourceGroup?.classList.remove("d-none");
            targetGroup?.classList.remove("d-none");
        }

        await dropdownIslemDepolariYukle();
        formuDenetle();
    });
}

// Çıkış/Transfer İçin Kaynak Depo Seçildiğinde İçi Dolu Rafları Getir
const sWarehouseDropdown = document.getElementById("sourceWarehouseId");
if (sWarehouseDropdown) {
    sWarehouseDropdown.addEventListener("change", function () {
        if (typeof StockUtils !== 'undefined') {
            StockUtils.fillSmartLocationsForWarehouse(this.value, 'sourceLocationId');
        }
        formuDenetle();
    });
}

// Giriş İçin Hedef Depo Seçildiğinde Tüm Rafları Getir
const tWarehouseDropdown = document.getElementById("targetWarehouseId");
if (tWarehouseDropdown) {
    tWarehouseDropdown.addEventListener("change", function () {
        // Depo değiştirildiğinde eski raf stok bilgisini gizler
        document.getElementById("targetLocationStockInfo")?.classList.add("d-none");
        if (typeof StockUtils !== 'undefined') {
            StockUtils.loadAllLocations(this.value, 'targetLocationId');
        }
        formuDenetle();
    });
}

// Giriş İçin Hedef Raf Seçildiğinde Stok Miktarını Getir
const targetLocationDropdown = document.getElementById("targetLocationId");
if (targetLocationDropdown) {
    targetLocationDropdown.addEventListener("change", async function () {
        const locationId = this.value;
        const productId = document.getElementById("urunSecimi")?.value;
        const infoDiv = document.getElementById("targetLocationStockInfo");
        const valSpan = document.getElementById("targetLocationStockValue");

        if (locationId && productId && infoDiv && valSpan) {
            try {
                // Seçilen ürünün, seçilen raftaki anlık stok durumunu getiriyoruz
                const stockData = await apiRequest(`/stock-levels/by-product/${productId}`, 'GET');
                const rafStogu = stockData.find(s => s.locationId === parseInt(locationId, 10));

                // Stok varsa sayıyı yaz, yoksa 0 yaz
                valSpan.textContent = rafStogu ? rafStogu.quantity : "0";
                infoDiv.classList.remove('d-none');
            } catch (e) {
                infoDiv.classList.add('d-none');
            }
        } else if (infoDiv) {
            infoDiv.classList.add('d-none');
        }
        formuDenetle();
    });
}

// İşlem gruplarını ve stok bilgisini temizler
function formGruplariniGizle() {
    document.getElementById("sourceLocationGroup")?.classList.add("d-none");
    document.getElementById("targetLocationGroup")?.classList.add("d-none");
    document.getElementById("tedarikciGroup")?.classList.add("d-none");
    document.getElementById("cikisNoktasiGroup")?.classList.add("d-none");
    document.getElementById("targetLocationStockInfo")?.classList.add("d-none");
}

function formuDenetle() {
    const tip = document.getElementById("islemTipi").value;
    const urun = document.getElementById("urunSecimi").value;
    const adet = document.getElementById("islemAdedi").value;
    const sourceLoc = document.getElementById("sourceLocationId").value;
    const targetLoc = document.getElementById("targetLocationId").value;
    const kaydetButonu = document.getElementById("btnKaydet");

    if (!kaydetButonu) return;

    // Miktardan bağımsız olarak sadece raf durumunu kontrol et
    let ayniRafHatasi = false;
    if (tip === "TRANSFER" && sourceLoc !== "" && targetLoc !== "" && sourceLoc === targetLoc) {
        ayniRafHatasi = true;
    }

    // Formun genel geçerliliğini kontrol et
    let miktarGecerli = (adet && parseInt(adet) > 0 && parseInt(adet) <= MAX_ISLEM_ADEDI);
    let gecerli = (tip !== "" && urun !== "" && miktarGecerli && !ayniRafHatasi);

    if (gecerli) {
        if (tip === "GIRIS" && targetLoc === "") gecerli = false;
        else if (tip === "CIKIS" && sourceLoc === "") gecerli = false;
    }

    kaydetButonu.disabled = !gecerli;

    // Aynı raf seçildiyse ekrana kırmızı uyarı bas, seçilmediyse sil
    const uyariId = "ayniRafUyarisiUI";
    let uyariElementi = document.getElementById(uyariId);

    if (ayniRafHatasi) {
        if (!uyariElementi) {
            const uyariHtml = `<div id="${uyariId}" class="text-danger small fw-bold mt-2"><i class="bi bi-exclamation-triangle"></i> Kaynak ve Hedef raf aynı olamaz! Lütfen farklı bir raf seçin.</div>`;
            document.getElementById("targetLocationGroup").insertAdjacentHTML('beforeend', uyariHtml);
        }
    } else {
        if (uyariElementi) uyariElementi.remove();
    }
}

["urunSecimi", "islemAdedi", "sourceLocationId", "targetLocationId"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", formuDenetle);
});
const islemAdediInput = document.getElementById("islemAdedi");
if (islemAdediInput) islemAdediInput.addEventListener("input", formuDenetle);

// TEST KULLANICISININ KAYIT ETMESİNİ ENGELLEYEN HATA GİDERİLDİ
const stokIslemFormu = document.getElementById("stokIslemFormu");
if (stokIslemFormu) {
    stokIslemFormu.addEventListener("submit", async (e) => {
        e.preventDefault();

        const tip = document.getElementById("islemTipi").value;
        const secilenUrunId = document.getElementById("urunSecimi").value;
        const qty = parseInt(document.getElementById("islemAdedi").value);

        const secilenUrun = tumUrunler.find(u => (u.id ?? u.Id).toString() === secilenUrunId);
        const secilenBarkod = secilenUrun ? (secilenUrun.barcode ?? secilenUrun.Barcode) : "";

        const sourceLocElement = document.getElementById("sourceLocationId");
        const targetLocElement = document.getElementById("targetLocationId");
        const sourceLocVal = sourceLocElement ? sourceLocElement.value : null;
        const targetLocVal = targetLocElement ? targetLocElement.value : null;

        const kaydetButonu = document.getElementById("btnKaydet");
        const bFiyatElement = document.getElementById("birimFiyat");
        const fNoElement = document.getElementById("faturaNo");
        const tIdElement = document.getElementById("tedarikciSecimi");
        const cNoktasiElement = document.getElementById("cikisNoktasi");

        const bFiyat = bFiyatElement ? parseFloat(bFiyatElement.value) || 0 : 0;
        const fNo = fNoElement ? fNoElement.value : null;
        const tId = tIdElement ? tIdElement.value : null;
        const cNoktasi = cNoktasiElement ? cNoktasiElement.value : null;

        const payload = {
            productId: parseInt(secilenUrunId, 10),
            productBarcode: secilenBarkod,
            movementType: tip === "GIRIS" ? "IN" : tip === "CIKIS" ? "OUT" : "TRANSFER",
            quantity: qty,
            sourceLocationId: ((tip === "CIKIS" || tip === "TRANSFER") && sourceLocVal && !isNaN(parseInt(sourceLocVal))) ? parseInt(sourceLocVal) : null,
            targetLocationId: ((tip === "GIRIS" || tip === "TRANSFER") && targetLocVal && !isNaN(parseInt(targetLocVal))) ? parseInt(targetLocVal) : null,
            description: tip === "GIRIS" ? "Stok Girişi" : tip === "CIKIS" ? "Stok Çıkışı" : "Raf Arası Transfer",
            unitPrice: bFiyat,
            documentNumber: fNo && fNo.trim() !== "" ? fNo : null,
            supplierId: (tip === "GIRIS" && tId && tId !== "" && !isNaN(parseInt(tId))) ? parseInt(tId) : null,
            destination: (tip === "CIKIS" && cNoktasi && cNoktasi.trim() !== "") ? cNoktasi : null
        };

        try {
            const orjinalMetin = kaydetButonu.innerText;
            kaydetButonu.disabled = true;
            kaydetButonu.innerText = "İşleniyor...";

            await apiRequest('/stock/movements', 'POST', payload);

            const modalElement = document.getElementById("stokIslemModal");
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) modalInstance.hide();

            document.getElementById("stokIslemFormu").reset();

            const sourceGroup = document.getElementById("sourceLocationGroup");
            const targetGroup = document.getElementById("targetLocationGroup");
            if (sourceGroup) sourceGroup.classList.add("d-none");
            if (targetGroup) targetGroup.classList.add("d-none");

            hareketView.refresh();
            basariToast("Stok hareketi kaydedildi");
            kaydetButonu.innerText = orjinalMetin;
        } catch (hata) {
            hataGoster("Hata: " + hata.message);
            kaydetButonu.disabled = false;
            kaydetButonu.innerText = "Ekle ve Onayla";
        }
    });
}

const modalTrigger = document.querySelector('[data-bs-target="#stokIslemModal"]');
if (modalTrigger) {
    modalTrigger.addEventListener("click", async () => {
        const form = document.getElementById("stokIslemFormu");
        if (form) form.reset();

        formGruplariniGizle(); // Modal açıldığında form grupları temizlenir, gizlenir

        const btn = document.getElementById("btnKaydet");
        if (btn) btn.disabled = true;

        await dropdownUrunleriYukle();
    });
}

function initMovementCamera() {
    const cameraArea = document.getElementById("kameraAlani");
    const btnOpenCamera = document.getElementById("btnKameraAc");
    const btnCloseCamera = document.getElementById("btnKameraKapat");
    const productSelect = document.getElementById("urunSecimi");

    btnOpenCamera?.addEventListener("click", async () => {
        if (btnOpenCamera.disabled) return;

        // Çoklu tıklamaları engeller
        btnOpenCamera.disabled = true;

        try {
            // Kamera donanımını ve tarayıcı izinlerini denetler.
            if (typeof checkCameraPermission === 'function') await checkCameraPermission();

            // İzin varsa alanı görünür yapar
            if (cameraArea) cameraArea.classList.remove("d-none");

            let isProcessingQR = false;

            await startScanner("reader", async (scannedText) => {
                if (isProcessingQR) return;
                isProcessingQR = true;

                try {
                    let isProductFound = false;
                    if (productSelect && tumUrunler.length > 0) {
                        const bulunanUrun = tumUrunler.find(u => (u.barcode ?? u.Barcode) === scannedText);
                        if (bulunanUrun) {
                            const hedefId = bulunanUrun.id ?? bulunanUrun.Id;
                            productSelect.value = hedefId;
                            productSelect.dispatchEvent(new Event('change'));
                            isProductFound = true;
                        }
                    }

                    if (isProductFound) {
                        formuDenetle();
                        closeCamera();
                    } else {
                        closeCamera();
                        setTimeout(async () => {
                            await uyariGoster(`Taranan barkod (${scannedText}) sistemde bulunamadı!`);
                        }, 100);
                    }
                } finally {
                    isProcessingQR = false;
                }
            }, () => { });

        } catch (error) {
            if (btnOpenCamera) btnOpenCamera.disabled = false;

            // scanner.js'den gelen Türkçe hatayı basar.
            const hataMetni = error?.message ? error.message : "Kameraya erişilemedi veya izin reddedildi.";
            uyariGoster(hataMetni);
        }
    });

    if (btnCloseCamera) btnCloseCamera.addEventListener("click", closeCamera);
    document.getElementById('stokIslemModal')?.addEventListener('hidden.bs.modal', closeCamera);

    function closeCamera() {
        if (cameraArea) cameraArea.classList.add("d-none");
        if (btnOpenCamera) btnOpenCamera.disabled = false;
        if (typeof stopScanner === 'function') stopScanner();
    }
}

async function dropdownTedarikcileriYukle() {
    const tedarikciSelect = document.getElementById("tedarikciSecimi");
    try {
        const data = await apiRequest('/suppliers', 'GET');
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

async function kullaniciProfiliGoster(userId) {
    try {
        const user = await apiRequest(`/users/${userId}`, 'GET');

        document.getElementById('upmName').textContent = `${user.firstName || ''} ${user.lastName || ''}`;
        document.getElementById('upmEmail').textContent = (user.email || '') + (user.phoneNumber ? ' | 📞 ' + user.phoneNumber : '');
        document.getElementById('upmRole').textContent = user.role || 'viewer';
        document.getElementById('upmDate').textContent = new Date(user.createdAt).toLocaleDateString("tr-TR");

        const emailStatusSpan = document.getElementById('upmEmailStatus');
        if (user.isEmailConfirmed) {
            emailStatusSpan.innerHTML = '<span class="badge bg-success rounded-pill"><i class="bi bi-check-lg"></i> Onaylı</span>';
        } else {
            emailStatusSpan.innerHTML = '<span class="badge bg-danger rounded-pill">Onaysız</span>';
        }

        bootstrap.Modal.getOrCreateInstance(document.getElementById('userProfileModal')).show();
    } catch (hata) {
        hataGoster("Profil yüklenirken bir hata oluştu: " + hata.message);
    }
}

// =========================================================================
// UYGULAMA BAŞLATICI
// =========================================================================
document.addEventListener("DOMContentLoaded", async () => {
    initMovementCamera();
    initMovementSearchCamera();
    initPhysicalScannerListener();

    // Yetkiye göre buton/kolon gizleme. Kullanıcının yetkilerini kontrol et, yetkisi yoksa "Yeni İşlem" butonunu gizle
    if (typeof hasPermission === "function" && !hasPermission("Movement.Inbound") && !hasPermission("Movement.Outbound") && !hasPermission("Movement.Transfer")) {
        const btnYeniIslem = document.getElementById("btnYeniIslem");
        if (btnYeniIslem) btnYeniIslem.classList.add('d-none');
    }

    // Tarayıcı hazır, yetkiler tamam. Artık veritabanından güvenle verileri çekebiliriz
    await dropdownTedarikcileriYukle();
    hareketView.load(1);

    // URL'deki filtreye göre ilgili butonu renkli hale getir
    if (aktifFiltre === 'GIRIS') {
        aktifButonuGuncelle("btnGirisler");
    } else if (aktifFiltre === 'CIKIS') {
        aktifButonuGuncelle("btnCikislar");
    } else if (aktifFiltre === 'TRANSFER') {
        aktifButonuGuncelle("btnTransferler");
    } else {
        aktifButonuGuncelle("btnTumu");
    }
});