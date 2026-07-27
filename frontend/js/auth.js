// auth.js - Çıkış yapma ve kullanıcı profili işlemleri (Kurşun Geçirmez Hali)

let dynamicBannerContainer = null;

function generateRandomString(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

document.addEventListener('DOMContentLoaded', () => {

    // 1. Çıkış Yap Butonunu Güvenli Dinle
    const btnNavbarLogout = document.getElementById('btnNavbarLogout');
    if (btnNavbarLogout) {
        btnNavbarLogout.addEventListener("click", (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        });
    }

    // 2. Kullanıcı E-postasını Navbar'a Güvenli Yaz
    const userProfileEl = document.getElementById('userProfile');
    const token = localStorage.getItem('token');

    if (userProfileEl && token) {
        try {
            // Token parçalanırken hata oluşursa sayfa patlamasın diye try-catch içinde tutuyoruz
            const payload = JSON.parse(atob(token.split('.')[1]));
            userProfileEl.textContent = payload.email || "Kullanıcı";
            // Permissions can be string or array
            let permissions = [];
            if (payload.Permission) {
                permissions = Array.isArray(payload.Permission) ? payload.Permission : [payload.Permission];
            }

            // Kullanıcı Yönetimi Gösterme Mantığı
            if (payload.role === "superadmin" || permissions.includes("User.View") || permissions.includes("User.Add") || permissions.includes("User.Edit") || permissions.includes("User.Delete")) {
                const navUsersItem = document.getElementById("navUsersItem");
                if (navUsersItem) navUsersItem.classList.remove("d-none");
            }

            // Rol ve Yetki Yönetimi Gösterme Mantığı
            if (payload.role === "superadmin" || permissions.includes("Role.View") || permissions.includes("Role.Add") || permissions.includes("Role.Edit") || permissions.includes("Role.Delete")) {
                const navRolesItem = document.getElementById("navRolesItem");
                if (navRolesItem) navRolesItem.classList.remove("d-none");
            }

            // Kategoriler
            if (payload.role === "superadmin" || permissions.some(p => p.startsWith("Category."))) {
                const navItem = document.getElementById("navCategoriesItem");
                if (navItem) navItem.classList.remove("d-none");
            }
            
            // Ürünler
            if (payload.role === "superadmin" || permissions.some(p => p.startsWith("Product."))) {
                const navItem = document.getElementById("navProductsItem");
                if (navItem) navItem.classList.remove("d-none");
            }

            // Stok Hareketleri
            if (payload.role === "superadmin" || permissions.some(p => p.startsWith("Movement."))) {
                const navItem = document.getElementById("navMovementsItem");
                if (navItem) navItem.classList.remove("d-none");
            }

            // Depolar
            if (payload.role === "superadmin" || permissions.some(p => p.startsWith("Warehouse."))) {
                const navItem = document.getElementById("navWarehousesItem");
                if (navItem) navItem.classList.remove("d-none");
            }

            // Tedarikçiler
            if (payload.role === "superadmin" || permissions.some(p => p.startsWith("Supplier."))) {
                const navItem = document.getElementById("navSuppliersItem");
                if (navItem) navItem.classList.remove("d-none");
            }

            // Demirbaşlar (Assets)
            if (payload.role === "superadmin" || permissions.some(p => p.startsWith("Asset."))) {
                const navItem = document.getElementById("navAssetsItem");
                if (navItem) navItem.classList.remove("d-none");
            }

            // Sistem Logları
            if (payload.role === "superadmin" || permissions.includes("System.AuditLogs")) {
                const navItem = document.getElementById("navAuditLogsItem");
                if (navItem) navItem.classList.remove("d-none");
            }

            // Barkod Okuyucu
            if (payload.role === "superadmin" || permissions.includes("Scanner.Use")) {
                const navItem = document.getElementById("navTestScannerItem");
                if (navItem) navItem.classList.remove("d-none");
            }
        } catch (e) {
            console.error("Token çözümlenemedi:", e);
            userProfileEl.textContent = "Kullanıcı";
        }
    }

    // 3. STOK TÜKENDİ (EMPTY_STOCK) GLOBAL KALICI BİLDİRİMİ
    if (token) {
        checkEmptyStockAlerts();
    }
});

async function checkEmptyStockAlerts() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/notifications?onlyUnread=true`, {
            headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
        });
        
        if (!response.ok) return;

        const notifications = await response.json();
        const emptyAlerts = notifications.filter(n => n.severity === "EMPTY_STOCK" && !n.isRead);

        if (emptyAlerts.length > 0) {
            if (!dynamicBannerContainer) {
                dynamicBannerContainer = document.createElement("div");
                dynamicBannerContainer.id = "sys_" + generateRandomString(12);
                dynamicBannerContainer.className = generateRandomString(8);
                // CSP-safe DOM CSS injection
                dynamicBannerContainer.style.position = "fixed";
                dynamicBannerContainer.style.top = "0";
                dynamicBannerContainer.style.left = "0";
                dynamicBannerContainer.style.width = "100%";
                dynamicBannerContainer.style.zIndex = "2147483647"; // Max z-index
                document.body.prepend(dynamicBannerContainer);
            }
            dynamicBannerContainer.innerHTML = "";
            
            emptyAlerts.forEach(alert => {
                const randomNoiseClass = generateRandomString(10);
                const alertDiv = document.createElement("div");
                alertDiv.className = `alert alert-danger m-0 rounded-0 d-flex justify-content-between align-items-center shadow-lg border-bottom ${randomNoiseClass}`;
                alertDiv.style.padding = "1rem 1.5rem";
                alertDiv.style.borderBottomWidth = "4px";
                
                alertDiv.innerHTML = `
                    <div class="fw-bold fs-5 text-danger ${generateRandomString(6)}">
                        <i class="bi bi-exclamation-octagon-fill me-2 ${generateRandomString(5)}"></i>
                        <span class="safe-message-container"></span>
                    </div>
                    <button class="btn btn-danger fw-bold shadow-sm px-4 py-2 ${generateRandomString(7)}" data-action="approve-empty-stock" data-id="${alert.id}">
                        SONUCUNU ANLIYORUM
                    </button>
                `;
                
                // Güvenli (XSS korumalı) metin ataması
                alertDiv.querySelector('.safe-message-container').textContent = alert.message;
                
                dynamicBannerContainer.appendChild(alertDiv);
            });
            document.body.style.paddingTop = (emptyAlerts.length * 75) + "px";
        } else if (dynamicBannerContainer) {
            dynamicBannerContainer.remove();
            dynamicBannerContainer = null;
            document.body.style.paddingTop = "0px";
        }
    } catch(e) {}
}

// Güvenli (Event Delegation) Yöntemi ile Buton Tıklamasını Yakalama (Inline Onclick Yerine)
document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="approve-empty-stock"]');
    if (btn) {
        const id = btn.getAttribute('data-id');
        const token = localStorage.getItem('token');
        try {
            btn.disabled = true;
            btn.innerText = "Onaylanıyor...";
            await fetch(`${CONFIG.API_BASE_URL}/notifications/${id}/read`, { 
                method: "PUT", 
                headers: { "Authorization": `Bearer ${token}` }
            });
            checkEmptyStockAlerts();
        } catch(e) {
            btn.disabled = false;
            btn.innerText = "SONUCUNU ANLIYORUM";
            hataGoster(e.message);
        }
    }
});

function escapeHtml(text) {
    if (!text) return "";
    return text.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}