import { useState } from 'react';
import { MESES } from '../data/productos';
import { exportControlEntregas } from '../utils/exportExcel';

const EMPTY_ROW = () => ({
    fecha: '',
    producto: '',
    cantidad: '',
    areaUso: '',
    entregadoPor: '',
    quienRetira: '',
    quienRecibe: '',
});

const NUM_FILAS_INICIAL = 1;

export default function RegistroEntregas() {
    const [rows, setRows] = useState(() =>
        [EMPTY_ROW()]
    );
    const [filtroMes, setFiltroMes] = useState(String(new Date().getMonth()));
    const [filtroProducto, setFiltroProducto] = useState('');

    const handleCell = (rowIdx, field, val) => {
        setRows(prev => prev.map((r, i) =>
            i === rowIdx ? { ...r, [field]: val } : r
        ));
    };

    const addRow = () => setRows(prev => [...prev, EMPTY_ROW()]);

    const removeRow = idx => {
        if (rows.length <= 1) return;
        setRows(prev => prev.filter((_, i) => i !== idx));
    };

    const filteredRows = rows.filter(r => {
        // Mostrar siempre filas sin fecha (recién creadas), o las que coinciden con el mes
        const matchMes = filtroMes === '' || r.fecha === '' || (
            r.fecha !== '' && new Date(r.fecha + 'T00:00:00').getMonth() === Number(filtroMes)
        );
        const matchProducto = filtroProducto === '' || r.producto.toLowerCase().includes(filtroProducto.toLowerCase());
        return matchMes && matchProducto;
    });

    const filasConDatos = rows.filter(r => r.producto || r.fecha).length;

    return (
        <div className="section-card">
            {/* Header */}
            <div className="section-card-header">
                <h5>
                    <i className="bi bi-clipboard-check" />
                    Formato Control de Entregas
                </h5>
                <button
                    className="btn-export"
                    onClick={() => exportControlEntregas(rows.filter(r => r.producto || r.fecha))}
                >
                    <i className="bi bi-file-earmark-excel" />
                    Exportar Excel
                </button>
            </div>

            {/* Filtros */}
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
                    value={filtroProducto}
                    onChange={e => setFiltroProducto(e.target.value)}
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
                    Registros con datos: <strong>{filasConDatos}</strong>
                </span>
            </div>

            {/* Tabla */}
            <div className="table-wrap">
                <table className="data-table entregas-table">
                    <thead>
                        <tr>
                            <th style={{ width: 36 }}>#</th>
                            <th style={{ minWidth: 110 }}>FECHA</th>
                            <th style={{ minWidth: 180 }}>PRODUCTO</th>
                            <th style={{ minWidth: 90 }}>CANTIDAD</th>
                            <th style={{ minWidth: 140 }}>ÁREA DE USO</th>
                            <th style={{ minWidth: 150 }}>ENTREGADO POR</th>
                            <th style={{ minWidth: 140 }}>QUIEN RETIRA</th>
                            <th style={{ minWidth: 140 }}>QUIEN RECIBE</th>
                            <th style={{ width: 36 }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRows.map((row, i) => {
                            // Índice real en el array original
                            const realIdx = rows.indexOf(row);
                            return (
                                <tr key={i}>
                                    <td className="center" style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{realIdx + 1}</td>
                                    <td>
                                        <input
                                            type="date"
                                            className="input-full"
                                            value={row.fecha}
                                            onChange={e => handleCell(realIdx, 'fecha', e.target.value)}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            className="input-full"
                                            placeholder="Producto..."
                                            value={row.producto}
                                            onChange={e => handleCell(realIdx, 'producto', e.target.value)}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            className="input-full"
                                            min={0}
                                            placeholder="0"
                                            value={row.cantidad}
                                            onChange={e => handleCell(realIdx, 'cantidad', e.target.value)}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            className="input-full"
                                            placeholder="Área..."
                                            value={row.areaUso}
                                            onChange={e => handleCell(realIdx, 'areaUso', e.target.value)}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            className="input-full"
                                            placeholder="Nombre..."
                                            value={row.entregadoPor}
                                            onChange={e => handleCell(realIdx, 'entregadoPor', e.target.value)}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            className="input-full"
                                            placeholder="Nombre..."
                                            value={row.quienRetira}
                                            onChange={e => handleCell(realIdx, 'quienRetira', e.target.value)}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            className="input-full"
                                            placeholder="Nombre..."
                                            value={row.quienRecibe}
                                            onChange={e => handleCell(realIdx, 'quienRecibe', e.target.value)}
                                        />
                                    </td>
                                    <td className="center">
                                        <button
                                            onClick={() => removeRow(realIdx)}
                                            style={{
                                                background: 'none', border: 'none', color: '#ef4444',
                                                cursor: 'pointer', fontSize: '0.9rem', padding: '0.1rem 0.3rem'
                                            }}
                                            title="Eliminar fila"
                                        >
                                            <i className="bi bi-x-lg" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Agregar fila */}
            <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #e2e8f0' }}>
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
            </div>
        </div>
    );
}
