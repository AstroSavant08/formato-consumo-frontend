/**
 * Análisis profundo de solo lectura — Consumo_DESARROLLO.xlsx
 */
import ExcelJS from 'exceljs';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXCEL_PATH = join(__dirname, '..', 'docs', 'Consumo_DESARROLLO.xlsx');

function cellValue(cell) {
  if (!cell || cell.value == null) return null;
  const v = cell.value;
  if (typeof v === 'object') {
    if (v.formula) return v.result ?? v.formula;
    if (v.richText) return v.richText.map((t) => t.text).join('');
    if (v.text) return v.text;
    if (v instanceof Date) return v;
    if (Array.isArray(v)) return v.map(cellValue).join(', ');
  }
  return v;
}

function normalizeName(s) {
  if (s == null) return '';
  return String(s)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function fixEncoding(s) {
  if (!s) return s;
  // Common mojibake from UTF-8 read as Latin-1 in some pipelines
  return String(s)
    .replace(/CAF├ë/gi, 'CAFÉ')
    .replace(/BA├æO/gi, 'BAÑO')
    .replace(/PEQUE├æO/gi, 'PEQUEÑO');
}

function similarity(a, b) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const wa = new Set(na.split(' ').filter(Boolean));
  const wb = new Set(nb.split(' ').filter(Boolean));
  const inter = [...wa].filter((w) => wb.has(w)).length;
  const union = new Set([...wa, ...wb]).size;
  return union ? inter / union : 0;
}

// Load frontend products dynamically
const productosPath = join(__dirname, '..', 'src', 'data', 'productos.js');
const productosSrc = readFileSync(productosPath, 'utf8');
const frontendProducts = [...productosSrc.matchAll(/nombre:\s*"([^"]+)"/g)].map((m) => m[1]);

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);
  const ws = wb.getWorksheet('BD') || wb.worksheets[0];

  const records = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const fecha = cellValue(row.getCell(1));
    const producto = fixEncoding(cellValue(row.getCell(2)));
    const cantidad = cellValue(row.getCell(3));
    const unidad = cellValue(row.getCell(4));
    const area = cellValue(row.getCell(5));
    const quienRecibe = cellValue(row.getCell(6));
    const entrega = cellValue(row.getCell(7));

    const hasAny = [fecha, producto, cantidad, unidad, area, quienRecibe, entrega].some(
      (v) => v != null && v !== ''
    );
    if (!hasAny) continue;

    records.push({
      row: r,
      fecha: fecha instanceof Date ? fecha : fecha,
      producto: producto ? String(producto).trim() : null,
      cantidad,
      unidad: unidad ? String(unidad).trim() : null,
      area: area ? String(area).trim() : null,
      quienRecibe: quienRecibe ? String(quienRecibe).trim() : null,
      entrega: entrega ? String(entrega).trim() : null,
    });
  }

  const dates = records
    .map((r) => (r.fecha instanceof Date ? r.fecha : null))
    .filter(Boolean);
  const minDate = dates.length ? new Date(Math.min(...dates)) : null;
  const maxDate = dates.length ? new Date(Math.max(...dates)) : null;

  const missing = {
    fecha: records.filter((r) => !r.fecha).length,
    producto: records.filter((r) => !r.producto).length,
    cantidad: records.filter((r) => r.cantidad == null || r.cantidad === '').length,
    unidad: records.filter((r) => !r.unidad).length,
    area: records.filter((r) => !r.area).length,
    quienRecibe: records.filter((r) => !r.quienRecibe).length,
    entrega: records.filter((r) => !r.entrega).length,
  };

  // Duplicates exact
  const keyCount = new Map();
  for (const r of records) {
    const key = [
      r.fecha instanceof Date ? r.fecha.toISOString().slice(0, 10) : r.fecha,
      normalizeName(r.producto),
      r.cantidad,
      normalizeName(r.area),
      normalizeName(r.quienRecibe),
    ].join('|');
    keyCount.set(key, (keyCount.get(key) || 0) + 1);
  }
  const exactDuplicates = [...keyCount.entries()].filter(([, c]) => c > 1);

  // Product stats
  const byProduct = new Map();
  for (const r of records) {
    if (!r.producto) continue;
    const p = byProduct.get(r.producto) || { count: 0, totalQty: 0, areas: new Set(), units: new Set() };
    p.count++;
    p.totalQty += Number(r.cantidad) || 0;
    if (r.area) p.areas.add(r.area);
    if (r.unidad) p.units.add(r.unidad);
    byProduct.set(r.producto, p);
  }

  const byArea = new Map();
  for (const r of records) {
    if (!r.area) continue;
    const a = byArea.get(r.area) || { count: 0, totalQty: 0, products: new Set() };
    a.count++;
    a.totalQty += Number(r.cantidad) || 0;
    if (r.producto) a.products.add(r.producto);
    byArea.set(r.area, a);
  }

  const units = [...new Set(records.map((r) => r.unidad).filter(Boolean))].sort();
  const excelProducts = [...byProduct.keys()].sort((a, b) => a.localeCompare(b, 'es'));

  // Compare products
  const matched = [];
  const excelOnly = [];
  const frontendOnly = [...frontendProducts];

  for (const ep of excelProducts) {
    let best = { name: null, score: 0 };
    for (const fp of frontendProducts) {
      const score = similarity(ep, fp);
      if (score > best.score) best = { name: fp, score };
    }
    if (best.score >= 0.6) {
      matched.push({ excel: ep, frontend: best.name, score: best.score });
      const idx = frontendOnly.indexOf(best.name);
      if (idx >= 0) frontendOnly.splice(idx, 1);
    } else {
      excelOnly.push(ep);
    }
  }

  // Ambiguous matches (multiple excel to same frontend)
  const frontendMatchGroups = new Map();
  for (const m of matched) {
    const arr = frontendMatchGroups.get(m.frontend) || [];
    arr.push(m);
    frontendMatchGroups.set(m.frontend, arr);
  }
  const ambiguousMatches = [...frontendMatchGroups.entries()].filter(([, arr]) => arr.length > 1);

  // Monthly aggregation
  const byMonth = new Map();
  for (const r of records) {
    if (!(r.fecha instanceof Date)) continue;
    const key = `${r.fecha.getFullYear()}-${String(r.fecha.getMonth() + 1).padStart(2, '0')}`;
    byMonth.set(key, (byMonth.get(key) || 0) + 1);
  }

  const invalidQty = records.filter((r) => r.cantidad != null && r.cantidad !== '' && isNaN(Number(r.cantidad)));

  const report = {
    summary: {
      totalRecords: records.length,
      sheetName: ws.name,
      columns: 7,
      dateRange: minDate && maxDate ? {
        from: minDate.toISOString().slice(0, 10),
        to: maxDate.toISOString().slice(0, 10),
      } : null,
      uniqueProducts: excelProducts.length,
      uniqueAreas: byArea.size,
      hasPrices: false,
      hasMonthlyMatrix: false,
      hasPedidosSheet: false,
      hasExistencias: false,
    },
    missingFields: missing,
    invalidQuantities: invalidQty.length,
    exactDuplicateGroups: exactDuplicates.length,
    exactDuplicateRecords: exactDuplicates.reduce((s, [, c]) => s + c, 0),
    topDuplicateExamples: exactDuplicates
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, c]) => ({ key: k, count: c })),
    units,
    monthlyRecordCounts: Object.fromEntries([...byMonth.entries()].sort()),
    areas: [...byArea.entries()]
      .map(([name, s]) => ({ name, records: s.count, totalQty: s.totalQty, uniqueProducts: s.products.size }))
      .sort((a, b) => b.records - a.records),
    products: [...byProduct.entries()]
      .map(([name, s]) => ({
        name,
        records: s.count,
        totalQty: s.totalQty,
        areas: [...s.areas],
        units: [...s.units],
      }))
      .sort((a, b) => b.records - a.records),
    comparison: {
      frontendProductCount: frontendProducts.length,
      excelProductCount: excelProducts.length,
      matchedCount: matched.length,
      excelOnlyCount: excelOnly.length,
      frontendOnlyCount: frontendOnly.length,
      matched,
      excelOnly,
      frontendOnly,
      ambiguousMatches: ambiguousMatches.map(([frontend, arr]) => ({
        frontend,
        excelVariants: arr.map((x) => x.excel),
      })),
    },
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
