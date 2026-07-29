// XSS koruması
function escapeHtml(text) {
    if (!text) return "";
    return text.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

let currentAssetId = null;
let currentGridPage = 1;
let currentGridPageSize = 8; // Izgara tasarımı için varsayılan 8
const userRole = typeof getUserRole === "function" ? getUserRole() : "User";
const token = localStorage.getItem('token');
if (!token) window.location.href = 'login.html';

// ==========================================
// SAYFA YÜKLENDİĞİNDE ÇALIŞACAKLAR 
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    applyPermissions();
    initEventListeners();

    loadProductsForDropdown();
    loadUsersForDropdown();

    // 'goBackToGrid' fonksiyonu ile aynı güvenlik kuralı buraya da eklendi.
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

    // KAMERA 1: ARAMA EKRANI İÇİN
    initSearchCamera();

    // KAMERA 2: YENİ EKİPMAN EKLEME EKRANI İÇİN
    initAddAssetCamera();
}


function initSearchCamera() {
    const btnKameraAcAsset = document.getElementById("btnKameraAcAsset");
    const scannerModalEl = document.getElementById("scannerModalAsset");

    btnKameraAcAsset?.addEventListener("click", async () => {
        const durumEl = document.getElementById('kameraDurumAsset');
        const originalHtml = btnKameraAcAsset.innerHTML;
        btnKameraAcAsset.disabled = true;
        btnKameraAcAsset.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;

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
                new Audio('https://www.soundjay.com/button/beep-07.wav').play().catch(() => { });
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

    btnKameraAcEkle?.addEventListener("click", async () => {
        if (btnKameraAcEkle.disabled) return;
        const originalText = btnKameraAcEkle.innerHTML;
        btnKameraAcEkle.disabled = true;
        btnKameraAcEkle.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Bekleniyor...`;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());

            kameraAlaniEkle.classList.remove("d-none");
            btnKameraAcEkle.innerHTML = originalText;

            startScanner("readerEkle", (scannedText) => {
                new Audio('https://www.soundjay.com/button/beep-07.wav').play().catch(() => { });
                inputNewAssetSerial.value = scannedText;
                closeScannerEkle();
                basariToast("Barkod başarıyla okundu!");
            }, () => { });
        } catch (error) {
            uyariGoster("Kameraya erişilemedi!");
            btnKameraAcEkle.disabled = false;
            btnKameraAcEkle.innerHTML = originalText;
        }
    });

    btnKameraKapatEkle?.addEventListener("click", closeScannerEkle);
    document.getElementById('createAssetModal')?.addEventListener('hidden.bs.modal', closeScannerEkle);

    function closeScannerEkle() {
        kameraAlaniEkle?.classList.add("d-none");
        if (btnKameraAcEkle) {
            btnKameraAcEkle.disabled = false;
            btnKameraAcEkle.innerHTML = `<i class="bi bi-upc-scan me-1"></i> Barkod Okut`;
        }
        stopScanner();
    }
}

// Grid Listesine Geri Dönüş Fonksiyonu
async function goBackToGrid() {
    document.getElementById('assetResultContainer').classList.add('d-none');
    document.getElementById('serialSearchInput').value = '';

    if (["admin", "superadmin"].includes(userRole)) {
        document.getElementById('adminGridContainer').classList.remove('d-none');
        await loadGridCards(currentGridPage); // Beklenerek çiziliyor      
    }
}

async function loadProductsForDropdown() {
    try {
        const data = await apiRequest('/products?pageNumber=1&pageSize=1000', 'GET');
        const select = document.getElementById('newAssetProduct');

        if (data.items && data.items.length > 0) {
            // Döngü yerine map ve join ile tek satırlık string üretiyoruz, DOM'a 1 kere basıyoruz.
            const optionsHtml = data.items.map(product =>
                `<option value="${product.id}">${escapeHtml(product.name)} (Stok: ${product.stockQuantity ?? Bilinmiyor})</option>`
            ).join('');

            // Başlık ve veriler, DOM'a TEK SEFERDE basıldı.
            select.innerHTML = '<option value="">-- Bir Ürün Seçin --</option>' + optionsHtml;
        } else {
            select.innerHTML = '<option value="">Kayıtlı ürün bulunamadı!</option>';
        }
    } catch (e) {
        console.error("Ürünler yüklenirken hata:", e);
    }
}

async function loadUsersForDropdown() {
    try {
        // API'ye sayfalama parametrelerini gönderiyoruz
        const response = await apiRequest('/users?pageNumber=1&pageSize=1000', 'GET');

        // Gelen verinin içindeki diziyi güvenli şekilde yakalıyoruz
        const users = response.items || response.data || response;
        const select = document.getElementById('assignUserSelect');

        if (users && users.length > 0) {
            // Tüm kullanıcıları dönüp, arka planda dev bir HTML metni oluşturuyoruz
            const optionsHtml = users.map(user => {
                const fname = user.firstName ?? user.FirstName ?? "";
                const lname = user.lastName ?? user.LastName ?? "";
                const email = user.email ?? user.Email ?? "Bilinmiyor";

                const displayName = `${fname} ${lname}`.trim() || email;
                const id = user.id ?? user.Id;
                // Değeri doğrudan DOM'a yazmak yerine 'return' ile geriye döndürüyoruz
                return `<option value="${id}">${escapeHtml(displayName)}</option>`;
            }).join(''); // .join('') ile tüm parçaları aralarında boşluk olmadan tek bir metne dönüştürüyoruz.

            // Ana başlık ile arka planda ürettiğimiz metni birleştirip, DOM'a TEK SEFERDE yazdırıyoruz
            select.innerHTML = '<option value="">-- Kullanıcıyı Seçiniz --</option>' + optionsHtml;

        } else {
            select.innerHTML = '<option value="">Kullanıcı bulunamadı!</option>';
        }
    } catch (e) {
        console.error("Kullanıcılar yüklenirken hata:", e);
    }
}

async function searchAsset() {
    const serial = document.getElementById('serialSearchInput').value.trim();
    if (!serial) return;

    try {
        const data = await apiRequest(`/assets/${encodeURIComponent(serial)}/timeline`, 'GET');
        currentAssetId = data.assetInfo.id;

        document.getElementById('assetResultContainer').classList.remove('d-none');
        // Arama yapıldığında Grid'i gizle
        document.getElementById('adminGridContainer').classList.add('d-none');

        // 1. Cihaz Profilini Doldur
        document.getElementById('resProductName').textContent = data.assetInfo.productName;
        document.getElementById('resSerialNumber').textContent = data.assetInfo.serialNumber;

        // Renkli Rozet Mantığı
        let statusBadge = `<span class="badge bg-secondary">Bilinmiyor</span>`;
        if (data.assetInfo.status === 'Available') statusBadge = `<span class="badge bg-success px-3 py-2 fs-6 rounded-pill">Müsait (Boşta)</span>`;
        else if (data.assetInfo.status === 'In Use') statusBadge = `<span class="badge bg-primary px-3 py-2 fs-6 rounded-pill">Kullanımda</span>`;
        else if (data.assetInfo.status === 'Broken') statusBadge = `<span class="badge bg-danger px-3 py-2 fs-6 rounded-pill">Arızalı</span>`;

        document.getElementById('resStatus').innerHTML = statusBadge;

        if (data.assetInfo.nextMaintenanceDate) {
            document.getElementById('resStatus').innerHTML += `<div class="mt-2"><small class="text-info fw-bold"><i class="bi bi-calendar-event"></i> Sonraki Bakım: ${new Date(data.assetInfo.nextMaintenanceDate).toLocaleDateString('tr-TR')}</small></div>`;
        }

        document.getElementById('resAssignedTo').textContent = data.assetInfo.assignedTo;

        // Cihazın durumuna göre mantıksız olan butonları gizle
        const btnAssign = document.querySelector('[data-bs-target="#assignAssetModal"]');
        const btnReturn = document.querySelector('[data-bs-target="#returnAssetModal"]');
        const btnBreakdown = document.querySelector('[data-bs-target="#breakdownModal"]');
        const btnResolve = document.querySelector('[data-bs-target="#resolveModal"]');

        const status = data.assetInfo.status;

        // Müsait değilse "Ata" butonunu gizle
        if (btnAssign) btnAssign.classList.toggle('d-none', status !== 'Available');

        // Kullanımda değilse "Teslim Al" butonunu gizle
        if (btnReturn) btnReturn.classList.toggle('d-none', status !== 'In Use');

        // Zaten arızalıysa "Arıza Bildir" butonunu gizle
        if (btnBreakdown) btnBreakdown.classList.toggle('d-none', status === 'Broken');

        // Arızalı değilse "Çözüm Gir (Tamir)" butonunu gizle
        if (btnResolve) btnResolve.classList.toggle('d-none', status !== 'Broken');

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
        document.getElementById('serialSearchInput').value = '';

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
        userId: parseInt(userId),
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

        // Form alanlarını temizle
        document.querySelectorAll('textarea, input[type="date"]').forEach(el => el.value = '');

        // Ekrana başarı mesajı ver ve Timeline'ı (Zaman çizelgesini) güncelle!
        basariToast("Harika! " + (result.message || "İşlem başarıyla tamamlandı."));
        await searchAsset(); //Ekranın güncellenmesi beklenecek        

    } catch (e) {
        hataGoster("Bağlantı hatası: " + e.message);
    }
}

// YENİ EKİPMAN OLUŞTURMA FONKSİYONU
async function submitCreateAsset() {
    const productId = document.getElementById('newAssetProduct').value;
    const serialNumber = document.getElementById('newAssetSerial').value.trim();
    const notes = document.getElementById('newAssetNotes').value.trim();

    if (!productId || !serialNumber) {
        return uyariGoster("Lütfen Ürün seçin ve Seri Numarası girin!");
    }

    try {
        const result = await apiRequest('/assets', 'POST', {
            productId: parseInt(productId),
            serialNumber: serialNumber,
            notes: notes
        }) || {};

        basariToast("Harika! Yeni Demirbaş başarıyla sisteme kaydedildi.");

        // Modalı kapat
        const modalInstance = bootstrap.Modal.getInstance(document.getElementById('createAssetModal'));
        if (modalInstance) modalInstance.hide();

        // Formu temizle
        document.getElementById('newAssetProduct').value = '';
        document.getElementById('newAssetSerial').value = '';
        document.getElementById('newAssetNotes').value = '';

        // Sadece yetkisi olanlar için Grid'i YENİLE ve bitmesini BEKLE
        if (["admin", "superadmin"].includes(userRole)) {
            await loadGridCards(1); // Cihaz eklendiği için listeyi ve sayfalamayı yenile
        }

        // İşlem tamamen bittikten sonra detay aramasını tetikle ve BEKLE
        // Cihazı otomatik olarak ara ve ekranda göster!
        document.getElementById('serialSearchInput').value = serialNumber;
        await searchAsset();
    } catch (e) {
        hataGoster("Bağlantı hatası: " + e.message);

    }
}

// ==========================================
// ADMİNLER İÇİN GRİD KART MOTORU
// ==========================================
// Fonksiyon dışarıdan bir 'page' (sayfa) parametresi alıyor.
async function loadGridCards(page = 1) {
    currentGridPage = page;
    const gridContainer = document.getElementById("equipmentGridCards");
    gridContainer.innerHTML = '<div class="col-12 text-center text-muted"><div class="spinner-border text-primary"></div><br>Ekipmanlar yükleniyor...</div>';

    try {
        const response = await apiRequest(`/assets?pageNumber=${page}&pageSize=${currentGridPageSize}`, 'GET');
        const assets = response.assets || response;
        const totalRecords = response.totalRecords || (assets ? assets.length : 0);

        if (!assets || assets.length === 0) {
            gridContainer.innerHTML = '<div class="col-12 text-center text-muted"><i class="bi bi-inbox fs-1"></i><p>Sistemde henüz kayıtlı ekipman yok.</p></div>';
            const paginationContainer = document.getElementById("assetsPaginationContainer");
            if (paginationContainer) paginationContainer.innerHTML = "";
            return;
        }

        // createElement ile tarayıcıyı yormak yerine, 
        // verileri dışarıdaki bağımsız HTML oluşturucuya (buildAssetCardHtml) gönderip metin olarak birleştiriyoruz.
        const cardsHtml = assets.map(asset => buildAssetCardHtml(asset)).join('');

        // Birleştirilen HTML'i tek bir seferde ekrana basıyoruz.
        gridContainer.innerHTML = cardsHtml;

        // Sayfalama Modülünü Grid Modunda (isGrid = true) Tetikle
        if (typeof buildPagination === 'function') {
            buildPagination(
                "assetsPaginationContainer",
                totalRecords,
                page,
                currentGridPageSize,
                (newPage) => loadGridCards(newPage),
                (newSize) => {
                    currentGridPageSize = newSize;
                    loadGridCards(1);
                },
                true // 'isGrid' parametresi! (8, 24, 48 çıkar)
            );
        }

    } catch (error) {
        gridContainer.innerHTML = `<div class="col-12 text-center text-danger">Yüklenirken hata oluştu: ${error.message}</div>`;
        const paginationContainer = document.getElementById("assetsPaginationContainer");
        if (paginationContainer) paginationContainer.innerHTML = "";
    }
}

// ==========================================
// KART HTML ÜRETİCİSİ (UI VE DATA AYRIMI)
// ==========================================
function buildAssetCardHtml(asset) {
    let statusText = "Bilinmiyor";
    let statusClass = "bg-secondary text-white";
    let iconColor = "text-primary";

    if (asset.status === 'Available') { statusText = "Boşta"; statusClass = "bg-success text-white"; iconColor = "text-success"; }
    else if (asset.status === 'In Use') { statusText = "Kullanımda"; statusClass = "bg-primary text-white"; iconColor = "text-primary"; }
    else if (asset.status === 'Broken') { statusText = "Arızalı"; statusClass = "bg-danger text-white"; iconColor = "text-danger"; }

    const personelAdi = asset.assignedToName ?? "Şu an Boşta";

    return `
        <div class="col-12 col-md-6 col-lg-4 col-xl-3">
            <div class="card border-0 shadow-sm rounded-4 h-100 equipment-grid-card position-relative asset-grid-card">
                <div class="card-body text-center p-4">
                    <div class="mb-3">
                        <div class="d-inline-flex align-items-center justify-content-center bg-light rounded-circle asset-icon-circle">
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