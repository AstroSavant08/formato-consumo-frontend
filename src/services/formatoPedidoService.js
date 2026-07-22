import { api } from './api';
import {
    buildPedidoRowsFromProductos,
} from './catalogosService';
import {
    ConsumoAnioValidationError,
    normalizeDineroSolicitar,
} from './consumoAnioService';

export { ConsumoAnioValidationError as FormatoPedidoValidationError };

function dineroToDisplay(value) {
    if (value == null || value === '') {
        return '';
    }
    return String(value);
}

function mapPlanLineaMeses(producto) {
    const mesesByIndex = Array.from({ length: 12 }, (_, mes) => {
        const registro = (producto.meses ?? []).find(m => Number(m.mes) === mes);
        return Number(registro?.cantidad) || 0;
    });

    return { cantidades: mesesByIndex };
}

function applyPlanLineaToRow(baseRow, planLinea) {
    return {
        ...baseRow,
        nombre: planLinea.nombre || baseRow.nombre,
        stockDebido: Number(planLinea.stock_debido) || 0,
        dineroSolicitado: dineroToDisplay(planLinea.dinero_solicitado),
        ...mapPlanLineaMeses(planLinea),
    };
}

/**
 * Combina el catálogo operativo con las líneas persistidas del formato de pedido.
 * @param {object[]} catalogProductos
 * @param {object[]} planProductos
 * @returns {object[]}
 */
export function mergeCatalogWithPedidoPlan(catalogProductos, planProductos) {
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

    const catalogRows = buildPedidoRowsFromProductos(catalogProductos);
    const mergedCatalog = catalogRows.map(row => {
        const planLinea = planByProductoId.get(row.id);
        return planLinea ? applyPlanLineaToRow(row, planLinea) : row;
    });

    let nextLocalId = -1;
    const tempRows = tempLines.map(linea => ({
        id: nextLocalId--,
        nombre: linea.nombre || '',
        stockDebido: Number(linea.stock_debido) || 0,
        dineroSolicitado: dineroToDisplay(linea.dinero_solicitado),
        ...mapPlanLineaMeses(linea),
    }));

    return [...mergedCatalog, ...tempRows];
}

export function mapFirmaFromApi(firma) {
    return {
        fecha: firma?.fecha ?? new Date().toLocaleDateString('es-CO'),
        solicitadoPor: firma?.solicitado_por ?? '',
        autorizadoPor: firma?.autorizado_por ?? '',
        cantidadDinero: firma?.cantidad_dinero ?? '',
    };
}

export function mapEspecialFromApi(pedidoEspecial) {
    const items = (pedidoEspecial ?? []).map(item => ({
        que: item.que ?? '',
        cantidad: item.cantidad != null && item.cantidad !== '' ? String(item.cantidad) : '',
    }));

    if (items.length === 0) {
        return defaultEspecialRows();
    }

    return items;
}

export function defaultEspecialRows() {
    return [
        { que: '', cantidad: '' },
        { que: '', cantidad: '' },
        { que: '', cantidad: '' },
    ];
}

export function defaultFirma() {
    return {
        fecha: new Date().toLocaleDateString('es-CO'),
        solicitadoPor: '',
        autorizadoPor: '',
        cantidadDinero: '',
    };
}

function hasEspecialContent(row) {
    const que = String(row.que ?? '').trim();
    const cantidad = String(row.cantidad ?? '').trim();
    return que !== '' || cantidad !== '';
}

function normalizeEspecialCantidad(value, contextLabel) {
    if (value == null || String(value).trim() === '') {
        return { ok: true, value: null };
    }

    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) {
        return { ok: false, error: `Cantidad inválida en pedido especial (${contextLabel}): "${value}"` };
    }

    return { ok: true, value: num };
}

/**
 * @param {number} anio
 * @param {object[]} rows
 * @param {object[]} especial
 * @param {object} firma
 * @returns {{ anio: number, firma: object, pedido_especial: object[], productos: object[] }}
 */
export function buildFormatoPedidoPayload(anio, rows, especial, firma) {
    const errors = [];

    const productos = rows.map((row, index) => {
        const nombre = String(row.nombre ?? '').trim();
        const labelBase = nombre || `Fila ${index + 1}`;

        if (!nombre) {
            errors.push(`La fila ${index + 1} requiere un nombre de producto.`);
        }

        const dinero = normalizeDineroSolicitar(row.dineroSolicitado, labelBase);
        if (!dinero.ok) {
            errors.push(dinero.error);
        }

        const meses = Array.from({ length: 12 }, (_, mes) => ({
            mes,
            cantidad: Number(row.cantidades?.[mes]) || 0,
        }));

        return {
            producto_id: row.id > 0 ? row.id : null,
            nombre,
            stock_debido: Number(row.stockDebido) || 0,
            orden: index + 1,
            dinero_solicitado: dinero.ok ? dinero.value : null,
            meses,
        };
    });

    const pedidoEspecial = [];
    (especial ?? []).filter(hasEspecialContent).forEach((row, index) => {
        const label = String(row.que ?? '').trim() || `Fila especial ${index + 1}`;
        const cantidad = normalizeEspecialCantidad(row.cantidad, label);

        if (!cantidad.ok) {
            errors.push(cantidad.error);
        }

        pedidoEspecial.push({
            orden: pedidoEspecial.length + 1,
            que: String(row.que ?? '').trim(),
            cantidad: cantidad.ok ? cantidad.value : null,
        });
    });

    if (errors.length) {
        throw new ConsumoAnioValidationError(errors);
    }

    return {
        anio,
        firma: {
            fecha: String(firma?.fecha ?? '').trim(),
            solicitado_por: String(firma?.solicitadoPor ?? '').trim(),
            autorizado_por: String(firma?.autorizadoPor ?? '').trim(),
            cantidad_dinero: String(firma?.cantidadDinero ?? '').trim(),
        },
        pedido_especial: pedidoEspecial,
        productos,
    };
}

/**
 * @param {number} anio
 * @returns {Promise<{ found: boolean, data: object|null }>}
 */
export async function fetchFormatoPedido(anio) {
    try {
        const response = await api.get(`/formato-pedido/${anio}`);
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
 * @param {object} payload
 * @returns {Promise<object>}
 */
export async function saveFormatoPedido(anio, payload) {
    const response = await api.put(`/formato-pedido/${anio}`, payload);
    return response.data ?? null;
}
