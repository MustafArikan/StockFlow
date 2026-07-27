const API_URL = `${CONFIG.API_BASE_URL}/audit-logs`;
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = 'login.html';
    throw new Error("Oturum bulunamadı, yönlendiriliyor...");
}

let logsData = [];
let currentPage = 1;
let pageSize = 50;

async function loglariYukle(page = 1) {
    currentPage = page;
    try {
        const responseData = await apiRequest(`/audit-logs?pageNumber=${page}&pageSize=${pageSize}`, 'GET');
        logsData = responseData.items || responseData; // Geriye dönük uyumluluk
        tabloyuCiz(logsData);
        sayfalamaCiz(responseData.totalRecords || 0, responseData.currentPage || 1);
    } catch (e) {
        console.error(e);
    }
}

function tabloyuCiz(veriler) {
    const govde = document.getElementById("logTablosuGövdesi");
    govde.innerHTML = "";
    if (veriler.length === 0) {
        govde.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4"><i class="bi bi-inbox fs-4 d-block mb-2"></i>Kayıt bulunamadı.</td></tr>`;
        return;
    }

    const mHtml = veriler.map((l, index) => {
        const trh = new Date(l.timestamp).toLocaleString("tr-TR");
        let islemTipi = `<span class="badge bg-secondary">${escapeHtml(l.actionType)}</span>`;
        if (l.actionType === "Added") islemTipi = `<span class="badge bg-success">Eklendi</span>`;
        else if (l.actionType === "Deleted") islemTipi = `<span class="badge bg-danger">Silindi</span>`;
        else if (l.actionType === "Modified") islemTipi = `<span class="badge bg-warning text-dark">Düzenlendi</span>`;

        let ipKismi = l.ipAddress ? `<br><small class="text-muted"><i class="bi bi-globe me-1"></i>${escapeHtml(l.ipAddress)}</small>` : '';
        let kisiKismi = l.userId 
            ? `<a href="#" data-action="view-profile" data-user-id="${l.userId}" class="text-decoration-none fw-bold text-primary"><i class="bi bi-person-badge me-1"></i>${escapeHtml(l.userName || 'Sistem')}</a>` 
            : `<span class="text-muted"><i class="bi bi-robot me-1"></i>Sistem</span>`;

        return `<tr>
            <td><small class="text-muted">${trh}</small></td>
            <td>${kisiKismi}${ipKismi}</td>
            <td>${islemTipi}</td>
            <td>
               <span class="fw-bold">${escapeHtml(l.entityName)}</span>
               <br><small class="text-muted">ID: ${escapeHtml(l.entityId ? l.entityId.toString() : '-')}</small>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary shadow-sm" data-action="view-detail" data-log-index="${index}">
                    <i class="bi bi-search me-1"></i> İncele
                </button>
            </td>
        </tr>`;
    }).join("");
    govde.innerHTML = mHtml;
}

function sayfalamaCiz(totalRecords, current) {
    buildPagination(
        "paginationContainer", 
        totalRecords, 
        current, 
        pageSize, 
        (newPage) => {
            loglariYukle(newPage);
        },
        (newSize) => {
            pageSize = newSize;
            loglariYukle(1);
        }
    );
}

async function kullaniciProfiliGoster(userId) {
    try {
        const user = await apiRequest(`/users/${userId}`, 'GET');
        
        document.getElementById('upmName').textContent = `${user.firstName || ''} ${user.lastName || ''}`;
        document.getElementById('upmEmail').textContent = (user.email || '') + (user.phoneNumber ? ' | 📞 ' + user.phoneNumber : '');
        document.getElementById('upmRole').textContent = user.role || 'viewer';
        document.getElementById('upmDate').textContent = new Date(user.createdAt).toLocaleDateString("tr-TR");
        
        const emailStatusSpan = document.getElementById('upmEmailStatus');
        if (user.isEmailConfirmed) {
            emailStatusSpan.innerHTML = '<span class="badge bg-success rounded-pill"><i class="bi bi-check-lg"></i> Onaylı</span>';
        } else {
            emailStatusSpan.innerHTML = '<span class="badge bg-danger rounded-pill">Onaysız</span>';
        }
        
        bootstrap.Modal.getOrCreateInstance(document.getElementById('userProfileModal')).show();
    } catch (hata) {
        hataGoster("Profil yüklenirken bir hata oluştu: " + hata.message)
    }
}

function detayGoster(log) {
    let kisiText = log.userName ? `${escapeHtml(log.userName)} (ID: ${log.userId})` : "Sistem";
    let ipText = log.ipAddress ? escapeHtml(log.ipAddress) : "Bilinmiyor";

    let html = `<div class="row mb-3">
                    <div class="col-md-6">
                        <strong>İşlemi Yapan:</strong> ${kisiText} <br>
                        <strong>IP Adresi:</strong> ${ipText}
                    </div>
                    <div class="col-md-6 text-md-end">
                        <strong>Kayıt Tipi:</strong> ${escapeHtml(log.entityName)} <br>
                        <strong>İşlem Tipi:</strong> <span class="badge bg-secondary">${escapeHtml(log.actionType)}</span>
                    </div>
                </div><hr>`;

    let oldData = {};
    let newData = {};

    if(log.oldValues) {
        try { oldData = JSON.parse(log.oldValues); } catch(e) {}
    }
    if(log.newValues) {
        try { newData = JSON.parse(log.newValues); } catch(e) {}
    }

    if (log.actionType === "Modified") {
        html += `<h5>Değişiklikler:</h5><ul class="list-group list-group-flush mb-3">`;
        const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
        let changesCount = 0;
        
        allKeys.forEach(key => {
            const oldVal = oldData[key];
            const newVal = newData[key];
            
            if (oldVal !== newVal && (oldVal !== undefined || newVal !== undefined)) {
                changesCount++;
                html += `<li class="list-group-item px-0">
                            <strong>${escapeHtml(key)}:</strong> 
                            <span class="text-danger text-decoration-line-through">${escapeHtml(oldVal !== null ? oldVal : 'null')}</span> 
                            <i class="bi bi-arrow-right mx-2 text-muted"></i> 
                            <span class="text-success fw-bold">${escapeHtml(newVal !== null ? newVal : 'null')}</span>
                         </li>`;
            }
        });
        
        if (changesCount === 0) {
            html += `<li class="list-group-item px-0 text-muted">Kayıt güncellendi ancak takip edilen alanlarda bir değişiklik tespit edilmedi.</li>`;
        }
        html += `</ul>`;
    } else if (log.actionType === "Added") {
        html += `<h5>Eklenen Veri:</h5><div class="bg-light p-3 rounded mt-2 border"><table class="table table-sm table-borderless mb-0"><tbody>`;
        Object.keys(newData).forEach(key => {
            html += `<tr><td class="fw-bold w-150px">${escapeHtml(key)}</td><td>${escapeHtml(newData[key] !== null ? newData[key] : 'null')}</td></tr>`;
        });
        html += `</tbody></table></div>`;
    } else if (log.actionType === "Deleted") {
        html += `<h5>Silinen Veri (Eski Durum):</h5><div class="bg-light p-3 rounded mt-2 border"><table class="table table-sm table-borderless mb-0"><tbody>`;
        Object.keys(oldData).forEach(key => {
            html += `<tr><td class="fw-bold w-150px">${escapeHtml(key)}</td><td class="text-danger">${escapeHtml(oldData[key] !== null ? oldData[key] : 'null')}</td></tr>`;
        });
        html += `</tbody></table></div>`;
    }

    document.getElementById('logDetailBody').innerHTML = html;
    bootstrap.Modal.getOrCreateInstance(document.getElementById('logDetailModal')).show();
}

document.addEventListener('DOMContentLoaded', () => {
    loglariYukle();

    // Event Delegation for strictly CSP-compliant DOM interaction
    const govde = document.getElementById("logTablosuGövdesi");
    if (govde) {
        govde.addEventListener('click', (e) => {
            const detailBtn = e.target.closest('[data-action="view-detail"]');
            if (detailBtn) {
                const index = parseInt(detailBtn.getAttribute('data-log-index'), 10);
                if (!isNaN(index) && logsData[index]) {
                    detayGoster(logsData[index]);
                }
                return;
            }

            const profileLink = e.target.closest('[data-action="view-profile"]');
            if (profileLink) {
                e.preventDefault();
                const userId = profileLink.getAttribute('data-user-id');
                if (userId) {
                    kullaniciProfiliGoster(userId);
                }
            }
        });
    }

    // Pagination Click Listener is handled by buildPagination
});


