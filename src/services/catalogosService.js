import { api } from './api';

/**
 * @returns {Promise<Array<{id: number, codigo: string, nombre: string}>>}
 */
export async function fetchAreas() {
    const response = await api.get('/areas');
    return response.data ?? [];
}

/**
 * @returns {Promise<Array<{id: number, nombre: string, unidad_default: string|null}>>}
 */
export async function fetchProductos() {
    const response = await api.get('/productos?historico=false');
    return response.data ?? [];
}
