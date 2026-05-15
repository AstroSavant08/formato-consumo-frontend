import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { MESES, MESES_SHORT } from '../data/productos';

// ── helpers ──────────────────────────────────────────────────────────────────
const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5C' } };
const HEADER_FILL2 = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
const ACCENT_FILL  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } };
const EVEN_FILL    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
const WHITE_FILL   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
const GREEN_FILL   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };

const WHITE_FONT   = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 };
const DARK_FONT    = { color: { argb: 'FF1E293B' }, size: 10 };
const BOLD_DARK    = { color: { argb: 'FF1E293B' }, bold: true, size: 10 };

const thinBorder = {
  top:    { style: 'thin', color: { argb: 'FFE2E8F0' } },
  left:   { style: 'thin', color: { argb: 'FFE2E8F0' } },
  bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  right:  { style: 'thin', color: { argb: 'FFE2E8F0' } },
};

function setRow(row, font, fill, alignment = { vertical: 'middle' }) {
  row.eachCell({ includeEmpty: true }, cell => {
    cell.font = font;
    cell.fill = fill;
    cell.alignment = alignment;
    cell.border = thinBorder;
  });
}

// ── CONSUMO DEL AÑO ──────────────────────────────────────────────────────────
export async function exportConsumoAnio(rows, anio) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Formato Consumo';
  const ws = wb.addWorksheet('Consumo del Año', { views: [{ state: 'frozen', ySplit: 2 }] });

  // Anchos de columna
  ws.columns = [
    { width: 5 },   // #
    { width: 42 },  // producto
    { width: 13 },  // stock
    ...MESES_SHORT.map(() => ({ width: 9 })),
    { width: 11 },  // total año
  ];

  // Título
  ws.mergeCells(1, 1, 1, 15);
  const titleCell = ws.getCell('A1');
  titleCell.value = `CONSUMO DEL AÑO ${anio} — PRODUCTOS A & C`;
  titleCell.font = { ...WHITE_FONT, size: 13, bold: true };
  titleCell.fill = HEADER_FILL;
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.border = thinBorder;
  ws.getRow(1).height = 28;

  // Cabeceras
  const headers = ['#', 'PRODUCTOS A & C', 'Stock debido\nmes a mes',
    ...MESES_SHORT.map(m => `Cant.\n${m}`), 'Total\nAño'];
  const hr = ws.addRow(headers);
  hr.height = 36;
  hr.eachCell((cell, col) => {
    cell.fill = HEADER_FILL2;
    cell.font = WHITE_FONT;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  });
  ws.getCell('B2').alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

  // Datos
  rows.forEach((p, i) => {
    const total = p.cantidades.reduce((s, v) => s + Number(v || 0), 0);
    const dr = ws.addRow([
      p.id,
      p.nombre,
      p.stockDebido,
      ...p.cantidades.map(v => Number(v) || 0),
      total,
    ]);
    dr.height = 18;
    const fill = i % 2 === 0 ? WHITE_FILL : EVEN_FILL;
    dr.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.fill = fill;
      cell.font = DARK_FONT;
      cell.border = thinBorder;
      cell.alignment = { vertical: 'middle', horizontal: col <= 2 ? 'left' : 'right' };
    });
    // resaltar total año
    const lastCol = dr.getCell(15);
    lastCol.font = BOLD_DARK;
    lastCol.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
  });

  // Footer totales
  const totRow = ws.addRow([
    '', 'TOTALES',
    rows.reduce((s, r) => s + r.stockDebido, 0),
    ...MESES_SHORT.map((_, mi) => rows.reduce((s, r) => s + Number(r.cantidades[mi] || 0), 0)),
    rows.reduce((s, r) => s + r.cantidades.reduce((a, v) => a + Number(v || 0), 0), 0),
  ]);
  totRow.height = 20;
  setRow(totRow, WHITE_FONT, HEADER_FILL, { horizontal: 'right', vertical: 'middle' });
  totRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `Consumo_Anio_${anio}.xlsx`);
}

// ── CONSUMO DE UN MES ─────────────────────────────────────────────────────────
export async function exportConsumoMes(rows, mesIdx, anio) {
  const mesNombre = MESES[mesIdx];
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Formato Consumo';
  const ws = wb.addWorksheet(`Consumo ${mesNombre}`, { views: [{ state: 'frozen', ySplit: 2 }] });

  ws.columns = [
    { width: 5 },   // #
    { width: 42 },  // producto
    { width: 14 },  // stock
    { width: 18 },  // cantidad mes
    { width: 13 },  // total año
  ];

  // Título
  ws.mergeCells(1, 1, 1, 5);
  const t = ws.getCell('A1');
  t.value = `CONSUMO ${mesNombre.toUpperCase()} ${anio} — PRODUCTOS A & C`;
  t.font = { ...WHITE_FONT, size: 13, bold: true };
  t.fill = HEADER_FILL;
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  t.border = thinBorder;
  ws.getRow(1).height = 28;

  // Cabeceras
  const hr = ws.addRow(['#', 'PRODUCTOS A & C', 'Stock debido\nmes a mes', `Cantidad\n${mesNombre}`, 'Total\nAño']);
  hr.height = 36;
  hr.eachCell((cell, col) => {
    cell.fill = col === 4 ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } } : HEADER_FILL2;
    cell.font = WHITE_FONT;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  });
  ws.getCell('B2').alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

  // Datos
  rows.forEach((p, i) => {
    const totalAnioRow = p.cantidades.reduce((s, v) => s + Number(v || 0), 0);
    const dr = ws.addRow([
      p.id,
      p.nombre,
      p.stockDebido,
      Number(p.cantidades[mesIdx]) || 0,
      totalAnioRow,
    ]);
    dr.height = 18;
    const fill = i % 2 === 0 ? WHITE_FILL : EVEN_FILL;
    dr.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.fill = fill;
      cell.font = DARK_FONT;
      cell.border = thinBorder;
      cell.alignment = { vertical: 'middle', horizontal: col <= 2 ? 'left' : 'right' };
    });
    // resaltar cantidad del mes
    dr.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
    dr.getCell(4).font = BOLD_DARK;
    // resaltar total año
    dr.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
    dr.getCell(5).font = BOLD_DARK;
  });

  // Footer
  const totRow = ws.addRow([
    '', 'TOTALES',
    rows.reduce((s, r) => s + r.stockDebido, 0),
    rows.reduce((s, r) => s + Number(r.cantidades[mesIdx] || 0), 0),
    rows.reduce((s, r) => s + r.cantidades.reduce((a, v) => a + Number(v || 0), 0), 0),
  ]);
  totRow.height = 20;
  setRow(totRow, WHITE_FONT, HEADER_FILL, { horizontal: 'right', vertical: 'middle' });
  totRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `Consumo_${mesNombre}_${anio}.xlsx`);
}

// ── FORMATO DE PEDIDO ─────────────────────────────────────────────────────────
export async function exportFormatoPedido(rows, mes, anio, pedidoEspecial, firma) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Formato de Pedido');

  ws.columns = [
    { width: 5 },
    { width: 44 },
    { width: 14 },
    { width: 16 },
    { width: 18 },
  ];

  // Título
  ws.mergeCells(1, 1, 1, 5);
  const t = ws.getCell('A1');
  t.value = `FORMATO DE PEDIDO — ${mes.toUpperCase()} ${anio}`;
  t.font = { ...WHITE_FONT, size: 13 };
  t.fill = HEADER_FILL;
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  t.border = thinBorder;
  ws.getRow(1).height = 28;

  // Cabeceras
  const hr = ws.addRow(['#', 'PRODUCTOS', 'Stock debido', 'Cantidad a solicitar', 'Dinero a solicitar']);
  hr.height = 22;
  setRow(hr, WHITE_FONT, HEADER_FILL2, { horizontal: 'center', vertical: 'middle' });
  hr.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };

  rows.forEach((p, i) => {
    const dr = ws.addRow([
      p.id,
      p.nombre,
      p.stockDebido,
      Number(p.cantidadSolicitar) || 0,
      p.dineroSolicitado || '',
    ]);
    dr.height = 18;
    const fill = i % 2 === 0 ? WHITE_FILL : EVEN_FILL;
    dr.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.fill = fill;
      cell.font = DARK_FONT;
      cell.border = thinBorder;
      cell.alignment = { vertical: 'middle', horizontal: col <= 2 ? 'left' : 'right' };
    });
  });

  // Espacio
  ws.addRow([]);

  // Pedido especial
  ws.mergeCells(ws.rowCount + 1, 1, ws.rowCount + 1, 5);
  const peTitle = ws.getCell(`A${ws.rowCount}`);
  peTitle.value = 'PEDIDO ESPECIAL / NOVEDAD';
  peTitle.font = { color: { argb: 'FF92400E' }, bold: true, size: 11 };
  peTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
  peTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  peTitle.border = thinBorder;
  ws.getRow(ws.rowCount).height = 20;

  // Sub-headers especial
  const phRow = ws.rowCount + 1;
  ws.mergeCells(phRow, 1, phRow, 4);
  ws.getCell(`A${phRow}`).value = 'Qué';
  ws.getCell(`A${phRow}`).font = BOLD_DARK;
  ws.getCell(`A${phRow}`).fill = EVEN_FILL;
  ws.getCell(`A${phRow}`).border = thinBorder;
  ws.getCell(`A${phRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getCell(`E${phRow}`).value = 'Cantidad';
  ws.getCell(`E${phRow}`).font = BOLD_DARK;
  ws.getCell(`E${phRow}`).fill = EVEN_FILL;
  ws.getCell(`E${phRow}`).border = thinBorder;
  ws.getCell(`E${phRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  pedidoEspecial.filter(pe => pe.que || pe.cantidad).forEach(pe => {
    const r = ws.rowCount + 1;
    ws.mergeCells(r, 1, r, 4);
    ws.getCell(`A${r}`).value = pe.que;
    ws.getCell(`A${r}`).border = thinBorder;
    ws.getCell(`A${r}`).alignment = { vertical: 'middle' };
    ws.getCell(`E${r}`).value = Number(pe.cantidad) || '';
    ws.getCell(`E${r}`).border = thinBorder;
    ws.getCell(`E${r}`).alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getRow(r).height = 18;
  });

  // Firma
  ws.addRow([]);
  const fields = [
    ['Fecha:', firma.fecha],
    ['Pedido solicitado por:', firma.solicitadoPor],
    ['Pedido autorizado por:', firma.autorizadoPor],
    ['Cantidad de dinero solicitada:', firma.cantidadDinero],
  ];
  fields.forEach(([label, val]) => {
    const r = ws.rowCount + 1;
    ws.mergeCells(r, 1, r, 2);
    ws.getCell(`A${r}`).value = label;
    ws.getCell(`A${r}`).font = BOLD_DARK;
    ws.getCell(`A${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
    ws.getCell(`A${r}`).border = thinBorder;
    ws.mergeCells(r, 3, r, 5);
    ws.getCell(`C${r}`).value = val;
    ws.getCell(`C${r}`).font = DARK_FONT;
    ws.getCell(`C${r}`).border = thinBorder;
    ws.getRow(r).height = 18;
  });

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `Pedido_${mes}_${anio}.xlsx`);
}

// ── REGISTRO CONTROL DE ENTREGAS ─────────────────────────────────────────────
export async function exportControlEntregas(rows) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Control de Entregas', { views: [{ state: 'frozen', ySplit: 2 }] });

  ws.columns = [
    { width: 14 },
    { width: 30 },
    { width: 12 },
    { width: 20 },
    { width: 22 },
    { width: 22 },
    { width: 22 },
  ];

  // Título
  ws.mergeCells(1, 1, 1, 7);
  const t = ws.getCell('A1');
  t.value = 'FORMATO CONTROL DE ENTREGAS';
  t.font = { ...WHITE_FONT, size: 13 };
  t.fill = HEADER_FILL;
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  t.border = thinBorder;
  ws.getRow(1).height = 28;

  // Cabeceras
  const cols = ['FECHA', 'PRODUCTO', 'CANTIDAD', 'AREA DE USO', 'ENTREGADO POR', 'QUIEN RETIRA', 'QUIEN RECIBE'];
  const hr = ws.addRow(cols);
  hr.height = 22;
  setRow(hr, WHITE_FONT, HEADER_FILL2, { horizontal: 'center', vertical: 'middle' });

  rows.forEach((row, i) => {
    const dr = ws.addRow([
      row.fecha, row.producto, row.cantidad,
      row.areaUso, row.entregadoPor, row.quienRetira, row.quienRecibe,
    ]);
    dr.height = 18;
    const fill = i % 2 === 0 ? WHITE_FILL : EVEN_FILL;
    dr.eachCell({ includeEmpty: true }, cell => {
      cell.fill = fill;
      cell.font = DARK_FONT;
      cell.border = thinBorder;
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });
  });

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), 'Control_Entregas.xlsx');
}
