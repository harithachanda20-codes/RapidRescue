import axios from 'axios';

const api = axios.create({
    baseURL: (
        import.meta.env.VITE_API_BASE_URL ||
        'http://localhost:8080'
    ).replace(/\/+$/, '') + '/api'
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('rr_token');

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

export default api;