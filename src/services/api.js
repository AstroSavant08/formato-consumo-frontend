/**
 * Cliente HTTP base para la API REST del backend Laravel.
 * La URL se configura mediante VITE_API_BASE_URL (ej: http://localhost:8000/api/v1).
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

function getAuthToken() {
    return localStorage.getItem('auth_token');
}

export function setAuthToken(token) {
    if (token) {
        localStorage.setItem('auth_token', token);
    } else {
        localStorage.removeItem('auth_token');
    }
}

/**
 * Petición genérica a la API.
 * @param {string} endpoint - Ruta relativa, ej: '/productos'
 * @param {RequestInit} options - Opciones fetch
 */
export async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const token = getAuthToken();

    const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (response.status === 204) {
        return null;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        const message = data?.message || `Error HTTP ${response.status}`;
        const error = new Error(message);
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}

export const api = {
    get: (endpoint) => apiRequest(endpoint),
    post: (endpoint, body) => apiRequest(endpoint, { method: 'POST', body: JSON.stringify(body) }),
    put: (endpoint, body) => apiRequest(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
    patch: (endpoint, body) => apiRequest(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (endpoint) => apiRequest(endpoint, { method: 'DELETE' }),
};

export { API_BASE_URL };
