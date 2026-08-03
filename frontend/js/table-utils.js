// table-utils.js
window.TableUtils = {
    sortData: function(data, key, asc = true) {
        return data.sort((a, b) => {
            if(a[key] < b[key]) return asc ? -1 : 1;
            if(a[key] > b[key]) return asc ? 1 : -1;
            return 0;
        });
    },
    renderEmptyRow: function(colspan, message = "Kayıt bulunamadı.") {
        return `<tr><td colspan="${colspan}" class="text-center text-muted py-4">${window.escapeHtml(message)}</td></tr>`;
    }
};
