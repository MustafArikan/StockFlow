// XSS koruması


let currentAssetId = null;
let currentAssetProductId = null;
let currentAssetSerialNumber = null; //Uygulamanın baktığı cihazı unutmaması için
let currentGridPage = 1;
let currentGridPageSize = 8; // Izgara tasarımı için varsayılan 8
const userRole = typeof getUserRole === "function" ? getUserRole() : "User";
const token = localStorage.getItem('token');
if (!token) window.location.href = 'login.html';
const barcodeBeepSound = new Audio('audio/beep-07.wav');

// ==========================================
// SAYFA YÜKLENDİĞİNDE ÇALIŞACAKLAR 
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    applyPermissions();
    initEventListeners();

    loadProductsForDropdown();
    loadUsersForDropdown();

    // Güvenli WMS Entegrasyonu: İstek hatası durumunda uygulamanın çökmesini engeller
    if (typeof StockUtils !== 'undefined') {
        try {
            StockUtils.loadAllWarehouses('deleteAssetTargetWarehouse');
        } catch (e) {
            console.error("Hedef depolar yüklenirken kritik hata:", e);
        }
    }

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
function initEventListeners() {
    document.getElementById('btnSearchAsset')?.addEventListener('click', searchAsset);
    document.getElementById('serialSearchInput')?.addEventListener('keyup', e => { if (e.key === 'Enter') searchAsset(); });
    document.getElementById('btnGeriDonGrid')?.addEventListener('click', goBackToGrid);

    document.getElementById('equipmentGridCards')?.addEventListener('click', (e) => {
        const cardLink = e.target.closest('.grid-asset-link');
        if (cardLink) {
            e.preventDefault();
            document.getElementById('serialSearchInput').value = cardLink.getAttribute('data-serial');
            searchAsset();
        }
    });

    document.getElementById('btnSubmitCreateAsset')?.addEventListener('click', submitCreateAsset);
    document.getElementById('btnSubmitAssign')?.addEventListener('click', submitAssignAsset);
    document.getElementById('btnSubmitReturn')?.addEventListener('click', submitReturnAsset);
    document.getElementById('btnSubmitBreakdown')?.addEventListener('click', submitBreakdown);
    document.getElementById('btnSubmitResolve')?.addEventListener('click', submitResolve);
    document.getElementById('btnSubmitMaintenance')?.addEventListener('click', submitMaintenance);

    // Kullanımdan kaldırma butonu dinleyicisi eklendi
    document.getElementById('btnSubmitDeleteAsset')?.addEventListener('click', submitDeleteAsset);

    // Akıllı Cascading Dropdown Dinleyicileri (WMS Entegrasyonu)    
    document.getElementById('newAssetProduct')?.addEventListener('change', async function () {
        const selectedProductId = this.value;

        // Eğer ürün seçimi kaldırıldıysa/boşaltıldıysa, depoları ve rafları sıfırla
        if (!selectedProductId) {
            if (typeof StockUtils !== 'undefined' && typeof StockUtils._resetDropdown === 'function') {
                StockUtils._resetDropdown('newAssetSourceWarehouse', 'Önce ürün seçiniz...', true);
                StockUtils._resetDropdown('newAssetSourceLocation', 'Önce depo seçiniz...', true);
            }
            return;
        }

        // Bütün işi Ortak WMS Motoru (StockUtils) yapar
        if (typeof StockUtils !== 'undefined') {
            await StockUtils.loadSmartWarehousesForProduct(selectedProductId, 'newAssetSourceWarehouse', 'newAssetSourceLocation');
        }
    });

    document.getElementById('deleteAssetTargetLocation')?.addEventListener('change', async function () {
        const infoDiv = document.getElementById('targetLocationStockInfo');
        const valSpan = document.getElementById('targetLocationStockValue');

        if (this.value && currentAssetProductId) {
            try {
                // Seçilen ürünün, seçilen raftaki stok durumunu getiriyoruz
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

    // STOKA GERİ AL SWITCH DİNAMİK METİN DİNLEYİCİSİ ---
    document.getElementById('returnToStockSwitch')?.addEventListener('change', function () {
        const label = document.getElementById('returnToStockLabel');
        const targetGroup = document.getElementById('returnTargetLocationGroup');

        if (this.checked) {
            // Switch AÇIK iken:
            label.innerHTML = 'Stoka Geri Al <span class="text-success small">(Stok miktarını artırır)</span>';
            if (targetGroup) targetGroup.classList.remove('d-none'); // Depo/Raf seçimini gösterir
        } else {
            // Switch KAPALI iken:
            label.innerHTML = 'Stoka Geri Alma <span class="text-danger small">(Stok miktarını artırmaz)</span>';
            if (targetGroup) targetGroup.classList.add('d-none'); // Depo/Raf seçimini gizler
        }
    });

    // KAMERA 1: ARAMA EKRANI İÇİN
    initSearchCamera();

    // KAMERA 2: YENİ EKİPMAN EKLEME EKRANI İÇİN
    initAddAssetCamera();
}


function initSearchCamera() {
    const btnKameraAcAsset = document.getElementById("btnKameraAcAsset");
    const scannerModalEl = document.getElementById("scannerModalAsset");
    const originalHtml = btnKameraAcAsset ? btnKameraAcAsset.innerHTML : '';

    btnKameraAcAsset?.addEventListener("click", async () => {
        const durumEl = document.getElementById('kameraDurumAsset');

        if (btnKameraAcAsset) {
            btnKameraAcAsset.disabled = true;
            btnKameraAcAsset.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());

            btnKameraAcAsset.disabled = false;
            btnKameraAcAsset.innerHTML = originalHtml;

            const scannerModalInstance = bootstrap.Modal.getOrCreateInstance(scannerModalEl);
            scannerModalInstance.show();

            if (durumEl) {
                durumEl.textContent = "Kamera başlatılıyor...";
                durumEl.className = "text-center text-muted small mt-3 fw-bold";
            }

            startScanner("readerAsset", (scannedText) => {
                barcodeBeepSound.currentTime = 0; // Sesi başa sarar
                barcodeBeepSound.play().catch(() => { }); // Sesi çalar
                document.getElementById('serialSearchInput').value = scannedText;
                if (durumEl) {
                    durumEl.textContent = "Barkod Okundu! Yönlendiriliyor...";
                    durumEl.className = "text-center text-success small mt-3 fw-bold";
                }
                searchAsset();
                setTimeout(() => scannerModalInstance.hide(), 600);
            }, () => {
                if (durumEl && durumEl.className.includes("text-muted")) durumEl.textContent = "Karekod veya Barkod aranıyor, kameraya gösterin...";
            });
        } catch (error) {
            btnKameraAcAsset.disabled = false;
            btnKameraAcAsset.innerHTML = originalHtml;
            uyariGoster("Kameraya erişilemedi! Lütfen tarayıcı izinlerini kontrol edin.");
        }
    });

    scannerModalEl?.addEventListener('hidden.bs.modal', stopScanner);
}

function initAddAssetCamera() {
    const btnKameraAcEkle = document.getElementById("btnKameraAcEkle");
    const btnKameraKapatEkle = document.getElementById("btnKameraKapatEkle");
    const kameraAlaniEkle = document.getElementById("kameraAlaniEkle");
    const inputNewAssetSerial = document.getElementById("newAssetSerial");
    const defaultBtnHtml = btnKameraAcEkle ? btnKameraAcEkle.innerHTML : '';

    btnKameraAcEkle?.addEventListener("click", async () => {
        if (btnKameraAcEkle.disabled) return;
        btnKameraAcEkle.disabled = true;
        btnKameraAcEkle.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Bekleniyor...`;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());

            kameraAlaniEkle.classList.remove("d-none");
            btnKameraAcEkle.innerHTML = defaultBtnHtml;

            startScanner("readerEkle", (scannedText) => {
                barcodeBeepSound.currentTime = 0; // Sesi başa sarar
                barcodeBeepSound.play().catch(() => { }); // Sesi çalar
                inputNewAssetSerial.value = scannedText;
                closeScannerEkle();
                basariToast("Barkod başarıyla okundu!");
            }, () => { });
        } catch (error) {
            uyariGoster("Kameraya erişilemedi!");
            btnKameraAcEkle.disabled = false;
            btnKameraAcEkle.innerHTML = defaultBtnHtml;
        }
    });

    btnKameraKapatEkle?.addEventListener("click", closeScannerEkle);
    document.getElementById('createAssetModal')?.addEventListener('hidden.bs.modal', closeScannerEkle);

    function closeScannerEkle() {
        kameraAlaniEkle?.classList.add("d-none");
        if (btnKameraAcEkle) {
            btnKameraAcEkle.disabled = false;
            btnKameraAcEkle.innerHTML = defaultBtnHtml;
        }
        stopScanner();
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
            select.add(new Option("-- Bir Ürün Seçin --", ""));
            products.forEach(product => {
                const stokText = product.stockQuantity ?? product.StockQuantity ?? 'Bilinmiyor';
                const name = product.name ?? product.Name;
                const id = product.id ?? product.Id;
                select.add(new Option(`${name} (Stok: ${stokText})`, id));
            });
            select.disabled = false;
        } else {
            select.add(new Option("Kayıtlı ürün bulunamadı!", ""));
            select.disabled = false;
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
        if (!select) return;

        select.length = 0; // Dropdown'u temizler

        if (users && users.length > 0) {
            select.add(new Option("-- Kullanıcıyı Seçiniz --", ""));
            users.forEach(user => {
                const fname = user.firstName ?? user.FirstName ?? "";
                const lname = user.lastName ?? user.LastName ?? "";
                const email = user.email ?? user.Email ?? "Bilinmiyor";
                const displayName = `${fname} ${lname}`.trim() || email;
                const id = user.id ?? user.Id;

                select.add(new Option(displayName, id));
            });
        } else {
            select.add(new Option("Kullanıcı bulunamadı!", ""));
        }
    } catch (e) {
        console.error("Kullanıcılar yüklenirken hata:", e);
    }
}

async function searchAsset() {
    // 1. Arama kutusuna bak, 2. Boşsa hafızadaki cihaza bak
    const inputSerial = document.getElementById('serialSearchInput').value.trim();
    const serial = inputSerial || currentAssetSerialNumber; // EĞER INPUT BOŞSA HAFIZADAKİNİ KULLAN
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
        let detailIconColor = "text-primary";
        let detailBgClass = "bg-primary bg-opacity-10";

        if (status === 'Available') {
            detailIconColor = "text-success";
            detailBgClass = "bg-success bg-opacity-10";
        }
        else if (status === 'In Use') {
            detailIconColor = "text-primary";
            detailBgClass = "bg-primary bg-opacity-10";
        }
        else if (status === 'Broken') {
            detailIconColor = "text-danger";
            detailBgClass = "bg-danger bg-opacity-10";
        }
        else if (status === 'Retired') {
            detailIconColor = "text-secondary opacity-50";
            detailBgClass = "bg-secondary bg-opacity-10";
        }

        // HTML'de atadığımız ID'ler üzerinden doğrudan tam isabet eşleştirme
        const iconContainer = document.getElementById('resIconContainer');
        const iconElement = document.getElementById('resIconElement');

        if (iconContainer) {
            iconContainer.className = `d-inline-flex align-items-center justify-content-center ${detailBgClass} rounded-circle mb-3`;
            iconContainer.style.width = "90px";
            iconContainer.style.height = "90px";
        }
        if (iconElement) {
            iconElement.className = `bi bi-laptop fs-1 ${detailIconColor}`;
        }

        // Renkli Rozet Mantığı
        let statusBadge = `<span class="badge bg-secondary">Bilinmiyor</span>`;
        if (status === 'Available') statusBadge = `<span class="badge bg-success px-3 py-2 fs-6 rounded-pill">Müsait (Boşta)</span>`;
        else if (status === 'In Use') statusBadge = `<span class="badge bg-primary px-3 py-2 fs-6 rounded-pill">Kullanımda</span>`;
        else if (status === 'Broken') statusBadge = `<span class="badge bg-danger px-3 py-2 fs-6 rounded-pill">Arızalı</span>`;
        else if (status === 'Retired') statusBadge = `<span class="badge bg-dark px-3 py-2 fs-6 rounded-pill"><i class="bi bi-slash-circle me-1"></i> Kullanım Dışı</span>`;

        const resStatusEl = document.getElementById('resStatus');
        resStatusEl.innerHTML = statusBadge;

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
        btnReturn.forEach(btn => btn.classList.toggle('d-none', status !== 'In Use' || !canAssign));

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
                const dateString = event.date ? new Date(event.date).toLocaleString('tr-TR') : "Tarih Yok";

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

        // Eğer arama gerçekten inputtan yapıldıysa inputu temizler
        if (inputSerial) {
            document.getElementById('serialSearchInput').value = '';
        }

    } catch (error) {
        hataGoster(error.message);
        document.getElementById('assetResultContainer').classList.add('d-none');

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

    // C# controller [HttpPut] beklediği için 'PUT' kullanıyoruz
    await sendAssetAction(`${CONFIG.API_BASE_URL}/assets/${currentAssetId}/assign`, 'PUT', {
        userId: parseInt(userId, 10),
        notes: notes
    });
}

async function submitReturnAsset() {
    if (!currentAssetId) return;
    const notes = document.getElementById('returnNotes').value;

    // C# controller [HttpPut] beklediği için 'PUT' kullanıyoruz
    await sendAssetAction(`${CONFIG.API_BASE_URL}/assets/${currentAssetId}/return`, 'PUT', { notes });
}

async function submitBreakdown() {
    if (!currentAssetId) return;
    const description = document.getElementById('breakdownDesc').value;

    if (!description) {
        uyariGoster("Lütfen arıza açıklamasını yazın!");
        return;
    }

    // C# controller [HttpPost] beklediği için 'POST' kullanıyoruz
    await sendAssetAction(`${CONFIG.API_BASE_URL}/assets/${currentAssetId}/breakdown`, 'POST', { description });
}

async function submitResolve() {
    if (!currentAssetId) return;
    const solution = document.getElementById('resolveSolution').value;

    if (!solution) {
        uyariGoster("Lütfen çözüm detaylarını yazın!");
        return;
    }

    // C# controller [HttpPost] beklediği için 'POST' kullanıyoruz
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

    // C# controller [HttpPost] beklediği için 'POST' kullanıyoruz
    await sendAssetAction(`${CONFIG.API_BASE_URL}/assets/${currentAssetId}/maintenance`, 'POST', payload);
}

// Tüm Butonlar İçin Ortak Backend İletişim Fonksiyonu
async function sendAssetAction(url, method, body) {
    try {
        const endpoint = url.replace(CONFIG.API_BASE_URL, '');
        const result = await apiRequest(endpoint, method, body) || {};

        // Açık olan modal penceresini kapat
        document.querySelectorAll('.modal').forEach(m => {
            const modalInstance = bootstrap.Modal.getInstance(m);
            if (modalInstance) modalInstance.hide();
        });

        // Form alanlarını temizler
        document.querySelectorAll('.modal textarea, .modal input[type="date"]').forEach(el => el.value = '');

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

    try {
        const result = await apiRequest('/assets', 'POST', {
            productId: parseInt(productId, 10),
            locationId: parseInt(locationId, 10),
            serialNumber: serialNumber,
            notes: notes
        }) || {};

        basariToast("Harika! Yeni Ekipman başarıyla sisteme kaydedildi.");

        // Modalı kapatır
        const modalInstance = bootstrap.Modal.getInstance(document.getElementById('createAssetModal'));
        if (modalInstance) modalInstance.hide();

        // Formu temizler
        document.getElementById('newAssetProduct').value = '';
        document.getElementById('newAssetSerial').value = '';
        document.getElementById('newAssetNotes').value = '';

        // Dropdownları resetler
        if (typeof StockUtils !== 'undefined') {
            StockUtils._resetDropdown('newAssetSourceWarehouse', 'Önce ürün seçiniz...', true);
            StockUtils._resetDropdown('newAssetSourceLocation', 'Önce depo seçiniz...', true);
        }

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
    pageSize: 8,
    fetchPage: async (page, pageSize) => {
        const response = await apiRequest(`/assets?pageNumber=${page}&pageSize=${pageSize}`, 'GET');
        const assets = response.assets || response;
        const totalRecords = response.totalRecords || (assets ? assets.length : 0);
        return {
            items: assets || [],
            totalItems: totalRecords
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
    // Tüm değişkenleri tek bir yerde başlatılır
    let statusText = "Bilinmiyor";
    let statusClass = "bg-secondary text-white";
    let iconColor = "text-primary";
    let iconBgClass = "bg-secondary bg-opacity-10";

    // if-else bloğu ile tüm renk ve metinler aynı anda atanır
    if (asset.status === 'Available') {
        statusText = "Boşta"; statusClass = "bg-success text-white";
        iconColor = "text-success"; iconBgClass = "bg-success bg-opacity-10";
    }
    else if (asset.status === 'In Use') {
        statusText = "Kullanımda"; statusClass = "bg-primary text-white";
        iconColor = "text-primary"; iconBgClass = "bg-primary bg-opacity-10";
    }
    else if (asset.status === 'Broken') {
        statusText = "Arızalı"; statusClass = "bg-danger text-white";
        iconColor = "text-danger"; iconBgClass = "bg-danger bg-opacity-10";
    }
    else if (asset.status === 'Retired') {
        statusText = "Kullanım Dışı"; statusClass = "bg-dark text-white";
        iconColor = "text-secondary opacity-50"; iconBgClass = "bg-secondary bg-opacity-10";
    }

    // Eğer cihaz kullanımdan kaldırılmışsa personeli boş göster, değilse atanmış kişiyi yaz
    const personelAdi = asset.status === 'Retired' ? "Kullanımdan Kaldırıldı" : (asset.assignedToName ?? "Şu an Boşta");

    return `
        <div class="col-12 col-md-6 col-lg-4 col-xl-3">
            <div class="card border-0 shadow-sm rounded-4 h-100 equipment-grid-card position-relative asset-grid-card">
                <div class="card-body text-center p-4">
                    <div class="mb-3">
                        <div class="d-inline-flex align-items-center justify-content-center ${iconBgClass} rounded-circle asset-icon-circle">
                            <i class="bi bi-laptop fs-1 ${iconColor}"></i>
                        </div>
                    </div>
                    <h6 class="fw-bold mb-1 text-truncate" title="${escapeHtml(asset.productName)}">${escapeHtml(asset.productName)}</h6>
                    <div class="mb-3">
                        <span class="badge bg-dark rounded-pill fw-normal asset-sn-badge">SN: ${escapeHtml(asset.serialNumber)}</span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center border-top pt-3 mt-auto">
                        <span class="badge ${statusClass} rounded-pill">${statusText}</span>
                        <small class="text-muted text-truncate ms-2 asset-person-name"><i class="bi bi-person-fill"></i> ${escapeHtml(personelAdi)}</small>
                    </div>
                </div>
                <!-- CSP Uyumlu Tıklanabilir Gizli Link -->
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
            ? `/assets/${currentAssetId}/retire?returnLocationId=${locationId}`
            : `/assets/${currentAssetId}/retire`;

        await apiRequest(endpoint, 'PUT');

        basariToast("Ekipman kullanımdan kaldırıldı ve pasife alındı.");

        const modalInstance = bootstrap.Modal.getInstance(document.getElementById('deleteAssetModal'));
        if (modalInstance) modalInstance.hide();

        document.getElementById('assetResultContainer').classList.add('d-none');
        document.getElementById('serialSearchInput').value = '';
        document.getElementById('targetLocationStockInfo').classList.add('d-none');

        currentAssetId = null;
        currentAssetProductId = null;
        currentAssetSerialNumber = null; // Cihaz silinince hafızayı tamamen temizler

        const stockSwitch = document.getElementById('returnToStockSwitch');
        if (stockSwitch) {
            stockSwitch.checked = true;
            stockSwitch.dispatchEvent(new Event('change'));
        }

        document.getElementById('deleteAssetTargetWarehouse').value = ''; // Depoyu temizler

        if (typeof StockUtils !== 'undefined') {
            StockUtils._resetDropdown('deleteAssetTargetLocation', 'Önce depo seçin...', true); // Rafı temizler
        }

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