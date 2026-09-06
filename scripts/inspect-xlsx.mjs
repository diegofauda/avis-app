import ExcelJS from "exceljs";

const file = process.argv[2];
const maxRows = Number(process.argv[3] || 22);
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(file);

console.log("ARCHIVO:", file);
console.log("HOJAS:", wb.worksheets.map((w) => w.name).join(" | "));

function cellStr(c) {
  const v = c.value;
  if (v == null) return "";
  if (typeof v === "object") {
    if (v.formula != null) return `=${v.formula}${v.result != null ? ` →${v.result}` : ""}`;
    if (v.result != null) return String(v.result);
    if (v.richText) return v.richText.map((t) => t.text).join("");
    if (v.text != null) return String(v.text);
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (v.error) return v.error;
    return JSON.stringify(v);
  }
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

for (const ws of wb.worksheets) {
  console.log(`\n===== HOJA: "${ws.name}"  (filas ${ws.rowCount}, cols ${ws.columnCount}) =====`);
  const rows = Math.min(ws.rowCount, maxRows);
  const cols = Math.min(ws.columnCount, 16);
  for (let r = 1; r <= rows; r++) {
    const row = ws.getRow(r);
    const cells = [];
    for (let c = 1; c <= cols; c++) {
      const s = cellStr(row.getCell(c)).replace(/\s+/g, " ").trim();
      if (s !== "") cells.push(`${String.fromCharCode(64 + c)}${r}:${s}`);
    }
    if (cells.length) console.log(cells.join("  |  "));
  }
}
