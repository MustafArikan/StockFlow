// const CONFIG = {
//     API_BASE_URL: 'http://localhost:5000/api', // 5136'yı 5000 yaptık!
// }

const CONFIG = {
    // window.location.hostname kodu, siteye o an hangi adresten giriliyorsa onu otomatik yakalar.
    API_BASE_URL: `http://${window.location.hostname}:5000/api`
}