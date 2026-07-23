// const CONFIG = {
//     API_BASE_URL: 'http://localhost:5000/api', // 5136'yi 5000 yaptik!
//     API_BASE_URL: 'http://localhost:5000/api', // 5136'yi 5000 yaptik!
// }

// --- Akilli Port Tespiti (Auto-Discovery) ---
// --- Akilli Port Tespiti (Auto-Discovery) ---
let activePort = localStorage.getItem('API_PORT_OVERRIDE');

if (!activePort) {
    // Eger override yoksa 5000 portuna istek at
    // Eger override yoksa 5000 portuna istek at
    try {
        const xhr = new XMLHttpRequest();
        // senkron istek
        xhr.open('GET', 'http://localhost:5000/api/health', false);
        xhr.send(null);
        // Hata yoksa 5000 portu ayaktadir ve cevap veriyordur
        // Hata yoksa 5000 portu ayaktadir ve cevap veriyordur
        activePort = '5000';
    } catch (error) {
        // 5000 portuna ulasilamazsa
        // 5000 portuna ulasilamazsa
        activePort = '5136';
    }
}

const CONFIG = {
    API_BASE_URL: `http://localhost:${activePort}/api`
};

// Merkezi Yetki Denetim Sistemi (RBAC)
function getUserRole() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return "viewer";
        const payloadBase64 = token.split('.')[1];
        const payloadDecoded = JSON.parse(atob(payloadBase64));

        return payloadDecoded["role"] ||
            payloadDecoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
            "viewer";
    } catch (e) {
        return "viewer";
    }
}

const PERMISSIONS = {
    "admin": [
        "Product.Add", "Product.Edit", "Product.Delete",
        "Category.Add", "Category.Edit", "Category.Delete",
        "Warehouse.Add", "Warehouse.Edit", "Warehouse.Delete",
        "Location.Add", "Location.Delete"
    ],
    "operator": [
        "Product.Edit", "Category.Edit", "Warehouse.Edit"
    ],
    "viewer": []
};

function hasPermission(action) {
    const role = getUserRole();
    if (role === "superadmin") return true; // Süper admin her şeye yetkilidir
    if (role === "superadmin") return true; // Süper admin her şeye yetkilidir
    return PERMISSIONS[role] && PERMISSIONS[role].includes(action);
}

// Merkezi Şifre Göster/Gizle İşlemi (Event Delegation / CSP Uyumlu)
document.addEventListener('click', function (e) {
    const btn = e.target.closest('.toggle-password');
    if (btn) {
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (!input) return;

        const icon = btn.querySelector('i');

        if (input.type === 'password') {
            input.type = 'text';
            if (icon) {
                icon.classList.remove('bi-eye-slash');
                icon.classList.add('bi-eye');
            }
        } else {
            input.type = 'password';
            if (icon) {
                icon.classList.remove('bi-eye');
                icon.classList.add('bi-eye-slash');
            }
        }
    }
});

// Modal Girişinde Enter Tuşu ile Kaydetme (Event Delegation / Tüm Sayfalarda Ortak)
// Modal Girişinde Enter Tuşu ile Kaydetme (Event Delegation / Tüm Sayfalarda Ortak)
// Form etiketiyle sarılı olsun ya da olmasın, bir modal içindeki metin kutusunda
// Enter'a basılınca o modalın birincil (kaydet/oluştur) butonunu tetikler.
document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;

    const aktifEleman = document.activeElement;
    if (!aktifEleman || aktifEleman.tagName !== 'INPUT') return;

    const gecersizTipler = ['button', 'submit', 'checkbox', 'radio', 'file'];
    if (gecersizTipler.includes(aktifEleman.type)) return;

    const modal = aktifEleman.closest('.modal');
    if (!modal) return;

    e.preventDefault(); // Form varsa sayfanin yenilenmesini engelle
    e.preventDefault(); // Form varsa sayfanin yenilenmesini engelle

    const kaydetButonu = modal.querySelector('.btn-primary:not(.btn-close), .btn-success:not(.btn-close)');
    if (kaydetButonu && !kaydetButonu.disabled) {
        kaydetButonu.click();
    }
});

async function apiRequest(endpoint, method = 'GET', bodyData = null) {
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const options = {
        method: method,
        headers: headers,
    };
    if (bodyData) {
        if (bodyData instanceof FormData) {
            // FormData kullanildiginda Content-Type'i tarayici otomatik belirlemelidir (boundary vb. ekler)
            options.body = bodyData;
        } else {
            headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(bodyData);
        }
    }
    const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint  }`, options);
    if (response.status === 401) {
        // Token gecersiz veya suresi dolmus, kullaniciyi cikis yapmaya zorla
        localStorage.removeItem('token');
        window.location.href = '/login.html';
        throw new Error('Oturum suresi doldu veya yetkisiz erisim. Lutfen tekrar giris yapin.');
    }
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
        const errorMessage = data?.message || 'Sunucu ile iletisimde bir hata olustu.';
        throw new Error(errorMessage);
    }
    return data;
}

function buildPagination(containerId, totalItems, currentPage, pageSize, onPageChange, onPageSizeChange) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (totalItems === 0) {
        container.innerHTML = "";
        return;
    }

    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    let startItem = (currentPage - 1) * pageSize + 1;
    let endItem = Math.min(currentPage * pageSize, totalItems);

    let html = `
    <div class="d-flex justify-content-between align-items-center mt-3">
        <div class="text-muted small">
            ${startItem}-${endItem} / ${totalItems} kayıt
        </div>
        <nav>
            <ul class="pagination pagination-sm mb-0 shadow-sm justify-content-center">`;
    
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link page-action" href="#" data-page="${currentPage - 1}">« Önceki</a></li>`;

    for (let i = 1; i <= totalPages; i++) {
        if (totalPages > 7) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                html += `<li class="page-item ${currentPage === i ? 'active' : ''}"><a class="page-link page-action" href="#" data-page="${i}">${i}</a></li>`;
            } else if (i === 2 || i === totalPages - 1) {
                html += `<li class="page-item disabled"><span class="page-link text-muted">...</span></li>`;
            }
        } else {
            html += `<li class="page-item ${currentPage === i ? 'active' : ''}"><a class="page-link page-action" href="#" data-page="${i}">${i}</a></li>`;
        }
    }

    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link page-action" href="#" data-page="${currentPage + 1}">Sonraki »</a></li>`;
    html += `   </ul>
        </nav>
        <div>
            <select class="form-select form-select-sm shadow-sm page-size-action" style="width: auto;">
                <option value="10" ${pageSize === 10 ? 'selected' : ''}>10 Satır</option>
                <option value="25" ${pageSize === 25 ? 'selected' : ''}>25 Satır</option>
                <option value="50" ${pageSize === 50 ? 'selected' : ''}>50 Satır</option>
                <option value="100" ${pageSize === 100 ? 'selected' : ''}>100 Satır</option>
            </select>
        </div>
    </div>`;

    container.innerHTML = html;

    const navEl = container.querySelector('nav');
    if (navEl) {
        navEl.addEventListener('click', (e) => {
            e.preventDefault();
            const btn = e.target.closest(".page-action");
            if (btn) {
                const parentLi = btn.closest(".page-item");
                if (parentLi && (parentLi.classList.contains("disabled") || parentLi.classList.contains("active"))) return;

                const page = parseInt(btn.getAttribute("data-page"));
                if (!isNaN(page)) {
                    onPageChange(page);
                }
            }
        });
    }

    const selectEl = container.querySelector('.page-size-action');
    if (selectEl) {
        selectEl.addEventListener('change', (e) => {
            onPageSizeChange(parseInt(e.target.value));
        });
    }
}

// Modal icinde selectpicker fix
if (typeof $ !== 'undefined') {
    $(document).on('shown.bs.modal', '.modal', function () {
        $(this).find('.selectpicker').selectpicker('render');
    });
}

function buildPagination(containerId, totalItems, currentPage, pageSize, onPageChange, onPageSizeChange) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (totalItems === 0) {
        container.innerHTML = "";
        return;
    }

    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    let startItem = (currentPage - 1) * pageSize + 1;
    let endItem = Math.min(currentPage * pageSize, totalItems);

    let html = `
    <div class="d-flex justify-content-between align-items-center mt-3">
        <div class="text-muted small">
            ${startItem}-${endItem} / ${totalItems} kayıt
        </div>
        <nav>
            <ul class="pagination pagination-sm mb-0 shadow-sm justify-content-center">`;
    
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link page-action" href="#" data-page="${currentPage - 1}">« Önceki</a></li>`;

    for (let i = 1; i <= totalPages; i++) {
        if (totalPages > 7) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                html += `<li class="page-item ${currentPage === i ? 'active' : ''}"><a class="page-link page-action" href="#" data-page="${i}">${i}</a></li>`;
            } else if (i === 2 || i === totalPages - 1) {
                html += `<li class="page-item disabled"><span class="page-link text-muted">...</span></li>`;
            }
        } else {
            html += `<li class="page-item ${currentPage === i ? 'active' : ''}"><a class="page-link page-action" href="#" data-page="${i}">${i}</a></li>`;
        }
    }

    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link page-action" href="#" data-page="${currentPage + 1}">Sonraki »</a></li>`;
    html += `   </ul>
        </nav>
        <div>
            <select class="form-select form-select-sm shadow-sm page-size-action" style="width: auto;">
                <option value="10" ${pageSize === 10 ? 'selected' : ''}>10 Satır</option>
                <option value="25" ${pageSize === 25 ? 'selected' : ''}>25 Satır</option>
                <option value="50" ${pageSize === 50 ? 'selected' : ''}>50 Satır</option>
                <option value="100" ${pageSize === 100 ? 'selected' : ''}>100 Satır</option>
            </select>
        </div>
    </div>`;

    container.innerHTML = html;

    const navEl = container.querySelector('nav');
    if (navEl) {
        navEl.addEventListener('click', (e) => {
            e.preventDefault();
            const btn = e.target.closest(".page-action");
            if (btn) {
                const parentLi = btn.closest(".page-item");
                if (parentLi && (parentLi.classList.contains("disabled") || parentLi.classList.contains("active"))) return;

                const page = parseInt(btn.getAttribute("data-page"));
                if (!isNaN(page)) {
                    onPageChange(page);
                }
            }
        });
    }

    const selectEl = container.querySelector('.page-size-action');
    if (selectEl) {
        selectEl.addEventListener('change', (e) => {
            onPageSizeChange(parseInt(e.target.value));
        });
    }
}

// LAYOUT (SIDEBAR & TOPBAR) RENDER MOTORU
function renderProfessionalLayout() {
    // 1. GÜVENLİK VE KONTROL: Eğer kullanıcı giriş, kayıt veya şifre sıfırlama sayfasındaysa
    // bu sayfalarda menü olmaması gerektiği için işlemi durdur
    const noNavPages = ['login.html', 'register.html', 'forgot-password.html'];
    if (noNavPages.some(p => window.location.pathname.includes(p))) return;

    // 2. AKTİF SAYFAYI BULMA: URL'ye bakarak şu an hangi sayfada olduğumuzu anlar   
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';

    // 3. SARMALAMA (WRAPPING) İŞLEMİ:
    // HTML dosyasında yazdığımız asıl içerikleri (tablolar, grafikler) alıp 'contentContainer' 
    // adında yeni bir div'in içine taşır
    const contentContainer = document.createElement('div');
    contentContainer.className = 'container-fluid p-4';
    
    while (document.body.firstChild) {
        contentContainer.appendChild(document.body.firstChild);
    }

    // 4. YAN MENÜYÜ (SIDEBAR) OLUŞTURMA:
    const sidebar = document.createElement('aside');
    sidebar.id = 'sidebar';
    sidebar.innerHTML = `
        <div class="sidebar-header border-bottom">
            <a class="fw-bold text-primary fs-4 text-decoration-none d-flex align-items-center" href="index.html">
                <i class="bi bi-hexagon-fill me-2 fs-5"></i>
                Stock<span class="sidebar-logo-text">Flow</span>
            </a>
            <button class="btn btn-sm d-lg-none text-muted border-0" id="btnCloseSidebar">
                <i class="bi bi-x-lg fs-5"></i>
            </button>
        </div>
        <div class="sidebar-menu flex-grow-1 overflow-auto py-3">
            <h6 class="sidebar-heading text-uppercase text-muted fw-bold px-4 mb-2 fs-07rem ls-1px">Ana Menü</h6>
            <a href="index.html" class="sidebar-link ${currentPath === 'index.html' ? 'active' : ''}"><i class="bi bi-grid-1x2"></i> <span>Ana Sayfa</span></a>
            <a href="categories.html" class="sidebar-link ${currentPath === 'categories.html' ? 'active' : ''}"><i class="bi bi-tags"></i> <span>Kategoriler</span></a>
            <a href="products.html" class="sidebar-link ${currentPath === 'products.html' ? 'active' : ''}"><i class="bi bi-box-seam"></i> <span>Ürünler</span></a>
            <a href="movements.html" class="sidebar-link ${currentPath === 'movements.html' ? 'active' : ''}"><i class="bi bi-arrow-left-right"></i> <span>Stok Hareketleri</span></a>
            
            <h6 class="sidebar-heading text-uppercase text-muted fw-bold px-4 mb-2 fs-07rem ls-1px">Yönetim</h6>
            <a href="warehouses.html" class="sidebar-link ${currentPath === 'warehouses.html' ? 'active' : ''}"><i class="bi bi-building"></i> <span>Depolar</span></a>
            <a href="suppliers.html" class="sidebar-link ${currentPath === 'suppliers.html' ? 'active' : ''}"><i class="bi bi-truck"></i> <span>Tedarikçiler</span></a>
            <a href="assets.html" class="sidebar-link ${currentPath === 'assets.html' ? 'active' : ''}"><i class="bi bi-pc-display"></i> <span>Demirbaşlar</span></a>
            
            <h6 class="sidebar-heading text-uppercase text-muted fw-bold px-4 mb-2 fs-07rem ls-1px">Sistem</h6>
            <a href="users.html" id="navUsersItem" class="sidebar-link d-none ${currentPath === 'users.html' ? 'active' : ''}"><i class="bi bi-people"></i> <span>Kullanıcılar</span></a>
            <a href="audit-logs.html" class="sidebar-link ${currentPath === 'audit-logs.html' ? 'active' : ''}"><i class="bi bi-shield-lock"></i> <span>Sistem Logları</span></a>
            <a href="test-scanner.html" class="sidebar-link ${currentPath === 'test-scanner.html' ? 'active' : ''}"><i class="bi bi-upc-scan"></i> <span>Barkod Okuyucu</span></a>
        </div>
    `;

    // 5. ÜST BARI (TOPBAR) VE ANA İSKELETİ OLUŞTURMA:
    const mainWrapper = document.createElement('div');
    mainWrapper.id = 'main-wrapper';
    
    const topbar = document.createElement('header');
    topbar.className = 'topbar shadow-sm';
    topbar.innerHTML = `
        <div class="d-flex align-items-center">            
            <button class="btn border-0 p-1 me-3 text-muted bg-transparent" id="btnToggleSidebar">
                <i class="bi bi-list fs-3"></i>
            </button>
        </div>
        <div class="d-flex align-items-center gap-3">
            <button id="layoutThemeToggleBtn" class="btn btn-link text-decoration-none text-muted p-0 fs-5" title="Temayı Değiştir"></button>

            <!-- Bildirimler -->
            <div class="dropdown position-relative">
                <a class="text-muted text-decoration-none dropdown-toggle no-caret" href="#" role="button" id="notificationDropdown" data-bs-toggle="dropdown">
                    <i class="bi bi-bell-fill fs-5"></i>
                    <span id="navbarNotificationCount" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none fs-065rem">0</span>
                </a>
                <ul class="dropdown-menu dropdown-menu-end shadow border-0 p-2 notification-dropdown-menu">
                    <li class="dropdown-header border-bottom pb-2 mb-2 d-flex justify-content-between align-items-center">
                        <span class="fw-bold">Son Bildirimler</span>
                        <button id="btnNavbarReadAll" class="btn btn-link btn-xs text-primary p-0 text-decoration-none small">Tümünü Oku</button>
                    </li>
                    <div id="navbarNotificationList" class="d-flex flex-column gap-2">
                        <li class="text-center text-muted py-3 small">Bildirimler yükleniyor...</li>
                    </div>
                    <li class="border-top mt-2 pt-2 text-center">
                        <a href="notifications.html" class="text-primary small text-decoration-none fw-bold">Tüm Bildirimleri Gör →</a>
                    </li>
                </ul>
            </div>

            <!-- Kullanıcı Menüsü (Profil ve Çıkış Birleştirildi) -->
            <div class="dropdown">
                <a href="#" class="d-flex align-items-center text-decoration-none dropdown-toggle text-muted" data-bs-toggle="dropdown" style="cursor: pointer;">
                    <div class="bg-primary text-white rounded-circle profile-icon-wrapper me-2 shadow-sm d-flex justify-content-center align-items-center">
                        <i class="bi bi-person"></i>
                    </div>
                    <span id="userProfile" class="small fw-bold d-none d-md-block text-muted">Yükleniyor...</span>
                </a>
                <ul class="dropdown-menu dropdown-menu-end shadow border-0 mt-2 py-2" style="min-width: 200px;">
                    <li>
                        <a href="profile.html" class="dropdown-item py-2 fw-semibold text-secondary">
                            <i class="bi bi-person-gear me-2 text-primary"></i> Profil Ayarları
                        </a>
                    </li>
                    <li><hr class="dropdown-divider my-1"></li>
                    <li>
                        <button id="btnNavbarLogout" class="dropdown-item py-2 fw-bold text-danger">
                            <i class="bi bi-box-arrow-right me-2"></i> Çıkış Yap
                        </button>
                    </li>
                </ul>
            </div>
        </div>
    `;
    
    mainWrapper.appendChild(topbar);
    mainWrapper.appendChild(contentContainer);
    
    document.body.appendChild(sidebar);
    document.body.appendChild(mainWrapper);

    // 6. ETKİLEŞİMLER (EVENT LISTENERS)
    
    // Sidebar'ı açıp kapatan butonun ayarları
    document.getElementById('btnToggleSidebar').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('collapsed');
        document.getElementById('main-wrapper').classList.toggle('expanded');
        if (window.innerWidth < 992) {
            document.getElementById('sidebar').classList.toggle('show-mobile');
        }
    });

    document.getElementById('btnCloseSidebar').addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('show-mobile');
    });

    // Tema Değiştirme Sistemi
    const themeBtn = document.getElementById('layoutThemeToggleBtn');
    if (themeBtn) {
        const updateIcon = (theme) => {
            themeBtn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
        };

        let currentTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        updateIcon(currentTheme);

        themeBtn.addEventListener('click', () => {
            currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', currentTheme);
            document.documentElement.setAttribute('data-bs-theme', currentTheme);
            localStorage.setItem('theme', currentTheme);
            updateIcon(currentTheme);

            // Chart.js grafiklerini sayfa yenilenmeden canlı günceller
            if (typeof renderTrendChart === "function" && typeof lastTrendData !== "undefined" && lastTrendData.length > 0) {
                setTimeout(() => {
                    renderTrendChart(lastTrendData);
                    if (typeof renderCategoryChart === "function" && lastCategoryData) renderCategoryChart(lastCategoryData);
                    if (typeof renderTopProductsChart === "function" && lastTopProductsData) renderTopProductsChart(lastTopProductsData);
                    if (typeof renderMovementSummaryChart === "function" && lastMovementData) renderMovementSummaryChart(lastMovementData);
                }, 50);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', renderProfessionalLayout);