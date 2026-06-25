// Centralized Javascript application and API service helper for IT Envanter Takip

const API_BASE_URL = 'http://localhost:5000/api';

// Authentication storage
const auth = {
    getToken() {
        return localStorage.getItem('token');
    },
    setToken(token) {
        localStorage.setItem('token', token);
    },
    logout() {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    },
    isAuthenticated() {
        return !!this.getToken();
    }
};

// Fetch wrapper with auth header
async function apiRequest(endpoint, options = {}) {
    const token = auth.getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const config = {
        ...options,
        headers
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        
        if (response.status === 401 || response.status === 403) {
            auth.logout();
            throw new Error('Oturum süresi doldu veya yetkisiz işlem!');
        }
        
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.hata || 'Bir hata oluştu!');
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}
