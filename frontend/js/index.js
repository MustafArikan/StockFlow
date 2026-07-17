const token = localStorage.getItem('token');

if (!token) {
    window.location.href = 'login.html';
}

function getUserEmail() {
    try {
        const payloadBase64 = token.split('.')[1];
        const payloadDecoded = JSON.parse(atob(payloadBase64));
        return payloadDecoded["email"] ||
               payloadDecoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] ||
               "Kullanıcı";
    } catch (e) {
        return "Kullanıcı";
    }
}

window.logout = function() {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}

function escapeHtml(text) {
    if (!text) return "";
    return text
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

document.addEventListener('DOMContentLoaded', () => {
    const userProfileEl = document.getElementById('userProfile');
    if (userProfileEl) {
        userProfileEl.textContent = getUserEmail();    
    }

    loadDashboardSummary();
    loadNavbarNotifications();

    const btnNavbarReadAll = document.getElementById('btnNavbarReadAll');
    if (btnNavbarReadAll) {
        btnNavbarReadAll.addEventListener("click", markAllAsRead);
    }

    const btnNavbarLogout = document.getElementById('btnNavbarLogout');
    if (btnNavbarLogout) {
        btnNavbarLogout.addEventListener("click", logout);
    }
});

async function loadDashboardSummary() {
    try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/reports/dashboard-summary`, {  
                method: 'GET',
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            
            if (response.status == 401) {
                logout();
                return;
            }

            if (!response.ok) throw new Error("Dashboard verileri alınamadı.");
                 
            const data = await response.json();

            document.getElementById("totalProductsText").textContent = data.totalProducts;
            document.getElementById("activeWarehousesText").textContent = data.totalWarehouses;
            document.getElementById("criticalAlertsText").textContent = data.criticalAlertsCount;
    }
    catch (error) {
        console.error("Dashboard yükleme hatası:", error);
    }
}

async function loadNavbarNotifications() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/notifications?onlyUnread=true`, {
            method: 'GET',
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.status == 401) {
            logout();
            return;
        }

        if (!response.ok) throw new Error("Bildirimler alınamadı.");

        const notifications = await response.json();
        renderNavbarNotifications(notifications);
    } catch (error) {
        console.error("Zil bildirimleri yükleme hatası:", error);
    }
}

function renderNavbarNotifications(notifications) {
    const badge = document.getElementById("notificationBadge");
    const list = document.getElementById("navbarNotificationList");

    if (!badge || !list) return;

    const count = notifications.length;
    if (count > 0) {
        badge.textContent = count;
        badge.classList.remove("d-none");
    } else {
        badge.classList.add("d-none");
    }

    if (count === 0) {
        list.innerHTML = `<li class="text-center text-muted py-3 small">Kritik stok uyarısı bulunmamaktadır.</li>`;
        return;
    }

    const recentNotifications = notifications.slice(0, 4);
    list.innerHTML = ""; // Clear existing first
    
    recentNotifications.forEach(notification => {
        let iconClass = "bi-exclamation-triangle-fill text-warning";
        if (notification.severity === "CRITICAL") {
            iconClass = "bi-exclamation-circle-fill text-orange-custom";
        } else if (notification.severity === "DANGER" || notification.severity === "EMPTY_STOCK") {
            iconClass = "bi-shield-fill-x text-danger";
        } else if (notification.severity === "INFO") {
            iconClass = "bi-info-circle-fill text-secondary";
        }
        
        const li = document.createElement("li");
        li.className = "p-2 border-bottom small rounded hover-bg";
        
        li.innerHTML = `
            <div class="d-flex align-items-start">
                <i class="bi ${iconClass} me-2"></i>
                <div class="flex-1-min-0">
                    <p class="mb-0 text-dark text-truncate fs-085 safe-message-container"></p>
                    <small class="text-muted fs-075">${new Date(notification.createdAt).toLocaleTimeString("tr-TR", {hour: '2-digit', minute:'2-digit'})}</small>
                </div>
            </div>
        `;
        
        const msgContainer = li.querySelector(".safe-message-container");
        msgContainer.title = notification.message;
        msgContainer.textContent = notification.message; // GÜVENLİ XSS koruması
        
        list.appendChild(li);
    });
}

async function markAllAsRead() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/notifications/read-all`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error("İşlem başarısız.");

        loadDashboardSummary();
        loadNavbarNotifications();
    } catch (error) {
        console.error("Tümünü okundu işaretleme hatası:", error);
    }
}
