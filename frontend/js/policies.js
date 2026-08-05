document.addEventListener("DOMContentLoaded", () => {
    PoliciesUI.init();
    PoliciesUI.attachEventListeners();
});

const PoliciesUI = {
    policies: [],
    allPermissions: {},
    selectedPolicyId: null,

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
            "asset.view": "Demirbaşları Görüntüleme",
            "asset.add": "Demirbaş Ekleme",
            "asset.edit": "Demirbaş Düzenleme",
            "asset.delete": "Demirbaş Silme",
            "asset.assign": "Demirbaş Zimmetleme",
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
        await this.loadPermissions();
        await this.loadPolicies();
    },

    loadPermissions: async function() {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/roles/permissions`, {
                headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
            });
            if (!response.ok) throw new Error("Yetkiler yüklenemedi");
            
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

    loadPolicies: async function() {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/authorizationpolicies`, {
                headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
            });
            if (!response.ok) throw new Error("Politikalar yüklenemedi");
            this.policies = await response.json();
            this.renderPoliciesList();
            
            if (this.selectedPolicyId) {
                this.selectPolicy(this.selectedPolicyId);
            }
        } catch (error) {
            document.getElementById('policiesListContainer').innerHTML = `<div class="p-3 text-danger text-center">Yükleme hatası</div>`;
        }
    },

    renderPoliciesList: function() {
        const container = document.getElementById('policiesListContainer');
        container.innerHTML = '';

        if (this.policies.length === 0) {
            container.innerHTML = '<div class="p-4 text-center text-muted">Henüz politika bulunmuyor.</div>';
            return;
        }

        this.policies.forEach(policy => {
            const isSelected = this.selectedPolicyId === policy.id ? 'active' : '';
            
            const el = document.createElement('div');
            el.className = `role-item p-3 border-bottom d-flex justify-content-between align-items-center ${isSelected}`;
            el.setAttribute('data-id', policy.id);
            el.innerHTML = `
                <div>
                    <h6 class="mb-1 fw-bold">${escapeHTML(policy.key)}</h6>
                    <small class="text-muted d-block">${escapeHTML(policy.description || '')}</small>
                    <small class="badge bg-light text-dark border mt-1">Limit: ${policy.permitLimit} / ${policy.windowSeconds}sn</small>
                </div>
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
            'Demirbaşlar': 'bi-pc-display',
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
            'Demirbaşlar', 
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
                            <div class="form-check form-switch m-0 d-flex align-items-center">
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

    selectPolicy: function(policyId) {
        this.selectedPolicyId = policyId;
        this.renderPoliciesList(); // To highlight active

        const policy = this.policies.find(p => p.id === policyId);
        if (!policy) return;

        document.getElementById('emptySelectionCard').classList.add('d-none');
        document.getElementById('policyDetailsCard').classList.remove('d-none');
        document.getElementById('policyDetailsCard').classList.add('d-flex');

        document.getElementById('selectedPolicyKeyDisplay').textContent = policy.key;
        document.getElementById('policyKey').value = policy.key;
        document.getElementById('policyId').value = policy.id;
        document.getElementById('policyDescription').value = policy.description || '';
        document.getElementById('policyPermitLimit').value = policy.permitLimit;
        document.getElementById('policyWindowSeconds').value = policy.windowSeconds;

        // Reset all checkboxes
        document.querySelectorAll('.perm-cb').forEach(cb => {
            cb.checked = false;
        });
        document.querySelectorAll('input[id^="selectAll_"]').forEach(cb => {
            cb.checked = false;
        });

        // Check assigned permissions
        if (policy.permissionIds) {
            policy.permissionIds.forEach(permissionId => {
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

    savePolicy: async function() {
        const id = document.getElementById('policyId').value;
        const desc = document.getElementById('policyDescription').value.trim();
        const limit = parseInt(document.getElementById('policyPermitLimit').value);
        const window = parseInt(document.getElementById('policyWindowSeconds').value);
        
        if (!id) return;

        if (isNaN(limit) || limit <= 0 || isNaN(window) || window <= 0) {
            uyariGoster("Lütfen geçerli bir limit ve zaman penceresi girin (Sıfırdan büyük olmalı).");
            return;
        }

        const confirmed = await onayla(`Politikayı güncellemek üzeresiniz. Rate limit değişiklikleri uygulamanın yeniden başlatılmasını gerektirir.`, "Evet, Güncelle");
        if (!confirmed) return;

        // Get selected permissions
        const permissionIds = [];
        document.querySelectorAll('.perm-cb:checked').forEach(cb => {
            permissionIds.push(parseInt(cb.value));
        });

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/authorizationpolicies/${id}`, {
                method: 'PUT',
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ 
                    description: desc, 
                    permitLimit: limit,
                    windowSeconds: window,
                    permissionIds: permissionIds 
                })
            });

            if (!response.ok) throw new Error("Politika güncellenemedi");
            
            basariToast("Politika kaydedildi. Limit değişiklikleri backend yeniden başlatıldığında aktif olacaktır.");

            await this.loadPolicies();

        } catch (error) {
            hataGoster(error.message);
        }
    },

    attachEventListeners: function() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('#btnSavePolicy')) {
                e.preventDefault();
                this.savePolicy();
            } else {
                const roleItem = e.target.closest('.role-item');
                if (roleItem) {
                    const policyId = roleItem.getAttribute('data-id');
                    if (policyId) this.selectPolicy(parseInt(policyId));
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
    }
};


