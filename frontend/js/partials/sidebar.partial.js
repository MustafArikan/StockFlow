function buildSidebarHtml(currentPath) {
    return `
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
            <a href="categories.html" id="navCategoriesItem" class="sidebar-link d-none ${currentPath === 'categories.html' ? 'active' : ''}"><i class="bi bi-tags"></i> <span>Kategoriler</span></a>
            <a href="products.html" id="navProductsItem" class="sidebar-link d-none ${currentPath === 'products.html' ? 'active' : ''}"><i class="bi bi-box-seam"></i> <span>Ürünler</span></a>
            <a href="movements.html" id="navMovementsItem" class="sidebar-link d-none ${currentPath === 'movements.html' ? 'active' : ''}"><i class="bi bi-arrow-left-right"></i> <span>Stok Hareketleri</span></a>
            
            <h6 class="sidebar-heading text-uppercase text-muted fw-bold px-4 mb-2 fs-07rem ls-1px">Yönetim</h6>
            <a href="warehouses.html" id="navWarehousesItem" class="sidebar-link d-none ${currentPath === 'warehouses.html' ? 'active' : ''}"><i class="bi bi-building"></i> <span>Depolar</span></a>
            <a href="suppliers.html" id="navSuppliersItem" class="sidebar-link d-none ${currentPath === 'suppliers.html' ? 'active' : ''}"><i class="bi bi-truck"></i> <span>Tedarikçiler</span></a>
            <a href="assets.html" id="navAssetsItem" class="sidebar-link d-none ${currentPath === 'assets.html' ? 'active' : ''}"><i class="bi bi-pc-display"></i> <span>Ekipman Yönetimi</span></a>
            
            <h6 class="sidebar-heading text-uppercase text-muted fw-bold px-4 mb-2 fs-07rem ls-1px">Sistem</h6>
            <a href="users.html" id="navUsersItem" class="sidebar-link d-none ${currentPath === 'users.html' ? 'active' : ''}"><i class="bi bi-people"></i> <span>Kullanıcılar</span></a>
            <a href="roles.html" id="navRolesItem" class="sidebar-link d-none ${currentPath === 'roles.html' ? 'active' : ''}"><i class="bi bi-shield-lock"></i> <span>Rol ve Yetki Yönetimi</span></a>
            <a href="audit-logs.html" id="navAuditLogsItem" class="sidebar-link d-none ${currentPath === 'audit-logs.html' ? 'active' : ''}"><i class="bi bi-journal-text"></i> <span>Sistem Logları</span></a>
            <a href="test-scanner.html" id="navTestScannerItem" class="sidebar-link d-none ${currentPath === 'test-scanner.html' ? 'active' : ''}"><i class="bi bi-upc-scan"></i> <span>Barkod Okuyucu</span></a>
        </div>
    `;
}
