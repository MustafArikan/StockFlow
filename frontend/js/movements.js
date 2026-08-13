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
                ? `<span class="badge bg-warning bg-opacity-10 text-dark border border-warning px-2 py-1 rounded-pill">STOK TRANSFERİ</span>`
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
}

function extractSymbology(rawScan) {
    const match = rawScan.match(/^\](\w\d)/);
    const map = { C1: 'GS1-128', E0: 'EAN-13', A0: 'CODE-39', Q0: 'QR_CODE' };
    if (match && map[match[1]]) {
        return { format: map[match[1]], code: rawScan.substring(3) };
    }
    return { format: '', code: rawScan };
}

// Sadece UI işlemlerini yapan özel fonksiyon
async function _uygulaFizikselArama(scannedText) {
    const parsedScan = extractSymbology(scannedText);
    scannedText = parsedScan.code;

    let resolveRes = null;
    try {
        resolveRes = await apiRequest('/barcodes/resolve', 'POST', {
            rawCode: scannedText,
            symbologyFormat: parsedScan.format
        });
    } catch (e) {
        // Eğer resolve patlarsa eski düz arama denenebilir ama uyarı vermek daha iyi
    }

    const modalEl = document.getElementById('stokIslemModal');
    if (modalEl && modalEl.classList.contains('show')) {
        if (!resolveRes) {
            if (typeof uyariGoster === 'function') uyariGoster(`Taranan barkod (${scannedText}) sistemde bulunamadı!`);
            return;
        }

        const urunSelect = document.getElementById('urunSecimi');
        if (urunSelect && resolveRes.productId) {
            urunSelect.value = resolveRes.productId;
            urunSelect.dispatchEvent(new Event('change'));
            
            setTimeout(() => {
                if (resolveRes.inputUnitId) {
                    const unitSelect = document.getElementById('islemBirimi');
                    if (unitSelect) {
                        unitSelect.disabled = false; // in case it's disabled initially
                        unitSelect.value = resolveRes.inputUnitId;
                        unitSelect.dispatchEvent(new Event('change'));
                    }
                }
                let finalLot = resolveRes.lotNumber;
                let finalExp = resolveRes.expiryDate;

                // Backend çıkaramazsa Frontend ile GS1 ayrıştırmayı dene
                if ((!finalLot || !finalExp) && typeof window.parseGs1Barcode === 'function') {
                    const parsed = window.parseGs1Barcode(scannedText);
                    if (parsed.isGs1) {
                        if (!finalLot && parsed.lotNumber) finalLot = parsed.lotNumber;
                        if (!finalExp && parsed.expiryDate) finalExp = parsed.expiryDate;
                    }
                }

                // Foolproof date formatter for input type="date"
                const formatToYYYYMMDD = (dVal) => {
                    if (!dVal) return "";
                    if (typeof dVal === 'object' && dVal.year) {
                        return `${dVal.year}-${String(dVal.month).padStart(2, '0')}-${String(dVal.day).padStart(2, '0')}`;
                    }
                    let ds = String(dVal).split('T')[0].trim();
                    // If it already looks like YYYY-MM-DD, return it
                    if (/^\d{4}-\d{2}-\d{2}$/.test(ds)) return ds;
                    // Try to parse DD.MM.YYYY or DD/MM/YYYY
                    const parts = ds.split(/[\.\/]/);
                    if (parts.length === 3) {
                        if (parts[2].length === 4) { // DD.MM.YYYY
                            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                        } else if (parts[0].length === 4) { // YYYY.MM.DD
                            return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                        }
                    }
                    // Final fallback using Date object
                    try {
                        const dateObj = new Date(ds);
                        if (!isNaN(dateObj.getTime())) {
                            return dateObj.toISOString().split('T')[0];
                        }
                    } catch (e) {}
                    return ds;
                };

                // Set values with retries in case async DOM updates (like stock loading) overwrite them
                let retries = 0;
                const intervalId = setInterval(() => {
                    if (finalLot) {
                        const lotInp = document.getElementById('lotNumber');
                        if (lotInp && !lotInp.value) lotInp.value = finalLot;
                    }
                    if (finalExp) {
                        const expInp = document.getElementById('expiryDate');
                        if (expInp) {
                            expInp.value = formatToYYYYMMDD(finalExp);
                        }
                    }
                    if (++retries >= 5) clearInterval(intervalId);
                }, 300);

                if (resolveRes.variableQuantity || resolveRes.suggestedQuantity) {
                    const qtyInp = document.getElementById('islemAdedi');
                    if (qtyInp) qtyInp.value = resolveRes.variableQuantity || resolveRes.suggestedQuantity;
                }
            }, 300);

            if (typeof basariToast === 'function') basariToast(`Barkod okundu: ${scannedText}`);
        }
        return;
    }

    // MODAL AÇIK DEĞİLSE TABLODA ARA
    let gtinToSearch = scannedText;
    if (resolveRes && resolveRes.productId) {
        const bul = tumUrunler.find(u => u.id === resolveRes.productId || u.Id === resolveRes.productId);
        if (bul) gtinToSearch = bul.barcode || bul.Barcode || scannedText;
    }

    const aramaKutusu = document.getElementById("aramaKutusu");
    if (aramaKutusu) {
        aramaKutusu.value = gtinToSearch;
        aktifFiltre = 'TUMU';
        if (typeof aktifButonuGuncelle === 'function') aktifButonuGuncelle("btnTumu");
        window.history.pushState({}, document.title, window.location.pathname);
        if (typeof hareketView !== 'undefined') hareketView.load(1);
        if (typeof basariToast === 'function') basariToast(`Barkod okundu: ${scannedText}`);
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

                    // Ürün kataloğunda barkod kontrolü
                    let gtinToSearch = scannedText;
                    if (typeof window.parseGs1Barcode === 'function') {
                        const parsedGs1 = window.parseGs1Barcode(scannedText);
                        if (parsedGs1.isGs1 && parsedGs1.gtin) {
                            gtinToSearch = parsedGs1.gtin;
                        }
                    }
                    const bulunanUrun = tumUrunler.find(u => (u.barcode || "").toLowerCase() === gtinToSearch.toLowerCase() || (u.barcode || "").toLowerCase() === scannedText.toLowerCase());

                    if (!bulunanUrun) {
                        modalInstance.hide();
                        setTimeout(() => {
                            if (typeof uyariGoster === 'function') {
                                uyariGoster(`Taranan barkod (${scannedText}) sistemde bulunamadı!`);
                            }
                        }, 100);

                        setTimeout(() => { isProcessingQR = false; }, 1000);
                        return;
                    }

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

// Ürün Seçildiğinde Çalışacak Akıllı WMS Motoru ve Birim Yükleme
const urunSecimiEl = document.getElementById("urunSecimi");
if (urunSecimiEl) {
    urunSecimiEl.addEventListener("change", async function () {
        // Ürün değiştiğinde eski raf stok bilgisini ekrandan gizler
        document.getElementById("targetLocationStockInfo")?.classList.add("d-none");
        
        // İşlem birimlerini yükle
        const productId = this.value;
        const birimSelect = document.getElementById("islemBirimi");
        if (birimSelect) {
            birimSelect.innerHTML = '<option value="">Yükleniyor...</option>';
            birimSelect.disabled = true;
            try {
                const product = tumUrunler.find(u => (u.id ?? u.Id).toString() === productId);
                if (product) {
                    birimSelect.innerHTML = '';
                    
                    const unitId = product.unitId ?? product.UnitId;
                    const unitShortCode = product.unitShortCode ?? product.UnitShortCode;

                    // Taban birimi ekle
                    const baseOpt = document.createElement("option");
                    baseOpt.value = unitId;
                    baseOpt.textContent = `${unitShortCode || 'Taban Birim'} (Taban)`;
                    birimSelect.appendChild(baseOpt);

                    const conversions = product.unitConversions || product.UnitConversions;

                    // Alternatif birimleri ekle
                    if (conversions && conversions.length > 0) {
                        conversions.forEach(c => {
                            const altId = c.alternativeUnitId ?? c.AlternativeUnitId;
                            const altCode = c.alternativeUnitShortCode ?? c.AlternativeUnitShortCode;
                            const factor = c.conversionFactor ?? c.ConversionFactor;
                            const isDef = c.isDefault ?? c.IsDefault;

                            const opt = document.createElement("option");
                            opt.value = altId;
                            opt.textContent = `${altCode} (1 = ${factor} ${unitShortCode})`;
                            if (isDef) {
                                opt.selected = true;
                            }
                            birimSelect.appendChild(opt);
                        });
                    }
                    birimSelect.disabled = false;
                }
            } catch (e) {
                birimSelect.innerHTML = '<option value="">Hata</option>';
            }
        }

        // --- STOK LOKASYON BİLGİSİNİ GETİR ---
        const islemTipi = document.getElementById("islemTipi")?.value;
        const stoklarAlani = document.getElementById("mevcutStoklarAlani");
        const stoklarListesi = document.getElementById("mevcutStoklarListesi");
        const hedefAlani = document.getElementById("hedefLokasyonlarAlani");
        const hedefListesi = document.getElementById("hedefLokasyonlarListesi");

        if (productId) {
            // "CIKIS" ve "TRANSFER" için kaynak stokları getir.
            // "GIRIS" ve "TRANSFER" için hedef stok önerilerini getir.
            if (stoklarListesi) stoklarListesi.innerHTML = '<div class="p-2 text-center text-muted">Yükleniyor...</div>';
            if (hedefListesi) hedefListesi.innerHTML = '<div class="p-2 text-center text-muted">Yükleniyor...</div>';
            
            if (islemTipi === "CIKIS" || islemTipi === "TRANSFER") {
                if (stoklarAlani) stoklarAlani.classList.remove("d-none");
            }
            if (islemTipi === "GIRIS" || islemTipi === "TRANSFER") {
                if (hedefAlani) hedefAlani.classList.remove("d-none");
            }

            try {
                const res = await fetch(`${CONFIG.API_BASE_URL}/stock-levels/by-product/${productId}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });

                if (res.ok) {
                    const stoklar = await res.json();
                    if (stoklarListesi) stoklarListesi.innerHTML = '';
                    if (hedefListesi) hedefListesi.innerHTML = '';
                    
                    if (stoklar.length === 0) {
                        if (stoklarListesi && (islemTipi === "CIKIS" || islemTipi === "TRANSFER")) {
                            stoklarListesi.innerHTML = '<div class="p-2 text-center text-danger fw-bold">Bu ürün için depolarda stok bulunmuyor!</div>';
                        }
                        if (hedefListesi && (islemTipi === "GIRIS" || islemTipi === "TRANSFER")) {
                            hedefListesi.innerHTML = '<div class="p-2 text-center text-muted small">Mevcut bir raf önerisi yok. Aşağıdan yeni raf ekleyebilirsiniz.</div>';
                        }
                    } else {
                        const createCard = (s, isTarget) => {
                            const lotText = s.lotNumber ? `<br><small class="text-secondary">Lot: ${escapeHtml(s.lotNumber)} | SKT: ${s.expiryDate ? s.expiryDate.split('T')[0] : '-'}</small>` : '';
                            
                            const div = document.createElement("div");
                            div.className = `list-group-item list-group-item-action d-flex flex-column flex-md-row justify-content-between align-items-md-center p-3 border-start border-4 border-top-0 border-end-0 border-bottom-1 mb-2 shadow-sm rounded ${isTarget ? 'border-success target-location-item' : 'border-secondary stock-location-item'}`;
                            div.style.cursor = "pointer";
                            div.setAttribute("data-wh-id", s.warehouseId);
                            div.setAttribute("data-loc-id", s.locationId);
                            div.setAttribute("data-qty", s.quantity || 0);
                            div.setAttribute("data-lot", s.lotNumber || "");
                            div.setAttribute("data-exp", s.expiryDate || "");
                            
                            const chkClass = isTarget ? 'target-loc-check' : 'source-loc-check';
                            const qtyClass = isTarget ? 'target-loc-qty' : 'source-loc-qty';
                            const maxAttr = isTarget ? '' : `max="${s.quantity}"`;
                            
                            div.innerHTML = `
                                <div class="d-flex align-items-center mb-3 mb-md-0 w-100">
                                    <div class="form-check form-switch me-3 fs-4">
                                        <input class="form-check-input mt-0 ${chkClass} cursor-pointer" type="checkbox">
                                    </div>
                                    <div class="flex-grow-1">
                                        <div class="fw-bold text-dark fs-6"><i class="bi bi-building me-1 text-primary"></i>${escapeHtml(s.warehouseName)}</div>
                                        <div class="text-secondary small"><i class="bi bi-box me-1"></i>Raf: <span class="fw-bold text-dark">${escapeHtml(s.locationCode)}</span></div>
                                        ${lotText}
                                    </div>
                                </div>
                                <div class="d-flex align-items-center justify-content-between w-100 mt-2 mt-md-0 w-md-25">
                                    <span class="badge ${isTarget ? 'bg-success' : 'bg-primary'} bg-opacity-10 ${isTarget ? 'text-success border-success' : 'text-primary border-primary'} border rounded-pill px-3 py-2 fs-6 me-2 shadow-sm" title="Mevcut Stok">${s.quantity || 0} Adet</span>
                                    <input type="number" class="form-control form-control-sm ${qtyClass} ${isTarget ? 'border-success' : 'border-primary'} text-center fw-bold shadow-sm d-none" placeholder="Miktar" ${maxAttr} min="0" step="any" disabled>
                                </div>
                            `;
                            
                            const chk = div.querySelector(`.${chkClass}`);
                            const qtyInp = div.querySelector(`.${qtyClass}`);
                            
                            div.addEventListener('click', (e) => {
                                if (e.target !== chk && e.target !== qtyInp) {
                                    chk.checked = !chk.checked;
                                    chk.dispatchEvent(new Event('change'));
                                }
                            });

                            qtyInp.addEventListener('input', () => {
                                if (typeof updateIslemAdediFromBoxes === 'function') updateIslemAdediFromBoxes();
                                if (typeof formuDenetle === 'function') formuDenetle();
                            });

                            chk.addEventListener('change', (e) => {
                                if (e.target.checked) {
                                    qtyInp.classList.remove('d-none');
                                    qtyInp.disabled = false;
                                    if(!isTarget) div.classList.replace('border-secondary', 'border-success');
                                    div.classList.add('bg-success', 'bg-opacity-10');
                                } else {
                                    qtyInp.classList.add('d-none');
                                    qtyInp.disabled = true;
                                    qtyInp.value = '';
                                    if(!isTarget) div.classList.replace('border-success', 'border-secondary');
                                    div.classList.remove('bg-success', 'bg-opacity-10');
                                }
                                if (typeof updateIslemAdediFromBoxes === 'function') updateIslemAdediFromBoxes();
                                if (typeof formuDenetle === 'function') formuDenetle();
                            });
                            
                            return div;
                        };

                        if (stoklarListesi && (islemTipi === "CIKIS" || islemTipi === "TRANSFER")) {
                            stoklar.forEach(s => stoklarListesi.appendChild(createCard(s, false)));
                            
                            const lotDoluMu = document.getElementById("lotNumber")?.value;
                            const sktDoluMu = document.getElementById("expiryDate")?.value;
                            if (stoklar.length > 0 && stoklarListesi.firstElementChild && !lotDoluMu && !sktDoluMu) {
                                stoklarListesi.firstElementChild.click();
                            }
                        }
                        
                        if (hedefListesi && (islemTipi === "GIRIS" || islemTipi === "TRANSFER")) {
                            stoklar.forEach(s => hedefListesi.appendChild(createCard(s, true)));
                        }
                    }
                } else {
                    if(stoklarAlani) stoklarAlani.classList.add("d-none");
                    if(hedefAlani) hedefAlani.classList.add("d-none");
                }
            } catch (e) {
                if(stoklarAlani) stoklarAlani.classList.add("d-none");
                if(hedefAlani) hedefAlani.classList.add("d-none");
            }
        }
        // -------------------------------------

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
            cGroup?.classList.remove("d-none");
            const tLoc = document.getElementById("targetLocationId");
            if (tLoc) tLoc.value = "";
        } else if (tip === "TRANSFER") {
            targetGroup?.classList.remove("d-none");
        }

        await dropdownIslemDepolariYukle();
        formuDenetle();

        // Ürün seçiliyse, stokları (varsa) yeniden getirmek için ürün seçimini tetikleyelim
        const currentProductId = document.getElementById("urunSecimi")?.value;
        if (currentProductId) {
            document.getElementById("urunSecimi").dispatchEvent(new Event("change"));
        }
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
    
    const stoklarAlani = document.getElementById("mevcutStoklarAlani");
    if (stoklarAlani) stoklarAlani.classList.add("d-none");
    const stoklarListesi = document.getElementById("mevcutStoklarListesi");
    if (stoklarListesi) stoklarListesi.innerHTML = "";
    
    const hedefLokasyonlarAlani = document.getElementById("hedefLokasyonlarAlani");
    if (hedefLokasyonlarAlani) hedefLokasyonlarAlani.classList.add("d-none");
    const hedefLokasyonlarListesi = document.getElementById("hedefLokasyonlarListesi");
    if (hedefLokasyonlarListesi) hedefLokasyonlarListesi.innerHTML = "";
}

function updateIslemAdediFromBoxes() {
    const tip = document.getElementById("islemTipi")?.value;
    const islemAdediInput = document.getElementById("islemAdedi");
    if (!islemAdediInput || !tip) return;
    
    let boxes = [];
    if (tip === "CIKIS" || tip === "TRANSFER") {
        boxes = Array.from(document.querySelectorAll('.source-loc-check:checked')).map(c => c.closest('.stock-location-item').querySelector('.source-loc-qty'));
    }
    if (tip === "GIRIS" || tip === "TRANSFER") {
        const targetBoxes = Array.from(document.querySelectorAll('.target-loc-check:checked')).map(c => c.closest('.target-location-item').querySelector('.target-loc-qty'));
        boxes = boxes.concat(targetBoxes);
    }
    
    let hasSpecificQty = boxes.some(inp => parseFloat(inp.value) > 0);
    const labelEl = islemAdediInput.previousElementSibling;
    
    if (hasSpecificQty) {
        islemAdediInput.readOnly = true;
        if (labelEl) labelEl.innerHTML = '4. Toplam Miktar <span class="text-primary">(Otomatik)</span>';
        
        let total = 0;
        boxes.forEach(inp => {
            const val = parseFloat(inp.value) || 0;
            total += val;
        });
        
        // For TRANSFER, if they entered qty in both source and target (which shouldn't happen usually but just in case),
        // we might sum both. Wait, for TRANSFER, source specific quantities determine the deduction. Target quantity is just the sum of sources (since it's 1 target).
        // Let's only sum source for TRANSFER if source has specifics, else target.
        if (tip === "TRANSFER") {
            const sourceBoxes = Array.from(document.querySelectorAll('.source-loc-check:checked')).map(c => c.closest('.stock-location-item').querySelector('.source-loc-qty'));
            let sourceHasSpecific = sourceBoxes.some(inp => parseFloat(inp.value) > 0);
            if (sourceHasSpecific) {
                total = sourceBoxes.reduce((acc, inp) => acc + (parseFloat(inp.value) || 0), 0);
            } else {
                const tBoxes = Array.from(document.querySelectorAll('.target-loc-check:checked')).map(c => c.closest('.target-location-item').querySelector('.target-loc-qty'));
                total = tBoxes.reduce((acc, inp) => acc + (parseFloat(inp.value) || 0), 0);
            }
        }
        
        islemAdediInput.value = total;
        // Trigger input event so formuDenetle evaluates the new value
        islemAdediInput.dispatchEvent(new Event('input'));
    } else {
        islemAdediInput.readOnly = false;
        if (labelEl) labelEl.textContent = '4. İşlem Miktarı';
    }
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
        if (tip === "CIKIS" || tip === "TRANSFER") {
            const hasSource = document.querySelectorAll('.source-loc-check:checked').length > 0;
            if (!hasSource) gecerli = false;
        }
        if (tip === "GIRIS" || tip === "TRANSFER") {
            const hasTarget = document.querySelectorAll('.target-loc-check:checked').length > 0;
            if (!hasTarget) gecerli = false;
        }
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

["urunSecimi", "islemAdedi", "sourceLocationId", "targetLocationId", "islemBirimi"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", formuDenetle);
});
const islemAdediInput = document.getElementById("islemAdedi");
if (islemAdediInput) islemAdediInput.addEventListener("input", formuDenetle);

const tLocDropdown = document.getElementById("targetLocationId");
const btnHedefEkle = document.getElementById("btnHedefRafEkle");
if (tLocDropdown && btnHedefEkle) {
    tLocDropdown.addEventListener("change", (e) => {
        btnHedefEkle.disabled = !e.target.value;
    });

    btnHedefEkle.addEventListener("click", () => {
        const whDropdown = document.getElementById("targetWarehouseId");
        if (!whDropdown.value || !tLocDropdown.value) return;

        const whName = whDropdown.options[whDropdown.selectedIndex].text;
        const locCode = tLocDropdown.options[tLocDropdown.selectedIndex].text;
        const whId = whDropdown.value;
        const locId = tLocDropdown.value;

        const hedefListesi = document.getElementById("hedefLokasyonlarListesi");
        
        // Prevent duplicate racks
        if (hedefListesi.querySelector(`[data-loc-id="${locId}"]`)) {
            hataGoster("Bu raf zaten listede ekli!");
            return;
        }
        
        // Remove empty state message if it exists
        if (hedefListesi.innerHTML.includes("Mevcut bir raf önerisi yok")) {
            hedefListesi.innerHTML = "";
        }

        const div = document.createElement("div");
        div.className = "list-group-item list-group-item-action d-flex flex-column flex-md-row justify-content-between align-items-md-center p-3 border-start border-4 border-success target-location-item border-top-0 border-end-0 border-bottom-1 mb-2 shadow-sm rounded";
        div.style.cursor = "pointer";
        div.setAttribute("data-wh-id", whId);
        div.setAttribute("data-loc-id", locId);
        div.setAttribute("data-qty", 0);
        div.setAttribute("data-lot", "");
        div.setAttribute("data-exp", "");

        let isBos = locCode.includes("(Boş)");
        let cleanLocCode = isBos ? locCode.replace(" (Boş)", "") : locCode;
        let emptyBadge = isBos ? `<span class="badge bg-warning text-dark ms-2 border border-warning"><i class="bi bi-info-circle me-1"></i>Tamamen Boş</span>` : '';

        div.innerHTML = `
            <div class="d-flex align-items-center mb-3 mb-md-0 w-100">
                <div class="form-check form-switch me-3 fs-4">
                    <input class="form-check-input mt-0 target-loc-check cursor-pointer" type="checkbox">
                </div>
                <div class="flex-grow-1">
                    <div class="fw-bold text-dark fs-6"><i class="bi bi-building me-1 text-primary"></i>${escapeHtml(whName)}</div>
                    <div class="text-secondary small"><i class="bi bi-box me-1"></i>Raf: <span class="fw-bold text-dark">${escapeHtml(cleanLocCode)}</span>${emptyBadge}</div>
                    <br><small class="text-secondary fst-italic">Yeni Eklendi</small>
                </div>
            </div>
            <div class="d-flex align-items-center justify-content-between w-100 mt-2 mt-md-0 w-md-25">
                <span class="badge bg-success bg-opacity-10 text-success border border-success rounded-pill px-3 py-2 fs-6 me-2 shadow-sm" title="Mevcut Stok">0 Adet</span>
                <input type="number" class="form-control form-control-sm target-loc-qty border-success text-center fw-bold shadow-sm d-none" placeholder="Miktar" min="0" step="any" disabled>
            </div>
        `;

        const chk = div.querySelector('.target-loc-check');
        const qtyInp = div.querySelector('.target-loc-qty');

        div.addEventListener('click', (e) => {
            if (e.target !== chk && e.target !== qtyInp) {
                chk.checked = !chk.checked;
                chk.dispatchEvent(new Event('change'));
            }
        });

        qtyInp.addEventListener('input', () => {
            if (typeof updateIslemAdediFromBoxes === 'function') updateIslemAdediFromBoxes();
            if (typeof formuDenetle === 'function') formuDenetle();
        });

        chk.addEventListener('change', (e) => {
            if (e.target.checked) {
                qtyInp.classList.remove('d-none');
                qtyInp.disabled = false;
                div.classList.add('bg-success', 'bg-opacity-10');
            } else {
                qtyInp.classList.add('d-none');
                qtyInp.disabled = true;
                qtyInp.value = '';
                div.classList.remove('bg-success', 'bg-opacity-10');
            }
            if (typeof updateIslemAdediFromBoxes === 'function') updateIslemAdediFromBoxes();
            if (typeof formuDenetle === 'function') formuDenetle();
        });

        hedefListesi.appendChild(div);
        
        // Auto-check and focus
        div.click();
        setTimeout(() => qtyInp.focus(), 50);

        // Reset dropdowns
        tLocDropdown.value = "";
        btnHedefEkle.disabled = true;
        if (typeof formuDenetle === 'function') formuDenetle();
    });
}

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

        const bFiyatElement = document.getElementById("birimFiyat");
        const fNoElement = document.getElementById("faturaNo");
        const tIdElement = document.getElementById("tedarikciSecimi");
        const cNoktasiElement = document.getElementById("cikisNoktasi");
        const iBirimElement = document.getElementById("islemBirimi");
        const lotNumberElement = document.getElementById("lotNumber");
        const expiryDateElement = document.getElementById("expiryDate");

        const bFiyat = bFiyatElement ? parseFloat(bFiyatElement.value) || 0 : 0;
        const fNo = fNoElement ? fNoElement.value : null;
        const tId = tIdElement ? tIdElement.value : null;
        const cNoktasi = cNoktasiElement ? cNoktasiElement.value : null;
        const inputUnitId = iBirimElement && iBirimElement.value ? parseInt(iBirimElement.value) : secilenUrun.unitId;
        const lotNumber = lotNumberElement && lotNumberElement.value.trim() !== "" ? lotNumberElement.value.trim() : null;
        const expiryDate = expiryDateElement && expiryDateElement.value !== "" ? expiryDateElement.value : null;

        const payloadBase = {
            productId: parseInt(secilenUrunId, 10),
            productBarcode: secilenBarkod,
            movementType: tip === "GIRIS" ? "IN" : tip === "CIKIS" ? "OUT" : "TRANSFER",
            inputUnitId: inputUnitId !== secilenUrun.unitId ? inputUnitId : null,
            targetLocationId: ((tip === "GIRIS" || tip === "TRANSFER") && targetLocVal && !isNaN(parseInt(targetLocVal))) ? parseInt(targetLocVal) : null,
            description: tip === "GIRIS" ? "Stok Girişi" : tip === "CIKIS" ? "Stok Çıkışı" : "Raf Arası Transfer",
            unitPrice: bFiyat,
            documentNumber: fNo && fNo.trim() !== "" ? fNo : null,
            supplierId: (tip === "GIRIS" && tId && tId !== "" && !isNaN(parseInt(tId))) ? parseInt(tId) : null,
            destination: (tip === "CIKIS" && cNoktasi && cNoktasi.trim() !== "") ? cNoktasi : null
        };

        const kaydetButonu = document.getElementById("btnKaydet");
        let operations = [];

        // Check if multi-rack selection is active
        const checkedSources = (tip === "CIKIS" || tip === "TRANSFER") 
            ? Array.from(document.querySelectorAll('.stock-location-item')).filter(item => item.querySelector('.source-loc-check').checked)
            : [];
            
        const checkedTargets = (tip === "GIRIS" || tip === "TRANSFER") 
            ? Array.from(document.querySelectorAll('.target-location-item')).filter(item => item.querySelector('.target-loc-check').checked)
            : [];

        if (tip === "CIKIS") {
            let totalRequestedQty = qty;
            let remainingQty = totalRequestedQty;
            let hasSpecificQty = checkedSources.some(item => parseFloat(item.querySelector('.source-loc-qty').value) > 0);

            if (hasSpecificQty) {
                for (const item of checkedSources) {
                    const specificQty = parseFloat(item.querySelector('.source-loc-qty').value) || 0;
                    if (specificQty > 0) {
                        operations.push({
                            ...payloadBase,
                            quantity: specificQty,
                            sourceLocationId: parseInt(item.getAttribute('data-loc-id')),
                            lotNumber: item.getAttribute('data-lot') || null,
                            expiryDate: item.getAttribute('data-exp') || null
                        });
                    }
                }
            } else {
                for (const item of checkedSources) {
                    if (remainingQty <= 0) break;
                    const availableQty = parseFloat(item.getAttribute('data-qty')) || 0;
                    const takeQty = Math.min(availableQty, remainingQty);
                    operations.push({
                        ...payloadBase,
                        quantity: takeQty,
                        sourceLocationId: parseInt(item.getAttribute('data-loc-id')),
                        lotNumber: item.getAttribute('data-lot') || null,
                        expiryDate: item.getAttribute('data-exp') || null
                    });
                    remainingQty -= takeQty;
                }
                if (remainingQty > 0) {
                    hataGoster(`Seçilen raflardaki toplam stok, girmek istediğiniz miktarı (${totalRequestedQty}) karşılamıyor.`);
                    return;
                }
            }
        } else if (tip === "GIRIS") {
            let hasSpecificQty = checkedTargets.some(item => parseFloat(item.querySelector('.target-loc-qty').value) > 0);
            
            if (hasSpecificQty) {
                for (const item of checkedTargets) {
                    const specificQty = parseFloat(item.querySelector('.target-loc-qty').value) || 0;
                    if (specificQty > 0) {
                        operations.push({
                            ...payloadBase,
                            quantity: specificQty,
                            targetLocationId: parseInt(item.getAttribute('data-loc-id')),
                            lotNumber: lotNumber,
                            expiryDate: expiryDate
                        });
                    }
                }
            } else {
                if (checkedTargets.length > 1) {
                    hataGoster("Çoklu rafa giriş yaparken lütfen listedeki kutucuklardan her raf için miktar belirtin.");
                    return;
                } else if (checkedTargets.length === 1) {
                    operations.push({
                        ...payloadBase,
                        quantity: qty,
                        targetLocationId: parseInt(checkedTargets[0].getAttribute('data-loc-id')),
                        lotNumber: lotNumber,
                        expiryDate: expiryDate
                    });
                }
            }
        } else if (tip === "TRANSFER") {
            if (checkedTargets.length !== 1) {
                hataGoster("Transfer işlemi için lütfen BİR (1) adet hedef raf seçin.");
                return;
            }
            
            const targetLocId = parseInt(checkedTargets[0].getAttribute('data-loc-id'));
            let totalRequestedQty = qty;
            let remainingQty = totalRequestedQty;
            let hasSpecificQty = checkedSources.some(item => parseFloat(item.querySelector('.source-loc-qty').value) > 0);

            if (hasSpecificQty) {
                for (const item of checkedSources) {
                    const specificQty = parseFloat(item.querySelector('.source-loc-qty').value) || 0;
                    if (specificQty > 0) {
                        operations.push({
                            ...payloadBase,
                            quantity: specificQty,
                            sourceLocationId: parseInt(item.getAttribute('data-loc-id')),
                            targetLocationId: targetLocId,
                            lotNumber: item.getAttribute('data-lot') || null,
                            expiryDate: item.getAttribute('data-exp') || null
                        });
                    }
                }
            } else {
                for (const item of checkedSources) {
                    if (remainingQty <= 0) break;
                    const availableQty = parseFloat(item.getAttribute('data-qty')) || 0;
                    const takeQty = Math.min(availableQty, remainingQty);
                    operations.push({
                        ...payloadBase,
                        quantity: takeQty,
                        sourceLocationId: parseInt(item.getAttribute('data-loc-id')),
                        targetLocationId: targetLocId,
                        lotNumber: item.getAttribute('data-lot') || null,
                        expiryDate: item.getAttribute('data-exp') || null
                    });
                    remainingQty -= takeQty;
                }
                if (remainingQty > 0) {
                    hataGoster(`Seçilen kaynak raflardaki toplam stok, transfer etmek istediğiniz miktarı (${totalRequestedQty}) karşılamıyor.`);
                    return;
                }
            }
        }

        try {
            const orjinalMetin = kaydetButonu.innerText;
            kaydetButonu.disabled = true;
            kaydetButonu.innerText = "İşleniyor...";

            // Execute all operations
            for (const op of operations) {
                await apiRequest('/stock/movements', 'POST', op);
            }

            document.getElementById("stokIslemFormu").reset();
            if (typeof formGruplariniGizle === 'function') {
                formGruplariniGizle();
            }

            const modalElement = document.getElementById("stokIslemModal");
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) modalInstance.hide();

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
    
    // Manuel barkod girişi için (Klavye ile)
    const manuelBarkodInp = document.getElementById("manuelBarkodInp");
    if (manuelBarkodInp) {
        manuelBarkodInp.addEventListener("keydown", async (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                const val = manuelBarkodInp.value.trim();
                if (val) {
                    if (typeof _uygulaFizikselArama === 'function') {
                        await _uygulaFizikselArama(val);
                    }
                    manuelBarkodInp.value = "";
                }
            }
        });
    }

    // Lot üretme butonu
    const btnLotUret = document.getElementById("btnLotUret");
    if (btnLotUret) {
        btnLotUret.addEventListener("click", () => {
            const lotInput = document.getElementById("lotNumber");
            if (lotInput) {
                const date = new Date();
                const dStr = date.toISOString().split('T')[0].replace(/-/g, '');
                const random = Math.floor(1000 + Math.random() * 9000);
                lotInput.value = `LOT-${dStr}-${random}`;
                if (typeof basariToast === 'function') basariToast("Yeni Lot numarası üretildi.");
            }
        });
    }

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
                    let resolveRes = null;
                    
                    try {
                        resolveRes = await apiRequest('/barcodes/resolve', 'POST', {
                            rawCode: scannedText,
                            symbologyFormat: ''
                        });
                    } catch (e) { }

                    if (productSelect && resolveRes && resolveRes.productId) {
                        productSelect.value = resolveRes.productId;
                        productSelect.dispatchEvent(new Event('change'));
                        
                        setTimeout(() => {
                            if (resolveRes.inputUnitId) {
                                const unitSelect = document.getElementById('islemBirimi');
                                if (unitSelect) {
                                    unitSelect.disabled = false;
                                    unitSelect.value = resolveRes.inputUnitId;
                                    unitSelect.dispatchEvent(new Event('change'));
                                }
                            }
                            if (resolveRes.lotNumber) {
                                const lotInput = document.getElementById("lotNumber");
                                if (lotInput) lotInput.value = resolveRes.lotNumber;
                            }
                            if (resolveRes.expiryDate) {
                                const expInput = document.getElementById("expiryDate");
                                if (expInput) {
                                    let dVal = resolveRes.expiryDate;
                                    let ds = "";
                                    if (typeof dVal === 'object' && dVal.year) {
                                        ds = `${dVal.year}-${String(dVal.month).padStart(2, '0')}-${String(dVal.day).padStart(2, '0')}`;
                                    } else {
                                        ds = String(dVal).split('T')[0].trim();
                                        const parts = ds.split(/[\.\/]/);
                                        if (parts.length === 3) {
                                            if (parts[2].length === 4) ds = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                                            else if (parts[0].length === 4) ds = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                                        }
                                    }
                                    expInput.value = ds;
                                }
                            }
                            if (resolveRes.variableQuantity || resolveRes.suggestedQuantity) {
                                // Düzeltme: formdaki gerçek id "islemAdedi" — "hareketMiktar" diye bir alan yok,
                                // bu yüzden bu satır hiçbir zaman çalışmıyordu.
                                const qtyInp = document.getElementById('islemAdedi');
                                if (qtyInp) qtyInp.value = resolveRes.variableQuantity || resolveRes.suggestedQuantity;
                            }
                        }, 300);

                        if (typeof basariToast === 'function') basariToast("Barkod okundu ve bilgiler dolduruldu.");
                        isProductFound = true;
                    } else if (productSelect && tumUrunler.length > 0) {
                        // Fallback: Eski düz eşleşme
                        let gtinToSearch = scannedText;
                        if (typeof window.parseGs1Barcode === 'function') {
                            const parsedGs1 = window.parseGs1Barcode(scannedText);
                            if (parsedGs1.isGs1 && parsedGs1.gtin) gtinToSearch = parsedGs1.gtin;
                        }
                        const bulunanUrun = tumUrunler.find(u => (u.barcode ?? u.Barcode) === gtinToSearch || (u.barcode ?? u.Barcode) === scannedText);
                        if (bulunanUrun) {
                            productSelect.value = bulunanUrun.id ?? bulunanUrun.Id;
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
    await loadAuthContext();
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
    await dropdownUrunleriYukle(); // Hareketler sayfasında barkod doğrulaması için ürün kataloğu yüklendi
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

    // GS1 / Barkod Yönlendirmelerini Yakala
    const pid = urlParams.get('productId');
    if (pid) {
        const modalEl = document.getElementById('stokIslemModal');
        if (modalEl) {
            bootstrap.Modal.getOrCreateInstance(modalEl).show();
            setTimeout(() => {
                const urunSelect = document.getElementById('urunSecimi');
                if (urunSelect) {
                    urunSelect.value = pid;
                    urunSelect.dispatchEvent(new Event('change'));
                    
                    // Lot, SKT ve Miktarı doldur
                    setTimeout(() => {
                        const lot = urlParams.get('lotNumber');
                        if (lot) {
                            const lotInp = document.getElementById('lotNumber');
                            if (lotInp) lotInp.value = lot;
                        }
                        
                        const exp = urlParams.get('expiryDate');
                        if (exp) {
                            const expInp = document.getElementById('expiryDate');
                            if (expInp) expInp.value = exp;
                        }
                        
                        const qty = urlParams.get('qty');
                        if (qty) {
                            const qtyInp = document.getElementById('hareketMiktar');
                            if (qtyInp) qtyInp.value = qty;
                        }
                        
                        const unitId = urlParams.get('inputUnitId');
                        if (unitId) {
                            const unitSelect = document.getElementById('girisBirim');
                            if (unitSelect) unitSelect.value = unitId;
                        }
                    }, 500); // Birimlerin / Stokların yüklenmesi için kısa gecikme
                }
            }, 500); // Modal açılış animasyonu için kısa gecikme
        }
    }
});
