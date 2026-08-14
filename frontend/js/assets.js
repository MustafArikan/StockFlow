let currentAssetId = null;
let currentAssetProductId = null;
let currentAssetSerialNumber = null; //Uygulamanın baktığı cihazı unutmaması için
let currentGridPage = 1;
let currentGridPageSize = 8; // Izgara tasarımı için varsayılan 8
let userRole = "User";
const token = localStorage.getItem('token');
if (!token) window.location.href = 'login.html';

// ==========================================
// ORTAK YARDIMCI FONKSİYONLAR
// ==========================================
function getAssetStatusUI(status) {
    switch (status) {
        case 'Available':
            return { text: "Müsait (Boşta)", shortText: "Boşta", badgeClass: "bg-success", iconColor: "text-success", bgClass: "bg-success bg-opacity-10" };
        case 'InUse':
            return { text: "Kullanımda", shortText: "Kullanımda", badgeClass: "bg-primary", iconColor: "text-primary", bgClass: "bg-primary bg-opacity-10" };
        case 'Broken':
            return { text: "Arızalı", shortText: "Arızalı", badgeClass: "bg-danger", iconColor: "text-danger", bgClass: "bg-danger bg-opacity-10" };
        case 'Retired':
            return { text: "Kullanım Dışı", shortText: "Kullanım Dışı", badgeClass: "bg-dark", iconColor: "text-secondary opacity-50", bgClass: "bg-secondary bg-opacity-10", iconExtra: "<i class='bi bi-slash-circle me-1'></i> " };
        default:
            return { text: "Bilinmiyor", shortText: "Bilinmiyor", badgeClass: "bg-secondary", iconColor: "text-primary", bgClass: "bg-primary bg-opacity-10" };
    }
}

/**
 * Okunan ham barkod metnini analiz eder ve ayırıcılara göre Ürün Kodu ile Seri Numarasını ayırır.
 * Bu sayede iş mantığı arayüzden ayrılır ve her yerden tekrar kullanılabilir hale gelir.
 * @param {string} rawText - Okunan ham barkod metni
 * @returns {object} { productBarcode, serialNumber } formatında ayrıştırılmış veriyi döndürür.
 */
function parseAssetBarcode(rawText) {
    let result = { productBarcode: rawText.trim(), serialNumber: rawText.trim() };
    const delimiters = ['|', ';', ',', '_'];

    // Metnin içinde belirlenen ayırıcılardan biri var mı diye kontrol eder.
    for (let d of delimiters) {
        if (rawText.includes(d)) {
            const parts = rawText.split(d);
            if (parts.length >= 2) {
                // Ayırıcıdan önceki kısmı ürün barkodu, sonraki kısmı seri numarası olarak belirler.
                result.productBarcode = parts[0].trim();
                result.serialNumber = parts.slice(1).join(d).trim();
                break;
            }
        }
    }
    return result;
}

// ==========================================
// SAYFA YÜKLENDİĞİNDE ÇALIŞACAKLAR 
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    await loadAuthContext();
    userRole = typeof getUserRole === "function" ? getUserRole() : "User";
    
    applyPermissions();
    initEventListeners();

    // Dropdown (Açılır Menü) Yüklemeleri
    loadProductsForDropdown();
    loadUsersForDropdown();
    dropdownKategorileriYukleAssets();

    // Tarayıcı Geçmişi Başlatma
    history.replaceState({ view: 'grid' }, null, '');

    // Güvenli WMS Entegrasyonu
    if (typeof StockUtils !== 'undefined') {
        try {
            StockUtils.loadAllWarehouses('deleteAssetTargetWarehouse');
        } catch (e) {
            console.error("Hedef depolar yüklenirken kritik hata:", e);
        }
    }

    // Admin Grid Başlatma
    if (["admin", "superadmin"].includes(userRole)) {
        document.getElementById("adminGridContainer")?.classList.remove("d-none");
        loadGridCards(1);
    }
});

// YETKİLENDİRME (RBAC) KONTROLLERİ
function applyPermissions() {
    if (!hasPermission("Asset.Add")) document.querySelector('[data-bs-target="#createAssetModal"]')?.classList.add('d-none');

    if (!hasPermission("Asset.Edit")) {
        document.querySelector('[data-bs-target="#breakdownModal"]')?.classList.add('d-none');
        document.querySelector('[data-bs-target="#resolveModal"]')?.classList.add('d-none');
        document.querySelector('[data-bs-target="#maintenanceModal"]')?.classList.add('d-none');
    }

    if (!hasPermission("Asset.Assign")) {
        document.querySelector('[data-bs-target="#assignAssetModal"]')?.classList.add('d-none');
        document.querySelector('[data-bs-target="#returnAssetModal"]')?.classList.add('d-none');
    }

    if (!hasPermission("Asset.Delete")) {
        document.querySelector('[data-bs-target="#deleteAssetModal"]')?.classList.add('d-none');
    }
}

// MERKEZİ OLAY DİNLEYİCİLERİ
// Ana başlatıcı fonksiyon, işleri alt yöneticilere böler ve sayfa yüklendiğinde çağrılır.
function initEventListeners() {
    initSearchAndActionListeners();
    initWMSDropdownListeners();
    initModalResetListeners();
    initSearchCamera();
    initAddAssetCamera();
}

// Arama çubuğu ve modal içindeki işlem butonlarının tıklanma olaylarını ve ızgara filtrelerini yönetir.
function initSearchAndActionListeners() {
    // Arama ve Geri Dönüş İşlemleri
    document.getElementById('btnSearchAsset')?.addEventListener('click', searchAsset);
    document.getElementById('serialSearchInput')?.addEventListener('keyup', e => { if (e.key === 'Enter') searchAsset(); });
    document.getElementById('btnGeriDonGrid')?.addEventListener('click', goBackToGrid);

    // Tablo (Grid) Kartına Tıklama
    document.getElementById('equipmentGridCards')?.addEventListener('click', (e) => {
        const cardLink = e.target.closest('.grid-asset-link');
        if (cardLink) {
            e.preventDefault();
            document.getElementById('serialSearchInput').value = cardLink.getAttribute('data-serial');
            searchAsset();
        }
    });

    // Modal Aksiyon Butonları
    document.getElementById('btnSubmitCreateAsset')?.addEventListener('click', submitCreateAsset);
    document.getElementById('btnSubmitAssign')?.addEventListener('click', submitAssignAsset);
    document.getElementById('btnSubmitReturn')?.addEventListener('click', submitReturnAsset);
    document.getElementById('btnSubmitBreakdown')?.addEventListener('click', submitBreakdown);
    document.getElementById('btnSubmitResolve')?.addEventListener('click', submitResolve);
    document.getElementById('btnSubmitMaintenance')?.addEventListener('click', submitMaintenance);
    document.getElementById('btnSubmitDeleteAsset')?.addEventListener('click', submitDeleteAsset);

    // Sıralama ve Temel Filtre İşlemleri
    document.getElementById('assetGridSort')?.addEventListener('change', function () {
        const [key, dir] = this.value.split('_');
        assetGrid.setSortState(key, dir);
        loadGridCards(1);
    });

    document.getElementById('filtreDurum')?.addEventListener('change', function () {
        loadGridCards(1);
    });

    document.getElementById('btnFiltreleriTemizle')?.addEventListener('click', () => {
        if (document.getElementById('filtreDurum')) document.getElementById('filtreDurum').value = '';
        const catSelect = document.getElementById('filtreKategoriId');
        if (catSelect) {
            catSelect.value = '';
            if (typeof buildCategoryCascader === 'function') {
                buildCategoryCascader('filtreKategoriContainer', 'filtreKategoriId', null, true);
            }
            document.getElementById('dynamicFilterArea')?.classList.add('d-none');
            const filterContainer = document.getElementById('dynamicFilterContainer');
            if (filterContainer) filterContainer.innerHTML = '';
        }
        loadGridCards(1);
    });

    // Dinamik Kategori Özellikleri Filtresi
    document.getElementById("filtreKategoriId")?.addEventListener("change", async function () {
        const categoryId = this.value;
        const filterArea = document.getElementById("dynamicFilterArea");
        const filterContainer = document.getElementById("dynamicFilterContainer");

        if (!categoryId) {
            if (filterArea) filterArea.classList.add("d-none");
            if (filterContainer) filterContainer.innerHTML = "";
            loadGridCards(1);
            return;
        }

        try {
            if (filterArea) filterArea.classList.remove("d-none");
            if (filterContainer) filterContainer.innerHTML = `<div class="col-12 text-center text-muted"><div class="spinner-border spinner-border-sm me-2"></div>Özellikler yükleniyor...</div>`;

            loadGridCards(1);

            const rules = await apiRequest(`/attribute-rules/category/${categoryId}`, "GET");

            if (filterContainer) filterContainer.innerHTML = "";

            if (rules.length === 0) {
                if (filterContainer) filterContainer.innerHTML = `<div class="col-12 text-muted fst-italic">Bu kategoriye ait filtrelenebilir özellik bulunamadı.</div>`;
                return;
            }

            rules.forEach(rule => {
                let options = [];
                if (rule.allowedValues && rule.allowedValues !== "[]") {
                    try { options = JSON.parse(rule.allowedValues); }
                    catch (e) { options = rule.allowedValues.split(",").map(s => s.trim()); }
                }

                if (rule.uiComponent === "color_picker" && rule.allowedValueList) {
                    options = options.map(val => {
                        const eslesen = rule.allowedValueList.find(a => a.value === val);
                        return { value: val, hex: eslesen ? eslesen.label : val };
                    });
                }

                let inputHtml = "";
                if (rule.uiComponent === "select" || rule.uiComponent === "color_picker") {
                    inputHtml = `<select id="filter_${rule.attributeKey}" class="form-select form-select-sm bg-light border-0 rounded-pill px-3 kural-filtresi">
                                    <option value="">Tümü</option>`;
                    options.forEach(opt => {
                        let val = typeof opt === "object" ? opt.value : opt;
                        inputHtml += `<option value="${escapeHtml(val)}">${escapeHtml(val)}</option>`;
                    });
                    inputHtml += `</select>`;
                } else {
                    inputHtml = `<input type="text" id="filter_${rule.attributeKey}" class="form-control form-control-sm bg-light border-0 rounded-pill px-3 kural-filtresi" placeholder="Ara...">`;
                }

                const div = document.createElement("div");
                div.className = "col-12 mb-3";
                div.innerHTML = `<label class="form-label small fw-bold mb-1">${escapeHtml(rule.attributeKey)}</label>${inputHtml}`;
                if (filterContainer) filterContainer.appendChild(div);
            });

            document.querySelectorAll(".kural-filtresi").forEach(el => {
                el.addEventListener("change", () => loadGridCards(1));
                el.addEventListener("input", () => loadGridCards(1));
            });

        } catch (e) {
            console.error("Filtre kuralları yüklenirken hata:", e);
            if (filterContainer) filterContainer.innerHTML = `<div class="col-12 text-danger">Özellikler yüklenemedi.</div>`;
        }
    });

    // Tarayıcı Geri Tuşu Yönetimi
    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.view) {
            if (e.state.view === 'grid') {
                document.getElementById('assetResultContainer').classList.add('d-none');
                document.getElementById('adminGridContainer').classList.remove('d-none');
                currentAssetId = null;
                currentAssetProductId = null;
                currentAssetSerialNumber = null;
                if (['admin', 'superadmin'].includes(userRole)) {
                    loadGridCards(currentGridPage);
                }
            } else if (e.state.view === 'asset') {
                searchAsset(e.state.serial, true);
            }
        } else {
            document.getElementById('assetResultContainer').classList.add('d-none');
            document.getElementById('adminGridContainer').classList.remove('d-none');
        }
    });
}

// Depo, Raf ve Kategori seçimi gibi dinamik değişen elemanların olaylarını dinler ve yönetir.
function initWMSDropdownListeners() {
    document.getElementById('newAssetProduct')?.addEventListener('change', async function () {
        const selectedProductId = this.value;

        if (!selectedProductId) {
            if (typeof StockUtils !== 'undefined' && typeof StockUtils._resetDropdown === 'function') {
                StockUtils._resetDropdown('newAssetSourceWarehouse', 'Önce ürün seçiniz...', true);
                StockUtils._resetDropdown('newAssetSourceLocation', 'Önce depo seçiniz...', true);
            }
            return;
        }

        if (typeof StockUtils !== 'undefined') {
            await StockUtils.loadSmartWarehousesForProduct(selectedProductId, 'newAssetSourceWarehouse', 'newAssetSourceLocation');
        }

        // --- STOK LOKASYON BİLGİSİNİ GETİR ---
        const stoklarAlani = document.getElementById("sourceLocationSection");
        const stoklarListesi = document.getElementById("mevcutStoklarListesi");

        if (stoklarListesi) stoklarListesi.innerHTML = '<div class="p-2 text-center text-muted">Yükleniyor...</div>';
        if (stoklarAlani) stoklarAlani.classList.remove("d-none");

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${CONFIG.API_BASE_URL}/stock-levels/by-product/${selectedProductId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.ok) {
                const stoklar = await res.json();
                if (stoklarListesi) stoklarListesi.innerHTML = '';

                if (stoklar.length === 0) {
                    if (stoklarListesi) {
                        stoklarListesi.innerHTML = '<div class="p-2 text-center text-danger fw-bold">Bu ürün için depolarda stok bulunmuyor!</div>';
                    }
                } else {
                    stoklar.forEach(stok => {
                        const item = document.createElement("div");
                        item.className = "list-group-item list-group-item-action d-flex flex-column flex-md-row justify-content-between align-items-md-center p-3 border-start border-4 border-top-0 border-end-0 border-bottom-1 mb-2 shadow-sm rounded border-secondary stock-location-item cursor-pointer";

                        const depoAdi = stok.warehouseName || stok.WarehouseName || stok.warehouse || "Bilinmeyen Depo";
                        const rafAdi = stok.locationCode || stok.locationName || "Bilinmeyen Raf";

                        item.innerHTML = `                             
                            <div class="d-flex align-items-center mb-3 mb-md-0 w-100 cursor-pointer">
                                <div class="form-check me-3 fs-4">
                                    <input class="form-check-input mt-0 cursor-pointer" type="radio" name="assetSourceLocRadio">
                                </div>
                                <div class="flex-grow-1">
                                    <div class="fw-bold text-dark fs-6"><i class="bi bi-building me-1 text-primary"></i>${escapeHtml(depoAdi)}</div>
                                    <div class="text-secondary small"><i class="bi bi-box me-1"></i>Raf: <span class="fw-bold text-dark">${escapeHtml(rafAdi)}</span></div>
                                </div>
                            </div>
                            <div class="d-flex align-items-center justify-content-between w-100 mt-2 mt-md-0 w-md-25">
                                <span class="badge bg-primary bg-opacity-10 text-primary border-primary border rounded-pill px-3 py-2 fs-6 me-2 shadow-sm" title="Mevcut Stok">${stok.quantity} ${escapeHtml(stok.unitShortCode || 'ADET')}</span>
                                <input type="number" class="form-control form-control-sm border-success text-center fw-bold shadow-sm d-none qty-input" value="1" disabled>
                            </div>
                        `;

                        const radio = item.querySelector('input[type="radio"]');
                        const qtyInput = item.querySelector('.qty-input');

                        item.onclick = async (e) => {
                            if (e.target !== radio && e.target !== qtyInput) {
                                radio.checked = true;
                            }

                            // Tümünü sıfırla
                            Array.from(stoklarListesi.children).forEach(child => {
                                child.classList.remove('bg-success', 'bg-opacity-10', 'border-success');
                                child.classList.add('border-secondary');
                                const childQty = child.querySelector('.qty-input');
                                if (childQty) childQty.classList.add('d-none');
                            });

                            // Seçileni aktif et
                            item.classList.remove('border-secondary');
                            item.classList.add('bg-success', 'bg-opacity-10', 'border-success');
                            qtyInput.classList.remove('d-none');

                            // Depo ve rafı otomatik seç
                            const whSelect = document.getElementById("newAssetSourceWarehouse");
                            const locSelect = document.getElementById("newAssetSourceLocation");

                            if (whSelect) {
                                whSelect.value = stok.warehouseId;
                                whSelect.dispatchEvent(new Event('change'));

                                // Raf listesinin yüklenmesini bekle
                                setTimeout(() => {
                                    if (locSelect) {
                                        locSelect.value = stok.locationId;
                                    }
                                }, 300);
                            }
                        };
                        stoklarListesi.appendChild(item);
                    });
                }
            } else {
                if (stoklarListesi) stoklarListesi.innerHTML = '<div class="p-2 text-center text-danger">Stok bilgisi alınamadı.</div>';
            }
        } catch (e) {
            console.error("Stok bilgisi çekilirken hata:", e);
            if (stoklarListesi) stoklarListesi.innerHTML = '<div class="p-2 text-center text-danger">Stok bilgisi çekilemedi.</div>';
        }


        // ... (Ürün değiştiğinde kuralları getiren PIM kodlarının devamı) ...
        const selectedOption = this.options[this.selectedIndex];
        const categoryId = selectedOption?.dataset?.categoryId;
        const attrContainer = document.getElementById('newAssetAttributesContainer');
        if (attrContainer) {
            attrContainer.innerHTML = '';
            if (categoryId) {
                try {
                    const rules = await apiRequest(`/attribute-rules/category/${categoryId}`, 'GET');
                    const assetRules = rules.filter(r => r.targetLevel === 'Asset' || r.TargetLevel === 'Asset');
                    if (assetRules.length > 0) {
                        attrContainer.innerHTML = `<h6 class="fw-bold text-info mb-3 mt-4"><i class="bi bi-list-check me-2"></i>3. Ekipman Özellikleri</h6>`;
                        const row = document.createElement('div');
                        row.className = 'row g-3';
                        assetRules.forEach(rule => {
                            const isReq = rule.isRequired || rule.IsRequired;
                            const key = rule.attributeKey || rule.AttributeKey;
                            const type = rule.dataType || rule.DataType;
                            const uiComp = rule.uiComponent || rule.UiComponent;
                            const allowedVals = rule.attributeAllowedValues || rule.AttributeAllowedValues;

                            const col = document.createElement('div');
                            col.className = 'col-md-6';
                            const label = document.createElement('label');
                            label.className = 'form-label small fw-bold text-muted';
                            label.innerHTML = `${key} ${isReq ? '<span class="text-danger">*</span>' : ''}`;

                            let input;
                            if (uiComp === 'select' && allowedVals && allowedVals.length > 0) {
                                input = document.createElement('select');
                                input.className = 'form-select dynamic-asset-attr';
                                input.add(new Option('Seçiniz...', ''));
                                allowedVals.forEach(val => {
                                    const v = val.value || val.Value;
                                    input.add(new Option(v, v));
                                });
                            } else {
                                input = document.createElement('input');
                                input.type = (type === 'number' || type === 'decimal') ? 'number' : 'text';
                                input.className = 'form-control dynamic-asset-attr';
                                input.placeholder = key + ' giriniz...';
                            }
                            input.dataset.key = key;
                            input.dataset.type = type;
                            if (isReq) input.required = true;

                            col.appendChild(label);
                            col.appendChild(input);
                            row.appendChild(col);
                        });
                        attrContainer.appendChild(row);
                    }
                } catch (e) {
                    console.error("Özellik kuralları alınamadı", e);
                }
            }
        }
    });

    document.getElementById('deleteAssetTargetLocation')?.addEventListener('change', async function () {
        const infoDiv = document.getElementById('targetLocationStockInfo');
        const valSpan = document.getElementById('targetLocationStockValue');

        if (this.value && currentAssetProductId) {
            try {
                const stockData = await apiRequest(`/stock-levels/by-product/${currentAssetProductId}`, 'GET');
                const rafStogu = stockData.find(s => s.locationId === parseInt(this.value, 10));

                valSpan.textContent = rafStogu ? rafStogu.quantity : "0";
                infoDiv.classList.remove('d-none');
            } catch (e) {
                infoDiv.classList.add('d-none');
            }
        } else {
            infoDiv.classList.add('d-none');
        }
    });

    document.getElementById('newAssetSourceWarehouse')?.addEventListener('change', function () {
        if (typeof StockUtils !== 'undefined') {
            StockUtils.fillSmartLocationsForWarehouse(this.value, 'newAssetSourceLocation');
        }
    });

    document.getElementById('deleteAssetTargetWarehouse')?.addEventListener('change', function () {
        if (typeof StockUtils !== 'undefined') {
            StockUtils.loadAllLocations(this.value, 'deleteAssetTargetLocation');
        }
    });

    document.getElementById('returnToStockSwitch')?.addEventListener('change', function () {
        const label = document.getElementById('returnToStockLabel');
        const targetGroup = document.getElementById('returnTargetLocationGroup');

        if (this.checked) {
            label.innerHTML = 'Stoka Geri Al <span class="text-success small">(Stok miktarını artırır)</span>';
            if (targetGroup) targetGroup.classList.remove('d-none');
        } else {
            label.innerHTML = 'Stoka Geri Alma <span class="text-danger small">(Stok miktarını artırmaz)</span>';
            if (targetGroup) targetGroup.classList.add('d-none');
        }
    });
}

// Modallar kapandığında içlerindeki verileri, formları ve uyarıları sıfırlama işlemlerini yönetir. 
function initModalResetListeners() {
    document.getElementById('createAssetModal')?.addEventListener('hidden.bs.modal', () => {
        const productSelect = document.getElementById('newAssetProduct');
        const serialInput = document.getElementById('newAssetSerial');
        const notesInput = document.getElementById('newAssetNotes');

        if (productSelect) productSelect.value = '';
        if (serialInput) serialInput.value = '';
        if (notesInput) notesInput.value = '';

        if (typeof StockUtils !== 'undefined') {
            StockUtils._resetDropdown('newAssetSourceWarehouse', 'Önce ürün seçiniz...', true);
            StockUtils._resetDropdown('newAssetSourceLocation', 'Önce depo seçiniz...', true);
        }

        const stoklarAlani = document.getElementById("sourceLocationSection");
        const stoklarListesi = document.getElementById("mevcutStoklarListesi");
        if (stoklarAlani) stoklarAlani.classList.add("d-none");
        if (stoklarListesi) stoklarListesi.innerHTML = "";

        const attrContainer = document.getElementById('newAssetAttributesContainer');
        if (attrContainer) attrContainer.innerHTML = '';

        const assignedUserSelect = document.getElementById('newAssetAssignedUser');
        if (assignedUserSelect) assignedUserSelect.value = '';

        const btnEkle = document.getElementById('btnSubmitCreateAsset');
        if (btnEkle) {
            btnEkle.disabled = false;
            btnEkle.innerHTML = 'Sisteme Kaydet';
        }
    });

    document.getElementById('deleteAssetModal')?.addEventListener('hidden.bs.modal', () => {
        const stockSwitch = document.getElementById('returnToStockSwitch');
        if (stockSwitch) {
            stockSwitch.checked = true;
            stockSwitch.dispatchEvent(new Event('change'));
        }

        const targetWarehouse = document.getElementById('deleteAssetTargetWarehouse');
        if (targetWarehouse) targetWarehouse.value = '';

        const stockInfo = document.getElementById('targetLocationStockInfo');
        if (stockInfo) stockInfo.classList.add('d-none');

        if (typeof StockUtils !== 'undefined') {
            StockUtils._resetDropdown('deleteAssetTargetLocation', 'Önce depo seçin...', true);
        }
    });

    const actionModals = ['assignAssetModal', 'returnAssetModal', 'breakdownModal', 'resolveModal', 'maintenanceModal'];
    actionModals.forEach(modalId => {
        document.getElementById(modalId)?.addEventListener('hidden.bs.modal', function () {
            this.querySelectorAll('textarea, input[type="date"], select').forEach(el => el.value = '');
        });
    });
}

function initSearchCamera() {
    const btnKameraAcAsset = document.getElementById("btnKameraAcAsset");
    const scannerModalEl = document.getElementById("scannerModalAsset");

    btnKameraAcAsset?.addEventListener("click", async () => {
        const durumEl = document.getElementById('kameraDurumAsset');

        // Kullanıcının butona art arda tıklayıp sistemi bozmasını engellemek için butonu kilitler.
        if (btnKameraAcAsset) btnKameraAcAsset.disabled = true;
        const scannerModalInstance = bootstrap.Modal.getOrCreateInstance(scannerModalEl);

        try {
            if (typeof checkCameraPermission === 'function') {
                await checkCameraPermission();
            }

            // İzin doğrulandıktan sonra kamera modalını güvenle ekranda gösterir.
            scannerModalInstance.show();

            if (durumEl) {
                durumEl.textContent = "Kamera başlatılıyor...";
                durumEl.className = "text-center text-muted small mt-3 fw-bold";
            }

            if (typeof startScanner === 'function') {
                let isProcessingQR = false;

                await startScanner("readerAsset", async (scannedText) => {
                    if (isProcessingQR) return;
                    isProcessingQR = true;

                    try {
                        if (durumEl) {
                            durumEl.textContent = "Barkod Okundu! Yönlendiriliyor...";
                            durumEl.className = "text-center text-success small mt-3 fw-bold";
                        }

                        stopScanner();
                        scannerModalInstance.hide();

                        setTimeout(async () => {
                            await searchAsset(scannedText);
                        }, 100);

                    } finally {
                        isProcessingQR = false;
                    }
                }, () => {
                    if (durumEl && durumEl.className.includes("text-muted") && !isProcessingQR) {
                        durumEl.textContent = "Karekod veya Barkod aranıyor, kameraya gösterin...";
                    }
                });
            }
        } catch (error) {
            if (btnKameraAcAsset) btnKameraAcAsset.disabled = false;

            try { scannerModalInstance.hide(); } catch (e) { }

            // Motorun (scanner.js) gönderdiği Türkçe hatayı alır ve kullanıcıya gösterir.
            const hataMetni = error?.message ? error.message : "Kameraya erişilemedi veya izin reddedildi.";
            uyariGoster(hataMetni);
        }
    });

    // Kullanıcı modalı kapattığında motoru durdurur ve butonu tekrar aktif eder.
    scannerModalEl?.addEventListener('hidden.bs.modal', () => {
        if (typeof stopScanner === 'function') stopScanner();
        if (btnKameraAcAsset) btnKameraAcAsset.disabled = false;
    });
}

function initAddAssetCamera() {
    const btnKameraAcEkle = document.getElementById("btnKameraAcEkle");
    const btnKameraKapatEkle = document.getElementById("btnKameraKapatEkle");
    const kameraAlaniEkle = document.getElementById("kameraAlaniEkle");
    const inputNewAssetSerial = document.getElementById("newAssetSerial");

    btnKameraAcEkle?.addEventListener("click", async () => {
        if (btnKameraAcEkle.disabled) return;

        // Kullanıcının butona art arda tıklayıp sistemi bozmasını engellemek için butonu kilitler.
        btnKameraAcEkle.disabled = true;

        try {
            if (typeof checkCameraPermission === 'function') {
                await checkCameraPermission();
            }

            // İzin doğrulandıktan sonra kamera alanını görünür hale getirir.
            kameraAlaniEkle.classList.remove("d-none");
            let isProcessingQR = false;

            // Motorun kamerayı açmasını bekler ve okuma işlemi başarılı olduğunda içindeki fonksiyonu çalıştırır.
            await startScanner("readerEkle", (scannedText) => {
                if (isProcessingQR) return;
                isProcessingQR = true;

                try {
                    // Dışarıya aldığımız iş mantığını çağırarak metni güvenle parçalar.
                    const parsedData = parseAssetBarcode(scannedText);

                    // Ayrıştırılan seri numarasını ilgili forma yazar.
                    inputNewAssetSerial.value = parsedData.serialNumber;

                    // Ayrıştırılan ürün barkodunu sistemdeki ürünler listesinde arar ve bulursa otomatik seçer.
                    const productSelect = document.getElementById('newAssetProduct');
                    let productFound = false;

                    if (productSelect) {
                        const options = Array.from(productSelect.options);
                        const matchedOption = options.find(opt => opt.dataset.barcode === parsedData.productBarcode || opt.dataset.barcode === scannedText);

                        if (matchedOption) {
                            productSelect.value = matchedOption.value;
                            productSelect.dispatchEvent(new Event('change'));
                            productFound = true;
                        }
                    }

                    // Kullanıcıya işlemin durumu hakkında bilgi verir.
                    if (productFound) {
                        basariToast("Ürün ve Seri No eşleştirildi!");
                    } else {
                        basariToast("Barkod okundu (Ürün bulunamadı)");
                    }

                    // İşlem bittiği için kamerayı güvenle kapatır.
                    closeScannerEkle();
                } finally {
                    isProcessingQR = false;
                }
            }, () => { });
        } catch (error) {
            if (btnKameraAcEkle) btnKameraAcEkle.disabled = false;

            // Motorun (scanner.js) gönderdiği Türkçe hatayı alır ve kullanıcıya gösterir.
            const hataMetni = error?.message ? error.message : "Kameraya erişilemedi veya izin reddedildi.";
            uyariGoster(hataMetni);
        }
    });

    // Kullanıcı kamerayı kapattığında veya modal kapandığında motoru temizler.
    btnKameraKapatEkle?.addEventListener("click", closeScannerEkle);
    document.getElementById('createAssetModal')?.addEventListener('hidden.bs.modal', closeScannerEkle);

    // Kamera alanını gizler, butonu tekrar aktif eder ve tarayıcıyı tamamen durdurur.    
    function closeScannerEkle() {
        kameraAlaniEkle?.classList.add("d-none");
        if (btnKameraAcEkle) btnKameraAcEkle.disabled = false;
        if (typeof stopScanner === 'function') stopScanner();
    }
}

// Grid Listesine Geri Dönüş Fonksiyonu
async function goBackToGrid() {
    currentAssetId = null;
    currentAssetProductId = null;
    currentAssetSerialNumber = null; // Geri dönünce hafızayı temizler

    document.getElementById('assetResultContainer').classList.add('d-none');
    document.getElementById('serialSearchInput').value = '';

    if (["admin", "superadmin"].includes(userRole)) {
        document.getElementById('adminGridContainer').classList.remove('d-none');
        await loadGridCards(currentGridPage); // Beklenerek çiziliyor      
    }
}

// Ürün kataloğunu sunucudan çeker ve  Yeni Ekipman Ekle modalındaki ürün listesini doldurur. 
async function loadProductsForDropdown() {
    try {
        const select = document.getElementById('newAssetProduct');
        if (!select) return;

        select.length = 0;
        select.add(new Option("Yükleniyor...", ""));
        select.disabled = true;

        const data = await apiRequest('/products?pageNumber=1&pageSize=1000', 'GET');
        select.length = 0;

        // API yanıtı data.items, data.products veya direkt array olabilir
        const products = data.items || data.products || data.data || data;

        if (Array.isArray(products) && products.length > 0) {
            // Sadece stok miktarı 0'dan büyük olan ürünleri filtrele
            const availableProducts = products.filter(p => {
                const sq = p.stockQuantity ?? p.StockQuantity ?? 0;
                return parseFloat(sq) > 0;
            });

            if (availableProducts.length > 0) {
                select.add(new Option("-- Bir Ürün Seçin --", ""));
                availableProducts.forEach(product => {
                    const stokText = product.stockQuantity ?? product.StockQuantity ?? 'Bilinmiyor';
                    const name = product.name ?? product.Name;
                    const id = product.id ?? product.Id;
                    const catId = product.categoryId ?? product.CategoryId;
                    const barcode = product.barcode ?? product.Barcode;

                    const option = new Option(`${name} (Stok: ${stokText})`, id);
                    if (catId) option.dataset.categoryId = catId;
                    if (barcode) option.dataset.barcode = barcode;
                    select.add(option);
                });
                select.disabled = false;
            } else {
                select.add(new Option("Stokta ürün bulunamadı!", ""));
                select.disabled = true;
            }
        } else {
            select.add(new Option("Kayıtlı ürün bulunamadı!", ""));
            select.disabled = true;
        }
    } catch (e) {
        console.error("Ürünler yüklenirken hata:", e);
        const select = document.getElementById('newAssetProduct');
        if (select) {
            select.length = 0;
            select.add(new Option("Bağlantı Hatası!", ""));
            select.disabled = false;
        }
    }
}

// Sistemdeki kullanıcıları sayfalama ile çeker ve Kullanıcı Atama modalına aktarır. 
async function loadUsersForDropdown() {
    try {
        const response = await apiRequest('/users?pageNumber=1&pageSize=1000', 'GET');
        const users = response.items || response.data || response;
        const select = document.getElementById('assignUserSelect');
        const selectNewAsset = document.getElementById('newAssetAssignedUser');

        if (select) select.length = 0;
        if (selectNewAsset) selectNewAsset.length = 0;

        if (users && users.length > 0) {
            if (select) select.add(new Option("-- Kullanıcıyı Seçiniz --", ""));
            if (selectNewAsset) selectNewAsset.add(new Option("Şimdilik boşta kalsın...", ""));

            users.forEach(user => {
                const fname = user.firstName ?? user.FirstName ?? "";
                const lname = user.lastName ?? user.LastName ?? "";
                const email = user.email ?? user.Email ?? "Bilinmiyor";
                const displayName = `${fname} ${lname}`.trim() || email;
                const id = user.id ?? user.Id;

                if (select) select.add(new Option(displayName, id));
                if (selectNewAsset) selectNewAsset.add(new Option(displayName, id));
            });
        } else {
            if (select) select.add(new Option("Kullanıcı bulunamadı!", ""));
            if (selectNewAsset) selectNewAsset.add(new Option("Kullanıcı bulunamadı!", ""));
        }
    } catch (e) {
        console.error("Kullanıcılar yüklenirken hata:", e);
    }
}

async function searchAsset(kameraBarkodu = null, skipHistory = false) {
    let serial = "";
    let isManualInput = false;

    if (kameraBarkodu && typeof kameraBarkodu === "string") {
        serial = kameraBarkodu.trim();
    } else {
        const inputVal = document.getElementById('serialSearchInput').value.trim();
        serial = inputVal || currentAssetSerialNumber;
        if (inputVal) isManualInput = true;
    }

    if (!serial) return;

    try {
        const data = await apiRequest(`/assets/${encodeURIComponent(serial)}/timeline`, 'GET');
        currentAssetId = data.assetInfo.id;
        currentAssetProductId = data.assetInfo.productId;
        currentAssetSerialNumber = data.assetInfo.serialNumber;

        document.getElementById('assetResultContainer').classList.remove('d-none');
        // Arama yapıldığında Grid'i gizle
        document.getElementById('adminGridContainer').classList.add('d-none');

        // 1. Cihaz Profilini Doldur        
        document.getElementById('resProductName').textContent = data.assetInfo.productName;
        document.getElementById('resSerialNumber').textContent = data.assetInfo.serialNumber;

        const status = data.assetInfo.status;
        const ui = getAssetStatusUI(status); // Ortak Yardımcı fonksiyondan UI değerlerini al

        const iconContainer = document.getElementById('resIconContainer');
        const iconElement = document.getElementById('resIconElement');

        if (iconContainer) {
            iconContainer.className = `d-inline-flex align-items-center justify-content-center ${ui.bgClass} rounded-circle mb-3 h-60px w-60px`;
        }
        if (iconElement) {
            iconElement.className = `bi bi-laptop fs-1 ${ui.iconColor}`;
        }

        const resStatusEl = document.getElementById('resStatus');
        resStatusEl.innerHTML = `<span class="badge ${ui.badgeClass} px-3 py-2 fs-6 rounded-pill">${ui.iconExtra || ''}${ui.text}</span>`;

        if (data.assetInfo.nextMaintenanceDate) {
            resStatusEl.innerHTML += `<div class="mt-2"><small class="text-info fw-bold"><i class="bi bi-calendar-event"></i> Sonraki Bakım: ${new Date(data.assetInfo.nextMaintenanceDate).toLocaleDateString('tr-TR')}</small></div>`;
        }

        document.getElementById('resAssignedTo').textContent = data.assetInfo.assignedTo;

        // Ekranda birden fazla buton varsa tümünü gizler
        const btnAssign = document.querySelectorAll('[data-bs-target="#assignAssetModal"]');
        const btnReturn = document.querySelectorAll('[data-bs-target="#returnAssetModal"]');
        const btnBreakdown = document.querySelectorAll('[data-bs-target="#breakdownModal"]');
        const btnResolve = document.querySelectorAll('[data-bs-target="#resolveModal"]');
        const btnRetire = document.querySelectorAll('[data-bs-target="#deleteAssetModal"]');
        const btnMaintenance = document.querySelectorAll('[data-bs-target="#maintenanceModal"]');

        const canAssign = hasPermission("Asset.Assign");
        const canEdit = hasPermission("Asset.Edit");
        const canDelete = hasPermission("Asset.Delete");

        // Tüm liste öğeleri için güvenlik kapıları
        btnAssign.forEach(btn => btn.classList.toggle('d-none', status !== 'Available' || !canAssign));
        btnReturn.forEach(btn => btn.classList.toggle('d-none', status !== 'InUse' || !canAssign));

        // Kullanım Dışı ise Bakımı Gizler
        btnMaintenance.forEach(btn => btn.classList.toggle('d-none', status === 'Retired' || !canEdit));

        btnBreakdown.forEach(btn => btn.classList.toggle('d-none', status === 'Broken' || status === 'Retired' || !canEdit));
        btnResolve.forEach(btn => btn.classList.toggle('d-none', status !== 'Broken' || !canEdit));

        btnRetire.forEach(btn => {
            const wrapper = btn.closest('.border-top') || btn.parentElement;
            if (wrapper) wrapper.classList.toggle('d-none', status === 'Retired' || !canDelete);
        });

        // 2. Timeline (Zaman Çizelgesini) Çiz
        const timelineUl = document.getElementById('assetTimelineList');
        timelineUl.innerHTML = ''; // Önce temizle

        if (data.timeline && data.timeline.length > 0) {
            const timelineHtml = data.timeline.map(event => {
                // Etkinlik tipine göre timeline nokta rengini ve ikonunu belirle
                let dotClass = "dot-primary";
                let iconHtml = '<i class="bi bi-info-circle text-primary"></i>';

                if (event.eventType === "Sisteme Giriş") {
                    dotClass = "dot-success";
                    iconHtml = '<i class="bi bi-box-arrow-in-right text-success"></i>';
                } else if (event.eventType.includes("Atandı") || event.eventType.includes("Teslim")) {
                    // Kullanıcı Atandı veya Teslim Alındı durumlarında sarı nokta yanar
                    dotClass = "dot-warning";
                    iconHtml = '<i class="bi bi-person-check text-warning"></i>';
                } else if (event.eventType.includes("Arıza") || event.eventType.includes("Servis") || event.eventType.includes("Bakım")) {
                    // Arıza, Çözüm veya Bakım durumlarında kırmızı/mavi nokta yanar
                    dotClass = event.eventType.includes("Arıza") ? "dot-danger" : "dot-info";
                    let iconColor = event.eventType.includes("Arıza") ? "text-danger" : "text-info";
                    iconHtml = `<i class="bi bi-tools ${iconColor}"></i>`;
                }

                // Tarihi formatla                
                let dateString = "Tarih Yok";
                if (event.date) {
                    const parsedDate = new Date(event.date);

                    if (!isNaN(parsedDate.getTime())) {
                        // UTC'den Yerel Saate (Local Time) güvenli çeviri
                        dateString = parsedDate.toLocaleString('tr-TR', {
                            year: 'numeric', month: '2-digit', day: '2-digit',
                            hour: '2-digit', minute: '2-digit', second: '2-digit'
                        });
                    }
                }

                return `
                    <li class="timeline-item ${dotClass}">
                        <div class="timeline-content">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span class="fw-bold fs-6">${iconHtml} ${escapeHtml(event.eventType)}</span>
                                <span class="text-muted small"><i class="bi bi-calendar3"></i> ${dateString}</span>
                            </div>
                            <p class="mb-0 text-secondary">${escapeHtml(event.notes || "Açıklama bulunmuyor.")}</p>
                            <div class="mt-2 text-end">
                                <small class="text-muted fst-italic"><i class="bi bi-person-fill"></i> İşlem: ${escapeHtml(event.userName)}</small>
                            </div>
                        </div>
                    </li>
                `;
            }).join('');

            timelineUl.innerHTML = timelineHtml; // Tek seferde DOM'a yazıldı        
        } else {
            timelineUl.innerHTML = '<li class="text-muted fst-italic">Geçmiş kaydı bulunamadı.</li>';
        }

        // Sonuç alanını göster, input'u temizle
        document.getElementById('assetResultContainer').classList.remove('d-none');

        // Eğer arama başarılıysa ve inputtan yapıldıysa kutuyu temizle
        if (isManualInput) {
            document.getElementById('serialSearchInput').value = '';
        }

    } catch (error) {
        hataGoster(error.message);
        document.getElementById('assetResultContainer').classList.add('d-none');

        document.getElementById('serialSearchInput').value = '';

        // Hata alındığında kullanıcı yetkiliyse boş ekranda kalmaması için Grid'i (Tabloyu) geri getiriyoruz
        if (["admin", "superadmin"].includes(userRole)) {
            document.getElementById('adminGridContainer').classList.remove('d-none');
        }
    }
}

async function submitAssignAsset() {
    if (!currentAssetId) return;
    const userId = document.getElementById('assignUserSelect').value;
    const notes = document.getElementById('assignNotes').value;

    if (!userId) {
        uyariGoster("Lütfen atanacak kullanıcıyı seçiniz!");
        return;
    }

    await sendAssetAction(`${CONFIG.API_BASE_URL}/assets/${currentAssetId}/assign`, 'PUT', {
        userId: parseInt(userId, 10),
        notes: notes
    });
}

async function submitReturnAsset() {
    if (!currentAssetId) return;
    const notes = document.getElementById('returnNotes').value;

    await sendAssetAction(`${CONFIG.API_BASE_URL}/assets/${currentAssetId}/return`, 'PUT', { notes });
}

async function submitBreakdown() {
    if (!currentAssetId) return;
    const description = document.getElementById('breakdownDesc').value;

    if (!description) {
        uyariGoster("Lütfen arıza açıklamasını yazın!");
        return;
    }

    await sendAssetAction(`${CONFIG.API_BASE_URL}/assets/${currentAssetId}/breakdown`, 'POST', { description });
}

async function submitResolve() {
    if (!currentAssetId) return;
    const solution = document.getElementById('resolveSolution').value;

    if (!solution) {
        uyariGoster("Lütfen çözüm detaylarını yazın!");
        return;
    }

    await sendAssetAction(`${CONFIG.API_BASE_URL}/assets/${currentAssetId}/resolve`, 'POST', { solution });
}

async function submitMaintenance() {
    if (!currentAssetId) return;
    const details = document.getElementById('maintenanceDetails').value;
    const nextDate = document.getElementById('maintenanceNextDate').value;

    if (!details) {
        uyariGoster("Lütfen yapılan bakımın detaylarını girin!");
        return;
    }

    const payload = { details };
    if (nextDate) payload.nextMaintenanceDate = new Date(nextDate).toISOString();

    await sendAssetAction(`${CONFIG.API_BASE_URL}/assets/${currentAssetId}/maintenance`, 'POST', payload);
}

// Tüm Butonlar İçin Ortak Backend İletişim Fonksiyonu
async function sendAssetAction(url, method, body) {
    try {
        const endpoint = url.replace(CONFIG.API_BASE_URL, '');
        const result = await apiRequest(endpoint, method, body) || {};

        // Sadece ekranda aktif olarak açık olan modalı bul ve kapat
        const activeModalEl = document.querySelector('.modal.show');
        if (activeModalEl) {
            bootstrap.Modal.getInstance(activeModalEl).hide();
        }

        // Ekrana başarı mesajı ver ve Timeline'ı (Zaman çizelgesini) güncelle!
        basariToast("Harika! " + (result.message || "İşlem başarıyla tamamlandı."));
        await searchAsset(); //Ekranın güncellenmesi beklenecek        

    } catch (e) {
        hataGoster("Bağlantı hatası: " + e.message);
    }
}

// YENİ EKİPMAN OLUŞTURMA FONKSİYONU (WMS Entegreli)
async function submitCreateAsset() {
    const productId = document.getElementById('newAssetProduct').value;
    const serialNumber = document.getElementById('newAssetSerial').value.trim();
    const notes = document.getElementById('newAssetNotes').value.trim();
    const locationId = document.getElementById('newAssetSourceLocation').value;

    if (!productId) {
        return uyariGoster("Lütfen kaydedilecek Ürünü seçiniz!");
    }
    if (!serialNumber) {
        return uyariGoster("Lütfen ekipmanın Seri Numarasını veya Barkodunu giriniz!");
    }
    if (!locationId) {
        return uyariGoster("Lütfen stoktan düşülecek Çıkış Rafını seçiniz!");
    }

    const btnEkle = document.getElementById('btnSubmitCreateAsset');
    const originalText = btnEkle ? btnEkle.innerHTML : '';

    if (btnEkle) {
        btnEkle.disabled = true;
        btnEkle.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Kaydediliyor...';
    }

    const attrInputs = document.querySelectorAll('.dynamic-asset-attr');
    const attributesObj = [];
    let hasValidationError = false;
    attrInputs.forEach(input => {
        if (input.required && !input.value.trim()) {
            hasValidationError = true;
        }
        if (input.value.trim()) {
            attributesObj.push({ key: input.dataset.key, value: input.value.trim(), type: input.dataset.type });
        }
    });

    const assignedUserId = document.getElementById('newAssetAssignedUser')?.value;

    if (hasValidationError) {
        if (btnEkle) {
            btnEkle.disabled = false;
            btnEkle.innerHTML = originalText;
        }
        return uyariGoster("Lütfen zorunlu ekipman özelliklerini doldurunuz.");
    }

    const attributes = attributesObj.length > 0 ? JSON.stringify(attributesObj) : null;

    try {
        const body = {
            productId: parseInt(productId, 10),
            serialNumber: serialNumber,
            notes: notes,
            locationId: parseInt(locationId, 10),
            attributes: attributes
        };
        if (assignedUserId) {
            body.assignedUserId = parseInt(assignedUserId, 10);
        }

        const res = await apiRequest('/assets', 'POST', body);
        basariToast("Harika! Yeni Ekipman başarıyla sisteme kaydedildi.");

        // Form penceresinde: liste pencerelerine haber ver ve kapan.
        if (window.ModalWindow && ModalWindow.isFormWindow) {
            ModalWindow.done('assets');
            return;
        }

        // Modalı kapatır
        const modalInstance = bootstrap.Modal.getInstance(document.getElementById('createAssetModal'));
        if (modalInstance) modalInstance.hide();

        // Sadece yetkisi olanlar için Grid'i YENİLER ve bitmesini BEKLER
        if (["admin", "superadmin"].includes(userRole)) {
            await loadGridCards(1);
        }

        // İşlem tamamen bittikten sonra detay aramasını tetikler
        document.getElementById('serialSearchInput').value = serialNumber;
        await searchAsset();
    } catch (e) {
        hataGoster("Bağlantı hatası: " + e.message);
    } finally {
        if (btnEkle) {
            btnEkle.disabled = false;
            btnEkle.innerHTML = originalText;
        }
    }
}

// ==========================================
// ADMİNLER İÇİN GRİD KART MOTORU
// ==========================================
const assetGrid = createDataView({
    containerId: "equipmentGridCards",
    paginationContainerId: "assetsPaginationContainer",
    mode: 'grid',
    emptyMessage: "Sistemde henüz kayıtlı ekipman yok.",
    pageSize: 8, // Sayfa başına 8 kart
    fetchPage: async (page, pageSize, sortKey, sortDir) => {

        let url = `/assets?pageNumber=1&pageSize=10000`;

        // FİLTRELERİ URL'E EKLE
        const categoryId = document.getElementById('filtreKategoriId')?.value;
        if (categoryId) url += `&categoryId=${categoryId}`;

        const statusFilter = document.getElementById('filtreDurum')?.value;
        if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;

        const dynamicInputs = document.querySelectorAll('.kural-filtresi');
        let dAttributes = {};
        dynamicInputs.forEach(input => {
            const val = input.value.trim();
            if (val) {
                const key = input.id.replace('filter_', '');
                dAttributes[key] = val;
            }
        });
        if (Object.keys(dAttributes).length > 0) {
            url += `&dynamicAttributes=${encodeURIComponent(JSON.stringify(dAttributes))}`;
        }

        // 1. Veriyi Backend'den Çek
        const response = await apiRequest(url, 'GET');
        let allAssets = response.assets || response.items || response.data || response || [];

        // 2. TEMİZ VE KUSURSUZ SIRALAMA MOTORU
        if (sortKey && Array.isArray(allAssets) && allAssets.length > 0) {
            allAssets.sort((a, b) => {
                const actualKey = Object.keys(a).find(k => k.toLowerCase() === sortKey.toLowerCase()) || sortKey;

                let valA = a[actualKey] ?? "";
                let valB = b[actualKey] ?? "";

                // EĞER SIRALANAN SÜTUN "TARİH" İSE (Örn: CreatedAt)
                if (actualKey.toLowerCase().includes('date') || actualKey.toLowerCase().includes('time') || actualKey.toLowerCase() === 'createdat') {
                    // Tarihleri milisaniyeye (sayıya) çevir
                    const dateA = valA ? new Date(valA).getTime() : 0;
                    const dateB = valB ? new Date(valB).getTime() : 0;

                    // Matematiksel sıralama: asc ise küçükten büyüğe, desc ise büyükten küçüğe
                    return sortDir === 'asc' ? (dateA - dateB) : (dateB - dateA);
                }

                // EĞER SIRALANAN SÜTUN "METİN" İSE (Örn: İsim, Durum vb. A-Z)
                valA = valA.toString().toLowerCase();
                valB = valB.toString().toLowerCase();

                if (valA < valB) return sortDir === 'asc' ? -1 : 1;
                if (valA > valB) return sortDir === 'asc' ? 1 : -1;
                return 0;
            });
        }

        // 3. SIRALANMIŞ VERİDEN İLGİLİ SAYFAYI KES
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedAssets = allAssets.slice(startIndex, endIndex);

        return {
            items: paginatedAssets,
            totalItems: allAssets.length
        };
    },
    renderCard: buildAssetCardHtml
});

async function loadGridCards(page = 1) {
    currentGridPage = page;
    assetGrid.load(page);
}

// ==========================================
// KART HTML ÜRETİCİSİ (UI VE DATA AYRIMI)
// ==========================================
function buildAssetCardHtml(asset) {
    const ui = getAssetStatusUI(asset.status);

    const personelAdi = asset.status === 'Retired' ? "Kullanımdan Kaldırıldı" : (asset.assignedToName ?? "Şu an Boşta");

    return `
        <div class="col-12 col-md-6 col-lg-4 col-xl-3">
            <div class="card border-0 shadow-sm rounded-4 h-100 equipment-grid-card position-relative asset-grid-card">
                <div class="card-body text-center p-4">
                    <div class="mb-3">
                        <div class="d-inline-flex align-items-center justify-content-center ${ui.bgClass} rounded-circle asset-icon-circle">
                            <i class="bi bi-laptop fs-1 ${ui.iconColor}"></i>
                        </div>
                    </div>
                    <h6 class="fw-bold mb-1 text-truncate" title="${escapeHtml(asset.productName)}">${escapeHtml(asset.productName)}</h6>
                    <div class="mb-3">
                        <span class="badge bg-dark rounded-pill fw-normal asset-sn-badge d-inline-block text-truncate" style="max-width: 100%;" title="${escapeHtml(asset.serialNumber)}">SN: ${escapeHtml(asset.serialNumber)}</span>
                    </div>                    
                    
                    <div class="d-flex flex-column align-items-center justify-content-center border-top pt-3 mt-auto gap-2">                        
                        <span class="badge ${ui.badgeClass} rounded-pill px-3 text-wrap lh-base">${ui.shortText}</span> 
                      
                        <small class="text-muted w-100 text-center text-wrap lh-sm fs-080rem"><i class="bi bi-person-fill"></i> ${escapeHtml(personelAdi)}</small>
                    </div>
                    
                </div>
                <a href="#" class="stretched-link grid-asset-link" data-serial="${escapeHtml(asset.serialNumber)}"></a>
            </div>
        </div>
    `;
}

// ==========================================
// EKİPMANI KULLANIMDAN KALDIRMA 
// ==========================================
async function submitDeleteAsset() {
    if (!currentAssetId) return;

    const isReturnToStock = document.getElementById('returnToStockSwitch').checked;
    const locationId = document.getElementById('deleteAssetTargetLocation').value;

    if (isReturnToStock && !locationId) {
        return uyariGoster("Stoka geri almak için lütfen Hedef Rafı seçiniz!");
    }

    const btn = document.getElementById('btnSubmitDeleteAsset');
    const originalBtnHtml = btn ? btn.innerHTML : '';

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> İşleniyor...';
    }

    try {
        const endpoint = isReturnToStock
            ? `/assets/${currentAssetId}?returnLocationId=${locationId}`
            : `/assets/${currentAssetId}`;

        await apiRequest(endpoint, 'DELETE');

        basariToast("Ekipman başarıyla silindi/pasife alındı.");

        const modalInstance = bootstrap.Modal.getInstance(document.getElementById('deleteAssetModal'));
        if (modalInstance) modalInstance.hide();

        document.getElementById('assetResultContainer').classList.add('d-none');
        document.getElementById('serialSearchInput').value = '';

        currentAssetId = null;
        currentAssetProductId = null;
        currentAssetSerialNumber = null; // Cihaz silinince hafızayı tamamen temizler        

        if (["admin", "superadmin"].includes(userRole)) {
            document.getElementById('adminGridContainer').classList.remove('d-none');
            await loadGridCards(currentGridPage); // Grid'i bulunduğu sayfada yeniler
        }

    } catch (e) {
        hataGoster("İşlem hatası: " + e.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalBtnHtml;
        }
    }
}

// ==========================================
// KATEGORI CASCADER VE DINAMIK FILTRE MOTORU
// ==========================================

async function dropdownKategorileriYukleAssets() {
    try {
        const data = await apiRequest("/categories?pageNumber=1&pageSize=1000", "GET");
        window.tumKategoriler = data.items || data;
        buildCategoryCascader("filtreKategoriContainer", "filtreKategoriId", null, true);
    } catch (err) {
        console.error("Kategoriler yüklenemedi", err);
    }
}

function buildCategoryCascader(containerId, hiddenInputId, selectedCategoryId = null, isFilter = false) {
    const container = document.getElementById(containerId);
    const hiddenInput = document.getElementById(hiddenInputId);
    if (!container || !hiddenInput) return;

    let finalizedCategoryId = selectedCategoryId;
    let expandedCategories = new Set();

    function updateExpandedCategories(id) {
        expandedCategories.clear();
        if (!id) return;

        expandedCategories.add(id);
        let current = window.tumKategoriler.find(k => k.id == id);
        while (current && current.parentId) {
            expandedCategories.add(current.parentId);
            current = window.tumKategoriler.find(k => k.id == current.parentId);
        }
    }

    if (finalizedCategoryId) {
        updateExpandedCategories(finalizedCategoryId);
    }

    container.innerHTML = "";

    const dropdownDiv = document.createElement("div");
    dropdownDiv.className = "dropdown w-100";

    const button = document.createElement("button");
    let btnClasses = isFilter ? "btn form-control rounded-pill text-start bg-white border d-flex justify-content-between align-items-center" : "btn form-control text-start bg-white border d-flex justify-content-between align-items-center";
    button.className = btnClasses;
    button.type = "button";
    button.dataset.bsToggle = "dropdown";
    button.dataset.bsAutoClose = "outside";

    const spanText = document.createElement("span");
    spanText.className = "text-truncate pe-2";

    const caretIcon = document.createElement("i");
    caretIcon.className = "bi bi-chevron-down text-muted";
    caretIcon.style.fontSize = "0.8rem";

    button.appendChild(spanText);
    button.appendChild(caretIcon);

    const menu = document.createElement("ul");
    menu.className = "dropdown-menu w-100 shadow-sm scrollable-dropdown";

    dropdownDiv.appendChild(button);
    dropdownDiv.appendChild(menu);
    container.appendChild(dropdownDiv);

    function updateButtonText() {
        if (!finalizedCategoryId) {
            spanText.innerHTML = `<span class="text-muted">Kategori Seçin</span>`;
            hiddenInput.value = "";
            hiddenInput.dispatchEvent(new Event("change"));
            return;
        }
        const cat = window.tumKategoriler.find(k => k.id == finalizedCategoryId);
        if (cat) {
            spanText.textContent = cat.name;
            hiddenInput.value = cat.id;
            hiddenInput.dispatchEvent(new Event("change"));
        }
    }

    function renderLevel(parentId, parentUl, level) {
        const children = window.tumKategoriler.filter(k => k.parentId == parentId);
        if (children.length === 0) return;

        children.forEach(c => {
            const hasChildren = window.tumKategoriler.some(k => k.parentId == c.id);
            const isExpanded = expandedCategories.has(c.id);
            const isSelected = finalizedCategoryId == c.id;

            const li = document.createElement("li");
            li.className = "px-2 py-1";

            const itemDiv = document.createElement("div");
            itemDiv.className = "d-flex align-items-center justify-content-between rounded p-2 custom-dropdown-item";
            if (isSelected) {
                itemDiv.classList.add("bg-primary", "bg-opacity-10", "text-primary", "fw-bold");
            } else {
                itemDiv.classList.add("cursor-pointer");
            }
            if (level > 0) itemDiv.classList.add(`ms-${Math.min(level, 5)}`);

            const leftDiv = document.createElement("div");
            leftDiv.className = "d-flex align-items-center flex-grow-1";

            if (hasChildren) {
                const toggleBtn = document.createElement("span");
                toggleBtn.className = "me-2 text-muted cursor-pointer";
                toggleBtn.innerHTML = isExpanded ? `<i class="bi bi-dash-square"></i>` : `<i class="bi bi-plus-square"></i>`;
                toggleBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (expandedCategories.has(c.id)) {
                        expandedCategories.delete(c.id);
                    } else {
                        updateExpandedCategories(c.id);
                    }
                    renderMenu();
                };
                leftDiv.appendChild(toggleBtn);
            } else {
                const spacer = document.createElement("span");
                spacer.style.width = "20px";
                spacer.className = "d-inline-block me-2";
                leftDiv.appendChild(spacer);
            }

            const nameSpan = document.createElement("span");
            nameSpan.textContent = c.name;
            leftDiv.appendChild(nameSpan);

            itemDiv.appendChild(leftDiv);

            if (isSelected) {
                const checkIcon = document.createElement("i");
                checkIcon.className = "bi bi-check2 text-primary fs-5";
                itemDiv.appendChild(checkIcon);
            }

            itemDiv.onclick = (e) => {
                e.stopPropagation();
                finalizedCategoryId = c.id;
                updateExpandedCategories(c.id);
                renderMenu();
                updateButtonText();
                const bsDropdown = bootstrap.Dropdown.getInstance(button);
                if (bsDropdown) bsDropdown.hide();
            };

            li.appendChild(itemDiv);
            parentUl.appendChild(li);

            if (hasChildren && isExpanded) {
                const subUl = document.createElement("ul");
                subUl.className = "list-unstyled mb-0";
                renderLevel(c.id, subUl, level + 1);
                li.appendChild(subUl);
            }
        });
    }

    function renderMenu() {
        menu.innerHTML = "";
        if (isFilter) {
            const allLi = document.createElement("li");
            allLi.className = "px-2 py-1 border-bottom";
            const allDiv = document.createElement("div");
            allDiv.className = "d-flex align-items-center p-2 rounded custom-dropdown-item";
            if (!finalizedCategoryId) {
                allDiv.classList.add("bg-primary", "bg-opacity-10", "text-primary", "fw-bold");
            } else {
                allDiv.classList.add("cursor-pointer");
            }
            allDiv.innerHTML = `<span class="ms-4">Tümü</span>`;
            allDiv.onclick = (e) => {
                e.stopPropagation();
                finalizedCategoryId = null;
                expandedCategories.clear();
                renderMenu();
                updateButtonText();
                const bsDropdown = bootstrap.Dropdown.getInstance(button);
                if (bsDropdown) bsDropdown.hide();
            };
            allLi.appendChild(allDiv);
            menu.appendChild(allLi);
        }
        renderLevel(null, menu, 0);
    }

    renderMenu();
    updateButtonText();
}

// PENCEREYE TAŞINAN MODAL (kural: js/modal-window.js başındaki açıklama)
//   createAssetModal → yeni ekipman kaydı, çok alanlı form → pencere
//
// Diğerleri MODAL kalır — hepsi tek amaçlı, birkaç alanlık işlemler:
//   assignAssetModal (ata) · returnAssetModal (teslim al) · breakdownModal
//   (arıza bildir) · resolveModal (arıza çöz) · maintenanceModal (bakım) ·
//   deleteAssetModal (sil) · scannerModalAsset (kamera)
if (window.ModalWindow) {
    ModalWindow.register({ createAssetModal: 'Yeni Ekipman' });
    ModalWindow.onChanged('assets', () => {
        if (typeof loadGridCards === 'function') loadGridCards(1);
    });
}
