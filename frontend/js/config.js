// const CONFIG = {
//     API_BASE_URL: 'http://localhost:5000/api', // 5136'yı 5000 yaptık!
// }

const CONFIG = {
    // Eğer tarayıcı konsoluna manuel bir port override girildiyse onu kullan,
    // Yoksa ön yüz portuna göre otomatik eşleştirme yap (3000 -> 5000, 5500 -> 5136)
    API_BASE_URL: localStorage.getItem('API_PORT_OVERRIDE') 
        ? `http://localhost:${localStorage.getItem('API_PORT_OVERRIDE')}/api`
        : (window.location.port === '3000' ? 'http://localhost:5000/api' : 'http://localhost:5136/api')
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
