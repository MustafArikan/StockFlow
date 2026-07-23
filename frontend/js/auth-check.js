(function() {
    var token = localStorage.getItem('token');
    if (!token) {
        window.location.replace('login.html');
        return;
    }
    try {
        var payload = JSON.parse(atob(token.split('.')[1]));
        // Eğer token'ın süresi dolmuşsa (exp saniye cinsindendir)
        if (payload.exp && (payload.exp * 1000 < Date.now())) {
            localStorage.removeItem('token');
            window.location.replace('login.html');
        }
    } catch (e) {
        localStorage.removeItem('token');
        window.location.replace('login.html');
    }
})();
