// ==========================================
// ORTAK STOK MOTORU (WMS UTILITIES)
// Bu modül; stok miktarlarını çeker, sıfır stoklu rafları gizler 
// ve hem Stok Hareketleri hem de Ekipman sayfalarında ortak kullanılır.
// ==========================================

const StockUtils = {
    currentAvailableStockMap: [],

    // YARDIMCI METOT 
    _resetDropdown(elementId, defaultText, isDisabled = false) {
        const el = document.getElementById(elementId);
        if (el) {
            el.length = 0; // Dropdown listesini saniyesinde tamamen temizler
            if (defaultText) {
                el.add(new Option(defaultText, "")); // Varsayılan boş seçeneği ekler
            }
            el.disabled = isDisabled;
        }
        return el;
    },

    // 1. ÇIKIŞ İŞLEMLERİ İÇİN (Sadece stoku > 0 olan depoları getirir)
    async loadSmartWarehousesForProduct(productId, whDropdownId, locDropdownId) {
        const whSelect = document.getElementById(whDropdownId);
        if (!whSelect) return;

        this._resetDropdown(whDropdownId, 'Yükleniyor...', true);
        this._resetDropdown(locDropdownId, 'Önce depo seçin...', true);

        if (!productId) {
            this._resetDropdown(whDropdownId, 'Önce ürün seçiniz...', true);
            return;
        }

        try {
            const response = await apiRequest(`/stock-levels/product/${productId}`, 'GET');
            this.currentAvailableStockMap = response.items || response || [];

            // Stok adedi 0'dan büyük olanları filtreler
            const availableStock = this.currentAvailableStockMap.filter(s => s.quantity > 0);

            if (availableStock.length === 0) {
                this._resetDropdown(whDropdownId, 'Bu üründen stokta kalmamış!', true);
                return;
            }

            // Depoları gruplar ve stokları toplar
            const warehouseMap = new Map();
            availableStock.forEach(item => {
                if (!warehouseMap.has(item.warehouseId)) {
                    warehouseMap.set(item.warehouseId, { id: item.warehouseId, name: item.warehouseName, totalStock: 0 });
                }
                warehouseMap.get(item.warehouseId).totalStock += item.quantity;
            });

            this._resetDropdown(whDropdownId, '-- Çıkış Yapılacak Depoyu Seçiniz --', false);
            
            // innerHTML yerine new Option() ile güvenli nesne ataması
            warehouseMap.forEach(wh => {
                whSelect.add(new Option(`${wh.name} (Mevcut: ${wh.totalStock} Adet)`, wh.id));
            });

        } catch (e) {
            console.error("Akıllı stok yükleme hatası:", e);
            this._resetDropdown(whDropdownId, 'Stok bilgisi alınamadı!', true);
        }
    },

    // 2. ÇIKIŞ İŞLEMLERİ İÇİN (Seçili depoda stoku > 0 olan rafları getirir)
    fillSmartLocationsForWarehouse(warehouseId, locDropdownId) {
        const locSelect = document.getElementById(locDropdownId);
        if (!locSelect) return;

        if (!warehouseId) {
            this._resetDropdown(locDropdownId, 'Önce depo seçin...', true);
            return;
        }

        const availableLocations = this.currentAvailableStockMap.filter(s => s.warehouseId === parseInt(warehouseId, 10) && s.quantity > 0);

        this._resetDropdown(locDropdownId, '-- Düşülecek Rafı Seçiniz --', false);
        
        availableLocations.forEach(loc => {
            locSelect.add(new Option(`${loc.locationCode} (Mevcut: ${loc.quantity} Adet)`, loc.locationId));
        });
    },

    // 3. STOK GİRİŞİ / STOĞA GERİ EKLEME İŞLEMLERİ İÇİN (Tüm Depoları Getirir - Sıfır Kontrolü Yok)
    async loadAllWarehouses(targetDropdownId) {
        const targetSelect = document.getElementById(targetDropdownId);
        if (!targetSelect) return;

        try {
            const data = await apiRequest('/warehouses?pageSize=1000', 'GET');
            const warehouses = data.items || data;

            if (warehouses && warehouses.length > 0) {
                this._resetDropdown(targetDropdownId, '-- Hedef Depo Seçiniz --', false);
                warehouses.forEach(w => {
                    targetSelect.add(new Option(w.name, w.id));
                });
            } else {
                this._resetDropdown(targetDropdownId, 'Depo Bulunamadı', true);
            }
        } catch (e) {
            console.error("Depolar yüklenirken hata:", e);
            this._resetDropdown(targetDropdownId, 'Hata!', true);
        }
    },

    // 4. STOK GİRİŞİ / STOĞA GERİ EKLEME İŞLEMLERİ İÇİN (Seçili deponun tüm raflarını getirir)
    async loadAllLocations(warehouseId, targetDropdownId) {
        const select = document.getElementById(targetDropdownId);
        if (!select) return;

        if (!warehouseId) {
            this._resetDropdown(targetDropdownId, 'Önce depo seçin...', true);
            return;
        }

        this._resetDropdown(targetDropdownId, 'Yükleniyor...', false);

        try {
            const data = await apiRequest(`/locations/by-warehouse/${warehouseId}?pageSize=1000`, 'GET');
            const locations = data.items || data;

            if (locations && locations.length > 0) {
                this._resetDropdown(targetDropdownId, '-- Hedef Raf Seçiniz --', false);
                locations.forEach(l => {
                    select.add(new Option(l.code, l.id));
                });
            } else {
                this._resetDropdown(targetDropdownId, 'Bu depoda raf yok!', true);
            }
        } catch (e) {
            this._resetDropdown(targetDropdownId, 'Hata oluştu!', true);
        }
    }
};