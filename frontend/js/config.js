// const CONFIG = {
//     API_BASE_URL: 'http://localhost:5000/api', // 5136'yı 5000 yaptık!
// }

const CONFIG = {
    // Eğer tarayıcı konsoluna manuel bir port override girildiyse onu kullan,
    // Yoksa ön yüz portuna göre otomatik eşleştirme yap (3000 -> 5000, 5500 -> 5136)
    API_BASE_URL: localStorage.getItem('API_PORT_OVERRIDE') 
        ? `http://localhost:${localStorage.getItem('API_PORT_OVERRIDE')}/api`
        : (window.location.port === '3000' ? 'http://localhost:5000/api' : 'http://localhost:5136/api')
};
