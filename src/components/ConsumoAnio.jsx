
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MESES } from '../data/productos';
import {
    buildConsumoRowsFromProductos,
    fetchProductos,
} from '../services/catalogosService';
import {
    buildConsumoAnioPayload,
    ConsumoAnioValidationError,
    fetchConsumoAnio,
    mergeCatalogWithPlan,
    saveConsumoAnio,
} from '../services/consumoAnioService';
import { exportConsumoAnio, exportConsumoMes } from '../utils/exportExcel';

const ANIO_ACTUAL = new Date().getFullYear();

function formatApiError(err) {
    if (err?.data?.errors) {
        return Object.values(err.data.errors).flat().join(' ');
    }
    return err?.data?.message || err?.message || 'Error de conexión con la API.';
}

function nextLocalProductId(rows) {
    const localIds = rows.filter(r => r.id < 0).map(r => r.id);
    return localIds.length ? Math.min(...localIds) - 1 : -1;
}

export default function ConsumoAnio() {
    const [rows, setRows] = useState([]);
    const [catalogLoading, setCatalogLoading] = useState(true);
    const [catalogError, setCatalogError] = useState(null);
    const [catalogReady, setCatalogReady] = useState(false);
    const [planLoading, setPlanLoading] = useState(false);
    const [planError, setPlanError] = useState(null);
    const [planFound, setPlanFound] = useState(null);
    const [anio, setAnio] = useState(ANIO_ACTUAL);
    const [anioInput, setAnioInput] = useState(String(ANIO_ACTUAL));
    const [mesActivo, setMesActivo] = useState(new Date().getMonth());
    const [isDirty, setIsDirty] = useState(false);
    const [saveStatus, setSaveStatus] = useState('idle');
    const [saveMessage, setSaveMessage] = useState('');

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
            setSaveStatus('idle');
            setSaveMessage('');

            try {
                const result = await fetchConsumoAnio(anio);

                if (cancelled) {
                    return;
                }

                if (result.found && result.data?.productos) {
                    setRows(mergeCatalogWithPlan(
                        catalogProductosRef.current,
                        result.data.productos
                    ));
                    setPlanFound(true);
                } else {
                    setRows(buildConsumoRowsFromProductos(catalogProductosRef.current));
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
        setSaveStatus('idle');
        setSaveMessage('');
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

    const handleStock = (rowIdx, val) => {
        markDirty();
        setRows(prev => prev.map((r, i) =>
            i === rowIdx ? { ...r, stockDebido: val === '' ? 0 : parseFloat(val) || 0 } : r
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

    const handleNombre = (rowIdx, val) => {
        markDirty();
        setRows(prev => prev.map((r, i) =>
            i === rowIdx ? { ...r, nombre: val } : r
        ));
    };

    const handleExistencias = (rowIdx, mesIdx, val) => {
        markDirty();
        setRows(prev => prev.map((r, i) => {
            if (i !== rowIdx) return r;
            const exist = [...r.existencias];
            exist[mesIdx] = val === '' ? 0 : parseFloat(val) || 0;
            return { ...r, existencias: exist };
        }));
    };

    const handleDineroSolicitar = (rowIdx, mesIdx, val) => {
        markDirty();
        setRows(prev => prev.map((r, i) => {
            if (i !== rowIdx) return r;
            const dinero = [...r.dineroSolicitar];
            dinero[mesIdx] = val;
            return { ...r, dineroSolicitar: dinero };
        }));
    };

    const handleAddProducto = () => {
        markDirty();
        setRows(prev => [
            ...prev,
            {
                id: nextLocalProductId(prev),
                nombre: '',
                stockDebido: 0,
                cantidades: Array(12).fill(0),
                existencias: Array(12).fill(0),
                dineroSolicitar: Array(12).fill(''),
            },
        ]);
    };

    const handleSave = async () => {
        setSaveStatus('saving');
        setSaveMessage('');

        try {
            const payload = buildConsumoAnioPayload(anio, rows, MESES);
            const saved = await saveConsumoAnio(anio, payload);

            if (saved?.productos) {
                setRows(mergeCatalogWithPlan(
                    catalogProductosRef.current,
                    saved.productos
                ));
            }

            setPlanFound(true);
            setIsDirty(false);
            setSaveStatus('success');
            setSaveMessage('Guardado correctamente');
        } catch (err) {
            setSaveStatus('error');
            if (err instanceof ConsumoAnioValidationError) {
                setSaveMessage(err.messages.join(' '));
            } else {
                setSaveMessage(formatApiError(err));
            }
        }
    };

    const totalMesActivo = useMemo(() =>
        rows.reduce((s, r) => s + Number(r.cantidades[mesActivo] || 0), 0),
        [rows, mesActivo]
    );

    const totalAnio = useMemo(() =>
        rows.reduce((s, r) => s + r.cantidades.reduce((a, v) => a + Number(v || 0), 0), 0),
        [rows]
    );

    const tableBusy = catalogLoading || planLoading;
    const canEdit = !catalogLoading && !catalogError && !planLoading;
    const canSave = canEdit && !planError && rows.length > 0 && saveStatus !== 'saving';
    const canExport = canEdit && !planError && rows.length > 0;

    return (
        <div className="section-card">
            {/* Header */}
            <div className="section-card-header">
                <h5>
                    <i className="bi bi-calendar3" />
                    Consumo del Año — Productos A &amp; C
                </h5>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                    <label className="text-white-50 me-1" style={{ fontSize: '0.8rem' }}>Año:</label>
                    <input
                        type="number"
                        className="input-cell"
                        style={{ width: 80, textAlign: 'center' }}
                        value={anioInput}
                        onChange={e => setAnioInput(e.target.value)}
                        onBlur={handleAnioBlur}
                        disabled={planLoading || saveStatus === 'saving'}
                    />
                    <button
                        className="btn-export"
                        disabled={!canSave}
                        onClick={handleSave}
                        style={{ background: '#15803d' }}
                        title="Guardar consumo del año en la base de datos"
                    >
                        <i className={`bi ${saveStatus === 'saving' ? 'bi-arrow-repeat' : 'bi-save'}`} />
                        {saveStatus === 'saving' ? 'Guardando...' : 'Guardar Consumo del Año'}
                    </button>
                    <button
                        className="btn-export"
                        disabled={!canExport}
                        onClick={() => exportConsumoMes(rows, mesActivo, anio)}
                        title={`Exportar solo ${MESES[mesActivo]}`}
                    >
                        <i className="bi bi-file-earmark-excel" />
                        Exportar {MESES[mesActivo]}
                    </button>
                    <button
                        className="btn-export"
                        disabled={!canExport}
                        onClick={() => exportConsumoAnio(rows, anio)}
                        style={{ background: '#1a3a5c' }}
                        title="Exportar todos los meses del año"
                    >
                        <i className="bi bi-calendar-range" />
                        Exportar año completo
                    </button>
                </div>
            </div>

            {(catalogLoading || catalogError || planLoading || planError || planFound === false || saveStatus === 'success' || saveStatus === 'error') && (
                <div style={{ padding: '0.65rem 1rem', borderBottom: '1px solid #e2e8f0', fontSize: '0.82rem' }}>
                    {catalogLoading && (
                        <span style={{ color: '#64748b', display: 'block' }}>
                            <i className="bi bi-arrow-repeat me-1" />
                            Cargando catálogo...
                        </span>
                    )}
                    {catalogError && (
                        <span style={{ color: '#dc2626', display: 'block' }}>
                            <i className="bi bi-exclamation-triangle me-1" />
                            Error de catálogo: {catalogError}
                        </span>
                    )}
                    {!catalogLoading && !catalogError && planLoading && (
                        <span style={{ color: '#64748b', display: 'block' }}>
                            <i className="bi bi-arrow-repeat me-1" />
                            Cargando consumo del año {anio}...
                        </span>
                    )}
                    {!catalogLoading && !catalogError && !planLoading && planError && (
                        <span style={{ color: '#dc2626', display: 'block' }}>
                            <i className="bi bi-exclamation-triangle me-1" />
                            Error al cargar el plan: {planError}
                        </span>
                    )}
                    {!catalogLoading && !catalogError && !planLoading && !planError && planFound === false && (
                        <span style={{ color: '#64748b', display: 'block' }}>
                            <i className="bi bi-info-circle me-1" />
                            Año {anio} sin datos guardados. Puede editar y guardar por primera vez.
                        </span>
                    )}
                    {saveStatus === 'success' && (
                        <span style={{ color: '#15803d', display: 'block' }}>
                            <i className="bi bi-check-circle me-1" />
                            {saveMessage}
                        </span>
                    )}
                    {saveStatus === 'error' && (
                        <span style={{ color: '#dc2626', display: 'block' }}>
                            <i className="bi bi-exclamation-triangle me-1" />
                            Error al guardar: {saveMessage}
                        </span>
                    )}
                </div>
            )}

            {/* Selector de mes */}
            <div className="filter-bar">
                <label><i className="bi bi-calendar-month me-1" />Mes:</label>
                <div className="d-flex gap-1 flex-wrap">
                    {MESES.map((m, i) => (
                        <button
                            key={i}
                            onClick={() => setMesActivo(i)}
                            style={{
                                padding: '0.28rem 0.7rem',
                                borderRadius: 6,
                                border: mesActivo === i ? '2px solid #2563eb' : '1px solid #e2e8f0',
                                background: mesActivo === i ? '#2563eb' : '#fff',
                                color: mesActivo === i ? '#fff' : '#475569',
                                fontWeight: mesActivo === i ? 700 : 400,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                            }}
                        >
                            {m.slice(0, 3)}
                        </button>
                    ))}
                </div>
                {!catalogLoading && !catalogError && rows.length > 0 && (
                    <span style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {rows.length} productos cargados
                        {isDirty && ' · cambios sin guardar'}
                    </span>
                )}
                <span className="ms-auto" style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                    Total año: <strong>{totalAnio.toLocaleString('es-CO', { minimumFractionDigits: 1 })}</strong>
                </span>
            </div>

            {/* Tabla — solo muestra el mes seleccionado */}
            <div className="table-wrap">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th style={{ width: 36 }}>ID</th>
                            <th style={{ textAlign: 'left', minWidth: 240 }}>PRODUCTOS A &amp; C</th>
                            <th style={{ minWidth: 120 }}>Stock debido<br />mes a mes</th>
                            <th className="th-existencias" style={{ minWidth: 120 }}>Existencias<br /><span style={{ fontSize: '0.73rem', opacity: 0.85, fontWeight: 400 }}>({MESES[mesActivo]})</span></th>
                            <th style={{ background: '#1d4ed8', borderBottom: '3px solid #f59e0b', minWidth: 130 }}>
                                Cantidad — {MESES[mesActivo]}
                            </th>
                            <th className="th-dinero" style={{ minWidth: 130 }}>Dinero a solicitar<br /><span style={{ fontSize: '0.73rem', opacity: 0.85, fontWeight: 400 }}>({MESES[mesActivo]})</span></th>
                            <th className="th-total" style={{ minWidth: 100 }}>Total<br />Año</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableBusy && (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                                    {catalogLoading ? 'Cargando catálogo de productos...' : `Cargando consumo del año ${anio}...`}
                                </td>
                            </tr>
                        )}
                        {!tableBusy && catalogError && (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem', color: '#dc2626' }}>
                                    No se pudo cargar el catálogo de productos.
                                </td>
                            </tr>
                        )}
                        {!tableBusy && !catalogError && planError && (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem', color: '#dc2626' }}>
                                    No se pudo cargar el consumo del año {anio}.
                                </td>
                            </tr>
                        )}
                        {canEdit && !planError && rows.map((p, ri) => {
                            const totalRow = p.cantidades.reduce((s, v) => s + Number(v || 0), 0);
                            const valMes = p.cantidades[mesActivo];
                            const valExist = p.existencias[mesActivo];
                            const valDinero = p.dineroSolicitar[mesActivo];
                            return (
                                <tr key={p.id}>
                                    <td className="center">
                                        <span className="badge-num">{p.id}</span>
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            className="input-cell"
                                            style={{ minWidth: 180, width: '100%' }}
                                            value={p.nombre}
                                            placeholder="Nombre del producto"
                                            onChange={e => handleNombre(ri, e.target.value)}
                                        />
                                    </td>
                                    <td style={{ padding: '0.3rem 0.4rem' }}>
                                        <input
                                            type="number"
                                            className="input-cell"
                                            style={{ width: 88 }}
                                            min={0}
                                            step={0.5}
                                            value={p.stockDebido === 0 ? '' : p.stockDebido}
                                            placeholder="0"
                                            onChange={e => handleStock(ri, e.target.value)}
                                        />
                                    </td>
                                    <td style={{ padding: '0.3rem 0.4rem', background: '#fef3c7' }}>
                                        <input
                                            type="number"
                                            className="input-cell"
                                            style={{ width: 88 }}
                                            min={0}
                                            step={0.5}
                                            value={valExist === 0 ? '' : valExist}
                                            placeholder="0"
                                            onChange={e => handleExistencias(ri, mesActivo, e.target.value)}
                                        />
                                    </td>
                                    <td className="month-highlight" style={{ padding: '0.3rem 0.4rem' }}>
                                        <input
                                            type="number"
                                            className="input-cell"
                                            style={{ width: 100 }}
                                            min={0}
                                            step={0.5}
                                            value={valMes === 0 ? '' : valMes}
                                            placeholder="0"
                                            onChange={e => handleCantidad(ri, mesActivo, e.target.value)}
                                        />
                                    </td>
                                    <td style={{ padding: '0.3rem 0.4rem', background: '#f1f5f9' }}>
                                        <input
                                            type="text"
                                            className="input-cell"
                                            style={{ width: 90 }}
                                            value={valDinero}
                                            placeholder="$"
                                            onChange={e => handleDineroSolicitar(ri, mesActivo, e.target.value)}
                                        />
                                    </td>
                                    <td className="num" style={{ fontWeight: 700, color: '#3730a3', background: '#eff6ff' }}>
                                        {totalRow.toLocaleString('es-CO', { minimumFractionDigits: 1 })}
                                    </td>
                                </tr>
                            );
                        })}
                        {canEdit && !planError && (
                        <tr>
                            <td colSpan={7} className="add-row-cell" style={{ textAlign: 'center' }}>
                                <button
                                    className="btn-export"
                                    type="button"
                                    onClick={handleAddProducto}
                                    style={{ margin: '0.2rem auto' }}
                                >
                                    <i className="bi bi-plus-circle" /> Agregar producto
                                </button>
                            </td>
                        </tr>
                        )}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={2} style={{ textAlign: 'right', letterSpacing: '0.04em' }}>TOTALES</td>
                            <td className="num">
                                {rows.reduce((s, r) => s + r.stockDebido, 0).toLocaleString('es-CO', { minimumFractionDigits: 1 })}
                            </td>
                            <td className="num">
                                {rows.reduce((s, r) => s + (r.existencias[mesActivo] || 0), 0).toLocaleString('es-CO', { minimumFractionDigits: 1 })}
                            </td>
                            <td className="num">
                                {totalMesActivo.toLocaleString('es-CO', { minimumFractionDigits: 1 })}
                            </td>
                            <td className="num">
                                {rows.reduce((s, r) => {
                                    const v = parseFloat(r.dineroSolicitar[mesActivo]);
                                    return s + (isNaN(v) ? 0 : v);
                                }, 0).toLocaleString('es-CO', { minimumFractionDigits: 1 })}
                            </td>
                            <td className="num">
                                {totalAnio.toLocaleString('es-CO', { minimumFractionDigits: 1 })}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
