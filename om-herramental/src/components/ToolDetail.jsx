import { useMemo } from 'react'
import { CalendarClock } from 'lucide-react'
import { movementService, toolStatusService } from '../container'
import { useResource } from '../hooks/useResource'
import { currentToolStatus, outstandingByTool, statusLabel } from '../utils/inventory'
import { Alert, Badge, Card, Modal } from './ui'
import ToolDocuments from './ToolDocuments'

const date = (value) => new Date(value).toLocaleString('es-CO')

export default function ToolDetail({ tool, onClose }) {
  const { data: movements, error: movementError } = useResource(() => movementService.forTool(tool.id), [tool.id])
  const { data: statusHistory, error: statusError } = useResource(() => toolStatusService.forTool(tool.id), [tool.id])
  const events = useMemo(() => [
    {
      id: `initial-${tool.id}`,
      date: tool.created_at,
      title: `Estado inicial: ${statusLabel(statusHistory.at(-1)?.estado_anterior || tool.estado)}`,
      description: 'Alta de la herramienta',
      status: statusHistory.at(-1)?.estado_anterior || tool.estado,
    },
    ...movements.map((movement) => ({
      id: movement.id,
      date: movement.created_at,
      title: `${movement.tipo === 'SALIDA' ? 'Salida' : 'Entrada'} · ${movement.cantidad} unidad(es)`,
      description: [movement.responsable, movement.destino, movement.observacion].filter(Boolean).join(' · '),
      status: movement.tipo,
    })),
    ...statusHistory.map((change) => ({
      id: change.id,
      date: change.created_at,
      title: `Estado: ${statusLabel(change.estado_anterior)} → ${statusLabel(change.estado_nuevo)}`,
      description: 'Cambio de estado',
      status: change.estado_nuevo,
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)), [movements, statusHistory, tool.created_at, tool.estado, tool.id])
  const outstanding = outstandingByTool(movements)[tool.id] || 0
  const status = currentToolStatus(tool, outstanding)

  return (
    <Modal title={`Detalle · ${tool.codigo}`} onClose={onClose} className="max-w-3xl">
      <div className="space-y-6">
        {(movementError || statusError) && <Alert>{movementError || statusError}</Alert>}
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div><h4 className="text-lg font-semibold">{tool.nombre}</h4><p className="text-sm text-muted">{tool.categoria} · {tool.ubicacion || 'Ubicación no indicada'}</p></div>
            <Badge v={status} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[['Código de activo', tool.codigo], ['Unidades en bodega', tool.stock_actual], ['Stock mínimo', tool.stock_minimo]].map(([label, value]) => (
              <Card key={label} className="p-3"><p className="text-xs text-muted">{label}</p><p className="mt-1 font-medium">{value}</p></Card>
            ))}
          </div>
        </section>
        <ToolDocuments toolId={tool.id} />
        <section className="space-y-3">
          <div className="flex items-center gap-2"><CalendarClock size={17} className="text-brand" /><h4 className="font-medium">Historial de movimientos y estados</h4></div>
          {events.map((event) => <div key={event.id} className="flex gap-3 border-l border-line pl-4">
            <div className="min-w-0 flex-1 pb-3">
              <div className="flex flex-wrap items-center gap-2"><Badge v={event.status} /><span className="text-sm font-medium">{event.title}</span></div>
              {event.description && <p className="mt-1 text-xs text-muted">{event.description}</p>}
              <time className="mt-1 block text-xs text-muted">{date(event.date)}</time>
            </div>
          </div>)}
          {!events.length && <p className="text-sm text-muted">Aún no hay movimientos ni cambios de estado.</p>}
        </section>
      </div>
    </Modal>
  )
}
