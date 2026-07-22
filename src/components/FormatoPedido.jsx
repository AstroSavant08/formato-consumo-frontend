import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MESES, MESES_SHORT } from '../data/productos';
import {
    buildPedidoRowsFromProductos,
    fetchProductos,
} from '../services/catalogosService';
import {
    buildFormatoPedidoPayload,
    defaultEspecialRows,
    defaultFirma,
    fetchFormatoPedido,
    FormatoPedidoValidationError,
    mapEspecialFromApi,
    mapFirmaFromApi,
    mergeCatalogWithPedidoPlan,
    saveFormatoPedido,
} from '../services/formatoPedidoService';
import { exportFormatoPedido } from '../utils/exportExcel';

const ANIO_ACTUAL = new Date().getFullYear();
const MES_ACTUAL = new Date().getMonth();

function formatApiError(err) {
    if (err?.data?.errors) {
        return Object.values(err.data.errors).flat().join(' ');
    }
    return err?.data?.message || err?.message || 'Error de conexión con la API.';
}

export default function FormatoPedido() {
    const [rows, setRows] = useState([]);
    const [catalogLoading, setCatalogLoading] = useState(true);
    const [catalogError, setCatalogError] = useState(null);
    const [catalogReady, setCatalogReady] = useState(false);
    const [planLoading, setPlanLoading] = useState(false);
    const [planError, setPlanError] = useState(null);
    const [planFound, setPlanFound] = useState(null);
    const [anio, setAnio] = useState(ANIO_ACTUAL);
    const [anioInput, setAnioInput] = useState(String(ANIO_ACTUAL));
    const [especial, setEspecial] = useState(defaultEspecialRows());
    const [firma, setFirma] = useState(defaultFirma());
    const [isDirty, setIsDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState('');

    const catalogProductosRef = useRef([]);

    useEffect(() => {
        let cancelled = false;

        async function loadCatalog() {
            setCatalogLoading(true);
            setCatalogError(null);
            setCatalogReady(false);

            try {
                const productos = await fetchProductos();

                if (!cancelled) {
                    catalogProductosRef.current = productos;
                    setCatalogReady(true);
                }
            } catch (err) {
                if (!cancelled) {
                    setCatalogError(formatApiError(err));
                    catalogProductosRef.current = [];
                    setRows([]);
                }
            } finally {
                if (!cancelled) {
                    setCatalogLoading(false);
                }
            }
        }

        loadCatalog();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!catalogReady || catalogError) {
            return undefined;
        }

        let cancelled = false;

        async function loadPlan() {
            setPlanLoading(true);
            setPlanError(null);
            setPlanFound(null);
            setSaving(false);
            setSaveSuccess(false);
            setSaveError('');

            try {
                const result = await fetchFormatoPedido(anio);

                if (cancelled) {
                    return;
                }

                if (result.found && result.data) {
                    setRows(mergeCatalogWithPedidoPlan(
                        catalogProductosRef.current,
                        result.data.productos
                    ));
                    setEspecial(mapEspecialFromApi(result.data.pedido_especial));
                    setFirma(mapFirmaFromApi(result.data.firma));
                    setPlanFound(true);
                } else {
                    setRows(buildPedidoRowsFromProductos(catalogProductosRef.current));
                    setEspecial(defaultEspecialRows());
                    setFirma(defaultFirma());
                    setPlanFound(false);
                }

                setIsDirty(false);
            } catch (err) {
                if (!cancelled) {
                    setPlanError(formatApiError(err));
                }
            } finally {
                if (!cancelled) {
                    setPlanLoading(false);
                }
            }
        }

        loadPlan();

        return () => {
            cancelled = true;
        };
    }, [anio, catalogReady, catalogError]);

    const markDirty = useCallback(() => {
        setIsDirty(true);
        setSaveSuccess(false);
        setSaveError('');
    }, []);

    const handleAnioChange = (rawValue) => {
        const newAnio = Number(rawValue);
        if (!Number.isFinite(newAnio) || newAnio < 2000 || newAnio > 2100) {
            setAnioInput(String(anio));
            return;
        }

        if (newAnio === anio) {
            setAnioInput(String(anio));
            return;
        }

        if (isDirty) {
            const confirmed = window.confirm(
                'Hay cambios sin guardar en este año. ¿Desea cambiar de año sin guardar?'
            );
            if (!confirmed) {
                setAnioInput(String(anio));
                return;
            }
        }

        setAnioInput(String(newAnio));
        setAnio(newAnio);
    };

    const handleAnioBlur = () => {
        handleAnioChange(anioInput);
    };

    const handleStock = (idx, val) => {
        markDirty();
        setRows(prev => prev.map((r, i) =>
            i === idx ? { ...r, stockDebido: val === '' ? 0 : parseFloat(val) || 0 } : r
        ));
    };

    const handleCantidad = (rowIdx, mesIdx, val) => {
        markDirty();
        setRows(prev => prev.map((r, i) => {
            if (i !== rowIdx) return r;
            const cant = [...r.cantidades];
            cant[mesIdx] = val === '' ? 0 : parseFloat(val) || 0;
            return { ...r, cantidades: cant };
        }));
    };

    const handleDinero = (idx, val) => {
        markDirty();
        setRows(prev => prev.map((r, i) =>
            i === idx ? { ...r, dineroSolicitado: val } : r
        ));
    };

    const handleEspecial = (idx, field, val) => {
        markDirty();
        setEspecial(prev => prev.map((e, i) => i === idx ? { ...e, [field]: val } : e));
    };

    const addEspecial = () => {
        markDirty();
        setEspecial(prev => [...prev, { que: '', cantidad: '' }]);
    };

    const removeEspecial = idx => {
        markDirty();
        setEspecial(prev => prev.filter((_, i) => i !== idx));
    };

    const handleFirma = (field, val) => {
        markDirty();
        setFirma(prev => ({ ...prev, [field]: val }));
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveSuccess(false);
        setSaveError('');

        try {
            const payload = buildFormatoPedidoPayload(anio, rows, especial, firma);
            const saved = await saveFormatoPedido(anio, payload);

            if (saved) {
                setRows(mergeCatalogWithPedidoPlan(
                    catalogProductosRef.current,
                    saved.productos
                ));
                setEspecial(mapEspecialFromApi(saved.pedido_especial));
                setFirma(mapFirmaFromApi(saved.firma));
            }

            setPlanFound(true);
            setIsDirty(false);
            setSaveSuccess(true);
        } catch (err) {
            if (err instanceof FormatoPedidoValidationError) {
                setSaveError(err.messages.join(' '));
            } else {
                setSaveError(formatApiError(err));
            }
        } finally {
            setSaving(false);
        }
    };

    const totalSolicitar = useMemo(() =>
        rows.reduce((s, r) => s + r.cantidades.reduce((a, v) => a + Number(v || 0), 0), 0),
        [rows]
    );

    const totalPorMes = useMemo(() =>
        MESES.map((_, mi) => rows.reduce((s, r) => s + Number(r.cantidades[mi] || 0), 0)),
        [rows]
    );

    const tableBusy = catalogLoading || planLoading;
    const canEdit = !catalogLoading && !catalogError && !planLoading;
    const canSave = canEdit && !planError && rows.length > 0 && !saving;
    const canExport = canEdit && !planError && rows.length > 0;

    const handleExport = async () => {
        await exportFormatoPedido(rows, anio, especial, firma);
    };

    return (
        <div className="d-flex flex-column gap-3">
            {/* Cabecera del pedido */}
            <div className="section-card">
                <div className="section-card-header">
                    <h5>
                        <i className="bi bi-cart3" />
                        Formato de Pedido
                    </h5>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                        <label className="text-white-50" style={{ fontSize: '0.8rem' }}>Año:</label>
                        <input
                            type="number"
                            className="input-cell"
                            style={{ width: 80, textAlign: 'center' }}
                            value={anioInput}
                            onChange={e => setAnioInput(e.target.value)}
                            onBlur={handleAnioBlur}
                            disabled={planLoading || saving}
                        />
                        <button
                            className="btn-export"
                            disabled={!canSave}
                            onClick={handleSave}
                            style={{ background: '#15803d' }}
                            title="Guardar formato de pedido en la base de datos"
                        >
                            <i className={`bi ${saving ? 'bi-arrow-repeat' : 'bi-save'}`} />
                            {saving ? 'Guardando...' : 'Guardar Formato de Pedido'}
                        </button>
                        <button
                            className="btn-export"
                            disabled={!canExport}
                            onClick={handleExport}
                        >
                            <i className="bi bi-file-earmark-excel" />
                            Exportar Excel
                        </button>
                    </div>
                </div>

                {/* Info bar */}
                <div className="filter-bar">
                    <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        Año: <strong>{anio}</strong>
                    </span>
                    {!catalogLoading && !catalogError && rows.length > 0 && (
                        <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                            {rows.length} productos cargados
                        </span>
                    )}
                    {planLoading && (
                        <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                            <i className="bi bi-arrow-repeat me-1" />
                            Cargando plan del año...
                        </span>
                    )}
                    {!planLoading && planFound === false && canEdit && (
                        <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                            Sin plan guardado para este año
                        </span>
                    )}
                    {isDirty && (
                        <span style={{ fontSize: '0.82rem', color: '#b45309' }}>
                            Cambios sin guardar
                        </span>
                    )}
                    <span className="ms-auto" style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        Total unidades solicitadas en el año: <strong>{totalSolicitar.toLocaleString('es-CO', { minimumFractionDigits: 1 })}</strong>
                    </span>
                </div>

                {(catalogLoading || catalogError || planError || saveSuccess || saveError) && (
                    <div style={{ padding: '0.65rem 1rem', borderBottom: '1px solid #e2e8f0', fontSize: '0.82rem' }}>
                        {catalogLoading && (
                            <span style={{ color: '#64748b' }}>
                                <i className="bi bi-arrow-repeat me-1" />
                                Cargando productos desde la API...
                            </span>
                        )}
                        {catalogError && (
                            <span style={{ color: '#dc2626' }}>
                                <i className="bi bi-exclamation-triangle me-1" />
                                Productos: {catalogError}
                            </span>
                        )}
                        {planError && (
                            <span style={{ color: '#dc2626', display: 'block' }}>
                                <i className="bi bi-exclamation-triangle me-1" />
                                Plan: {planError}
                            </span>
                        )}
                        {saveSuccess && (
                            <span style={{ color: '#15803d' }}>
                                <i className="bi bi-check-circle me-1" />
                                Guardado correctamente
                            </span>
                        )}
                        {saveError && (
                            <span style={{ color: '#dc2626' }}>
                                <i className="bi bi-exclamation-triangle me-1" />
                                {saveError}
                            </span>
                        )}
                    </div>
                )}

                {/* Tabla productos — 12 columnas de meses */}
                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: 36 }}>ID</th>
                                <th style={{ textAlign: 'left', minWidth: 200 }}>PRODUCTOS</th>
                                <th style={{ minWidth: 90 }}>Stock<br />debido</th>
                                {MESES_SHORT.map((m, mi) => (
                                    <th
                                        key={mi}
                                        style={{
                                            minWidth: 72,
                                            background: mi === MES_ACTUAL ? '#1d4ed8' : '#1e3a8a',
                                            borderBottom: mi === MES_ACTUAL ? '3px solid #f59e0b' : undefined,
                                        }}
                                    >
                                        Cant.<br />{m}
                                    </th>
                                ))}
                                <th className="th-total" style={{ minWidth: 90 }}>Total<br />Año</th>
                                <th className="th-dinero" style={{ minWidth: 115 }}>Dinero a<br />solicitar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableBusy && (
                                <tr>
                                    <td colSpan={17} style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                                        {catalogLoading ? 'Cargando catálogo de productos...' : 'Cargando plan del año...'}
                                    </td>
                                </tr>
                            )}
                            {!tableBusy && catalogError && (
                                <tr>
                                    <td colSpan={17} style={{ textAlign: 'center', padding: '1.5rem', color: '#dc2626' }}>
                                        No se pudo cargar el catálogo de productos.
                                    </td>
                                </tr>
                            )}
                            {!tableBusy && !catalogError && rows.map((p, ri) => {
                                const totalRow = p.cantidades.reduce((s, v) => s + Number(v || 0), 0);
                                return (
                                    <tr key={p.id}>
                                        <td className="center">
                                            <span className="badge-num">{p.id}</span>
                                        </td>
                                        <td style={{ fontWeight: 500 }}>{p.nombre}</td>
                                        <td style={{ padding: '0.3rem 0.4rem' }}>
                                            <input
                                                type="number"
                                                className="input-cell"
                                                style={{ width: 70 }}
                                                min={0}
                                                step={0.5}
                                                value={p.stockDebido === 0 ? '' : p.stockDebido}
                                                placeholder="0"
                                                onChange={e => handleStock(ri, e.target.value)}
                                                disabled={!canEdit}
                                            />
                                        </td>
                                        {p.cantidades.map((val, mi) => (
                                            <td
                                                key={mi}
                                                style={{
                                                    padding: '0.3rem 0.25rem',
                                                    background: mi === MES_ACTUAL ? '#eff6ff' : undefined,
                                                    borderLeft: mi === MES_ACTUAL ? '2px solid #2563eb' : undefined,
                                                    borderRight: mi === MES_ACTUAL ? '2px solid #2563eb' : undefined,
                                                }}
                                            >
                                                <input
                                                    type="number"
                                                    className="input-cell"
                                                    style={{ width: 62 }}
                                                    min={0}
                                                    step={0.5}
                                                    value={val === 0 ? '' : val}
                                                    placeholder="0"
                                                    onChange={e => handleCantidad(ri, mi, e.target.value)}
                                                    disabled={!canEdit}
                                                />
                                            </td>
                                        ))}
                                        <td className="num" style={{ fontWeight: 700, color: '#3730a3', background: '#eff6ff' }}>
                                            {totalRow.toLocaleString('es-CO', { minimumFractionDigits: 1 })}
                                        </td>
                                        <td style={{ padding: '0.3rem 0.4rem', background: '#ecfdf5' }}>
                                            <input
                                                type="text"
                                                className="input-cell"
                                                style={{ width: 95 }}
                                                placeholder="$ —"
                                                value={p.dineroSolicitado || ''}
                                                onChange={e => handleDinero(ri, e.target.value)}
                                                disabled={!canEdit}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={3} style={{ textAlign: 'right', letterSpacing: '0.04em' }}>TOTALES</td>
                                {totalPorMes.map((t, mi) => (
                                    <td key={mi} className="num">
                                        {t.toLocaleString('es-CO', { minimumFractionDigits: 1 })}
                                    </td>
                                ))}
                                <td className="num">
                                    {totalSolicitar.toLocaleString('es-CO', { minimumFractionDigits: 1 })}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Pedido especial */}
            <div className="special-order-section">
                <h6>
                    <i className="bi bi-star-fill" />
                    Pedido Especial / Novedad
                </h6>
                <div className="table-wrap" style={{ maxHeight: 'none' }}>
                    <table className="data-table" style={{ minWidth: 400 }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left', width: '70%' }}>Qué</th>
                                <th style={{ width: '20%' }}>Cantidad</th>
                                <th style={{ width: '10%' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {especial.map((e, i) => (
                                <tr key={i}>
                                    <td style={{ padding: '0.35rem 0.5rem' }}>
                                        <input
                                            type="text"
                                            className="input-cell"
                                            style={{ width: '100%', textAlign: 'left' }}
                                            placeholder="Descripción del pedido especial..."
                                            value={e.que}
                                            onChange={ev => handleEspecial(i, 'que', ev.target.value)}
                                            disabled={!canEdit}
                                        />
                                    </td>
                                    <td style={{ padding: '0.35rem 0.5rem' }}>
                                        <input
                                            type="number"
                                            className="input-cell"
                                            min={0}
                                            placeholder="0"
                                            value={e.cantidad}
                                            onChange={ev => handleEspecial(i, 'cantidad', ev.target.value)}
                                            disabled={!canEdit}
                                        />
                                    </td>
                                    <td className="center">
                                        {especial.length > 1 && (
                                            <button
                                                onClick={() => removeEspecial(i)}
                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' }}
                                                title="Eliminar fila"
                                                disabled={!canEdit}
                                            >
                                                <i className="bi bi-trash3" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <button
                    onClick={addEspecial}
                    disabled={!canEdit}
                    style={{
                        marginTop: '0.5rem', background: 'none', border: '1px dashed #f59e0b',
                        borderRadius: 7, padding: '0.3rem 0.9rem', color: '#92400e',
                        fontSize: '0.82rem', cursor: canEdit ? 'pointer' : 'not-allowed', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '0.35rem', opacity: canEdit ? 1 : 0.6,
                    }}
                >
                    <i className="bi bi-plus-circle" /> Agregar fila
                </button>
            </div>

            {/* Sección de firmas */}
            <div className="firma-section">
                <h6 style={{ color: '#0c4a6e', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <i className="bi bi-pen" />
                    Información del Pedido
                </h6>
                <div className="row g-3">
                    <div className="col-md-3 col-sm-6">
                        <div className="firma-field">
                            <label>Fecha</label>
                            <input
                                className="firma-input"
                                type="text"
                                value={firma.fecha}
                                onChange={e => handleFirma('fecha', e.target.value)}
                                disabled={!canEdit}
                            />
                        </div>
                    </div>
                    <div className="col-md-3 col-sm-6">
                        <div className="firma-field">
                            <label>Pedido solicitado por</label>
                            <input
                                className="firma-input"
                                type="text"
                                placeholder="Nombre del solicitante"
                                value={firma.solicitadoPor}
                                onChange={e => handleFirma('solicitadoPor', e.target.value)}
                                disabled={!canEdit}
                            />
                        </div>
                    </div>
                    <div className="col-md-3 col-sm-6">
                        <div className="firma-field">
                            <label>Pedido autorizado por</label>
                            <input
                                className="firma-input"
                                type="text"
                                placeholder="Nombre del autorizador"
                                value={firma.autorizadoPor}
                                onChange={e => handleFirma('autorizadoPor', e.target.value)}
                                disabled={!canEdit}
                            />
                        </div>
                    </div>
                    <div className="col-md-3 col-sm-6">
                        <div className="firma-field">
                            <label>Cantidad de dinero solicitada</label>
                            <input
                                className="firma-input"
                                type="text"
                                placeholder="ej: 2300000 COP"
                                value={firma.cantidadDinero}
                                onChange={e => handleFirma('cantidadDinero', e.target.value)}
                                disabled={!canEdit}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
