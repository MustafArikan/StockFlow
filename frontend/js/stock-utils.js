// frontend/js/stock-utils.js

function parseQuantityInput(value) {
    if (value === null || value === undefined || value === '') return 0;
    let strVal = value.toString().replace(',', '.');
    let parsed = parseFloat(strVal);
    return isNaN(parsed) ? 0 : parsed;
}

function formatQuantity(value, maxDecimals = 3) {
    if (value === null || value === undefined) return '0';
    let parsed = parseFloat(value);
    if (isNaN(parsed)) return '0';

    if (Number.isInteger(parsed)) {
        return parsed.toString();
    }

    let strVal = parsed.toFixed(maxDecimals);
    strVal = strVal.replace(/0+$/, '');
    strVal = strVal.replace(/\.$/, '');

    return strVal;
}

const StockUtils = {
    _resetDropdown: function(id, text, disabled) {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = `<option value="" selected disabled>${text}</option>`;
            el.disabled = disabled;
        }
    },
    loadAllWarehouses: async function(dropdownId) {
        this._resetDropdown(dropdownId, "Yükleniyor...", true);
        try {
            const data = await apiRequest("/warehouses?pageSize=1000", "GET");
            const arr = data.items || data;
            const el = document.getElementById(dropdownId);
            if (el) {
                el.innerHTML = '<option value="" selected disabled>Seçiniz...</option>';
                arr.forEach(w => {
                    const opt = document.createElement("option");
                    opt.value = w.id || w.Id;
                    opt.textContent = w.name || w.Name;
                    el.appendChild(opt);
                });
                el.disabled = false;
            }
        } catch (e) {
            this._resetDropdown(dropdownId, "Hata oluştu!", true);
        }
    },
    loadSmartWarehousesForProduct: async function(productId, warehouseDropdownId, locationDropdownId) {
        this._resetDropdown(warehouseDropdownId, "Yükleniyor...", true);
        this._resetDropdown(locationDropdownId, "Önce depo seçiniz...", true);
        try {
            const data = await apiRequest("/warehouses?pageSize=1000", "GET");
            const arr = data.items || data;
            const el = document.getElementById(warehouseDropdownId);
            if (el) {
                el.innerHTML = '<option value="" selected disabled>Seçiniz...</option>';
                arr.forEach(w => {
                    const opt = document.createElement("option");
                    opt.value = w.id || w.Id;
                    opt.textContent = w.name || w.Name;
                    el.appendChild(opt);
                });
                el.disabled = false;
            }
        } catch (e) {
            this._resetDropdown(warehouseDropdownId, "Hata oluştu!", true);
        }
    },
    fillAllLocationsForWarehouse: async function(warehouseId, dropdownId) {
        this._resetDropdown(dropdownId, "Yükleniyor...", true);
        try {
            const data = await apiRequest(`/locations/by-warehouse/${warehouseId}?pageSize=1000`, "GET");
            const locations = data.items || data;
            const el = document.getElementById(dropdownId);
            if (el) {
                el.innerHTML = '<option value="" selected disabled>Seçiniz...</option>';
                locations.forEach(loc => {
                    const opt = document.createElement("option");
                    opt.value = loc.id || loc.Id;
                    const baseText = loc.name || loc.Name || loc.code || loc.Code;
                    opt.textContent = (loc.isEmpty || loc.IsEmpty) ? `${baseText} (Boş)` : baseText;
                    el.appendChild(opt);
                });
                el.disabled = false;
            }
        } catch (e) {
            this._resetDropdown(dropdownId, "Hata oluştu!", true);
        }
    },
    fillSmartLocationsForWarehouse: async function(warehouseId, dropdownId) {
        await this.fillAllLocationsForWarehouse(warehouseId, dropdownId);
    },
    loadAllLocations: async function(warehouseId, dropdownId) {
        await this.fillAllLocationsForWarehouse(warehouseId, dropdownId);
    }
};