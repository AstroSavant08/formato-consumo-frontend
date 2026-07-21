import { api } from './api';

/**
 * Convierte una entrega de la API al modelo de fila del frontend.
 * @param {object} entrega
 * @returns {object}
 */
export function apiEntregaToRow(entrega) {
    return {
        fecha: entrega.fecha || '',
        producto: entrega.producto?.nombre || '',
        productoId: entrega.producto?.id ?? '',
        cantidad: entrega.cantidad ?? '',
        unidad: entrega.unidad || 'UND',
        areaUso: entrega.area?.nombre || '',
        areaId: entrega.area?.id ?? '',
        entregadoPor: entrega.entregado_por || '',
        quienRetira: '',
        quienRecibe: entrega.quien_recibe || '',
        fuente: entrega.fuente || '',
        apiId: entrega.id,
        saved: true,
        saving: false,
        saveError: null,
        isDraft: false,
    };
}

/**
 * @param {object} row
 * @returns {object}
 */
export function rowToPayload(row) {
    return {
        fecha: row.fecha,
        producto_id: Number(row.productoId),
        area_id: Number(row.areaId),
        cantidad: Number(row.cantidad),
        unidad: String(row.unidad || '').trim(),
        quien_recibe: String(row.quienRecibe || '').trim(),
        entregado_por: String(row.entregadoPor || '').trim(),
    };
}

/**
 * @param {object} row
 * @returns {string|null}
 */
export function validateRow(row) {
    if (!row.fecha) return 'La fecha es obligatoria.';
    if (!row.productoId) return 'Seleccione un producto.';
    if (!row.areaId) return 'Seleccione un área de uso.';
    if (row.cantidad === '' || row.cantidad === null || Number(row.cantidad) <= 0) {
        return 'La cantidad debe ser mayor que 0.';
    }
    if (!String(row.unidad || '').trim()) return 'La unidad es obligatoria.';
    if (!String(row.entregadoPor || '').trim()) return 'Indique quién entrega.';
    if (!String(row.quienRecibe || '').trim()) return 'Indique quién recibe.';
    return null;
}

/**
 * Parámetro de API para filtro por mes calendario (0-11), sin restringir el año.
 * Permite consultar entregas históricas (2022-2024) al filtrar por mes.
 * @param {string|number} monthIndex - 0-11 o cadena vacía
 * @returns {{ mes?: number }}
 */
export function monthToApiParam(monthIndex) {
    if (monthIndex === '' || monthIndex === null || monthIndex === undefined) {
        return {};
    }

    return { mes: Number(monthIndex) };
}

/**
 * Parámetro de API para filtro por nombre de producto (búsqueda parcial).
 * @param {string} producto
 * @returns {{ producto?: string }}
 */
export function productToApiParam(producto) {
    const trimmed = String(producto || '').trim();
    if (!trimmed) {
        return {};
    }

    return { producto: trimmed };
}

/**
 * @param {object} [params]
 * @param {number} [params.page]
 * @param {number} [params.mes] - Índice de mes 0-11 (filtra por mes sin restringir año)
 * @param {string} [params.producto] - Búsqueda parcial por nombre de producto
 * @param {number} [params.producto_id]
 * @param {string} [params.desde]
 * @param {string} [params.hasta]
 * @param {string} [params.fuente]
 * @returns {Promise<{ data: object[], meta: object }>}
 */
export async function fetchEntregas(params = {}) {
    const query = new URLSearchParams();

    if (params.page) query.set('page', String(params.page));
    if (params.mes !== undefined && params.mes !== null && params.mes !== '') {
        query.set('mes', String(params.mes));
    }
    if (params.producto) {
        query.set('producto', String(params.producto).trim());
    }
    if (params.producto_id) {
        query.set('producto_id', String(params.producto_id));
    }
    if (params.desde) query.set('desde', params.desde);
    if (params.hasta) query.set('hasta', params.hasta);
    if (params.fuente) query.set('fuente', params.fuente);

    const qs = query.toString();
    const response = await api.get(`/entregas${qs ? `?${qs}` : ''}`);

    return {
        data: (response.data ?? []).map(apiEntregaToRow),
        meta: response.meta ?? { current_page: 1, last_page: 1, total: 0 },
    };
}

/**
 * @param {object} row
 * @returns {Promise<object>}
 */
export async function createEntrega(row) {
    const validationError = validateRow(row);
    if (validationError) {
        const error = new Error(validationError);
        error.status = 422;
        throw error;
    }

    const response = await api.post('/entregas', rowToPayload(row));
    return response.data;
}
