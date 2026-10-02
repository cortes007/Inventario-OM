import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Wrench } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { inventoryRealtimeService, movementService, toolService } from '../container'
import { useResource } from '../hooks/useResource'
import { Alert, Card } from '../components/ui'

const METRICS = [
  { key: 'available', label: 'En bodega', icon: Wrench, color: 'text-brand' },
  { key: 'out', label: 'En obra / prestadas', icon: ArrowUpFromLine, color: 'text-orange-400' },
  { key: 'low', label: 'Alertas de bajo stock', icon: AlertTriangle, color: 'text-amber-400' },
  { key: 'repair', label: 'En mantenimiento', icon: ArrowDownToLine, color: 'text-sky-400' },
]

export default function Dashboard() {
  const refreshTimer = useRef(null)
  const [realtimeError, setRealtimeError] = useState('')
  const { data: snapshot, loading, error, reload } = useResource(
    () => Promise.all([toolService.list(), movementService.outstandingByTool()]),
  )
  useEffect(() => {
    const unsubscribe = inventoryRealtimeService.subscribe(() => {
      window.clearTimeout(refreshTimer.current)
      refreshTimer.current = window.setTimeout(reload, 200)
    }, (subscriptionError) => setRealtimeError(subscriptionError?.message || ''))
    const fallbackRefresh = window.setInterval(reload, 30_000)
    return () => {
      unsubscribe()
      window.clearInterval(fallbackRefresh)
      window.clearTimeout(refreshTimer.current)
    }
  }, [reload])
  const [tools = [], movements = []] = snapshot || []
  const outstanding = movements
  const metrics = {
    available: tools.reduce((sum, tool) => sum + (tool.estado === 'DISPONIBLE' ? tool.stock_actual : 0), 0),
    out: Object.values(outstanding).reduce((sum, quantity) => sum + Math.max(0, quantity), 0),
    low: tools.filter((tool) => tool.estado !== 'BAJA' && tool.stock_actual <= tool.stock_minimo).length,
    repair: tools.filter((tool) => tool.estado === 'EN_REPARACION').length,
  }
  const lowTools = tools.filter((tool) => tool.estado !== 'BAJA' && tool.stock_actual <= tool.stock_minimo)
    .sort((a, b) => a.stock_actual - b.stock_actual).slice(0, 5)

  return (
    <div className="space-y-5">
      <div><h2 className="text-xl font-semibold">Panel de inventario</h2><p className="text-sm text-muted">Actualización por cambios de inventario, con recarga de respaldo cada 30 segundos.</p></div>
      {error && <Alert>{error} <button type="button" className="ml-2 underline" onClick={reload}>Reintentar</button></Alert>}
      {realtimeError && <p role="status" className="text-xs text-amber-400">{realtimeError}</p>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.map(({ key, label, icon: Icon, color }) => <Card key={key} className="p-4">
          <div className="flex items-center justify-between gap-2"><p className="text-sm text-muted">{label}</p><Icon size={18} className={color} /></div>
          <p className={`mt-2 text-3xl font-semibold ${color}`}>{loading && !snapshot.length ? '—' : metrics[key]}</p>
          <p className="mt-1 text-xs text-muted">{key === 'low' ? 'herramientas activas bajo su mínimo' : key === 'repair' ? 'herramientas en reparación' : 'unidades'}</p>
        </Card>)}
      </div>
      <Card className="p-4">
        <h3 className="font-medium">Alertas de reposición</h3>
        <p className="mb-3 text-sm text-muted">Herramientas disponibles cuyo stock alcanzó el mínimo o está por debajo.</p>
        <div className="divide-y divide-line">
          {lowTools.map((tool) => <div key={tool.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div><p className="text-sm font-medium">{tool.nombre}</p><p className="text-xs text-muted">{tool.codigo} · {tool.categoria}</p></div>
            <p className="text-sm text-amber-400">{tool.stock_actual} disponibles <span className="text-muted">/ mínimo {tool.stock_minimo}</span></p>
          </div>)}
          {!loading && !lowTools.length && <p className="py-5 text-center text-sm text-muted">No hay alertas de stock bajo.</p>}
        </div>
      </Card>
    </div>
  )
}
