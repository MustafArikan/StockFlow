const API_URL = `${CONFIG.API_BASE_URL}/notifications`;
const token = localStorage.getItem("token");

// 1. SECURITY CONTROL: Redirect to login if token is missing
if (!token) {
    window.location.href = "login.html";
}

let filterOnlyUnread = false;

// 2. DECODE JWT TO READ USER ROLE
function getUserRole() {
    try {
        const payloadBase64 = token.split('.')[1];
        const payloadDecoded = JSON.parse(atob(payloadBase64));
        // Retrieve role value from common ASP.NET Core claims schemas or standard keys
        return payloadDecoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || payloadDecoded["role"] || payloadDecoded["Role"] || "user";
    } catch (e) {
        return "user"; // Fallback to lowest privilege on error
    }
}

const userRole = getUserRole();

// XSS Protection Helper
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// 3. FETCH NOTIFICATIONS FROM API
async function loadNotifications() {
    try {
        const url = filterOnlyUnread ? `${API_URL}?onlyUnread=true` : API_URL;

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json"
            }
        });

        if (response.status === 401) {
            localStorage.removeItem("token");
            window.location.href = "login.html";
            return;
        }

        if (!response.ok) throw new Error("Bildirimler yüklenemedi.");

        const notifications = await response.json();
        renderNotifications(notifications);
    } catch (error) {
        document.getElementById("notificationList").innerHTML = 
            `<div class="alert alert-danger">Hata: ${error.message}</div>`;
    }
}

// 4. RENDERING NOTIFICATIONS (High-Performance DOM Management)
function renderNotifications(notificationsList) {
    const listContainer = document.getElementById("notificationList");
    
    if (notificationsList.length === 0) {
        listContainer.innerHTML = `<div class="text-center py-4 text-muted">Kayıtlı bildirim bulunamadı.</div>`;
        return;
    }

    listContainer.innerHTML = "";

    notificationsList.forEach(notification => {
        let borderClass = "alert-border-warning";
        let iconClass = "bi-exclamation-triangle-fill text-warning fs-4";
        
        if (notification.severity === "CRITICAL") {
            borderClass = "alert-border-critical"; 
            iconClass = "bi-exclamation-circle-fill fs-4 text-orange-custom";
        } else if (notification.severity === "DANGER" || notification.severity === "EMPTY_STOCK") {
            borderClass = "alert-border-danger";
            iconClass = "bi-shield-fill-x text-danger fs-4";
        } else if (notification.severity === "INFO") {
            borderClass = "alert-border-secondary";
            iconClass = "bi-info-circle-fill text-secondary fs-4";
        }

        const opacityClass = notification.isRead ? "opacity-50" : "";
        const isDanger = notification.severity === "DANGER";
        const isAdmin = userRole === "admin";
        
        const card = document.createElement("div");
        card.className = `card border-0 shadow-sm rounded-3 p-3 notification-card ${borderClass} ${opacityClass}`;
        
        let buttonHtml = `<button class="btn btn-sm btn-outline-success rounded-pill px-3 fw-bold btn-read" data-id="${notification.id}" ${notification.isRead || (isDanger && !isAdmin) ? 'disabled' : ''}>`;
        if (notification.isRead) {
            buttonHtml += `Okundu</button>`;
        } else if (isDanger && !isAdmin) {
            buttonHtml += `<i class="bi bi-lock-fill"></i> Kilitli (Sadece Admin)</button>`;
        } else {
            buttonHtml += `<i class="bi bi-check2"></i> Okundu İşaretle</button>`;
        }
        
        card.innerHTML = `
            <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div class="d-flex align-items-center gap-3">
                    <i class="bi ${iconClass}"></i>
                    <div>
                        <p class="mb-0 fw-semibold text-dark safe-message-container"></p>
                        <small class="text-muted">${new Date(notification.createdAt).toLocaleString("tr-TR")}</small>
                    </div>
                </div>
                <div>
                    ${buttonHtml}
                </div>
            </div>
        `;
        
        // GÜVENLİ: Tarayıcı otomatik escape yapar
        card.querySelector('.safe-message-container').textContent = notification.message;
        
        listContainer.appendChild(card);
    });
}

// Olay Delege Etme (Event Delegation) - Satır içi onclick kaldırıldı
document.getElementById("notificationList").addEventListener("click", (e) => {
    const btnRead = e.target.closest(".btn-read");
    if (btnRead && !btnRead.disabled) {
        const id = parseInt(btnRead.getAttribute("data-id"));
        markNotificationAsRead(id);
    }
});

// 5. MARK SINGLE NOTIFICATION AS READ
async function markNotificationAsRead(id) {
    try {
        const response = await fetch(`${API_URL}/${id}/read`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            alert(errorData.message || "İşlem başarısız.");
            return;
        }

        loadNotifications();
    } catch (error) {
        alert("Bağlantı hatası: " + error.message);
    }
}

// 6. MARK ALL AS READ (Bulk update)
async function markAllNotificationsAsRead() {
    try {
        const response = await fetch(`${API_URL}/read-all`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error("İşlem başarısız.");
        
        loadNotifications();
    } catch (error) {
        alert("Hata: " + error.message);
    }
}

// 7. EVENT LISTENERS
document.getElementById("btnMarkAllAsRead").addEventListener("click", markAllNotificationsAsRead);

document.getElementById("btnFilterAll").addEventListener("click", () => {
    filterOnlyUnread = false;
    document.getElementById("btnFilterAll").className = "btn btn-dark btn-sm rounded-pill px-3";
    document.getElementById("btnFilterUnread").className = "btn btn-outline-secondary btn-sm rounded-pill px-3";
    loadNotifications();
});

document.getElementById("btnFilterUnread").addEventListener("click", () => {
    filterOnlyUnread = true;
    document.getElementById("btnFilterAll").className = "btn btn-outline-secondary btn-sm rounded-pill px-3";
    document.getElementById("btnFilterUnread").className = "btn btn-dark btn-sm rounded-pill px-3";
    loadNotifications();
});

// Logout handler
function logout() {
    localStorage.removeItem("token");
    window.location.href = "login.html";
}

// Attach navbar logout listener
const btnNavbarLogout = document.getElementById("btnNavbarLogout");
if (btnNavbarLogout) {
    btnNavbarLogout.addEventListener("click", logout);
}

// Initial load
loadNotifications();


