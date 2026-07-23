// const CONFIG = {
//     API_BASE_URL: 'http://localhost:5000/api', // 5136'yı 5000 yaptık!
// }

// --- Akıllı Port Tespiti (Auto-Discovery) ---
let activePort = localStorage.getItem('API_PORT_OVERRIDE');

if (!activePort) {
    // Eğer override yoksa 5000 portuna istek at
    try {
        const xhr = new XMLHttpRequest();
        // senkron istek
        xhr.open('OPTIONS', 'http://localhost:5000/api/auth/login', false);
        xhr.send(null);
        // Hata yoksa 5000 portu ayaktadır ve cevap veriyordur
        activePort = '5000';
    } catch (error) {
        // 5000 portuna ulaşılamazsa
        activePort = '5136';
    }
}

const CONFIG = {
    API_BASE_URL: `http://localhost:${activePort}/api`
};

// Merkezi Yetki Denetim Sistemi (RBAC)
function getUserRole() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return "viewer";
        const payloadBase64 = token.split('.')[1];
        const payloadDecoded = JSON.parse(atob(payloadBase64));

        return payloadDecoded["role"] || 
               payloadDecoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || 
               "viewer";
    } catch (e) {
        return "viewer";
    }
}

const PERMISSIONS = {
    "admin": [
        "Product.Add", "Product.Edit", "Product.Delete",
        "Category.Add", "Category.Edit", "Category.Delete",
        "Warehouse.Add", "Warehouse.Edit", "Warehouse.Delete",
        "Location.Add", "Location.Delete",
        "Supplier.Add", "Supplier.Edit", "Supplier.Delete"
    ],
    "operator": [
        "Product.Edit", "Category.Edit", "Warehouse.Edit"
    ],
    "viewer": []
};

function hasPermission(action) {
    const role = getUserRole();
    return PERMISSIONS[role] && PERMISSIONS[role].includes(action);
}

// Merkezi Şifre Göster/Gizle İşlemi (Event Delegation / CSP Uyumlu)
document.addEventListener('click', function(e) {
    const btn = e.target.closest('.toggle-password');
    if (btn) {
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (!input) return;
        
        const icon = btn.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            if(icon) {
                icon.classList.remove('bi-eye-slash');
                icon.classList.add('bi-eye');
            }
        } else {
            input.type = 'password';
            if(icon) {
                icon.classList.remove('bi-eye');
                icon.classList.add('bi-eye-slash');
            }
        }
    }
});
