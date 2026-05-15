import { useState, useMemo } from 'react';
import { MESES, MESES_SHORT, initPedidoMes } from '../data/productos';
import { exportFormatoPedido } from '../utils/exportExcel';

const ANIO_ACTUAL = new Date().getFullYear();
const MES_ACTUAL = new Date().getMonth();

const EMPTY_ESPECIAL = () => ({ que: '', cantidad: '' });

export default function FormatoPedido() {
    const [rows, setRows] = useState(initPedidoMes);
    const [anio, setAnio] = useState(ANIO_ACTUAL);
    const [especial, setEspecial] = useState([EMPTY_ESPECIAL(), EMPTY_ESPECIAL(), EMPTY_ESPECIAL()]);
    const [firma, setFirma] = useState({
        fecha: new Date().toLocaleDateString('es-CO'),
        solicitadoPor: '',
        autorizadoPor: '',
        cantidadDinero: '',
    });

    const handleStock = (idx, val) => {
        setRows(prev => prev.map((r, i) =>
            i === idx ? { ...r, stockDebido: val === '' ? 0 : parseFloat(val) || 0 } : r
        ));
    };

    const handleCantidad = (rowIdx, mesIdx, val) => {
        setRows(prev => prev.map((r, i) => {
            if (i !== rowIdx) return r;
            const cant = [...r.cantidades];
            cant[mesIdx] = val === '' ? 0 : parseFloat(val) || 0;
            return { ...r, cantidades: cant };
        }));
    };

    const handleDinero = (idx, val) => {
        setRows(prev => prev.map((r, i) =>
            i === idx ? { ...r, dineroSolicitado: val } : r
        ));
    };

    const handleEspecial = (idx, field, val) => {
        setEspecial(prev => prev.map((e, i) => i === idx ? { ...e, [field]: val } : e));
    };

    const addEspecial = () => setEspecial(prev => [...prev, EMPTY_ESPECIAL()]);

    const removeEspecial = idx => setEspecial(prev => prev.filter((_, i) => i !== idx));

    const handleFirma = (field, val) => setFirma(prev => ({ ...prev, [field]: val }));

    const totalSolicitar = useMemo(() =>
        rows.reduce((s, r) => s + r.cantidades.reduce((a, v) => a + Number(v || 0), 0), 0),
        [rows]
    );

    const totalPorMes = useMemo(() =>
        MESES.map((_, mi) => rows.reduce((s, r) => s + Number(r.cantidades[mi] || 0), 0)),
        [rows]
    );

    const handleExport = async () => {
        await exportFormatoPedido(rows, MESES[mes], anio, especial, firma);
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
                            value={anio}
                            onChange={e => setAnio(Number(e.target.value))}
                        />
                        <button className="btn-export" onClick={handleExport}>
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
                    <span className="ms-auto" style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        Total unidades solicitadas en el año: <strong>{totalSolicitar.toLocaleString('es-CO', { minimumFractionDigits: 1 })}</strong>
                    </span>
                </div>

                {/* Tabla productos — 12 columnas de meses */}
                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: 36 }}>#</th>
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
                            {rows.map((p, ri) => {
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
                                        />
                                    </td>
                                    <td className="center">
                                        {especial.length > 1 && (
                                            <button
                                                onClick={() => removeEspecial(i)}
                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' }}
                                                title="Eliminar fila"
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
                    style={{
                        marginTop: '0.5rem', background: 'none', border: '1px dashed #f59e0b',
                        borderRadius: 7, padding: '0.3rem 0.9rem', color: '#92400e',
                        fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '0.35rem'
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
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
