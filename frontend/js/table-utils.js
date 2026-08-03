// table-utils.js
window.TableUtils = {
    sortData: function(data, key, asc = true) {
        return data.sort((a, b) => {
            let valA = a[key];
            let valB = b[key];
            
            if (valA === null || valA === undefined) valA = '';
            if (valB === null || valB === undefined) valB = '';

            if (typeof valA === 'string' && typeof valB === 'string') {
                return asc ? valA.localeCompare(valB, 'tr', { sensitivity: 'base' }) : valB.localeCompare(valA, 'tr', { sensitivity: 'base' });
            }
            if (typeof valA === 'number' && typeof valB === 'number') {
                return asc ? valA - valB : valB - valA;
            }
            
            if(valA < valB) return asc ? -1 : 1;
            if(valA > valB) return asc ? 1 : -1;
            return 0;
        });
    },
    renderEmptyRow: function(colspan, message = "Kayıt bulunamadı.") {
        return `<tr><td colspan="${colspan}" class="text-center text-muted py-4">${window.escapeHtml(message)}</td></tr>`;
    }
};
