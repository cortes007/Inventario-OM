import { useState } from 'react'
import { FileSpreadsheet, FileText, Sparkles } from 'lucide-react'
import { movementService, reportService, toolService } from '../container'
import { useResource } from '../hooks/useResource'

import { Alert, Badge, Button, Card, Field } from '../components/ui'

const iso = (d) => d.toISOString().slice(0, 10)
const now = new Date()

export default function Reports() {
  const [flt, setFlt] = useState({ desde: iso(new Date(now.getFullYear(), now.getMonth(), 1)), hasta: iso(now), tipo: '' })
  const { data, loading, error } = useResource(() => reportService.movements(flt), [flt])
  const [exportError, setExportError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [analisisIA, setAnalisisIA] = useState('')
  const [cargandoIA, setCargandoIA] = useState(false)
  const s = reportService.summary(data)
  const set = (k) => (e) => setFlt({ ...flt, [k]: e.target.value })
  const inventoryRows = async () => {
    const [tools, outstanding] = await Promise.all([toolService.list(), movementService.outstandingByTool()])
    return reportService.inventoryRowsWithMovements(tools, outstanding)
  }
  const exportInventory = async (format) => {
    setExportError('')
    setExporting(true)
    try {
      const rows = await inventoryRows()
      if (format === 'xlsx') {
        const { exportXlsx } = await import('../utils/spreadsheet')
        exportXlsx(rows, `inventario_${iso(now)}.xlsx`)
      } else if (format === 'pdf') {
        const { exportPdf } = await import('../utils/pdf')
        exportPdf(rows, `inventario_${iso(now)}.pdf`, 'Inventario actual de herramientas')
      }
    } catch (exportFailure) {
      setExportError(exportFailure.message)
    } finally {
      setExporting(false)
    }
  }
  const exportMovements = async () => {
    setExportError('')
    setExporting(true)
    try {
      const { exportXlsx } = await import('../utils/spreadsheet')
      const rows = reportService.movementRows(data)
      exportXlsx(rows, `movimientos_${flt.desde}_${flt.hasta}.xlsx`, 'Movimientos')
    } catch (exportFailure) {
      setExportError(exportFailure.message)
    } finally {
      setExporting(false)
    }
  }
  const analizarMovimientos = async () => {
    setExportError('')
    setCargandoIA(true)
    setAnalisisIA('')
    try {
      const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
      const response = await fetch(`${apiBaseUrl}/api/analizar-movimientos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fechaDesde: flt.desde,
          fechaHasta: flt.hasta,
          totalMovimientos: s.total,
          totalEntradas: s.entradas,
          totalSalidas: s.salidas,
          datosTabla: data,
        }),
      })
      const responseText = await response.text()
      let result
      try {
        result = responseText ? JSON.parse(responseText) : {}
      } catch {
        throw new Error(`El backend devolvió una respuesta no válida (HTTP ${response.status}). Verifica que el servicio de análisis esté activo.`)
      }
      if (!response.ok) throw new Error(result.error || 'Error desconocido')
      if (typeof result.analisis !== 'string' || !result.analisis.trim()) {
        throw new Error('El backend no devolvió un análisis. Revisa los logs del backend.')
      }
      setAnalisisIA(result.analisis)
    } catch (err) {
      setExportError(err instanceof TypeError
        ? 'No se pudo conectar con el backend de análisis. Inícialo y verifica que esté disponible.'
        : err.message)
    } finally {
      setCargandoIA(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0"><h2 className="text-xl font-semibold">Informes</h2><p className="text-sm text-muted">Filtra los movimientos y exporta el inventario actual.</p></div>
        <div className="flex min-w-0 flex-wrap gap-2">
          <Button variant="ghost" disabled={exporting} onClick={() => exportInventory('xlsx')}><FileSpreadsheet size={16} />Inventario XLSX</Button>
          <Button variant="ghost" disabled={exporting} onClick={() => exportInventory('pdf')}><FileText size={16} />Inventario PDF</Button>
        </div>
      </div>
      <Card className="grid min-w-0 grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[repeat(3,minmax(150px,1fr))_auto] xl:items-end">
        <Field label="Desde"><input type="date" className="inp min-w-0" value={flt.desde} onChange={set('desde')} /></Field>
        <Field label="Hasta"><input type="date" className="inp min-w-0" value={flt.hasta} onChange={set('hasta')} /></Field>
        <Field label="Tipo"><select className="inp min-w-0" value={flt.tipo} onChange={set('tipo')}><option value="">Todos</option><option value="ENTRADA">Entradas</option><option value="SALIDA">Salidas</option></select></Field>
        <Button className="w-full justify-center sm:col-span-2 xl:col-span-1" disabled={loading || exporting || cargandoIA || !data.length} onClick={analizarMovimientos}><Sparkles size={16} />{cargandoIA ? 'Analizando...' : 'Analizar Movimientos con IA'}</Button>
      </Card>
      <Alert>{exportError}</Alert>
      {analisisIA && (
        <Card className="border-brand/30 bg-brand/5 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles size={18} className="text-brand" />
            <h3 className="font-semibold text-brand">Resumen Ejecutivo — Análisis con IA</h3>
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed">{analisisIA}</p>
          <div className="mt-4 border-t border-brand/20 pt-3">
            <Button variant="ghost" className="text-xs" disabled={exporting} onClick={exportMovements}><FileSpreadsheet size={14} />Exportar a Excel</Button>
          </div>
        </Card>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[['Movimientos', s.total], ['Unidades que entraron', s.entradas], ['Unidades que salieron', s.salidas]].map(([l, v]) => (
          <Card key={l} className="p-4"><p className="text-xs text-muted">{l}</p><p className="mt-1 text-2xl font-semibold">{v}</p></Card>))}
      </div>
      <Alert>{error}</Alert>
      <Card className="max-h-[min(70dvh,720px)] min-w-0 overflow-auto">
        <table className="w-full min-w-[1100px]">
          <thead className="sticky top-0 z-10 border-b border-line bg-panel"><tr>{['Referencia', 'Fecha', 'Tipo', 'Código de activo', 'Herramienta', 'Cant.', 'Responsable', 'Destino', 'Observación'].map((h) => <th key={h} className="th whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {data.map((m) => (<tr key={m.id}><td className="td font-mono text-brand">{m.codigo}</td><td className="td text-muted">{new Date(m.created_at).toLocaleString('es-CO')}</td>
              <td className="td"><Badge v={m.tipo} /></td><td className="td font-mono text-brand">{m.herramientas?.codigo || '—'}</td>
              <td className="td">{m.herramientas?.nombre || '—'}</td><td className="td">{m.cantidad}</td>
              <td className="td">{m.responsable || '—'}</td><td className="td text-muted">{m.destino || '—'}</td>
              <td className="td text-muted">{m.observacion || '—'}</td></tr>))}
            {!loading && !data.length && <tr><td colSpan={9} className="td py-10 text-center text-muted">No hay movimientos en este rango. Amplía las fechas.</td></tr>}
          </tbody>
        </table>
        {!loading && data.length > 9 && <p className="border-t border-line bg-panel px-4 py-3 text-xs text-muted">Hay {data.length} movimientos; desplázate en la tabla para consultarlos. Excel incluye todo el resultado filtrado.</p>}
      </Card>
    </div>
  )
}
