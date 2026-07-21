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
 * Calcula rango de fechas para filtro por mes (año actual).
 * @param {string|number} monthIndex - 0-11 o cadena vacía
 * @param {number} [year]
 * @returns {{ desde?: string, hasta?: string }}
 */
export function monthToDateRange(monthIndex, year = new Date().getFullYear()) {
    if (monthIndex === '' || monthIndex === null || monthIndex === undefined) {
        return {};
    }

    const month = Number(monthIndex);
    const monthStr = String(month + 1).padStart(2, '0');
    const lastDay = new Date(year, month + 1, 0).getDate();

    return {
        desde: `${year}-${monthStr}-01`,
        hasta: `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`,
    };
}

/**
 * @param {object} [params]
 * @param {number} [params.page]
 * @param {string} [params.desde]
 * @param {string} [params.hasta]
 * @param {string} [params.fuente]
 * @returns {Promise<{ data: object[], meta: object }>}
 */
export async function fetchEntregas(params = {}) {
    const query = new URLSearchParams();

    if (params.page) query.set('page', String(params.page));
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
