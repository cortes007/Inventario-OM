import { useState } from 'react'
import { Download } from 'lucide-react'
import { reportService, toolService } from '../container'
import { useResource } from '../hooks/useResource'
import { download } from '../utils/csv'
import { Alert, Badge, Button, Card, Field } from '../components/ui'

const iso = (d) => d.toISOString().slice(0, 10)
const now = new Date()

export default function Reports() {
  const [flt, setFlt] = useState({ desde: iso(new Date(now.getFullYear(), now.getMonth(), 1)), hasta: iso(now), tipo: '' })
  const { data, loading, error } = useResource(() => reportService.movements(flt), [flt])
  const s = reportService.summary(data)
  const set = (k) => (e) => setFlt({ ...flt, [k]: e.target.value })
  const exportInventory = async () => download(reportService.inventoryCSV(await toolService.list()), `inventario_${iso(now)}.csv`)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-xl font-semibold">Informes</h2><p className="text-sm text-muted">Filtra por fechas y descarga el archivo para Excel.</p></div>
        <Button variant="ghost" onClick={exportInventory}><Download size={16} />Inventario actual</Button>
      </div>
      <Card className="flex flex-wrap items-end gap-3 p-4">
        <Field label="Desde"><input type="date" className="inp" value={flt.desde} onChange={set('desde')} /></Field>
        <Field label="Hasta"><input type="date" className="inp" value={flt.hasta} onChange={set('hasta')} /></Field>
        <Field label="Tipo"><select className="inp" value={flt.tipo} onChange={set('tipo')}><option value="">Todos</option><option value="ENTRADA">Entradas</option><option value="SALIDA">Salidas</option></select></Field>
        <Button disabled={!data.length} onClick={() => download(reportService.movementsCSV(data), `movimientos_${flt.desde}_${flt.hasta}.csv`)}><Download size={16} />Exportar movimientos</Button>
      </Card>
      <div className="grid grid-cols-3 gap-3">
        {[['Movimientos', s.total], ['Unidades que entraron', s.entradas], ['Unidades que salieron', s.salidas]].map(([l, v]) => (
          <Card key={l} className="p-4"><p className="text-xs text-muted">{l}</p><p className="mt-1 text-2xl font-semibold">{v}</p></Card>))}
      </div>
      <Alert>{error}</Alert>
      <Card className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-line"><tr>{['Referencia', 'Fecha', 'Tipo', 'Herramienta', 'Cant.', 'Responsable', 'Destino'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {data.map((m) => (<tr key={m.id}><td className="td font-mono text-brand">{m.codigo}</td><td className="td text-muted">{new Date(m.created_at).toLocaleString('es-CO')}</td>
              <td className="td"><Badge v={m.tipo} /></td><td className="td">{m.herramientas?.codigo} · {m.herramientas?.nombre}</td><td className="td">{m.cantidad}</td>
              <td className="td">{m.responsable}</td><td className="td text-muted">{m.destino || '—'}</td></tr>))}
            {!loading && !data.length && <tr><td colSpan={7} className="td py-10 text-center text-muted">No hay movimientos en este rango. Amplía las fechas.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
