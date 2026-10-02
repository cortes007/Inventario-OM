import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function exportPdf(rows, filename, title) {
  if (!rows.length) throw new Error('No hay filas para exportar')
  const document = new jsPDF({ orientation: 'landscape' })
  document.setFontSize(16)
  document.text(title, 14, 15)
  autoTable(document, {
    startY: 22,
    head: [Object.keys(rows[0])],
    body: rows.map((row) => Object.values(row).map((value) => String(value ?? ''))),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [16, 185, 129] },
  })
  document.save(filename)
}
