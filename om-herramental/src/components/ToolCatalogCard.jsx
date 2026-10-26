import { useEffect } from 'react'
import { ChevronDown, Eye, Pencil, Plus } from 'lucide-react'
import { Badge, Button, Card } from './ui'

/**
 * Tarjeta de Catálogo de Herramienta.
 * Representa una familia de activos individuales agrupados por nombre y categoría.
 * Soporta animación de expansión a fila completa (col-span-full) y reordenamiento superior (order-first).
 */
export default function ToolCatalogCard({
  item,
  isExpanded,
  onToggle,
  onViewDetail,
  onEditTool,
  onAddAsset,
}) {
  const cardElementId = `catalog-card-${item.id}`

  useEffect(() => {
    if (isExpanded) {
      const element = document.getElementById(cardElementId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }, [isExpanded, cardElementId])

  return (
    <Card
      id={cardElementId}
      className={`min-w-0 transition-all duration-300 ease-in-out ${
        isExpanded
          ? 'col-span-full order-first border-brand/50 bg-panel shadow-lg ring-1 ring-brand/30'
          : 'col-span-1 order-none hover:border-brand/30 hover:bg-white/[0.01]'
      }`}
    >
      {/* Cabecera interactiva del bloque */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
        className="flex cursor-pointer flex-col gap-3 p-4 select-none sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-line bg-bg px-2 py-0.5 text-xs font-medium text-muted">
              {item.categoria}
            </span>
            <span className="text-xs text-muted">
              {item.total} {item.total === 1 ? 'activo' : 'activos'}
            </span>
          </div>
          <h3 className="mt-1 truncate text-base font-semibold text-white">
            {item.nombre}
          </h3>
          {/* Métricas rápidas de disponibilidad */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {item.disponibles > 0 && (
              <span className="rounded-full bg-emerald-950/80 px-2 py-0.5 text-xs font-medium text-brand">
                {item.disponibles} disp.
              </span>
            )}
            {item.enUso > 0 && (
              <span className="rounded-full bg-orange-950/80 px-2 py-0.5 text-xs font-medium text-orange-400">
                {item.enUso} en uso
              </span>
            )}
            {item.enReparacion > 0 && (
              <span className="rounded-full bg-amber-950/80 px-2 py-0.5 text-xs font-medium text-amber-400">
                {item.enReparacion} rep.
              </span>
            )}
            {item.bajas > 0 && (
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400">
                {item.bajas} baja
              </span>
            )}
          </div>
        </div>

        {/* Acciones y control de expansión */}
        <div className="flex items-center justify-between gap-2 border-t border-line/60 pt-2 sm:border-t-0 sm:pt-0">
          <Button
            type="button"
            variant="ghost"
            className="text-xs"
            onClick={(e) => {
              e.stopPropagation()
              onAddAsset(item.nombre, item.categoria)
            }}
          >
            <Plus size={14} />
            <span>+ Activo</span>
          </Button>

          <div
            className={`flex h-8 w-8 items-center justify-center rounded-md border border-line text-muted transition-transform duration-300 ${
              isExpanded ? 'rotate-180 border-brand/50 text-brand' : 'hover:text-white'
            }`}
            title={isExpanded ? 'Contraer' : 'Expandir activos'}
          >
            <ChevronDown size={18} />
          </div>
        </div>
      </div>

      {/* Cuerpo expandido: Listado detallado de activos individuales */}
      {isExpanded && (
        <div className="border-t border-line/70 bg-bg/40 p-4 transition-all duration-300 ease-in-out">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted">
              Activos individuales asociados a este modelo ({item.activos.length})
            </p>
            <Button
              type="button"
              variant="ghost"
              className="text-xs sm:hidden"
              onClick={(e) => {
                e.stopPropagation()
                onAddAsset(item.nombre, item.categoria)
              }}
            >
              <Plus size={14} />
              <span>Registrar otro {item.nombre}</span>
            </Button>
          </div>

          {/* Vista tabular en escritorio */}
          <div className="hidden min-w-0 md:block">
            <div className="overflow-x-auto rounded-md border border-line bg-panel">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-panel text-xs text-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Código de activo</th>
                    <th className="px-4 py-2.5 font-medium">Ubicación actual</th>
                    <th className="px-4 py-2.5 font-medium">Estado</th>
                    <th className="px-4 py-2.5 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {item.activos.map((asset) => (
                    <tr key={asset.id} className="hover:bg-white/[0.02]">
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-brand">
                        {asset.codigo}
                      </td>
                      <td className="px-4 py-2.5 text-muted">
                        {asset.ubicacion || 'Bodega'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <Badge v={asset.calculatedStatus} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right">
                        <button
                          type="button"
                          aria-label={`Ver detalle ${asset.codigo}`}
                          title="Ver detalle"
                          className="p-1 text-muted hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation()
                            onViewDetail(asset)
                          }}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Editar ${asset.codigo}`}
                          title="Editar"
                          className="ml-1 p-1 text-muted hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation()
                            onEditTool(asset)
                          }}
                        >
                          <Pencil size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vista de tarjetas en móvil */}
          <div className="space-y-2.5 md:hidden">
            {item.activos.map((asset) => (
              <div
                key={asset.id}
                className="rounded-md border border-line bg-panel p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs font-semibold text-brand">
                      {asset.codigo}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Ubicación: <span className="text-zinc-200">{asset.ubicacion || 'Bodega'}</span>
                    </p>
                  </div>
                  <Badge v={asset.calculatedStatus} />
                </div>
                <div className="mt-3 flex justify-end gap-2 border-t border-line/60 pt-2">
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted hover:bg-line hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation()
                      onViewDetail(asset)
                    }}
                  >
                    <Eye size={14} />
                    <span>Detalle</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted hover:bg-line hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditTool(asset)
                    }}
                  >
                    <Pencil size={14} />
                    <span>Editar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
