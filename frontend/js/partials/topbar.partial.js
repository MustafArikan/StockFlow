function buildTopbarHtml() {
    return `
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
                <a href="#" class="d-flex align-items-center text-decoration-none dropdown-toggle text-muted cursor-pointer" data-bs-toggle="dropdown">
                    <div class="bg-primary text-white rounded-circle profile-icon-wrapper me-2 shadow-sm d-flex justify-content-center align-items-center">
                        <i class="bi bi-person"></i>
                    </div>
                    <span id="userProfile" class="small fw-bold d-none d-md-block text-muted">Yükleniyor...</span>
                </a>
                <ul class="dropdown-menu dropdown-menu-end shadow border-0 mt-2 py-2 dropdown-min-w">
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
}
