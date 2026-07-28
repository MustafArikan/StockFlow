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

    document.getElementById("adminGridContainer")?.classList.remove("d-none");
    loadGridCards(1); // Parametre olarak 1. sayfa diyoruz
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
function goBackToGrid() {
    document.getElementById('assetResultContainer').classList.add('d-none');
    document.getElementById('serialSearchInput').value = '';

    if (["admin", "superadmin"].includes(userRole)) {
        document.getElementById('adminGridContainer').classList.remove('d-none');
        loadGridCards(currentGridPage); // Güncel sayfayı koruyarak geri dön
    }
}

async function loadProductsForDropdown() {
    const token = localStorage.getItem('token');
    try {
        const data = await apiRequest('/products?pageNumber=1&pageSize=1000', 'GET');

        const select = document.getElementById('newAssetProduct');
        select.innerHTML = '<option value="">-- Bir Ürün Seçin --</option>';

        if (data.items && data.items.length > 0) {
            data.items.forEach(p => {
                select.innerHTML += `<option value="${p.id}">${escapeHtml(p.name)} (Stok: ${p.stockQuantity})</option>`;
            });
        } else {
            select.innerHTML = '<option value="">Kayıtlı ürün bulunamadı!</option>';
        }
    } catch (e) {
        console.error("Ürünler yüklenirken hata:", e);
    }
}

async function loadUsersForDropdown() {
    const token = localStorage.getItem('token');
    try {
        // API'ye sayfalama parametrelerini gönderiyoruz
        const response = await apiRequest('/users?pageNumber=1&pageSize=1000', 'GET');

        // Gelen verinin içindeki diziyi güvenli şekilde yakalıyoruz
        const users = response.items || response.data || response;

        const select = document.getElementById('assignUserSelect');
        select.innerHTML = '<option value="">-- Kullanıcıyı Seçiniz --</option>';

        if (users && users.length > 0) {
            users.forEach(u => {
                const fname = u.firstName || u.FirstName || "";
                const lname = u.lastName || u.LastName || "";
                const email = u.email || u.Email || "Bilinmiyor";
                let displayName = `${fname} ${lname}`.trim();
                if (!displayName) displayName = email; // İsim yoksa E-posta göster

                const id = u.id || u.Id;
                select.innerHTML += `<option value="${id}">${escapeHtml(displayName)}</option>`;
            });
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
            data.timeline.forEach(event => {
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

                const li = document.createElement('li');
                li.className = `timeline-item ${dotClass}`;
                li.innerHTML = `
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
                `;
                timelineUl.appendChild(li);
            });
        } else {
            timelineUl.innerHTML = '<li class="text-muted fst-italic">Geçmiş kaydı bulunamadı.</li>';
        }

        // Sonuç alanını göster, input'u temizle
        document.getElementById('assetResultContainer').classList.remove('d-none');
        document.getElementById('serialSearchInput').value = '';

    } catch (error) {
        hataGoster(error.message);
        document.getElementById('assetResultContainer').classList.add('d-none');
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
        searchAsset();

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

        loadGridCards(1); // Cihaz eklendiği için listeyi ve sayfalamayı yenile

        // Cihazı otomatik olarak ara ve ekranda göster!
        document.getElementById('serialSearchInput').value = serialNumber;
        searchAsset();

    } catch (e) {
        hataGoster("Bağlantı hatası: " + e.message);

    }
}

// ==========================================
// ADMİNLER İÇİN GRİD KART MOTORU
// ==========================================
async function loadGridCards() {
    const gridContainer = document.getElementById("equipmentGridCards");
    gridContainer.innerHTML = '<div class="col-12 text-center text-muted"><div class="spinner-border text-primary"></div><br>Ekipmanlar yükleniyor...</div>';

    try {
        const response = await apiRequest('/assets?pageNumber=1&pageSize=100', 'GET');
        const assets = response.assets || response;

        if (!assets || assets.length === 0) {
            gridContainer.innerHTML = '<div class="col-12 text-center text-muted"><i class="bi bi-inbox fs-1"></i><p>Sistemde henüz kayıtlı ekipman yok.</p></div>';
            return;
        }

        gridContainer.innerHTML = ''; // Temizle

        assets.forEach(a => {
            // Renk ve Durum Belirleme
            let statusText = "Bilinmiyor";
            let statusClass = "bg-secondary text-white";
            let iconColor = "text-primary";

            if (a.status === 'Available') { statusText = "Boşta"; statusClass = "bg-success text-white"; iconColor = "text-success"; }
            else if (a.status === 'In Use') { statusText = "Kullanımda"; statusClass = "bg-primary text-white"; iconColor = "text-primary"; }
            else if (a.status === 'Broken') { statusText = "Arızalı"; statusClass = "bg-danger text-white"; iconColor = "text-danger"; }

            let personelAdi = a.assignedToName;
            if (!personelAdi) personelAdi = "Şu an Boşta";

            // Kartı Oluşturma (CSS Efektli)
            const col = document.createElement("div");
            col.className = "col-12 col-md-6 col-lg-4 col-xl-3";
            col.innerHTML = `
                <div class="card border-0 shadow-sm rounded-4 h-100 equipment-grid-card position-relative asset-grid-card">
                    <div class="card-body text-center p-4">
                        <div class="mb-3">
                            <div class="d-inline-flex align-items-center justify-content-center bg-light rounded-circle asset-icon-circle">
                                <i class="bi bi-laptop fs-1 ${iconColor}"></i>
                            </div>
                        </div>
                        <h6 class="fw-bold mb-1 text-truncate" title="${escapeHtml(a.productName)}">${escapeHtml(a.productName)}</h6>
                        <div class="mb-3">
                            <span class="badge bg-dark rounded-pill fw-normal asset-sn-badge">SN: ${escapeHtml(a.serialNumber)}</span>
                        </div>
                        <div class="d-flex justify-content-between align-items-center border-top pt-3 mt-auto">
                            <span class="badge ${statusClass} rounded-pill">${statusText}</span>
                            <small class="text-muted text-truncate ms-2 asset-person-name"><i class="bi bi-person-fill"></i> ${escapeHtml(personelAdi)}</small>
                        </div>
                    </div>
                    <!-- CSP Uyumlu Tıklanabilir Gizli Link (onclick silindi) -->
                    <a href="#" class="stretched-link grid-asset-link" data-serial="${escapeHtml(a.serialNumber)}"></a>
                </div>
            `;
            gridContainer.appendChild(col);
        });

    } catch (error) {
        gridContainer.innerHTML = `<div class="col-12 text-center text-danger">Yüklenirken hata oluştu: ${error.message}</div>`;
    }
}