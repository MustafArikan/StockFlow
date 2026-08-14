// --- Dinamik API URL Tespiti ---
let apiBase = '/api'; // Production varsayılanı (Nginx üzerinden)

// Sadece hiçbir web sunucusu olmadan dosyaya çift tıklayıp açıldığında doğrudan API'ye gitmesi için:
if (window.location.protocol === 'file:') {
    apiBase = 'http://localhost:5000/api';
}

const CONFIG = {
    API_BASE_URL: apiBase
};

// Sayfa boyunca tek seferlik yüklenen, memory'de tutulan yetki bağlamı
window.__authContext = {
    loaded: false,
    role: null,
    permissions: new Set(),
    isSuperAdmin: false,
    email: null,
    firstName: null,
    lastName: null,
    loadingPromise: null
};

async function loadAuthContext() {
    if (window.__authContext.loaded) return window.__authContext;

    if (window.__authContext.loadingPromise) {
        return window.__authContext.loadingPromise;
    }

    const token = localStorage.getItem('token');
    if (!token) return window.__authContext;

    window.__authContext.loadingPromise = (async () => {
        try {
            const userData = await apiRequest('/auth/me', 'GET');
            window.__authContext.role = userData.role;
            window.__authContext.isSuperAdmin = userData.role === 'superadmin';
            window.__authContext.permissions = new Set(userData.permissions || []);
            window.__authContext.email = userData.email;
            window.__authContext.firstName = userData.firstName;
            window.__authContext.lastName = userData.lastName;
            window.__authContext.loaded = true;
        } catch (e) {
            console.error("Yetki bağlamı yüklenemedi:", e);
        } finally {
            window.__authContext.loadingPromise = null;
        }
        return window.__authContext;
    })();

    return window.__authContext.loadingPromise;
}

function hasPermission(action) {
    const ctx = window.__authContext;
    if (ctx.isSuperAdmin) return true;
    return ctx.permissions.has(action);
}

function getUserRole() {
    return window.__authContext.role || "viewer";
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
        let errorMessage = data?.message || 'Sunucu ile iletisimde bir hata olustu.';
        
        // ASP.NET Core DTO Validation Hatalarını Yakalama (400 Bad Request)
        if (response.status === 400 && data?.errors && typeof data.errors === 'object') {
            let errorHtml = '<div class="text-start mt-2"><ul class="mb-0 text-danger" style="list-style-type: none; padding-left: 0;">';
            let foundValidError = false;
            for (const key in data.errors) {
                if (Array.isArray(data.errors[key])) {
                    data.errors[key].forEach(msg => {
                        errorHtml += `<li class="mb-1"><i class="bi bi-exclamation-triangle-fill me-2 text-warning"></i>${msg}</li>`;
                        foundValidError = true;
                    });
                }
            }
            errorHtml += '</ul></div>';
            
            if (foundValidError) {
                errorMessage = `<div class="mb-2 fw-bold text-dark">Lütfen aşağıdaki eksiklikleri giderin:</div> ${errorHtml}`;
            }
        }

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

// Sayfa, masaüstü kabuğundaki bir pencerenin İÇERİĞİ olarak mı yükleniyor?
// (window-manager.js her pencereyi bir iframe ile açar.)
// Gömülü çalışırken kabuk BİR DAHA kurulmaz: duvar kağıdı, ikon rayları, menü
// çubuğu ve pencere çerçevesi zaten dışarıda, üst belgede duruyor.
function isEmbeddedWindow() {
    try {
        return window.self !== window.top;
    } catch (e) {
        // Farklı origin'e gömülmüşsek erişim hatası alırız; yine de gömülüyüz.
        return true;
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

    // desktop.html "boş masaüstü" sayfasıdır: pencere açılmaz,
    // yalnızca duvar kağıdı ve iki yandaki uygulama ikonları görünür.
    const isDesktopPage = currentPath === 'desktop.html';

    // 3. SARMALAMA (WRAPPING) İŞLEMİ:
    // HTML dosyasında yazdığımız asıl içerikleri (tablolar, grafikler) alıp 'contentContainer'
    // adında yeni bir div'in içine taşır
    const contentContainer = document.createElement('div');
    contentContainer.className = 'container-fluid p-4 dt-window-content';

    while (document.body.firstChild) {
        contentContainer.appendChild(document.body.firstChild);
    }

    // 3b. GÖMÜLÜ MOD: Yalnızca içerik render edilir, kabuk kurulmaz.
    // Sayfa doğrudan adresten açıldığında (standalone) bu blok çalışmaz ve
    // eski davranış birebir korunur.
    if (isEmbeddedWindow()) {
        document.body.classList.add('dt-embedded');
        document.body.appendChild(contentContainer);

        // Pencere başlığını üst belgeye bildir: başlık çubuğunda ve sekme
        // şeridinde bu yazacak.
        // İSTİSNA: Sayfa bir form penceresiyse ("?modal=...") başlığı
        // js/modal-window.js modalın kendi başlığından bildirir ("Ürün
        // Düzenle" gibi). Burada sayfa adını yazarsak onun üstüne biner —
        // bu blok loadAuthContext beklediği için SONRA çalışır ve kazanır.
        const formPenceresi = new URLSearchParams(window.location.search).has('modal');
        if (!formPenceresi) {
            const embeddedTitle = (document.title || 'StockFlow').split(/[-–|]/)[0].trim() || 'StockFlow';
            try {
                if (window.parent && typeof window.parent.__wmReportTitle === 'function') {
                    window.parent.__wmReportTitle(window.frameElement, embeddedTitle);
                }
            } catch (e) {
                /* üst belgeye erişilemiyorsa sessizce geç */
            }
        }
        return;
    }

    // Masaüstü modunu açar (duvar kağıdı, pencere gölgesi vb. bu sınıfa bağlıdır)
    document.body.classList.add('dt-desktop');

    // Pencere başlığı: sayfa başlığının ilk parçası (ör. "Ürünler - StockFlow" → "Ürünler")
    const appTitle = (document.title || 'StockFlow').split(/[-–|]/)[0].trim() || 'StockFlow';

    // 4. MASAÜSTÜ İKON RAYLARINI OLUŞTURMA (sol: operasyon, sağ: sistem)
    const sidebar = document.createElement('aside');
    sidebar.id = 'sidebar';
    sidebar.innerHTML = buildSidebarHtml(currentPath);

    const sidebarRight = document.createElement('aside');
    sidebarRight.id = 'sidebar-right';
    sidebarRight.innerHTML = buildSidebarRightHtml(currentPath);

    // 5. MENÜ ÇUBUĞU: Masaüstü metaforunda en üstte, tam genişlikte durur
    const topbar = document.createElement('header');
    topbar.className = 'topbar';
    topbar.innerHTML = buildTopbarHtml();

    // 6. UYGULAMA PENCERESİ: Başlık çubuğu (title bar) + içerik
    const mainWrapper = document.createElement('div');
    mainWrapper.id = 'main-wrapper';

    const titlebar = document.createElement('div');
    titlebar.className = 'dt-titlebar';
    titlebar.innerHTML = `
        <div class="dt-titlebar-left">
            <span class="dt-titlebar-icon"><i class="bi bi-hexagon-fill"></i></span>
            <span class="dt-titlebar-text"></span>
        </div>
        <div class="dt-window-controls">
            <button type="button" class="dt-wc dt-wc-max" id="dtWinMaximize" title="Tam ekran / pencere görünümü" aria-label="Tam ekran"><i class="bi bi-square"></i></button>
            <button type="button" class="dt-wc dt-wc-close" id="dtWinClose" title="Pencereyi kapat (masaüstünü göster)" aria-label="Pencereyi kapat"><i class="bi bi-x-lg"></i></button>
        </div>`;
    // Başlık metni textContent ile yazılır (XSS'e karşı güvenli)
    titlebar.querySelector('.dt-titlebar-text').textContent = appTitle;

    mainWrapper.appendChild(titlebar);
    mainWrapper.appendChild(contentContainer);

    // İkon raylarının ve pencerenin son durumunu LocalStorage'dan al ve uygula
    if (localStorage.getItem('sidebarState') === 'collapsed') {
        sidebar.classList.add('collapsed');
        sidebarRight.classList.add('collapsed');
        mainWrapper.classList.add('expanded');
    }
    if (localStorage.getItem('windowState') === 'maximized') {
        mainWrapper.classList.add('maximized');
        document.body.classList.add('dt-maximized');
    }

    document.body.appendChild(topbar);
    document.body.appendChild(sidebar);
    document.body.appendChild(sidebarRight);

    // Masaüstü sayfasında pencere hiç eklenmez
    if (isDesktopPage) {
        document.body.classList.add('dt-desktop-only');
    } else {
        document.body.appendChild(mainWrapper);
    }

    // Menü çubuğundaki aktif uygulama adını yazar
    const menubarApp = document.getElementById('dtMenubarApp');
    if (menubarApp) menubarApp.textContent = appTitle;

    // Sunucuya istek atarak giriş yapan kullanıcının bilgilerini (Ad, Soyad, Rol vb.) alıyoruz
    // loadAuthContext() zaten bu veriyi çektiği için ondan alabiliriz
    const ctx = window.__authContext;
    if (ctx.loaded) {
        const userProfileEl = document.getElementById('userProfile');
        if (userProfileEl) {
            userProfileEl.textContent = `${ctx.firstName || ''} ${ctx.lastName || ''}`.trim() || ctx.email;
        }

        // Kullanıcının rolünü kontrol ediyoruz (Superadmin ise)
        const role = ctx.role;
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
    } else {
        const userProfileEl = document.getElementById('userProfile');
        if (userProfileEl) userProfileEl.textContent = 'Hesap';
    }

    // 8. ETKİLEŞİMLER (EVENT LISTENERS)

    // Masaüstü ikon raylarını açıp kapatan butonun ayarları (her iki ray birlikte)
    const raylar = [sidebar, sidebarRight];

    document.getElementById('btnToggleSidebar').addEventListener('click', () => {
        const isCollapsed = !sidebar.classList.contains('collapsed');
        raylar.forEach(r => r.classList.toggle('collapsed', isCollapsed));
        mainWrapper.classList.toggle('expanded', isCollapsed);

        // Durumu localStorage'a kaydet
        localStorage.setItem('sidebarState', isCollapsed ? 'collapsed' : 'expanded');

        if (window.innerWidth < 992) {
            const acik = !sidebar.classList.contains('show-mobile');
            raylar.forEach(r => r.classList.toggle('show-mobile', acik));
        }
    });

    const btnCloseSidebar = document.getElementById('btnCloseSidebar');
    if (btnCloseSidebar) {
        btnCloseSidebar.addEventListener('click', () => {
            raylar.forEach(r => r.classList.remove('show-mobile'));
        });
    }

    // --- PENCERE KONTROLLERİ (Tam Ekran / Kapat) ---
    // Masaüstü sayfasında pencere olmadığı için bu bölüm atlanır.
    if (!isDesktopPage) {
        const tamEkranDegistir = () => {
            const isMax = mainWrapper.classList.toggle('maximized');
            document.body.classList.toggle('dt-maximized', isMax);
            localStorage.setItem('windowState', isMax ? 'maximized' : 'windowed');
        };

        // Kırmızı çarpı: pencereyi kapatır ve boş masaüstü sayfasına götürür
        document.getElementById('dtWinClose').addEventListener('click', () => {
            window.location.href = 'desktop.html';
        });

        document.getElementById('dtWinMaximize').addEventListener('click', tamEkranDegistir);

        // Başlık çubuğuna çift tıklama, işletim sistemlerindeki gibi tam ekrana geçirir
        titlebar.addEventListener('dblclick', (e) => {
            if (e.target.closest('.dt-wc')) return;
            tamEkranDegistir();
        });
    } else {
        // Masaüstü sayfasında ekranın altında yönlendirici bir ipucu gösterilir
        const masaustuIpucu = document.createElement('div');
        masaustuIpucu.className = 'dt-desktop-hint';
        masaustuIpucu.textContent = 'Açmak için bir uygulama seçin';
        document.body.appendChild(masaustuIpucu);

        // PENCERE YÖNETİCİSİ
        // Kabuk (menü çubuğu + ikon rayları) kurulduktan SONRA başlatılır:
        // ikon tıklamalarını yakalayıp pencere açması için rayların DOM'da
        // olması gerekir. Ayrıca önceki oturumda açık kalan pencereleri
        // konum ve boyutlarıyla geri yükler.
        if (window.WindowManager) {
            window.WindowManager.init();
        }

        // Masaüstüne çift tıklamak ana sayfayı pencerede açar
        document.addEventListener('dblclick', (e) => {
            if (e.target.closest('#sidebar, #sidebar-right, .topbar, .dt-taskbar, .dt-win')) return;
            if (window.WindowManager) window.WindowManager.open('index.html', 'Ana Sayfa');
        });
    }

    // --- MENÜ ÇUBUĞU SAATİ ---
    const clockEl = document.getElementById('dtClock');
    if (clockEl) {
        const saatiYaz = () => {
            const now = new Date();
            const tarih = now.toLocaleDateString('tr-TR', { weekday: 'short', day: '2-digit', month: 'short' });
            const saat = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            clockEl.textContent = `${tarih}  ${saat}`;
        };
        saatiYaz();
        setInterval(saatiYaz, 30000);
    }

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
document.addEventListener('DOMContentLoaded', async () => {
    await loadAuthContext();
    renderProfessionalLayout();
});
// Fix Bootstrap 5 Modal aria-hidden focus warnings in Chrome
document.addEventListener('hide.bs.modal', function () {
    if (document.activeElement) {
        document.activeElement.blur();
    }
});
