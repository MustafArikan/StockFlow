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
            
            // Eğer rol superadmin ise Kullanıcılar menüsünü göster
            if (payload.role === "superadmin") {
                const navUsersItem = document.getElementById("navUsersItem");
                if (navUsersItem) navUsersItem.classList.remove("d-none");
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
        }
    }
});

function escapeHtml(text) {
    if (!text) return "";
    return text.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}