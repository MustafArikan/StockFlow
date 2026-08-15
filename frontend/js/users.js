let userRoleName = "";
let userPermissionsList = [];

function hasPerm(p) {
    return userRoleName === "superadmin" || (userPermissionsList && userPermissionsList.has(p));
}

document.addEventListener("DOMContentLoaded", async () => {
    // Sadece superadmin erişebilir, değilse anasayfaya yönlendir
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "login.html";
        return;
    }
    try {   
        const ctx = await loadAuthContext();
        userRoleName = ctx.role;
        userPermissionsList = ctx.permissions;

        const canManageUsers = ctx.isSuperAdmin || 
            ctx.permissions.has("User.View") || 
            ctx.permissions.has("User.Add") || 
            ctx.permissions.has("User.Edit") || 
            ctx.permissions.has("User.Delete");

        if (!canManageUsers) {
            Swal.fire({
                icon: 'error',
                title: 'Yetkisiz Erişim',
                text: 'Kullanıcı yönetimi sayfasına erişim yetkiniz bulunmamaktadır.'
            }).then(() => {
                window.location.href = "index.html";
            });
            return;
        }

        if (hasPerm("User.Add")) {
            const btnYeni = document.getElementById("btnYeniKullanici");
            if (btnYeni) btnYeni.classList.remove("d-none");
        }
    } catch (e) {
        console.error("Yetki yüklenemedi", e);
    }

    rolleriGetir();
    kullanicilariGetir();

    document.getElementById("kullaniciFormu").addEventListener("submit", kullaniciKaydet);

    const btnYeni = document.getElementById("btnYeniKullanici");
    if (btnYeni) btnYeni.addEventListener("click", kullaniciModalSifirla);

    document.addEventListener("click", (e) => {
        const btnDuzenle = e.target.closest(".btn-duzenle");
        if (btnDuzenle) {
            kullaniciDuzenle(btnDuzenle.getAttribute("data-id"));
            return;
        }

        const btnSil = e.target.closest(".btn-sil");
        if (btnSil) {
            kullaniciSil(btnSil.getAttribute("data-id"));
            return;
        }

        const btnLog = e.target.closest(".btn-loglar");
        if (btnLog) {
            {
                const uid = btnLog.getAttribute("data-id");
                const uad = btnLog.getAttribute("data-ad");
                // İşlem geçmişi ayrı PENCEREDE açılır; liste açık kalır.
                if (!(window.ModalWindow &&
                      ModalWindow.open("kullaniciGecmisModal", { id: uid, ad: uad }, "İşlem Geçmişi"))) {
                    kullaniciGecmisiniGoster(uid, uad);
                }
            }
            return;
        }
    });
});

let sistemRolleri = [];

const userView = createDataView({
    containerId: "kullaniciTablosuGovdesi",
    paginationContainerId: "kullanicilarPaginationContainer",
    mode: 'table',
    emptyColspan: 6,
    emptyMessage: "Hiç kullanıcı bulunamadı.",
    pageSize: 10,
    fetchPage: async (page, size) => {
        try {
            const response = await apiRequest(`/users?pageNumber=${page}&pageSize=${size}`, 'GET');
            return {
                items: response.items || response || [],
                totalItems: response.totalRecords || (response.items ? response.items.length : (response.length || 0))
            };
        } catch (error) {
            Swal.fire('Hata', error.message || 'Kullanıcılar yüklenemedi.', 'error');
            return { items: [], totalItems: 0 };
        }
    },
    renderRow: (user) => {
        const kayitTarihi = new Date(user.createdAt).toLocaleString("tr-TR");
        let actionsHtml = "";
        
        if (hasPerm("SecurityAuditLog.View")) {
            actionsHtml += `<button class="btn btn-sm btn-info text-white shadow-sm me-1 btn-loglar" data-id="${user.id}" data-ad="${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}">
                <i class="bi bi-clock-history"></i> Loglar
            </button>`;
        }
        
        if (hasPerm("User.Edit")) {
            actionsHtml += `<button class="btn btn-sm btn-outline-primary shadow-sm me-1 btn-duzenle" data-id="${user.id}">
                <i class="bi bi-pencil-square"></i> Düzenle
            </button>`;
        }
        
        if (hasPerm("User.Delete")) {
            actionsHtml += `<button class="btn btn-sm btn-outline-danger shadow-sm btn-sil" data-id="${user.id}">
                <i class="bi bi-trash3"></i> Sil
            </button>`;
        }

        return `
            <tr>
                <td>
                    ${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}
                    ${user.identityNumber ? `<br><small class="text-muted"><i class="bi bi-person-badge"></i> ${escapeHtml(user.identityNumber)}</small>` : ''}
                </td>
                <td>${escapeHtml(user.email)}</td>
                <td>${escapeHtml(user.phoneNumber || "-")}</td>
                <td><span class="badge bg-secondary px-2 py-1">${escapeHtml(user.role)}</span></td>
                <td>${kayitTarihi}</td>
                <td class="text-end">
                    ${actionsHtml}
                </td>
            </tr>
        `;
    }
});

async function kullanicilariGetir() {
    userView.load(1);
}

async function rolleriGetir() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/roles`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });
        if (response.ok) {
            sistemRolleri = await response.json();
            const selectEl = document.getElementById("role");
            if (selectEl) {
                selectEl.innerHTML = '<option value="">Seçiniz...</option>';
                sistemRolleri.forEach(r => {
                    selectEl.innerHTML += `<option value="${r.id}">${escapeHtml(r.name)}</option>`;
                });
            }
        }
    } catch (e) {
        console.error("Roller getirilemedi", e);
    }
}

async function degistirKullaniciRolu(userId, newRoleId) {
    if(!newRoleId) return;
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/users/${userId}/role`, {
            method: 'PUT',
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({ roleId: parseInt(newRoleId) })
        });
        
        const text = await response.text();
        let data = {};
        if (text) try { data = JSON.parse(text); } catch(e){}
        
        if (!response.ok) throw new Error(data.message || "Rol değiştirilemedi.");
        
        Swal.fire({
            title: "Başarılı!",
            text: "Kullanıcı rolü anında değiştirildi.",
            icon: "success",
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
    } catch(err) {
        Swal.fire('Hata', err.message, 'error');
        kullanicilariGetir(); // Revert back the select
    }
}

function kullaniciModalSifirla() {
    document.getElementById("kullaniciFormu").reset();
    document.getElementById("kullaniciId").value = "";
    document.getElementById("modalBaslik").innerHTML = `<i class="bi bi-person-plus me-2 text-primary"></i> Yeni Kullanıcı`;
    document.getElementById("password").required = true;
    document.getElementById("passwordLabel").innerHTML = `Şifre <span class="text-danger">*</span>`;
    document.getElementById("passwordHelp").classList.add("d-none");
}

async function kullaniciDuzenle(id) {
    kullaniciModalSifirla();
    
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/users/${id}`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });
        
        const text = await response.text();
        if (!text) throw new Error("Sunucu boş yanıt döndürdü.");
        const user = JSON.parse(text);

        document.getElementById("kullaniciId").value = user.id;
        document.getElementById("firstName").value = user.firstName;
        document.getElementById("lastName").value = user.lastName;
        document.getElementById("email").value = user.email;
        document.getElementById("identityNumber").value = user.identityNumber || "";
        document.getElementById("phoneNumber").value = user.phoneNumber || "";
        document.getElementById("role").value = user.roleId || "";

        document.getElementById("modalBaslik").innerHTML = `<i class="bi bi-pencil-square me-2 text-primary"></i> Kullanıcı Düzenle`;
        
        // Düzenlerken şifre zorunlu değil
        document.getElementById("password").required = false;
        document.getElementById("passwordLabel").innerHTML = `Yeni Şifre`;
        document.getElementById("passwordHelp").classList.remove("d-none");

        const modal = new bootstrap.Modal(document.getElementById('kullaniciModal'));
        modal.show();
    } catch (error) {
        Swal.fire('Hata', 'Kullanıcı bilgileri alınamadı.', 'error');
    }
}

async function kullaniciKaydet(e) {
    e.preventDefault();

    const id = document.getElementById("kullaniciId").value;
    const isUpdate = !!id;

    const dto = {
        firstName: document.getElementById("firstName").value,
        lastName: document.getElementById("lastName").value,
        email: document.getElementById("email").value,
        identityNumber: document.getElementById("identityNumber").value.trim(),
        phoneNumber: document.getElementById("phoneNumber").value.trim(),
        roleId: parseInt(document.getElementById("role").value)
    };

    if (dto.identityNumber && !window.isValidTC(dto.identityNumber)) {
        return Swal.fire('Hata', 'Girdiğiniz TC Kimlik Numarası geçersiz!', 'error');
    }

    if (dto.phoneNumber && !window.isValidPhone(dto.phoneNumber)) {
        return Swal.fire('Hata', 'Geçerli bir telefon numarası giriniz! (Örn: 0555 555 55 55)', 'error');
    }

    const pwd = document.getElementById("password").value;

    if (!isUpdate && !pwd) {
        return Swal.fire('Hata', 'Yeni kullanıcı için şifre zorunludur.', 'error');
    }

    // Backend (CreateUserDto/UpdateUserDto) ile AYNI kural: en az 8 karakter, büyük/küçük harf, rakam, özel karakter.
    if (pwd && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$/.test(pwd)) {
        return Swal.fire('Hata', 'Şifre en az 8 karakter olmalı; en az bir büyük harf, bir küçük harf, bir rakam ve bir özel karakter içermelidir.', 'error');
    }

    if (pwd) dto.password = pwd;

    const url = isUpdate ? `${CONFIG.API_BASE_URL}/users/${id}` : `${CONFIG.API_BASE_URL}/users`;
    const method = isUpdate ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify(dto)
        });

        const text = await response.text();
        let data = {};
        if (text) {
            try { data = JSON.parse(text); } catch (e) { console.error("JSON Hatası:", text); }
        }
        
        if (!response.ok) {
            // Validasyon hatası gelirse (örn: ASP.NET 400 Bad Request nesnesi)
            let errorMsg = data.message || `İşlem başarısız (HTTP ${response.status}).`;
            if (data.errors) {
                const keys = Object.keys(data.errors);
                if (keys.length > 0) errorMsg = data.errors[keys[0]][0];
            }
            throw new Error(errorMsg);
        }

        Swal.fire('Başarılı', data.message, 'success');

        // Form penceresinde: liste pencerelerine haber ver ve kapan.
        if (window.ModalWindow && ModalWindow.isFormWindow) {
            ModalWindow.done('users');
            return;
        }

        const modal = bootstrap.Modal.getInstance(document.getElementById('kullaniciModal'));
        if(modal) modal.hide();

        kullanicilariGetir();
    } catch (error) {
        Swal.fire('Hata', error.message, 'error');
    }
}

async function kullaniciSil(id) {
    const result = await Swal.fire({
        title: 'Emin misiniz?',
        text: "Bu kullanıcıyı silmek istediğinize emin misiniz?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Evet, sil!',
        cancelButtonText: 'İptal'
    });

    if (result.isConfirmed) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/users/${id}`, {
                method: 'DELETE',
                headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
            });
            
            const text = await response.text();
            let data = {};
            if (text) {
                try { data = JSON.parse(text); } catch (e) {}
            }
            
            if (!response.ok) throw new Error(data.message || "Silme başarısız.");
            
            Swal.fire('Silindi!', data.message || 'Başarıyla silindi.', 'success');
            kullanicilariGetir();
        } catch (error) {
            Swal.fire('Hata', error.message, 'error');
        }
    }
}

async function kullaniciGecmisiniGoster(id, adSoyad) {
    document.getElementById("gecmisKullaniciAdSoyad").innerText = adSoyad;
    document.getElementById("gecmisTabloGovdesi").innerHTML = `<tr><td colspan="6" class="text-center">Loglar yükleniyor...</td></tr>`;
    
    // Pencerede içerik zaten sayfaya monte edilmiş durumda.
    if (!(window.ModalWindow && ModalWindow.isFormWindow)) {
        new bootstrap.Modal(document.getElementById('kullaniciGecmisModal')).show();
    }

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/audit-logs/user/${id}`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });
        
        if (response.status === 404) {
            document.getElementById("gecmisTabloGovdesi").innerHTML = `<tr><td colspan="6" class="text-center text-muted">Bu kullanıcıya ait herhangi bir işlem kaydı bulunamadı.</td></tr>`;
            return;
        }

        const text = await response.text();
        if (!text) {
            document.getElementById("gecmisTabloGovdesi").innerHTML = `<tr><td colspan="6" class="text-center text-muted">Bu kullanıcıya ait herhangi bir işlem kaydı bulunamadı.</td></tr>`;
            return;
        }

        const data = JSON.parse(text);
        const logs = data.items || [];
        
        const tbody = document.getElementById("gecmisTabloGovdesi");
        tbody.innerHTML = "";

        if (logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Bu kullanıcıya ait herhangi bir işlem kaydı bulunamadı.</td></tr>`;
            return;
        }

        logs.forEach(log => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="small">${new Date(log.timestamp).toLocaleString("tr-TR")}</td>
                <td class="fw-bold text-primary">${escapeHtml(log.actionType)}</td>
                <td>${escapeHtml(log.entityName)} <span class="badge bg-secondary">#${log.entityId}</span></td>
                <td class="small text-muted">${escapeHtml(log.ipAddress)}</td>
                <td class="small text-break mw-200">${log.oldValues ? escapeHtml(log.oldValues) : "-"}</td>
                <td class="small text-break mw-200">${log.newValues ? escapeHtml(log.newValues) : "-"}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        document.getElementById("gecmisTabloGovdesi").innerHTML = `<tr><td colspan="6" class="text-center text-danger">Loglar yüklenirken hata oluştu: ${escapeHtml(error.message)}</td></tr>`;
    }
}

// XSS Koruması için basit HTML Escape fonksiyonu



// PENCEREYE TAŞINAN MODALLAR (kural: js/modal-window.js başındaki açıklama)
//   kullaniciModal       → 6 alanlı ekle/düzenle formu          → pencere
//   kullaniciGecmisModal → işlem geçmişi listesi, kaydırmalı    → pencere
//
// NOT: kullaniciDuzenle() kaydı zaten sunucudan çekiyor (diğer sayfalardaki
// "bellekteki listeden ara" sorunu burada yok), bu yüzden edit geri çağrısı
// doğrudan onu çağırıyor.

if (window.ModalWindow) {
    ModalWindow.register({
        kullaniciModal: 'Kullanıcı Formu',
        kullaniciGecmisModal: 'İşlem Geçmişi'
    });

    // İşlem geçmişi penceresi: kullanıcı bağlamı adresten gelir.
    ModalWindow.formBoot({
        modal: 'kullaniciGecmisModal',
        edit: (id, p) => kullaniciGecmisiniGoster(id, p.ad || '')
    });

    ModalWindow.formBoot({
        modal: 'kullaniciModal',
        edit: (id) => kullaniciDuzenle(parseInt(id)),
        create: () => kullaniciModalSifirla()
    });

    ModalWindow.onChanged('users', () => {
        if (typeof kullanicilariGetir === 'function') kullanicilariGetir();
    });
}
