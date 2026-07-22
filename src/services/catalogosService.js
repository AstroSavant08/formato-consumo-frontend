import { api } from './api';

/**
 * @returns {Promise<Array<{id: number, codigo: string, nombre: string}>>}
 */
export async function fetchAreas() {
    const response = await api.get('/areas');
    return response.data ?? [];
}

/**
 * @param {object} [params]
 * @param {number} [params.page]
 * @returns {Promise<{ data: object[], meta: object }>}
 */
async function fetchProductosPage(params = {}) {
    const query = new URLSearchParams({ historico: 'false' });
    if (params.page) {
        query.set('page', String(params.page));
    }

    const response = await api.get(`/productos?${query.toString()}`);

    return {
        data: response.data ?? [],
        meta: response.meta ?? { current_page: 1, last_page: 1, total: 0 },
    };
}

/**
 * @returns {Promise<Array<{id: number, nombre: string, unidad_default: string|null, stock_minimo_referencia: number|null}>>}
 */
export async function fetchProductos() {
    const firstPage = await fetchProductosPage({ page: 1 });
    const allProductos = [...firstPage.data];

    for (let page = 2; page <= firstPage.meta.last_page; page++) {
        const result = await fetchProductosPage({ page });
        allProductos.push(...result.data);
    }

    return allProductos;
}

/**
 * @param {object} producto
 * @returns {number}
 */
export function stockMinimoToDebido(producto) {
    const value = Number(producto?.stock_minimo_referencia);
    return Number.isFinite(value) ? value : 0;
}

/**
 * @param {object} producto
 * @returns {object}
 */
export function mapProductoToConsumoRow(producto) {
    return {
        id: producto.id,
        nombre: producto.nombre || '',
        stockDebido: stockMinimoToDebido(producto),
        cantidades: Array(12).fill(0),
        existencias: Array(12).fill(0),
        dineroSolicitar: Array(12).fill(''),
    };
}

/**
 * @param {object} producto
 * @returns {object}
 */
export function mapProductoToPedidoRow(producto) {
    return {
        id: producto.id,
        nombre: producto.nombre || '',
        stockDebido: stockMinimoToDebido(producto),
        cantidades: Array(12).fill(0),
        dineroSolicitado: '',
    };
}

/**
 * @param {object[]} productos
 * @returns {object[]}
 */
export function buildConsumoRowsFromProductos(productos) {
    return productos.map(mapProductoToConsumoRow);
}

/**
 * @param {object[]} productos
 * @returns {object[]}
 */
export function buildPedidoRowsFromProductos(productos) {
    return productos.map(mapProductoToPedidoRow);
}
