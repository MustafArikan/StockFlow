// İŞLETİM SİSTEMİ MENÜ ÇUBUĞU (Desktop Menu Bar)
// Klasik topbar yerine masaüstü menü çubuğu görünümü üretir.
// DİKKAT: btnToggleSidebar, layoutThemeToggleBtn, notificationDropdown,
// navbarNotificationCount, navbarNotificationList, btnNavbarReadAll,
// userProfile ve btnNavbarLogout id'leri diğer scriptler tarafından
// kullanıldığı için birebir korunmuştur.
function buildTopbarHtml() {
    return `
        <div class="d-flex align-items-center gap-2 dt-menubar-left">
            <button class="btn dt-menu-btn" id="btnToggleSidebar" title="Masaüstü ikonlarını göster/gizle">
                <i class="bi bi-grid-3x3-gap-fill"></i>
            </button>
            <span class="dt-menubar-brand d-none d-md-flex">
                <i class="bi bi-hexagon-fill"></i> StockFlow
            </span>
            <span class="dt-menubar-sep d-none d-lg-block"></span>
            <span class="dt-menubar-app d-none d-lg-block" id="dtMenubarApp"></span>
        </div>

        <!-- AÇIK PENCERE SEKMELERİ
             Menü çubuğunun ORTASINDA durur. Ayrı bir şerit olarak eklenmez:
             ikinci bir bar hem dikey yer yiyor hem de ikon raylarının en
             üstteki ikonlarını (Ana Sayfa / Kullanıcılar) örtüyordu.
             İçeriği js/window-manager.js doldurur. -->
        <div class="dt-tabstrip" id="dtTaskbar" role="tablist" aria-label="Açık pencereler"></div>

        <div class="d-flex align-items-center gap-2 gap-md-3 dt-menubar-right">
            <span class="dt-clock d-none d-md-flex" id="dtClock" aria-live="off"></span>

            <button id="layoutThemeToggleBtn" class="btn dt-menu-btn" title="Temayı Değiştir"></button>

            <!-- Bildirimler -->
            <div class="dropdown position-relative">
                <a class="btn dt-menu-btn dropdown-toggle no-caret" href="#" role="button" id="notificationDropdown" data-bs-toggle="dropdown" title="Bildirimler">
                    <i class="bi bi-bell-fill"></i>
                    <span id="navbarNotificationCount" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none fs-065rem">0</span>
                </a>
                <ul class="dropdown-menu dropdown-menu-end p-2 notification-dropdown-menu">
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
                <a href="#" class="dt-user-chip text-decoration-none dropdown-toggle no-caret cursor-pointer" data-bs-toggle="dropdown">
                    <div class="profile-icon-wrapper">
                        <i class="bi bi-person-fill"></i>
                    </div>
                    <span id="userProfile" class="d-none d-md-block">Yükleniyor...</span>
                </a>
                <ul class="dropdown-menu dropdown-menu-end mt-2 py-2 dropdown-min-w">
                    <li>
                        <a href="profile.html" class="dropdown-item py-2 fw-semibold">
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
