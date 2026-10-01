// CSV con BOM y ';' para que Excel (regional es-CO) abra tildes y columnas correctamente.
export const toCSV = (rows) => {
  if (!rows.length) return ''
  const cols = Object.keys(rows[0])
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  return '\uFEFF' + [cols.map(esc).join(';'), ...rows.map((r) => cols.map((c) => esc(r[c])).join(';'))].join('\n')
}
export const download = (content, name) => {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
  a.download = name; a.click(); URL.revokeObjectURL(a.href)
}
