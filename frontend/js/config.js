// --- Dinamik API URL Tespiti ---
let apiBase = '/api'; // Production varsayılanı (Nginx üzerinden)

// Sadece hiçbir web sunucusu olmadan dosyaya çift tıklayıp açıldığında doğrudan API'ye gitmesi için:
if (window.location.protocol === 'file:') {
    apiBase = 'http://localhost:5000/api';
}

const CONFIG = {
    API_BASE_URL: apiBase
};

// Merkezi Yetki Denetim Sistemi (RBAC)
// Kullanıcının rolünü JWT token üzerinden güvenli bir şekilde çözer
function getUserRole() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return "viewer"; // Token yoksa varsayılan en düşük yetki

        const payloadBase64 = token.split('.')[1];
        const payloadDecoded = JSON.parse(atob(payloadBase64));

        // Sunucudan gelen rol bilgisini farklı claim tiplerine karşı güvenle okur
        return payloadDecoded["role"] ||
            payloadDecoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
            "viewer";
    } catch (e) {
        // Token parse edilemezse veya formatı hatalıysa sistemin çökmesini önler, güvenli rol döner
        return "viewer";
    }
}

function hasPermission(action) {
    try {
        const token = localStorage.getItem('token');
        if (!token) return false;

        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role === "superadmin") return true;

        let permissions = [];
        if (payload.Permission) {
            permissions = Array.isArray(payload.Permission) ? payload.Permission : [payload.Permission];
        }

        return permissions.includes(action);
    } catch (error) {
        console.error("Yetki kontrolünde hata:", error);
        return false;
    }
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
    const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, options);

    // Eğer token süresi dolduysa veya geçersizse kullanıcıyı login sayfasına atar
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

// MERKEZİ SAYFALAMA (PAGINATION) OLUŞTURUCU
// Tabloların altında sayfa numaralarını ve sayfa başına kayıt sayısını dinamik çizen fonksiyondur // isGrid = false parametresi eklendi
function buildPagination(containerId, totalItems, currentPage, pageSize, onPageChange, onPageSizeChange, isGrid = false) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (totalItems === 0) {
        container.innerHTML = "";
        return;
    }

    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    let startItem = (currentPage - 1) * pageSize + 1;
    let endItem = Math.min(currentPage * pageSize, totalItems);

    // isGrid bilgisi html oluşturucuya aktarıldı
    let html = buildPaginationHtml(totalItems, currentPage, pageSize, totalPages, startItem, endItem, isGrid);

    container.innerHTML = html;

    // Sayfa değiştirme butonlarına tıklama olayını bağlar
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

    // Sayfa başına satır sayısı değiştirme olayını bağlar
    const selectEl = container.querySelector('.page-size-action');
    if (selectEl) {
        selectEl.addEventListener('change', (e) => {
            onPageSizeChange(parseInt(e.target.value));
        });
    }
}

// Modal içinde selectpicker bileşeni varsa render sorununu çözen fix
if (typeof $ !== 'undefined') {
    $(document).on('shown.bs.modal', '.modal', function () {
        $(this).find('.selectpicker').selectpicker('render');
    });
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
    sidebar.innerHTML = buildSidebarHtml(currentPath);

    // 5. ÜST BARI (TOPBAR) VE ANA İSKELETİ OLUŞTURMA:
    const mainWrapper = document.createElement('div');
    mainWrapper.id = 'main-wrapper';

    // Sidebar'ın son durumunu LocalStorage'dan al ve uygula
    if (localStorage.getItem('sidebarState') === 'collapsed') {
        sidebar.classList.add('collapsed');
        mainWrapper.classList.add('expanded');
    }

    const topbar = document.createElement('header');
    topbar.className = 'topbar shadow-sm';
    topbar.innerHTML = buildTopbarHtml();

    mainWrapper.appendChild(topbar);
    mainWrapper.appendChild(contentContainer);

    document.body.appendChild(sidebar);
    document.body.appendChild(mainWrapper);

    // Sunucuya istek atarak giriş yapan kullanıcının bilgilerini (Ad, Soyad, Rol vb.) alıyoruz
    apiRequest('/auth/me', 'GET').then(userData => {
        const userProfileEl = document.getElementById('userProfile');
        if (userProfileEl) {
            userProfileEl.textContent = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email;
        }

        // Kullanıcının rolünü kontrol ediyoruz (Superadmin ise)
        const role = userData.role || getUserRole();
        if (role === 'superadmin') {
            const navUsersItem = document.getElementById('navUsersItem');
            const navRolesItem = document.getElementById('navRolesItem');
            if (navUsersItem) {
                navUsersItem.classList.remove('d-none');
            }
            if (navRolesItem) {
                navRolesItem.classList.remove('d-none');
            }
        }
    }).catch((error) => {
        // İstek başarısız olursa hem konsola hatayı logluyoruz hem de arayüzün çökmesini engellemek için "Hesap" yazdırıyoruz
        console.error("Layout yüklenirken hata oluştu:", error);
        const userProfileEl = document.getElementById('userProfile');
        if (userProfileEl) userProfileEl.textContent = 'Hesap';
    });

    // 6. ETKİLEŞİMLER (EVENT LISTENERS)

    // Sidebar'ı açıp kapatan butonun ayarları
    document.getElementById('btnToggleSidebar').addEventListener('click', () => {
        const isCollapsed = document.getElementById('sidebar').classList.toggle('collapsed');
        document.getElementById('main-wrapper').classList.toggle('expanded');
        
        // Durumu localStorage'a kaydet
        localStorage.setItem('sidebarState', isCollapsed ? 'collapsed' : 'expanded');

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

function tarihFormatla(t) {
    return t ? new Date(t).toLocaleDateString("tr-TR") : "-";
}

function tarihSaatFormatla(t) {
    return t ? new Date(t).toLocaleString("tr-TR") : "-";
}
document.addEventListener('DOMContentLoaded', renderProfessionalLayout);
// Fix Bootstrap 5 Modal aria-hidden focus warnings in Chrome
document.addEventListener('hide.bs.modal', function () {
    if (document.activeElement) {
        document.activeElement.blur();
    }
});
