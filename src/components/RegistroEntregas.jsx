import { useCallback, useEffect, useRef, useState } from 'react';
import { MESES } from '../data/productos';
import { fetchAreas, fetchProductos } from '../services/catalogosService';
import {
    createEntrega,
    fetchEntregas,
    monthToApiParam,
    productToApiParam,
    validateRow,
} from '../services/entregasService';
import { exportControlEntregas } from '../utils/exportExcel';

const PRODUCT_FILTER_DEBOUNCE_MS = 400;

const EMPTY_ROW = () => ({
    fecha: '',
    productoId: '',
    producto: '',
    cantidad: '',
    unidad: 'UND',
    areaId: '',
    areaUso: '',
    entregadoPor: '',
    quienRetira: '',
    quienRecibe: '',
    fuente: '',
    apiId: null,
    saved: false,
    saving: false,
    saveError: null,
    isDraft: true,
});

function formatApiError(err) {
    if (err?.data?.errors) {
        return Object.values(err.data.errors).flat().join(' ');
    }
    return err?.data?.message || err?.message || 'Error de conexión con la API.';
}

function matchesProductFilter(row, filtroProducto) {
    if (!filtroProducto) return true;
    return row.producto.toLowerCase().includes(filtroProducto.toLowerCase());
}

function FuenteBadge({ fuente }) {
    if (fuente === 'excel_historico') {
        return (
            <span
                title="Importada del Excel histórico original"
                style={{
                    display: 'inline-block',
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    padding: '0.12rem 0.4rem',
                    borderRadius: 999,
                    background: '#fef3c7',
                    color: '#92400e',
                    whiteSpace: 'nowrap',
                }}
            >
                Excel histórico
            </span>
        );
    }

    if (fuente === 'sistema') {
        return (
            <span
                title="Registrada en el sistema"
                style={{
                    display: 'inline-block',
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    padding: '0.12rem 0.4rem',
                    borderRadius: 999,
                    background: '#dbeafe',
                    color: '#1d4ed8',
                    whiteSpace: 'nowrap',
                }}
            >
                Sistema
            </span>
        );
    }

    return null;
}

export default function RegistroEntregas() {
    const [loadedRows, setLoadedRows] = useState([]);
    const [draftRows, setDraftRows] = useState(() => [EMPTY_ROW()]);
    const [areas, setAreas] = useState([]);
    const [productos, setProductos] = useState([]);
    const [catalogLoading, setCatalogLoading] = useState(true);
    const [catalogError, setCatalogError] = useState(null);
    const [entregasLoading, setEntregasLoading] = useState(true);
    const [entregasError, setEntregasError] = useState(null);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [globalMessage, setGlobalMessage] = useState(null);
    const [filtroMes, setFiltroMes] = useState('');
    const [filtroProductoInput, setFiltroProductoInput] = useState('');
    const [filtroProductoApi, setFiltroProductoApi] = useState('');
    const entregasRequestSeq = useRef(0);

    const loadEntregas = useCallback(async (
        page = 1,
        monthFilter = filtroMes,
        productFilter = filtroProductoApi,
    ) => {
        const requestSeq = ++entregasRequestSeq.current;

        setEntregasLoading(true);
        setEntregasError(null);

        try {
            const monthParam = monthToApiParam(monthFilter);
            const productParam = productToApiParam(productFilter);
            const result = await fetchEntregas({ page, ...monthParam, ...productParam });

            if (requestSeq !== entregasRequestSeq.current) {
                return;
            }

            setLoadedRows(result.data);
            setPagination(result.meta);
        } catch (err) {
            if (requestSeq !== entregasRequestSeq.current) {
                return;
            }
            setEntregasError(formatApiError(err));
        } finally {
            if (requestSeq === entregasRequestSeq.current) {
                setEntregasLoading(false);
            }
        }
    }, [filtroMes, filtroProductoApi]);

    useEffect(() => {
        let cancelled = false;

        async function loadCatalogos() {
            setCatalogLoading(true);
            setCatalogError(null);

            try {
                const [areasData, productosData] = await Promise.all([
                    fetchAreas(),
                    fetchProductos(),
                ]);

                if (!cancelled) {
                    setAreas(areasData);
                    setProductos(productosData);
                }
            } catch (err) {
                if (!cancelled) {
                    setCatalogError(formatApiError(err));
                }
            } finally {
                if (!cancelled) {
                    setCatalogLoading(false);
                }
            }
        }

        loadCatalogos();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setFiltroProductoApi(filtroProductoInput.trim());
        }, PRODUCT_FILTER_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [filtroProductoInput]);

    useEffect(() => {
        loadEntregas(1, filtroMes, filtroProductoApi);
    }, [filtroMes, filtroProductoApi, loadEntregas]);

    const updateDraftRow = (rowIdx, patch) => {
        setDraftRows(prev => prev.map((r, i) =>
            i === rowIdx ? { ...r, ...patch } : r
        ));
    };

    const handleDraftCell = (rowIdx, field, val) => {
        updateDraftRow(rowIdx, { [field]: val, saveError: null });
    };

    const handleProductoChange = (rowIdx, productoId) => {
        const producto = productos.find(p => String(p.id) === String(productoId));
        updateDraftRow(rowIdx, {
            productoId,
            producto: producto?.nombre || '',
            unidad: producto?.unidad_default || 'UND',
            saveError: null,
        });
    };

    const handleAreaChange = (rowIdx, areaId) => {
        const area = areas.find(a => String(a.id) === String(areaId));
        updateDraftRow(rowIdx, {
            areaId,
            areaUso: area?.nombre || '',
            saveError: null,
        });
    };

    const saveDraftRow = async (rowIdx) => {
        const row = draftRows[rowIdx];
        if (row.saved || row.saving) return;

        const validationError = validateRow(row);
        if (validationError) {
            updateDraftRow(rowIdx, { saveError: validationError });
            return;
        }

        updateDraftRow(rowIdx, { saving: true, saveError: null });
        setGlobalMessage(null);

        try {
            const entrega = await createEntrega(row);

            setDraftRows(prev => {
                const next = prev.filter((_, i) => i !== rowIdx);
                return next.length ? next : [EMPTY_ROW()];
            });

            setGlobalMessage(`Entrega #${entrega.id} guardada correctamente.`);
            await loadEntregas(1, filtroMes, filtroProductoApi);
        } catch (err) {
            updateDraftRow(rowIdx, {
                saving: false,
                saveError: formatApiError(err),
            });
        }
    };

    const addRow = () => setDraftRows(prev => [...prev, EMPTY_ROW()]);

    const removeDraftRow = idx => {
        setDraftRows(prev => {
            if (prev.length <= 1) return [EMPTY_ROW()];
            return prev.filter((_, i) => i !== idx);
        });
    };

    const filteredDraftRows = draftRows.filter(r => {
        const matchMes = filtroMes === '' || r.fecha === '' || (
            r.fecha !== '' && new Date(r.fecha + 'T00:00:00').getMonth() === Number(filtroMes)
        );
        return matchMes && matchesProductFilter(r, filtroProductoInput);
    });

    const displayRows = [
        ...loadedRows.map(row => ({ row, kind: 'loaded' })),
        ...filteredDraftRows.map((row, idx) => ({ row, kind: 'draft', draftIdx: draftRows.indexOf(row), idx })),
    ];

    const allExportRows = [
        ...loadedRows.filter(r => r.producto || r.fecha),
        ...draftRows.filter(r => r.producto || r.fecha),
    ];

    const filasConDatos = allExportRows.length;

    const renderRow = (row, options) => {
        const { kind, draftIdx } = options;
        const isLocked = row.saved || row.saving;
        const isDraft = kind === 'draft';

        return (
            <tr key={isDraft ? `draft-${draftIdx}` : `entrega-${row.apiId}`}>
                <td className="center" style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                    {isDraft ? '+' : row.apiId}
                </td>
                <td>
                    <input
                        type="date"
                        className="input-full"
                        value={row.fecha}
                        disabled={isLocked}
                        onChange={e => isDraft && handleDraftCell(draftIdx, 'fecha', e.target.value)}
                    />
                </td>
                <td>
                    <select
                        className="input-full"
                        value={row.productoId}
                        disabled={isLocked || catalogLoading || !!catalogError}
                        onChange={e => isDraft && handleProductoChange(draftIdx, e.target.value)}
                    >
                        <option value="">Seleccione producto...</option>
                        {productos.map(p => (
                            <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                    </select>
                </td>
                <td>
                    <input
                        type="number"
                        className="input-full"
                        min={0}
                        placeholder="0"
                        value={row.cantidad}
                        disabled={isLocked}
                        onChange={e => isDraft && handleDraftCell(draftIdx, 'cantidad', e.target.value)}
                    />
                </td>
                <td>
                    <input
                        type="text"
                        className="input-full"
                        placeholder="UND"
                        value={row.unidad}
                        disabled={isLocked}
                        onChange={e => isDraft && handleDraftCell(draftIdx, 'unidad', e.target.value)}
                    />
                </td>
                <td>
                    <select
                        className="input-full"
                        value={row.areaId}
                        disabled={isLocked || catalogLoading || !!catalogError}
                        onChange={e => isDraft && handleAreaChange(draftIdx, e.target.value)}
                    >
                        <option value="">Seleccione área...</option>
                        {areas.map(a => (
                            <option key={a.id} value={a.id}>{a.nombre}</option>
                        ))}
                    </select>
                </td>
                <td>
                    <input
                        type="text"
                        className="input-full"
                        placeholder="Nombre..."
                        value={row.entregadoPor}
                        disabled={isLocked}
                        onChange={e => isDraft && handleDraftCell(draftIdx, 'entregadoPor', e.target.value)}
                    />
                </td>
                <td>
                    <input
                        type="text"
                        className="input-full"
                        placeholder="Nombre..."
                        value={row.quienRetira}
                        disabled={isLocked}
                        onChange={e => isDraft && handleDraftCell(draftIdx, 'quienRetira', e.target.value)}
                    />
                </td>
                <td>
                    <input
                        type="text"
                        className="input-full"
                        placeholder="Nombre..."
                        value={row.quienRecibe}
                        disabled={isLocked}
                        onChange={e => isDraft && handleDraftCell(draftIdx, 'quienRecibe', e.target.value)}
                    />
                </td>
                <td className="center">
                    <FuenteBadge fuente={row.fuente} />
                    {isDraft && !row.fuente && (
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Nueva</span>
                    )}
                </td>
                <td>
                    {isDraft ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <button
                                type="button"
                                onClick={() => saveDraftRow(draftIdx)}
                                disabled={row.saved || row.saving || catalogLoading || !!catalogError}
                                style={{
                                    background: row.saved ? '#dcfce7' : '#2563eb',
                                    border: row.saved ? '1px solid #86efac' : 'none',
                                    borderRadius: 6,
                                    padding: '0.25rem 0.55rem',
                                    color: row.saved ? '#166534' : '#fff',
                                    fontSize: '0.76rem',
                                    fontWeight: 600,
                                    cursor: row.saved || row.saving ? 'default' : 'pointer',
                                    whiteSpace: 'nowrap',
                                }}
                                title="Guardar entrega en la API"
                            >
                                {row.saving ? 'Guardando...' : 'Guardar'}
                            </button>
                            {row.saveError && (
                                <span style={{ color: '#dc2626', fontSize: '0.72rem' }}>
                                    {row.saveError}
                                </span>
                            )}
                        </div>
                    ) : (
                        <span
                            style={{
                                display: 'inline-block',
                                fontSize: '0.76rem',
                                fontWeight: 600,
                                color: '#166534',
                                background: '#dcfce7',
                                border: '1px solid #86efac',
                                borderRadius: 6,
                                padding: '0.25rem 0.55rem',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            Guardada #{row.apiId}
                        </span>
                    )}
                </td>
                <td className="center">
                    {isDraft ? (
                        <button
                            onClick={() => removeDraftRow(draftIdx)}
                            disabled={row.saving}
                            style={{
                                background: 'none', border: 'none', color: '#ef4444',
                                cursor: row.saving ? 'default' : 'pointer',
                                fontSize: '0.9rem', padding: '0.1rem 0.3rem',
                                opacity: row.saving ? 0.5 : 1,
                            }}
                            title="Eliminar fila nueva"
                        >
                            <i className="bi bi-x-lg" />
                        </button>
                    ) : (
                        <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>—</span>
                    )}
                </td>
            </tr>
        );
    };

    return (
        <div className="section-card">
            <div className="section-card-header">
                <h5>
                    <i className="bi bi-clipboard-check" />
                    Formato Control de Entregas
                </h5>
                <button
                    className="btn-export"
                    onClick={() => exportControlEntregas(allExportRows)}
                >
                    <i className="bi bi-file-earmark-excel" />
                    Exportar Excel
                </button>
            </div>

            <div style={{ padding: '0.65rem 1rem', borderBottom: '1px solid #e2e8f0', fontSize: '0.82rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                {catalogLoading && (
                    <span style={{ color: '#64748b' }}>
                        <i className="bi bi-arrow-repeat me-1" />
                        Cargando catálogos...
                    </span>
                )}
                {catalogError && (
                    <span style={{ color: '#dc2626' }}>
                        <i className="bi bi-exclamation-triangle me-1" />
                        Catálogos: {catalogError}
                    </span>
                )}
                {!catalogLoading && !catalogError && (
                    <span style={{ color: '#64748b' }}>
                        <i className="bi bi-check2 me-1" />
                        Catálogos cargados ({productos.length} productos, {areas.length} áreas)
                    </span>
                )}
                {entregasLoading && (
                    <span style={{ color: '#64748b' }}>
                        <i className="bi bi-arrow-repeat me-1" />
                        Cargando entregas...
                    </span>
                )}
                {entregasError && (
                    <span style={{ color: '#dc2626' }}>
                        <i className="bi bi-exclamation-triangle me-1" />
                        Entregas: {entregasError}
                    </span>
                )}
                {!entregasLoading && !entregasError && (
                    <span style={{ color: '#64748b' }}>
                        <i className="bi bi-check2 me-1" />
                        {pagination.total} entregas en total (página {pagination.current_page}/{pagination.last_page})
                    </span>
                )}
                {globalMessage && (
                    <span style={{ color: '#15803d' }}>
                        <i className="bi bi-check-circle me-1" />
                        {globalMessage}
                    </span>
                )}
            </div>

            <div className="filter-bar">
                <label><i className="bi bi-calendar-month me-1" />Mes:</label>
                <select
                    className="filter-select"
                    value={filtroMes}
                    onChange={e => setFiltroMes(e.target.value)}
                    style={{ minWidth: 130 }}
                >
                    <option value="">Todos los meses</option>
                    {MESES.map((m, i) => (
                        <option key={i} value={i}>{m}</option>
                    ))}
                </select>
                <label className="ms-2"><i className="bi bi-search me-1" />Producto:</label>
                <input
                    type="text"
                    className="filter-select"
                    placeholder="Filtrar por producto..."
                    style={{ minWidth: 200 }}
                    value={filtroProductoInput}
                    onChange={e => setFiltroProductoInput(e.target.value)}
                />
                {filtroMes !== '' && (
                    <button
                        onClick={() => setFiltroMes('')}
                        style={{
                            background: 'none', border: '1px solid #cbd5e1', borderRadius: 6,
                            padding: '0.25rem 0.6rem', fontSize: '0.76rem', color: '#64748b',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem'
                        }}
                        title="Quitar filtro de mes"
                    >
                        <i className="bi bi-x" /> {MESES[Number(filtroMes)]}
                    </button>
                )}
                <span className="ms-auto" style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Registros visibles: <strong>{displayRows.length}</strong>
                    {' · '}
                    Con datos: <strong>{filasConDatos}</strong>
                </span>
            </div>

            <div className="table-wrap">
                <table className="data-table entregas-table">
                    <thead>
                        <tr>
                            <th style={{ width: 36 }}>#</th>
                            <th style={{ minWidth: 110 }}>FECHA</th>
                            <th style={{ minWidth: 180 }}>PRODUCTO</th>
                            <th style={{ minWidth: 90 }}>CANTIDAD</th>
                            <th style={{ minWidth: 80 }}>UNIDAD</th>
                            <th style={{ minWidth: 140 }}>ÁREA DE USO</th>
                            <th style={{ minWidth: 150 }}>ENTREGADO POR</th>
                            <th style={{ minWidth: 140 }}>QUIEN RETIRA</th>
                            <th style={{ minWidth: 140 }}>QUIEN RECIBE</th>
                            <th style={{ minWidth: 100 }}>ORIGEN</th>
                            <th style={{ minWidth: 110 }}>GUARDAR</th>
                            <th style={{ width: 36 }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {!entregasLoading && displayRows.length === 0 && (
                            <tr>
                                <td colSpan={12} className="center" style={{ padding: '1.5rem', color: '#64748b' }}>
                                    No hay entregas para los filtros seleccionados.
                                </td>
                            </tr>
                        )}
                        {displayRows.map(item =>
                            renderRow(item.row, {
                                kind: item.kind,
                                draftIdx: item.draftIdx,
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div style={{
                padding: '0.65rem 1rem',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.75rem',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <button
                    onClick={addRow}
                    style={{
                        background: 'none', border: '1px dashed #2563eb', borderRadius: 7,
                        padding: '0.3rem 1rem', color: '#2563eb', fontSize: '0.82rem',
                        cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem'
                    }}
                >
                    <i className="bi bi-plus-circle" /> Agregar fila
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
                    <button
                        type="button"
                        disabled={entregasLoading || pagination.current_page <= 1}
                        onClick={() => loadEntregas(pagination.current_page - 1, filtroMes, filtroProductoApi)}
                        style={{
                            background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6,
                            padding: '0.25rem 0.65rem', cursor: pagination.current_page <= 1 ? 'default' : 'pointer',
                            opacity: pagination.current_page <= 1 ? 0.5 : 1,
                        }}
                    >
                        Anterior
                    </button>
                    <span style={{ color: '#64748b' }}>
                        Página {pagination.current_page} de {pagination.last_page}
                    </span>
                    <button
                        type="button"
                        disabled={entregasLoading || pagination.current_page >= pagination.last_page}
                        onClick={() => loadEntregas(pagination.current_page + 1, filtroMes, filtroProductoApi)}
                        style={{
                            background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6,
                            padding: '0.25rem 0.65rem',
                            cursor: pagination.current_page >= pagination.last_page ? 'default' : 'pointer',
                            opacity: pagination.current_page >= pagination.last_page ? 0.5 : 1,
                        }}
                    >
                        Siguiente
                    </button>
                </div>
            </div>
        </div>
    );
}
