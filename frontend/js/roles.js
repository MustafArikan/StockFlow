document.addEventListener("DOMContentLoaded", () => {
    RolesUI.init();
    RolesUI.attachEventListeners();
});

const RolesUI = {
    roles: [],
    allPermissions: {},
    selectedRoleId: null,
    modalInstance: null,

    formatPermissionName: function(sysName) {
        if (!sysName) return "";
        const lowerSysName = sysName.toLowerCase();
        const dictionary = {
            "dashboard.view": "Ana Sayfayı Görüntüleme",
            "product.view": "Ürünleri Görüntüleme",
            "product.add": "Yeni Ürün Ekleme",
            "product.edit": "Ürün Düzenleme",
            "product.delete": "Ürün Silme",
            "category.view": "Kategorileri Görüntüleme",
            "category.add": "Kategori Ekleme",
            "category.edit": "Kategori Düzenleme",
            "category.delete": "Kategori Silme",
            "movement.view": "Stok Hareketlerini Görüntüleme",
            "movement.inbound": "Depoya Mal Girişi",
            "movement.outbound": "Depodan Mal Çıkışı",
            "movement.transfer": "Depolar Arası Transfer",
            "movement.edit": "Stok Hareketini Düzenleme",
            "movement.cancel": "Stok Hareketini İptal Etme",
            "warehouse.view": "Depoları Görüntüleme",
            "warehouse.add": "Depo Ekleme",
            "warehouse.edit": "Depo Düzenleme",
            "warehouse.delete": "Depo Silme",
            "location.view": "Konumları Görüntüleme",
            "location.add": "Konum Ekleme",
            "location.edit": "Konum Düzenleme",
            "location.delete": "Konum Silme",
            "supplier.view": "Tedarikçileri Görüntüleme",
            "supplier.add": "Tedarikçi Ekleme",
            "supplier.edit": "Tedarikçi Düzenleme",
            "supplier.delete": "Tedarikçi Silme",
            "asset.view": "Ekipmanları Görüntüleme",
            "asset.add": "Ekipman Ekleme",
            "asset.edit": "Ekipman Düzenleme",
            "asset.delete": "Ekipman Silme",
            "asset.assign": "Ekipman Atama",
            "scanner.use": "Barkod Okuyucu Kullanma",
            "report.view": "Raporları Görüntüleme",
            "report.export": "Raporları Dışa Aktarma",
            "report.import": "Rapor İçe Aktarma",
            "user.view": "Kullanıcıları Görüntüleme",
            "user.add": "Kullanıcı Ekleme",
            "user.edit": "Kullanıcı Düzenleme",
            "user.delete": "Kullanıcı Silme",
            "user.resetpassword": "Şifre Sıfırlama",
            "role.view": "Rolleri Görüntüleme",
            "role.add": "Rol Ekleme",
            "role.edit": "Rol Düzenleme",
            "role.delete": "Rol Silme",
            "policy.view": "Politikaları Görüntüleme",
            "policy.edit": "Politika Düzenleme",
            "notification.view": "Bildirimleri Görüntüleme",
            "notification.managesettings": "Bildirim Ayarlarını Yönetme",
            "settings.view": "Ayarları Görüntüleme",
            "settings.edit": "Ayarları Düzenleme",
            "system.auditlogs": "Güvenlik Loglarını Görüntüleme"
        };
        
        if (dictionary[lowerSysName]) return dictionary[lowerSysName];

        let parts = sysName.split('.');
        if(parts.length === 2) {
            let action = parts[1].toLowerCase();
            const actionDict = {
                "view": "Görüntüleme",
                "create": "Oluşturma",
                "add": "Ekleme",
                "edit": "Düzenleme",
                "update": "Güncelleme",
                "delete": "Silme",
                "manage": "Yönetim",
                "export": "Dışa Aktarma",
                "import": "İçe Aktarma",
                "print": "Yazdırma",
                "remove": "Çıkarma",
                "inbound": "Mal Girişi",
                "outbound": "Mal Çıkışı",
                "transfer": "Transfer",
                "cancel": "İptal Etme",
                "use": "Kullanma",
                "assign": "Atama",
                "managesettings": "Ayarları Yönetme"
            };
            if(actionDict[action]) {
                return `${parts[0]} ${actionDict[action]}`;
            }
        }
        return sysName.replace(/\./g, ' ');
    },

    init: async function() {
        this.modalInstance = new bootstrap.Modal(document.getElementById('newRoleModal'));
        await this.loadPermissions();
        await this.loadRoles();
    },

    loadPermissions: async function() {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/roles/permissions`, {
                headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
            });
            if (!response.ok) throw new Error("Yetkiler yüklenemedi");
            
            // Backend might return grouped or flat array. Let's assume flat array and group it here.
            const data = await response.json();
            
            if (Array.isArray(data)) {
                this.allPermissions = {};
                if (data.length > 0 && data[0].permissions !== undefined) {
                    data.forEach(group => {
                        this.allPermissions[group.module || "Genel"] = group.permissions;
                    });
                } else {
                    data.forEach(p => {
                        if (!this.allPermissions[p.module]) this.allPermissions[p.module] = [];
                        this.allPermissions[p.module].push(p);
                    });
                }
            } else {
                this.allPermissions = data;
            }
            this.renderPermissionModules();
        } catch (error) {
            hataGoster(error.message);
        }
    },

    loadRoles: async function() {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/roles`, {
                headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
            });
            if (!response.ok) throw new Error("Roller yüklenemedi");
            this.roles = await response.json();
            this.renderRolesList();
            
            if (this.selectedRoleId) {
                this.selectRole(this.selectedRoleId);
            }
        } catch (error) {
            document.getElementById('rolesListContainer').innerHTML = `<div class="p-3 text-danger text-center">Yükleme hatası</div>`;
        }
    },

    renderRolesList: function() {
        const container = document.getElementById('rolesListContainer');
        container.innerHTML = '';

        if (this.roles.length === 0) {
            container.innerHTML = '<div class="p-4 text-center text-muted">Henüz rol bulunmuyor.</div>';
            return;
        }

        const roleOrder = ["superadmin", "admin", "muhasebe", "operator", "depo_sorumlusu", "viewer"];
        
        const sortedRoles = [...this.roles].sort((a, b) => {
            const indexA = roleOrder.indexOf(a.name.toLowerCase());
            const indexB = roleOrder.indexOf(b.name.toLowerCase());
            
            if (indexA === -1 && indexB === -1) return a.name.localeCompare(b.name);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });

        sortedRoles.forEach(role => {
            const isSelected = this.selectedRoleId === role.id ? 'active' : '';
            const systemBadge = role.isSystemRole ? `<span class="badge bg-danger ms-2 fs-065rem">Sistem</span>` : '';
            
            const el = document.createElement('div');
            el.className = `role-item p-3 border-bottom d-flex justify-content-between align-items-center ${isSelected}`;
            el.setAttribute('data-id', role.id);
            el.innerHTML = `
                <div>
                    <h6 class="mb-1 fw-bold">${escapeHTML(role.name)} ${systemBadge}</h6>
                    <small class="text-muted">${escapeHTML(role.description || '')}</small>
                </div>
                <span class="badge bg-light text-dark border">${role.userCount || 0} Kişi</span>
            `;
            container.appendChild(el);
        });
    },

    renderPermissionModules: function() {
        const container = document.getElementById('permissionsContainer');
        container.innerHTML = '';

        const moduleIcons = {
            'Ana Sayfa': 'bi-house-door',
            'Ürünler': 'bi-box-seam',
            'Kategoriler': 'bi-tags',
            'Stok Hareketleri': 'bi-arrow-left-right',
            'Depolar': 'bi-buildings',
            'Konumlar': 'bi-geo-alt',
            'Tedarikçiler': 'bi-truck',
            'Ekipmanlar': 'bi-pc-display',
            'Sistem Araçları': 'bi-upc-scan',
            'Raporlar': 'bi-file-earmark-bar-graph',
            'Kullanıcı Yönetimi': 'bi-people',
            'Yetkilendirme': 'bi-shield-lock',
            'Bildirimler': 'bi-bell',
            'Sistem': 'bi-gear',
            'Güvenlik': 'bi-shield-check'
        };

        const logicalOrder = [
            'Ana Sayfa', 
            'Kategoriler', 
            'Ürünler', 
            'Stok Hareketleri', 
            'Depolar', 
            'Konumlar', 
            'Tedarikçiler', 
            'Ekipmanlar', 
            'Kullanıcı Yönetimi', 
            'Yetkilendirme', 
            'Güvenlik',
            'Sistem Araçları',
            'Raporlar',
            'Bildirimler', 
            'Sistem'
        ];

        const modules = Object.keys(this.allPermissions).sort((a, b) => {
            const indexA = logicalOrder.indexOf(a);
            const indexB = logicalOrder.indexOf(b);
            if (indexA === -1 && indexB === -1) return a.localeCompare(b);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });

        for (const moduleName of modules) {
            const permissions = this.allPermissions[moduleName];
            const moduleSlug = moduleName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            const iconClass = moduleIcons[moduleName] || 'bi-box';
            
            let html = `
                <div class="col-12 col-lg-6">
                    <div class="permission-module-card h-100 d-flex flex-column">
                        <div class="permission-module-header d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                            <h6 class="mb-0 fw-bold text-primary"><i class="bi ${iconClass} me-2 fs-5 align-middle"></i>${escapeHTML(moduleName)}</h6>
                            <div class="form-check form-switch m-0 d-flex align-items-center" title="Bu modüldeki (Örn: ${escapeHTML(moduleName)}) tüm yetkileri tek tuşla verir veya kaldırır.">
                                <label class="form-check-label me-2 small text-muted cursor-pointer" for="selectAll_${moduleSlug}">Tümünü Seç</label>
                                <input class="form-check-input m-0 cursor-pointer" type="checkbox" id="selectAll_${moduleSlug}">
                            </div>
                        </div>
                        <div class="permission-module-body flex-grow-1" id="module_body_${moduleSlug}">
            `;

            permissions.forEach(p => {
                html += `
                    <div class="permission-item">
                        <div class="pe-3">
                            <span class="fw-semibold d-block text-dark">${escapeHTML(this.formatPermissionName(p.name))}</span>
                            <small class="text-muted d-block roles-desc-text mt-1"><span class="badge bg-light text-secondary border me-1 font-monospace fs-065rem">${escapeHTML(p.name)}</span> ${escapeHTML(p.description || '')}</small>
                        </div>
                        <div class="form-check form-switch m-0 flex-shrink-0">
                            <input class="form-check-input perm-cb module-cb-${moduleSlug}" type="checkbox" value="${p.id}" id="perm_${p.id}">
                        </div>
                    </div>
                `;
            });

            html += `
                        </div>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', html);
        }
    },

    toggleModule: function(moduleSlug, isChecked) {
        const checkboxes = document.querySelectorAll(`.module-cb-${moduleSlug}`);
        checkboxes.forEach(cb => {
            if (!cb.disabled) cb.checked = isChecked;
        });
    },

    checkModuleToggle: function(moduleSlug) {
        const checkboxes = document.querySelectorAll(`.module-cb-${moduleSlug}`);
        const selectAllToggle = document.getElementById(`selectAll_${moduleSlug}`);
        if (!selectAllToggle) return;
        
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        selectAllToggle.checked = allChecked;
    },

    selectRole: function(roleId) {
        this.selectedRoleId = roleId;
        this.renderRolesList(); // To highlight active

        const role = this.roles.find(r => r.id === roleId);
        if (!role) return;

        const emptyCard = document.getElementById('emptySelectionCard');
        document.getElementById('emptySelectionCard').classList.add('d-none');
        document.getElementById('roleDetailsCard').classList.remove('d-none');
        document.getElementById('roleDetailsCard').classList.add('d-flex');

        document.getElementById('selectedRoleNameDisplay').textContent = role.name;
        document.getElementById('roleName').value = role.name;
        document.getElementById('roleId').value = role.id;
        document.getElementById('selectedRoleUserCount').textContent = `${role.userCount || 0} Kullanıcı`;
        document.getElementById('roleDescription').value = role.description || '';

        const sysBadge = document.getElementById('selectedRoleSystemBadge');
        const delBtn = document.getElementById('btnDeleteRole');
        const nameInput = document.getElementById('roleName');
        
        if (role.isSystemRole) {
            sysBadge.classList.remove('d-none');
            delBtn.disabled = true;
            delBtn.title = "Sistem rolleri silinemez";
            nameInput.disabled = true;
            nameInput.title = "Sistem rollerinin adı değiştirilemez";
        } else {
            sysBadge.classList.add('d-none');
            delBtn.disabled = false;
            delBtn.title = "";
            nameInput.disabled = false;
            nameInput.title = "";
        }

        // Reset all checkboxes
        document.querySelectorAll('.perm-cb').forEach(cb => {
            cb.checked = false;
        });
        document.querySelectorAll('input[id^="selectAll_"]').forEach(cb => {
            cb.checked = false;
        });

        // Check assigned permissions
        if (role.permissionIds) {
            role.permissionIds.forEach(permissionId => {
                const cb = document.getElementById(`perm_${permissionId}`);
                if (cb) cb.checked = true;
            });
        }

        // Trigger module toggle checks
        for (const moduleName of Object.keys(this.allPermissions)) {
            const moduleSlug = moduleName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            this.checkModuleToggle(moduleSlug);
        }
    },

    showNewRoleModal: function() {
        document.getElementById('newRoleForm').reset();
        this.modalInstance.show();
    },

    createNewRole: async function() {
        const name = document.getElementById('newRoleName').value.trim();
        const desc = document.getElementById('newRoleDesc').value.trim();
        
        if (!name) return;

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/roles`, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ name: name, description: desc, permissionIds: [] })
            });

            if (!response.ok) throw new Error("Rol oluşturulamadı");
            const newRole = await response.json();
            
            this.modalInstance.hide();
            basariToast("Yeni rol oluşturuldu. Şimdi yetkilerini ayarlayabilirsiniz.");

            await this.loadRoles();
            this.selectRole(newRole.id);

        } catch (error) {
            hataGoster(error.message);
        }
    },

    saveRole: async function() {
        const id = document.getElementById('roleId').value;
        const name = document.getElementById('roleName').value.trim();
        const desc = document.getElementById('roleDescription').value.trim();
        const role = this.roles.find(r => r.id == id);
        
        if (!id || !role || !name) return;

        const confirmed = await onayla(`"${name}" rolünün bilgilerini ve yetkilerini güncellemek üzeresiniz.`, "Evet, Güncelle");
        if (!confirmed) return;

        // Get selected permissions
        const permissionIds = [];
        document.querySelectorAll('.perm-cb:checked').forEach(cb => {
            permissionIds.push(parseInt(cb.value));
        });

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/roles/${id}`, {
                method: 'PUT',
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ name: name, description: desc, permissionIds: permissionIds })
            });

            if (!response.ok) throw new Error("Rol yetkileri güncellenemedi");
            
            basariToast("Rol ve yetkileri kaydedildi.");

            await this.loadRoles();

        } catch (error) {
            hataGoster(error.message);
        }
    },

    deleteSelectedRole: async function() {
        const id = document.getElementById('roleId').value;
        const role = this.roles.find(r => r.id == id);
        
        if (!id || !role) return;
        
        if (role.isSystemRole) {
            uyariGoster("Sistem rolleri silinemez.");
            return;
        }

        if (role.userCount > 0) {
            uyariGoster(`Bu rol şu anda ${role.userCount} kullanıcıya atanmış durumda. Lütfen önce bu kullanıcıların rollerini değiştirin!`);
            return;
        }

        const confirmed = await onayla(`"${role.name}" rolünü kalıcı olarak silmek üzeresiniz.`, "Evet, Sil!");
        if (confirmed) {
            try {
                const response = await fetch(`${CONFIG.API_BASE_URL}/roles/${id}`, {
                    method: 'DELETE',
                    headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.message || "Silme işlemi başarısız");
                }

                basariToast("Rol başarıyla silindi.");
                
                this.selectedRoleId = null;
                const emptyCard = document.getElementById('emptySelectionCard');
                const detailsCard = document.getElementById('roleDetailsCard');
                
                emptyCard.classList.remove('d-none');
                emptyCard.classList.add('d-flex');
                
                detailsCard.classList.remove('d-flex');
                detailsCard.classList.add('d-none');
                
                await this.loadRoles();
            } catch (error) {
                hataGoster(error.message);
            }
        }
    },

    attachEventListeners: function() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('#btnYeniRol')) {
                this.showNewRoleModal();
            } else if (e.target.closest('#btnDeleteRole')) {
                this.deleteSelectedRole();
            } else if (e.target.closest('#btnSavePermissions')) {
                this.saveRole();
            } else {
                const roleItem = e.target.closest('.role-item');
                if (roleItem) {
                    const roleId = roleItem.getAttribute('data-id');
                    if (roleId) this.selectRole(parseInt(roleId));
                }
            }
        });

        document.addEventListener('change', (e) => {
            if (e.target.matches('input[id^="selectAll_"]')) {
                const slug = e.target.id.replace('selectAll_', '');
                this.toggleModule(slug, e.target.checked);
            } else if (e.target.matches('.perm-cb')) {
                const classes = Array.from(e.target.classList);
                const moduleClass = classes.find(c => c.startsWith('module-cb-'));
                if (moduleClass) {
                    const slug = moduleClass.replace('module-cb-', '');
                    this.checkModuleToggle(slug);
                }
            }
        });

        document.addEventListener('submit', (e) => {
            if (e.target.id === 'newRoleForm') {
                e.preventDefault();
                this.createNewRole();
            }
        });
    }
};





