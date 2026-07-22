import { api } from './api';
import { buildConsumoRowsFromProductos } from './catalogosService';

export class ConsumoAnioValidationError extends Error {
    constructor(messages) {
        super(Array.isArray(messages) ? messages.join(' ') : messages);
        this.name = 'ConsumoAnioValidationError';
        this.messages = Array.isArray(messages) ? messages : [messages];
    }
}

/**
 * @param {unknown} value
 * @returns {{ ok: true, value: number|null } | { ok: false, error: string }}
 */
export function normalizeDineroSolicitar(value, contextLabel = '') {
    if (value == null) {
        return { ok: true, value: null };
    }

    const trimmed = String(value).trim();
    if (trimmed === '') {
        return { ok: true, value: null };
    }

    let cleaned = trimmed.replace(/[^\d.,-]/g, '');

    if (cleaned === '' || cleaned === '-') {
        const suffix = contextLabel ? ` (${contextLabel})` : '';
        return { ok: false, error: `Valor de dinero inválido${suffix}: "${trimmed}"` };
    }

    if (cleaned.includes(',') && cleaned.includes('.')) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (cleaned.includes(',')) {
        const parts = cleaned.split(',');
        cleaned = parts.length > 1 && parts[parts.length - 1].length <= 2
            ? `${parts.slice(0, -1).join('')}.${parts[parts.length - 1]}`
            : parts.join('');
    } else if (cleaned.includes('.')) {
        const parts = cleaned.split('.');
        if (parts.length > 1 && parts[parts.length - 1].length === 3) {
            cleaned = parts.join('');
        }
    }

    const num = Number(cleaned);
    if (!Number.isFinite(num) || num < 0) {
        const suffix = contextLabel ? ` (${contextLabel})` : '';
        return { ok: false, error: `Valor de dinero inválido${suffix}: "${trimmed}"` };
    }

    return { ok: true, value: num };
}

function dineroToDisplay(value) {
    if (value == null || value === '') {
        return '';
    }
    return String(value);
}

function mapPlanLineaMeses(producto) {
    const mesesByIndex = Array.from({ length: 12 }, (_, mes) => {
        const registro = (producto.meses ?? []).find(m => Number(m.mes) === mes);
        return registro ?? { mes, cantidad: 0, existencia: 0, dinero_solicitar: null };
    });

    return {
        cantidades: mesesByIndex.map(m => Number(m.cantidad) || 0),
        existencias: mesesByIndex.map(m => Number(m.existencia) || 0),
        dineroSolicitar: mesesByIndex.map(m => dineroToDisplay(m.dinero_solicitar)),
    };
}

function applyPlanLineaToRow(baseRow, planLinea) {
    return {
        ...baseRow,
        nombre: planLinea.nombre || baseRow.nombre,
        stockDebido: Number(planLinea.stock_debido) || 0,
        ...mapPlanLineaMeses(planLinea),
    };
}

/**
 * Combina el catálogo operativo con las líneas persistidas del plan.
 * @param {object[]} catalogProductos
 * @param {object[]} planProductos
 * @returns {object[]}
 */
export function mergeCatalogWithPlan(catalogProductos, planProductos) {
    const planByProductoId = new Map();
    const tempLines = [];

    for (const linea of planProductos ?? []) {
        if (linea.producto_id != null) {
            planByProductoId.set(linea.producto_id, linea);
        } else {
            tempLines.push(linea);
        }
    }

    tempLines.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

    const catalogRows = buildConsumoRowsFromProductos(catalogProductos);
    const mergedCatalog = catalogRows.map(row => {
        const planLinea = planByProductoId.get(row.id);
        return planLinea ? applyPlanLineaToRow(row, planLinea) : row;
    });

    let nextLocalId = -1;
    const tempRows = tempLines.map(linea => ({
        id: nextLocalId--,
        nombre: linea.nombre || '',
        stockDebido: Number(linea.stock_debido) || 0,
        ...mapPlanLineaMeses(linea),
    }));

    return [...mergedCatalog, ...tempRows];
}

/**
 * @param {object[]} productos
 * @returns {object[]}
 */
export function mapPlanProductosToRows(productos) {
    return mergeCatalogWithPlan([], productos);
}

/**
 * @param {number} anio
 * @param {object[]} rows
 * @param {string[]} mesLabels
 * @returns {{ anio: number, productos: object[] }}
 */
export function buildConsumoAnioPayload(anio, rows, mesLabels = []) {
    const errors = [];

    const productos = rows.map((row, index) => {
        const nombre = String(row.nombre ?? '').trim();
        const labelBase = nombre || `Fila ${index + 1}`;

        if (!nombre) {
            errors.push(`La fila ${index + 1} requiere un nombre de producto.`);
        }

        const meses = Array.from({ length: 12 }, (_, mes) => {
            const mesLabel = mesLabels[mes] ?? `mes ${mes + 1}`;
            const dinero = normalizeDineroSolicitar(
                row.dineroSolicitar?.[mes],
                `${labelBase}, ${mesLabel}`
            );

            if (!dinero.ok) {
                errors.push(dinero.error);
            }

            return {
                mes,
                cantidad: Number(row.cantidades?.[mes]) || 0,
                existencia: Number(row.existencias?.[mes]) || 0,
                dinero_solicitar: dinero.ok ? dinero.value : null,
            };
        });

        return {
            producto_id: row.id > 0 ? row.id : null,
            nombre,
            stock_debido: Number(row.stockDebido) || 0,
            orden: index + 1,
            meses,
        };
    });

    if (errors.length) {
        throw new ConsumoAnioValidationError(errors);
    }

    return { anio, productos };
}

/**
 * @param {number} anio
 * @returns {Promise<{ found: boolean, data: object|null }>}
 */
export async function fetchConsumoAnio(anio) {
    try {
        const response = await api.get(`/consumo-anio/${anio}`);
        return { found: true, data: response.data ?? null };
    } catch (err) {
        if (err.status === 404) {
            return { found: false, data: null };
        }
        throw err;
    }
}

/**
 * @param {number} anio
 * @param {{ anio: number, productos: object[] }} payload
 * @returns {Promise<object>}
 */
export async function saveConsumoAnio(anio, payload) {
    const response = await api.put(`/consumo-anio/${anio}`, payload);
    return response.data ?? null;
}
