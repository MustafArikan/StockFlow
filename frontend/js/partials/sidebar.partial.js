// MASAÜSTÜ İKON RAYLARI (Desktop Icon Rails)
// Klasik yan menü yerine, duvar kağıdı üzerinde duran masaüstü ikonları üretir.
// İkonlar iki kola ayrılır: solda günlük operasyon, sağda sistem yönetimi.
// Böylece hiçbir ikon ekranın altına taşmaz.
//
// DİKKAT: Tüm bağlantı id'leri (navProductsItem, navRolesItem ...), `sidebar-link`
// sınıfı, `d-none` ve `active` durumları aynen korunmuştur — auth.js bu id'ler
// üzerinden yetkiye göre menü öğelerini açıp kapatır.

// Tek bir masaüstü ikonu üretir: renkli uygulama karosu (tile) + altında etiket
function buildDesktopIcon(path, href, id, iconClass, label, tone) {
    const isActive = path === href ? 'active' : '';
    // Ana Sayfa dışındaki tüm öğeler yetki bilgisi gelene kadar gizlidir (d-none)
    const hidden = id ? 'd-none' : '';
    const idAttr = id ? `id="${id}"` : '';
    return `
        <a href="${href}" ${idAttr} class="sidebar-link desktop-icon ${hidden} ${isActive}" title="${label}">
            <span class="dt-tile dt-tone-${tone}">
                <i class="bi ${iconClass}"></i>
            </span>
            <span class="dt-label">${label}</span>
        </a>`;
}

// SOL RAY — marka + günlük operasyon uygulamaları
function buildSidebarHtml(currentPath) {
    const path = currentPath || 'index.html';
    const icon = (...args) => buildDesktopIcon(path, ...args);

    // Marka karosu kaldırıldı — ray doğrudan "Ana Sayfa" ile başlar.
    // Başlık yalnızca mobildeki kapatma düğmesini taşır (config.js bu id'yi bağlar).
    return `
        <div class="sidebar-header dt-rail-head">
            <button class="btn btn-sm d-lg-none border-0 dt-close-rail" id="btnCloseSidebar" title="Kapat">
                <i class="bi bi-x-lg fs-5"></i>
            </button>
        </div>
        <div class="sidebar-menu flex-grow-1 overflow-auto py-2">
            ${icon('index.html', '', 'bi-house-door-fill', 'Ana Sayfa', 'orange')}
            ${icon('categories.html', 'navCategoriesItem', 'bi-tags-fill', 'Kategoriler', 'purple')}
            ${icon('products.html', 'navProductsItem', 'bi-box-seam-fill', 'Ürünler', 'blue')}
            ${icon('movements.html', 'navMovementsItem', 'bi-arrow-left-right', 'Stok Hareketleri', 'teal')}
            ${icon('warehouses.html', 'navWarehousesItem', 'bi-building-fill', 'Depolar', 'yellow')}
            ${icon('suppliers.html', 'navSuppliersItem', 'bi-truck', 'Tedarikçiler', 'blue')}
            ${icon('assets.html', 'navAssetsItem', 'bi-pc-display', 'Ekipman', 'teal')}
        </div>
    `;
}

// SAĞ RAY — sistem ve yetki yönetimi uygulamaları
function buildSidebarRightHtml(currentPath) {
    const path = currentPath || 'index.html';
    const icon = (...args) => buildDesktopIcon(path, ...args);

    return `
        <div class="sidebar-menu flex-grow-1 overflow-auto py-2">
            ${icon('users.html', 'navUsersItem', 'bi-people-fill', 'Kullanıcılar', 'purple')}
            ${icon('roles.html', 'navRolesItem', 'bi-shield-lock-fill', 'Rol ve Yetki', 'red')}
            ${icon('policies.html', 'navPoliciesItem', 'bi-speedometer2', 'Politikalar', 'orange')}
            ${icon('audit-logs.html', 'navAuditLogsItem', 'bi-journal-text', 'Sistem Logları', 'slate')}
            ${icon('hybrid-scanner.html', 'navTestScannerItem', 'bi-upc-scan', 'Barkod Okuyucu', 'yellow')}
            ${icon('notifications.html', '', 'bi-bell-fill', 'Bildirimler', 'blue')}
        </div>
    `;
}

// Güvenlik ve Uyumluluk: Kodun tarayıcı ortamında (window nesnesi mevcutken) çalışıp
// çalışmadığını kontrol eder. Böylece sunucu (Node.js) taraflı olası çöküşler engellenir
// ve fonksiyonlar global scope'a eklenerek projedeki diğer scriptlerin erişimine açılır.
if (typeof window !== 'undefined') {
    window.buildSidebarHtml = buildSidebarHtml;
    window.buildSidebarRightHtml = buildSidebarRightHtml;
}
