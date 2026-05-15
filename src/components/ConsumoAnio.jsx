
import { useState, useMemo } from 'react';
import { MESES, MESES_SHORT, PRODUCTOS } from '../data/productos';
import { exportConsumoAnio, exportConsumoMes } from '../utils/exportExcel';

const ANIO_ACTUAL = new Date().getFullYear();


function getInitialRows() {
    return PRODUCTOS.map(p => ({
        ...p,
        cantidades: Array(12).fill(0),
        existencias: Array(12).fill(0),
        dineroSolicitar: Array(12).fill(''),
    }));
}

export default function ConsumoAnio() {
    const [rows, setRows] = useState(getInitialRows);
    const [anio, setAnio] = useState(ANIO_ACTUAL);
    const [mesActivo, setMesActivo] = useState(new Date().getMonth());

    const handleStock = (rowIdx, val) => {
        setRows(prev => prev.map((r, i) =>
            i === rowIdx ? { ...r, stockDebido: val === '' ? 0 : parseFloat(val) || 0 } : r
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


    const handleNombre = (rowIdx, val) => {
        setRows(prev => prev.map((r, i) =>
            i === rowIdx ? { ...r, nombre: val } : r
        ));
    };

    const handleExistencias = (rowIdx, mesIdx, val) => {
        setRows(prev => prev.map((r, i) => {
            if (i !== rowIdx) return r;
            const exist = [...r.existencias];
            exist[mesIdx] = val === '' ? 0 : parseFloat(val) || 0;
            return { ...r, existencias: exist };
        }));
    };

    const handleDineroSolicitar = (rowIdx, mesIdx, val) => {
        setRows(prev => prev.map((r, i) => {
            if (i !== rowIdx) return r;
            const dinero = [...r.dineroSolicitar];
            dinero[mesIdx] = val;
            return { ...r, dineroSolicitar: dinero };
        }));
    };

    const handleAddProducto = () => {
        setRows(prev => {
            // Buscar el id más alto actual
            const maxId = prev.reduce((max, p) => p.id > max ? p.id : max, 0);
            return [
                ...prev,
                {
                    id: maxId + 1,
                    nombre: '',
                    stockDebido: 0,
                    cantidades: Array(12).fill(0),
                    existencias: Array(12).fill(0),
                    dineroSolicitar: Array(12).fill(''),
                },
            ];
        });
    };

    const totalMesActivo = useMemo(() =>
        rows.reduce((s, r) => s + Number(r.cantidades[mesActivo] || 0), 0),
        [rows, mesActivo]
    );

    const totalAnio = useMemo(() =>
        rows.reduce((s, r) => s + r.cantidades.reduce((a, v) => a + Number(v || 0), 0), 0),
        [rows]
    );

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
                        value={anio}
                        onChange={e => setAnio(Number(e.target.value))}
                    />
                    <button
                        className="btn-export"
                        onClick={() => exportConsumoMes(rows, mesActivo, anio)}
                        title={`Exportar solo ${MESES[mesActivo]}`}
                    >
                        <i className="bi bi-file-earmark-excel" />
                        Exportar {MESES[mesActivo]}
                    </button>
                    <button
                        className="btn-export"
                        onClick={() => exportConsumoAnio(rows, anio)}
                        style={{ background: '#1a3a5c' }}
                        title="Exportar todos los meses del año"
                    >
                        <i className="bi bi-calendar-range" />
                        Exportar año completo
                    </button>
                </div>
            </div>

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
                <span className="ms-auto" style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                    Total año: <strong>{totalAnio.toLocaleString('es-CO', { minimumFractionDigits: 1 })}</strong>
                </span>
            </div>

            {/* Tabla — solo muestra el mes seleccionado */}
            <div className="table-wrap">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th style={{ width: 36 }}>#</th>
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
                        {rows.map((p, ri) => {
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
                        <tr>
                            <td colSpan={7} className="add-row-cell" style={{ textAlign: 'center' }}>
                                <button className="btn-export" type="button" onClick={handleAddProducto} style={{ margin: '0.2rem auto' }}>
                                    <i className="bi bi-plus-circle" /> Agregar producto
                                </button>
                            </td>
                        </tr>
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
