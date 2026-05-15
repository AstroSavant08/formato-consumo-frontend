import { useState } from 'react';
import { MESES, initPedidoMes } from '../data/productos';
import { exportFormatoPedido } from '../utils/exportExcel';

const ANIO_ACTUAL = new Date().getFullYear();
const MES_ACTUAL = new Date().getMonth(); // 0-based

const EMPTY_ESPECIAL = () => ({ que: '', cantidad: '' });

export default function FormatoPedido() {
    const [rows, setRows] = useState(initPedidoMes);
    const [mes, setMes] = useState(MES_ACTUAL);
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

    const handleCantidad = (idx, val) => {
        setRows(prev => prev.map((r, i) =>
            i === idx ? { ...r, cantidadSolicitar: val === '' ? 0 : parseFloat(val) || 0 } : r
        ));
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

    const totalSolicitar = rows.reduce((s, r) => s + Number(r.cantidadSolicitar || 0), 0);

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
                        <label className="text-white-50" style={{ fontSize: '0.8rem' }}>Mes:</label>
                        <select
                            className="filter-select"
                            value={mes}
                            onChange={e => setMes(Number(e.target.value))}
                            style={{ minWidth: 110 }}
                        >
                            {MESES.map((m, i) => (
                                <option key={i} value={i}>{m}</option>
                            ))}
                        </select>
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

                {/* Stat */}
                <div className="filter-bar">
                    <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        Pedido para: <strong>{MESES[mes]} {anio}</strong>
                    </span>
                    <span className="ms-auto" style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        Total unidades a solicitar: <strong>{totalSolicitar.toLocaleString('es-CO', { minimumFractionDigits: 1 })}</strong>
                    </span>
                </div>

                {/* Tabla productos */}
                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: 36 }}>#</th>
                                <th style={{ textAlign: 'left', minWidth: 250 }}>PRODUCTOS</th>
                                <th>Stock Debido</th>
                                <th>Cantidad a Solicitar</th>
                                <th>Dinero a Solicitar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((p, i) => (
                                <tr key={p.id}>
                                    <td className="center">
                                        <span className="badge-num">{p.id}</span>
                                    </td>
                                    <td>{p.nombre}</td>
                                    <td style={{ padding: '0.3rem 0.5rem' }}>
                                        <input
                                            type="number"
                                            className="input-cell"
                                            style={{ width: 82 }}
                                            min={0}
                                            step={0.5}
                                            value={p.stockDebido === 0 ? '' : p.stockDebido}
                                            placeholder="0"
                                            onChange={e => handleStock(i, e.target.value)}
                                        />
                                    </td>
                                    <td style={{ padding: '0.3rem 0.5rem' }}>
                                        <input
                                            type="number"
                                            className="input-cell"
                                            min={0}
                                            step={0.5}
                                            value={p.cantidadSolicitar === 0 ? '' : p.cantidadSolicitar}
                                            placeholder="0"
                                            onChange={e => handleCantidad(i, e.target.value)}
                                        />
                                    </td>
                                    <td style={{ padding: '0.3rem 0.5rem' }}>
                                        <input
                                            type="text"
                                            className="input-cell"
                                            style={{ width: 120 }}
                                            placeholder="$ —"
                                            value={p.dineroSolicitado || ''}
                                            onChange={e => handleDinero(i, e.target.value)}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={3} style={{ textAlign: 'right' }}>TOTALES</td>
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
