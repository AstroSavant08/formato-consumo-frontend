/**
 * Análisis de solo lectura de Consumo_DESARROLLO.xlsx
 * No modifica el archivo original.
 */
import ExcelJS from 'exceljs';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXCEL_PATH = join(__dirname, '..', 'docs', 'Consumo_DESARROLLO.xlsx');

function cellValue(cell) {
  if (!cell || cell.value == null) return null;
  const v = cell.value;
  if (typeof v === 'object') {
    if (v.formula) return v.result ?? v.formula;
    if (v.richText) return v.richText.map((t) => t.text).join('');
    if (v.text) return v.text;
    if (v instanceof Date) return v.toISOString();
    if (Array.isArray(v)) return v.map(cellValue).join(', ');
  }
  return v;
}

function inferType(values) {
  const nonNull = values.filter((v) => v != null && v !== '');
  if (nonNull.length === 0) return 'empty';
  let num = 0,
    str = 0,
    date = 0,
    bool = 0;
  for (const v of nonNull) {
    if (typeof v === 'boolean') bool++;
    else if (v instanceof Date) date++;
    else if (typeof v === 'number') num++;
    else if (typeof v === 'string') {
      if (/^\d{4}-\d{2}-\d{2}/.test(v) || /^\d{1,2}\/\d{1,2}\/\d{4}/.test(v)) date++;
      else if (!isNaN(Number(v.replace(/[,$.\s]/g, ''))) && /[\d]/.test(v)) num++;
      else str++;
    } else num++;
  }
  const types = [
    ['number', num],
    ['string', str],
    ['date', date],
    ['boolean', bool],
  ].sort((a, b) => b[1] - a[1]);
  return types[0][1] > 0 ? types[0][0] : 'mixed';
}

function normalizeName(s) {
  if (s == null) return '';
  return String(s)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);

  const report = {
    file: EXCEL_PATH,
    sheetCount: wb.worksheets.length,
    sheets: [],
  };

  for (const ws of wb.worksheets) {
    const rowCount = ws.rowCount;
    const colCount = ws.columnCount;

    // Detect header row (first non-empty row in first 5 rows)
    let headerRowIdx = 1;
    for (let r = 1; r <= Math.min(5, rowCount); r++) {
      const row = ws.getRow(r);
      let filled = 0;
      row.eachCell({ includeEmpty: false }, () => filled++);
      if (filled >= 2) {
        headerRowIdx = r;
        break;
      }
    }

    const headerRow = ws.getRow(headerRowIdx);
    const headers = [];
    headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
      headers[col] = cellValue(cell);
    });

    const maxCol = Math.max(headers.length - 1, colCount);
    const cleanHeaders = [];
    for (let c = 1; c <= maxCol; c++) {
      cleanHeaders.push(headers[c] ?? null);
    }

    // Sample data rows
    const dataStart = headerRowIdx + 1;
    const sampleRows = [];
    const columnSamples = cleanHeaders.map(() => []);
    const allColumnValues = cleanHeaders.map(() => []);

    for (let r = dataStart; r <= rowCount; r++) {
      const row = ws.getRow(r);
      let hasData = false;
      const rowData = [];
      for (let c = 1; c <= maxCol; c++) {
        const val = cellValue(row.getCell(c));
        rowData.push(val);
        if (val != null && val !== '') hasData = true;
        if (val != null && val !== '') {
          allColumnValues[c - 1].push(val);
          if (columnSamples[c - 1].length < 5) columnSamples[c - 1].push(val);
        }
      }
      if (hasData && sampleRows.length < 8) sampleRows.push({ row: r, data: rowData });
    }

    const columns = cleanHeaders.map((h, i) => ({
      index: i + 1,
      header: h,
      inferredType: inferType(allColumnValues[i]),
      nonEmptyCount: allColumnValues[i].length,
      samples: columnSamples[i],
    }));

    // Count non-empty data rows
    let dataRowCount = 0;
    for (let r = dataStart; r <= rowCount; r++) {
      const row = ws.getRow(r);
      let hasData = false;
      row.eachCell({ includeEmpty: false }, () => {
        hasData = true;
      });
      if (hasData) dataRowCount++;
    }

    // Extract unique product-like and area-like columns heuristically
    const productCols = columns.filter((c) => {
      const h = normalizeName(c.header);
      return /producto|articulo|item|insumo|material|descripcion/.test(h);
    });
    const areaCols = columns.filter((c) => {
      const h = normalizeName(c.header);
      return /area|departamento|seccion|uso|destino/.test(h);
    });
    const monthCols = columns.filter((c) => {
      const h = normalizeName(String(c.header ?? ''));
      return /^(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|enero|febrero|marzo)/.test(h);
    });

    const uniqueProducts = new Set();
    const uniqueAreas = new Set();

    for (const col of productCols) {
      allColumnValues[col.index - 1].forEach((v) => {
        if (v != null && String(v).trim()) uniqueProducts.add(String(v).trim());
      });
    }
    for (const col of areaCols) {
      allColumnValues[col.index - 1].forEach((v) => {
        if (v != null && String(v).trim()) uniqueAreas.add(String(v).trim());
      });
    }

    // If no explicit product column, try first text column with many unique values
    if (uniqueProducts.size === 0) {
      for (const col of columns) {
        if (col.inferredType === 'string' && col.nonEmptyCount > 5) {
          const uniq = new Set(allColumnValues[col.index - 1].map((v) => String(v).trim()));
          if (uniq.size >= 3 && uniq.size <= 200) {
            uniq.forEach((v) => uniqueProducts.add(v));
            break;
          }
        }
      }
    }

    report.sheets.push({
      name: ws.name,
      rowCount,
      colCount: maxCol,
      headerRowIdx,
      dataRowCount,
      headers: cleanHeaders,
      columns,
      monthColumnCount: monthCols.length,
      monthHeaders: monthCols.map((c) => c.header),
      sampleRows,
      uniqueProductCount: uniqueProducts.size,
      uniqueProducts: [...uniqueProducts].sort((a, b) => a.localeCompare(b, 'es')),
      uniqueAreaCount: uniqueAreas.size,
      uniqueAreas: [...uniqueAreas].sort((a, b) => a.localeCompare(b, 'es')),
    });
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
