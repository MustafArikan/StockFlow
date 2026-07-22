// const CONFIG = {
//     API_BASE_URL: 'http://localhost:5000/api', // 5136'yÄ± 5000 yaptÄ±k!
// }

// --- AkÄ±llÄ± Port Tespiti (Auto-Discovery) ---
let activePort = localStorage.getItem('API_PORT_OVERRIDE');

if (!activePort) {
    // EÄŸer override yoksa 5000 portuna istek at
    try {
        const xhr = new XMLHttpRequest();
        // senkron istek
        xhr.open('GET', 'http://localhost:5000/api/health', false);
        xhr.send(null);
        // Hata yoksa 5000 portu ayaktadÄ±r ve cevap veriyordur
        activePort = '5000';
    } catch (error) {
        // 5000 portuna ulaÅŸÄ±lamazsa
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
    if (role === "superadmin") return true; // Süper admin her şeye yetkilidir
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

// Modal Girişinde Enter Tuşu ile Kaydetme (Event Delegation / Tüm Sayfalarda Ortak)
// Form etiketiyle sarılı olsun ya da olmasın, bir modal içindeki metin kutusunda
// Enter'a basılınca o modalın birincil (kaydet/oluştur) butonunu tetikler.
document.addEventListener('keydown', function(e) {
    if (e.key !== 'Enter') return;

    const aktifEleman = document.activeElement;
    if (!aktifEleman || aktifEleman.tagName !== 'INPUT') return;

    const gecersizTipler = ['button', 'submit', 'checkbox', 'radio', 'file'];
    if (gecersizTipler.includes(aktifEleman.type)) return;

    const modal = aktifEleman.closest('.modal');
    if (!modal) return;

    e.preventDefault(); // Form varsa sayfanÄ±n yenilenmesini engelle

    const kaydetButonu = modal.querySelector('.btn-primary:not(.btn-close), .btn-success:not(.btn-close)');
    if (kaydetButonu && !kaydetButonu.disabled) {
        kaydetButonu.click();
    }
});

async function apiRequest(endpoint, method = 'GET', bodyData = null) {
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const options = {
        method: method,
        headers: headers,
    };
    if (bodyData) {
        if (bodyData instanceof FormData) {
            // FormData kullanÄ±ldÄ±ÄŸÄ±nda Content-Type'Ä± tarayÄ±cÄ± otomatik belirlemelidir (boundary vb. ekler)
            options.body = bodyData;
        } else {
            headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(bodyData);
        }
    }
    const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint  }`, options);
    if (response.status === 401) {
        // Token geÃ§ersiz veya sÃ¼resi dolmuÅŸ, kullanÄ±cÄ±yÄ± Ã§Ä±kÄ±ÅŸ yapmaya zorla
        localStorage.removeItem('token');
        window.location.href = '/login.html';
        throw new Error('Oturum sÃ¼resi doldu veya yetkisiz eriÅŸim. LÃ¼tfen tekrar giriÅŸ yapÄ±n.');
    }
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
        const errorMessage = data?.message || 'Sunucu ile iletiÅŸimde bir hata oluÅŸtu.';
        throw new Error(errorMessage);
    }
    return data;
}

function buildPagination(containerId, totalItems, currentPage, pageSize, onPageChange, onPageSizeChange) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (totalItems === 0) {
        container.innerHTML = "";
        return;
    }

    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    let startItem = (currentPage - 1) * pageSize + 1;
    let endItem = Math.min(currentPage * pageSize, totalItems);

    let html = `
    <div class="d-flex justify-content-between align-items-center mt-3">
        <div class="text-muted small">
            ${startItem}-${endItem} / ${totalItems} kayıt
        </div>
        <nav>
            <ul class="pagination pagination-sm mb-0 shadow-sm justify-content-center">`;
    
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link page-action" href="#" data-page="${currentPage - 1}">« Önceki</a></li>`;

    for (let i = 1; i <= totalPages; i++) {
        if (totalPages > 7) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                html += `<li class="page-item ${currentPage === i ? 'active' : ''}"><a class="page-link page-action" href="#" data-page="${i}">${i}</a></li>`;
            } else if (i === 2 || i === totalPages - 1) {
                html += `<li class="page-item disabled"><span class="page-link text-muted">...</span></li>`;
            }
        } else {
            html += `<li class="page-item ${currentPage === i ? 'active' : ''}"><a class="page-link page-action" href="#" data-page="${i}">${i}</a></li>`;
        }
    }

    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link page-action" href="#" data-page="${currentPage + 1}">Sonraki »</a></li>`;
    html += `   </ul>
        </nav>
        <div>
            <select class="form-select form-select-sm shadow-sm page-size-action" style="width: auto;">
                <option value="10" ${pageSize === 10 ? 'selected' : ''}>10 Satır</option>
                <option value="25" ${pageSize === 25 ? 'selected' : ''}>25 Satır</option>
                <option value="50" ${pageSize === 50 ? 'selected' : ''}>50 Satır</option>
                <option value="100" ${pageSize === 100 ? 'selected' : ''}>100 Satır</option>
            </select>
        </div>
    </div>`;

    container.innerHTML = html;

    const navEl = container.querySelector('nav');
    if (navEl) {
        navEl.addEventListener('click', (e) => {
            e.preventDefault();
            const btn = e.target.closest(".page-action");
            if (btn) {
                const parentLi = btn.closest(".page-item");
                if (parentLi && (parentLi.classList.contains("disabled") || parentLi.classList.contains("active"))) return;

                const page = parseInt(btn.getAttribute("data-page"));
                if (!isNaN(page)) {
                    onPageChange(page);
                }
            }
        });
    }

    const selectEl = container.querySelector('.page-size-action');
    if (selectEl) {
        selectEl.addEventListener('change', (e) => {
            onPageSizeChange(parseInt(e.target.value));
        });
    }
}
