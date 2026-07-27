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
    // 1. Sayfa açıldığında dropdown için ürünleri güvenli şekilde yükle
    loadProductsForDropdown();
    loadUsersForDropdown();

    // Herkes asset listesini görebilir, sadece butonlar yetkilere göre gizlenir
    document.getElementById("adminGridContainer").classList.remove("d-none");
    loadGridCards();

    // Yetkiye Göre Buton Gizleme
    if (!hasPermission("Asset.Add")) {
        const btnEkle = document.querySelector('[data-bs-target="#createAssetModal"]');
        if (btnEkle) btnEkle.classList.add('d-none');
    }

    if (!hasPermission("Asset.Edit")) {
        const btnAriza = document.querySelector('[data-bs-target="#breakdownModal"]');
        if (btnAriza) btnAriza.classList.add('d-none');
        
        const btnCozum = document.querySelector('[data-bs-target="#resolveModal"]');
        if (btnCozum) btnCozum.classList.add('d-none');
        
        const btnBakim = document.querySelector('[data-bs-target="#maintenanceModal"]');
        if (btnBakim) btnBakim.classList.add('d-none');
    }

    if (!hasPermission("Asset.Assign")) {
        const btnAta = document.querySelector('[data-bs-target="#assignAssetModal"]');
        if (btnAta) btnAta.classList.add('d-none');
        
        const btnAl = document.querySelector('[data-bs-target="#returnAssetModal"]');
        if (btnAl) btnAl.classList.add('d-none');
    }

    // 3. Arama ve Klavye Dinleyicileri
    document.getElementById('btnSearchAsset').addEventListener('click', searchAsset);
    document.getElementById('serialSearchInput').addEventListener('keyup', function (e) {
        if (e.key === 'Enter') searchAsset();
    });

    // 4. Listeye Dön Butonu Dinleyicisi
    const btnGeri = document.getElementById('btnGeriDonGrid');
    if (btnGeri) btnGeri.addEventListener('click', goBackToGrid);

    // 5. Grid Kartlarına Tıklama Dinleyicisi
    const gridContainerBox = document.getElementById('equipmentGridCards');
    if (gridContainerBox) {
        gridContainerBox.addEventListener('click', (e) => {
            const cardLink = e.target.closest('.grid-asset-link');
            if (cardLink) {
                e.preventDefault(); // Sayfanın üste kaymasını engelle
                const serial = cardLink.getAttribute('data-serial');
                document.getElementById('serialSearchInput').value = serial;
                searchAsset();
            }
        });
    }

    // 6. Aksiyon Modalları (İşlem Butonları) Dinleyicileri
    document.getElementById('btnSubmitCreateAsset').addEventListener('click', submitCreateAsset);
    document.getElementById('btnSubmitAssign').addEventListener('click', submitAssignAsset);
    document.getElementById('btnSubmitReturn').addEventListener('click', submitReturnAsset);
    document.getElementById('btnSubmitBreakdown').addEventListener('click', submitBreakdown);
    document.getElementById('btnSubmitResolve').addEventListener('click', submitResolve);
    document.getElementById('btnSubmitMaintenance').addEventListener('click', submitMaintenance);

    // 7. KAMERA VE QR OKUYUCU DİNLEYİCİLERİ (MODAL VERSİYONU)
    const btnKameraAcAsset = document.getElementById("btnKameraAcAsset");
    const scannerModalEl = document.getElementById("scannerModalAsset");
    let scannerModalInstance = null;

    if (btnKameraAcAsset && scannerModalEl) {
        // ASYNC eklendi çünkü kamera izni bekleyeceğiz
        btnKameraAcAsset.addEventListener("click", async () => {
            const durumEl = document.getElementById('kameraDurumAsset');

            // 7.1. GÜVENLİK: Önce İzin Kontrolü Yap
            const originalHtml = btnKameraAcAsset.innerHTML;
            btnKameraAcAsset.disabled = true;
            btnKameraAcAsset.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;

            try {
                // Kameraya erişmeyi dene
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                // Başarılı olursa arkada çalışan testi hemen kapat
                stream.getTracks().forEach(track => track.stop());

                // İzin alındı Butonu eski haline getir ve Modalı Aç
                btnKameraAcAsset.disabled = false;
                btnKameraAcAsset.innerHTML = originalHtml;

                scannerModalInstance = bootstrap.Modal.getOrCreateInstance(scannerModalEl);
                scannerModalInstance.show();

                if (durumEl) {
                    durumEl.textContent = "Kamera başlatılıyor...";
                    durumEl.className = "text-center text-muted small mt-3 fw-bold";
                }

                // Kamerayı Başlat
                startScanner("readerAsset", (scannedText) => {
                    // BAŞARILI OKUMA
                    let audio = new Audio('https://www.soundjay.com/button/beep-07.wav');
                    audio.play().catch(() => { });

                    document.getElementById('serialSearchInput').value = scannedText;

                    if (durumEl) {
                        durumEl.textContent = "Barkod Okundu! Yönlendiriliyor...";
                        durumEl.className = "text-center text-success small mt-3 fw-bold";
                    }

                    searchAsset();

                    setTimeout(() => {
                        scannerModalInstance.hide();
                    }, 600);

                }, (errorMessage) => {
                    // HATA DURUMU (Kameraya gösterilmediğinde)
                    if (durumEl && durumEl.className.includes("text-muted")) {
                        durumEl.textContent = "Karekod veya Barkod aranıyor, kameraya gösterin...";
                    }
                });

            } catch (error) {
                // 7.2. İZİN REDDEDİLDİ VEYA KAMERA YOK (Modal hiç açılmaz)
                btnKameraAcAsset.disabled = false;
                btnKameraAcAsset.innerHTML = originalHtml;
                alert("Kameraya erişilemedi! Lütfen tarayıcı adres çubuğundaki kilit simgesinden kamera izni verin veya bilgisayarınıza bir kamera bağlayın.");
            }
        });

        // Modal dışarı tıklanarak kapatılırsa kamerayı kesinlikle durdur
        scannerModalEl.addEventListener('hidden.bs.modal', () => {
            stopScanner();
        });
    }

});

// Grid Listesine Geri Dönüş Fonksiyonu
function goBackToGrid() {
    document.getElementById('assetResultContainer').classList.add('d-none');
    document.getElementById('serialSearchInput').value = '';

    if (["admin", "superadmin"].includes(userRole)) {
        document.getElementById('adminGridContainer').classList.remove('d-none');
        loadGridCards(); // Güncel durumu yansıtmak için yeniden yükle
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
    if (!userId) return alert("Lütfen atanacak kullanıcıyı seçiniz!");

    await sendAssetAction(`${CONFIG.API_BASE_URL}/assets/${currentAssetId}/assign`, 'POST', {
        userId: parseInt(userId),
        notes: notes
    });
}

async function submitReturnAsset() {
    if (!currentAssetId) return;
    const notes = document.getElementById('returnNotes').value;
    await sendAssetAction(`${CONFIG.API_BASE_URL}/assets/${currentAssetId}/return`, 'POST', { notes });
}

async function submitBreakdown() {
    if (!currentAssetId) return;
    const description = document.getElementById('breakdownDesc').value;
    if (!description) return alert("Lütfen arıza açıklamasını yazın!");
    await sendAssetAction(`${CONFIG.API_BASE_URL}/assets/${currentAssetId}/breakdown`, 'POST', { description });
}

async function submitResolve() {
    if (!currentAssetId) return;
    const solution = document.getElementById('resolveSolution').value;
    if (!solution) return alert("Lütfen çözüm detaylarını yazın!");
    await sendAssetAction(`${CONFIG.API_BASE_URL}/assets/${currentAssetId}/resolve`, 'POST', { solution });
}

async function submitMaintenance() {
    if (!currentAssetId) return;
    const details = document.getElementById('maintenanceDetails').value;
    const nextDate = document.getElementById('maintenanceNextDate').value;
    if (!details) return alert("Lütfen yapılan bakımın detaylarını girin!");

    const payload = { details };
    if (nextDate) payload.nextMaintenanceDate = new Date(nextDate).toISOString();

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

// YENİ DEMİRBAŞ OLUŞTURMA FONKSİYONU
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
                <div class="card border-0 shadow-sm rounded-4 h-100 equipment-grid-card position-relative" style="transition: transform 0.2s, box-shadow 0.2s; cursor: pointer;">
                    <div class="card-body text-center p-4">
                        <div class="mb-3">
                            <div class="d-inline-flex align-items-center justify-content-center bg-light rounded-circle" style="width: 70px; height: 70px;">
                                <i class="bi bi-laptop fs-1 ${iconColor}"></i>
                            </div>
                        </div>
                        <h6 class="fw-bold mb-1 text-truncate" title="${escapeHtml(a.productName)}">${escapeHtml(a.productName)}</h6>
                        <div class="mb-3">
                            <span class="badge bg-dark rounded-pill fw-normal" style="letter-spacing: 1px;">SN: ${escapeHtml(a.serialNumber)}</span>
                        </div>
                        <div class="d-flex justify-content-between align-items-center border-top pt-3 mt-auto">
                            <span class="badge ${statusClass} rounded-pill">${statusText}</span>
                            <small class="text-muted text-truncate ms-2" style="max-width: 120px;"><i class="bi bi-person-fill"></i> ${escapeHtml(personelAdi)}</small>
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