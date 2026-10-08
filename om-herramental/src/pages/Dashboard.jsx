import { useMemo, useState } from 'react'
import { Archive, ArrowLeftRight, ArrowUpFromLine, CheckCircle2, Package, Plus, Wrench } from 'lucide-react'
import { movementService, toolService } from '../container'
import { useResource } from '../hooks/useResource'
import { useInventoryRealtime } from '../hooks/useInventoryRealtime'
import { currentToolStatus } from '../utils/inventory'
import { Alert, Badge, Card } from '../components/ui'

const METRICS = [
  { key: 'total', label: 'Total de activos', icon: Package, color: 'text-brand', status: null },
  { key: 'available', label: 'Disponibles', icon: CheckCircle2, color: 'text-emerald-400', status: 'DISPONIBLE' },
  { key: 'inUse', label: 'En uso', icon: ArrowUpFromLine, color: 'text-orange-400', status: 'EN_USO' },
  { key: 'repair', label: 'En reparación', icon: Wrench, color: 'text-amber-400', status: 'EN_REPARACION' },
  { key: 'retired', label: 'Dados de baja', icon: Archive, color: 'text-zinc-400', status: 'BAJA' },
]

export default function Dashboard({ onNavigate }) {
  const [selectedStatus, setSelectedStatus] = useState(null)
  const { data: snapshot, initialLoading, error, reload } = useResource(
    () => Promise.all([toolService.list(), movementService.outstandingByTool()]),
  )
  const { connected, error: realtimeError } = useInventoryRealtime(reload)
  const [tools = [], outstanding = {}] = snapshot || []
  const metrics = {
    total: tools.length,
    available: tools.filter((tool) => currentToolStatus(tool, outstanding[tool.id] || 0) === 'DISPONIBLE').length,
    inUse: tools.filter((tool) => currentToolStatus(tool, outstanding[tool.id] || 0) === 'EN_USO').length,
    repair: tools.filter((tool) => currentToolStatus(tool, outstanding[tool.id] || 0) === 'EN_REPARACION').length,
    retired: tools.filter((tool) => currentToolStatus(tool, outstanding[tool.id] || 0) === 'BAJA').length,
  }
  const visibleTools = useMemo(() => selectedStatus
    ? tools.filter((tool) => currentToolStatus(tool, outstanding[tool.id] || 0) === selectedStatus)
    : tools, [tools, selectedStatus, outstanding])

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl border border-line bg-panel">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-4">
            <div className="hidden shrink-0 rounded-xl border border-brand/20 bg-bg p-3 text-brand sm:block">
              <Package size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Control de activos</p>
              <h2 className="mt-1 text-2xl font-semibold">Panel de inventario</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                Cuidar cada activo impulsa cada proyecto: orden, disponibilidad y confianza en cada obra.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigate?.('tools')}
              className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-line"
            >
              <Plus size={16} /> Gestionar activos
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.('movs')}
              className="inline-flex items-center gap-2 rounded-md bg-brand px-3 py-2 text-sm font-medium text-black transition hover:bg-brand-dark"
            >
              <ArrowLeftRight size={16} /> Registrar movimiento
            </button>
          </div>
        </div>
        {(realtimeError || connected) && (
          <div className="border-t border-line px-5 py-2.5 sm:px-6">
            {realtimeError
              ? <p role="status" className="text-xs text-amber-400">Realtime no conectado ({realtimeError}). Actualizando cada 5 segundos.</p>
              : <p role="status" className="text-xs text-brand">Conectado a actualizaciones en tiempo real.</p>}
          </div>
        )}
      </section>
      {error && <Alert>{error} <button type="button" className="ml-2 underline" onClick={reload}>Reintentar</button></Alert>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {METRICS.map(({ key, label, icon: Icon, color, status }) => {
          const active = status ? selectedStatus === status : selectedStatus === null
          return <button key={key} type="button" aria-pressed={active}
            onClick={() => setSelectedStatus(status)}
            className={`rounded-lg border bg-panel p-3 text-left transition hover:border-brand/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${active ? 'border-brand/60 ring-1 ring-brand/30' : 'border-line'}`}>
            <div className="flex items-center justify-between gap-2"><p className="text-sm text-muted">{label}</p><Icon size={18} className={color} /></div>
            <p className={`mt-2 text-3xl font-semibold ${color}`}>{initialLoading ? '—' : metrics[key]}</p>
            <p className="mt-1 text-xs text-muted">activos registrados</p>
          </button>
        })}
      </div>
      <Card className="min-w-0 overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          <h3 className="font-medium">
            Activos registrados{selectedStatus ? ` · ${METRICS.find((metric) => metric.status === selectedStatus)?.label}` : ''}
          </h3>
          <span className="shrink-0 text-xs text-muted">{visibleTools.length} activos</span>
        </div>
        <div className="max-h-96 overflow-auto">
          <table className="hidden w-full min-w-[600px] md:table">
            <thead className="border-b border-line">
              <tr>{['Activo', 'Categoría', 'Ubicación actual', 'Estado'].map((heading) => <th key={heading} className="th whitespace-nowrap">{heading}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visibleTools.map((tool) => {
                const status = currentToolStatus(tool, outstanding[tool.id] || 0)
                return (
                  <tr key={tool.id}>
                    <td className="td">
                      <p className="font-medium text-white">{tool.nombre || '—'}</p>
                      <p className="mt-0.5 font-mono text-xs text-muted">{tool.codigo || '—'}</p>
                    </td>
                    <td className="td">{tool.categoria || '—'}</td>
                    <td className={`td capitalize ${tool.ubicacion ? '' : 'text-muted'}`}>{tool.ubicacion || 'No asignada'}</td>
                    <td className="td"><Badge v={status} /></td>
                  </tr>
                )
              })}
              {!visibleTools.length && <tr><td colSpan={4} className="td py-8 text-center text-muted">{initialLoading ? 'Cargando activos…' : 'No hay activos para este estado.'}</td></tr>}
            </tbody>
          </table>
          <div className="divide-y divide-line md:hidden">
            {visibleTools.map((tool) => {
              const status = currentToolStatus(tool, outstanding[tool.id] || 0)
              return (
                <article key={tool.id} className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{tool.nombre || '—'}</p>
                    <p className="mt-0.5 font-mono text-xs text-muted">{tool.codigo || '—'}</p>
                    <p className="mt-1 text-xs capitalize text-muted">{tool.ubicacion || 'No asignada'}</p>
                  </div>
                  <Badge v={status} />
                </article>
              )
            })}
            {!visibleTools.length && <p className="px-4 py-8 text-center text-sm text-muted">{initialLoading ? 'Cargando activos…' : 'No hay activos para este estado.'}</p>}
          </div>
        </div>
      </Card>
    </div>
  )
}
