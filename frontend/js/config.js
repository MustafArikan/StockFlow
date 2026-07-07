// const CONFIG = {
//     API_BASE_URL: 'http://localhost:5000/api', // 5136'yı 5000 yaptık!
// }

// --- Akıllı Port Tespiti (Auto-Discovery) ---
let activePort = localStorage.getItem('API_PORT_OVERRIDE');

if (!activePort) {
    // Eğer override yoksa 5000 portuna (Docker) ufak bir gizli istek atıp ayakta mı diye bakarız.
    try {
        const xhr = new XMLHttpRequest();
        // Asenkron olmayan (senkron) istek atıyoruz ki diğer JS kodları çalışmadan port belli olsun
        xhr.open('OPTIONS', 'http://localhost:5000/api/auth/login', false);
        xhr.send(null);
        // Hata fırlatmadıysa 5000 portu ayaktadır ve cevap veriyordur
        activePort = '5000';
    } catch (error) {
        // Eğer 5000 portuna ulaşılamazsa (Connection Refused vs.), 5136 (Visual Studio) kullan
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
        "Location.Add", "Location.Delete"
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
