import { currentToolStatus } from './inventory'

/**
 * Agrupa una lista de herramientas (activos serializados individuales)
 * en un catálogo consolidado por tipo de herramienta (mismo nombre y categoría).
 *
 * @param {Array<Object>} tools - Lista de activos individuales.
 * @param {Object} [outstanding={}] - Diccionario de préstamos pendientes por herramienta ID.
 * @returns {Array<Object>} Lista de bloques de catálogo consolidados.
 */
export function groupToolsCatalog(tools, outstanding = {}) {
  if (!Array.isArray(tools) || tools.length === 0) {
    return []
  }

  const catalogMap = new Map()

  for (const tool of tools) {
    if (!tool || typeof tool !== 'object') continue

    const nombre = (tool.nombre || '').trim()
    const categoria = (tool.categoria || 'General').trim()
    const groupKey = `${nombre.toLowerCase()}____${categoria.toLowerCase()}`

    const loanedCount = outstanding ? (outstanding[tool.id] || 0) : 0
    const calculatedStatus = currentToolStatus(tool, loanedCount)
    const enrichedTool = { ...tool, calculatedStatus }

    if (!catalogMap.has(groupKey)) {
      catalogMap.set(groupKey, {
        id: groupKey,
        nombre: nombre || 'Sin nombre',
        categoria: categoria || 'General',
        total: 0,
        disponibles: 0,
        enUso: 0,
        enReparacion: 0,
        bajas: 0,
        activos: [],
      })
    }

    const group = catalogMap.get(groupKey)
    group.total += 1
    group.activos.push(enrichedTool)

    switch (calculatedStatus) {
      case 'DISPONIBLE':
        group.disponibles += 1
        break
      case 'EN_USO':
        group.enUso += 1
        break
      case 'EN_REPARACION':
        group.enReparacion += 1
        break
      case 'BAJA':
        group.bajas += 1
        break
      default:
        group.disponibles += 1
        break
    }
  }

  return Array.from(catalogMap.values()).sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
  )
}

/**
 * Posiciona la cámara del navegador directamente sobre la cabecera (`block: 'start'`)
 * de la tarjeta de catálogo expandida tras completarse el reflujo del layout (`order-first`).
 *
 * @param {HTMLElement|null} element - Elemento DOM de la tarjeta expandida.
 * @param {Function} [scheduleFrame] - Planificador de frame (por defecto requestAnimationFrame).
 * @param {Function} [cancelFrame] - Cancelador de frame (por defecto cancelAnimationFrame).
 * @returns {Function|undefined} Función de limpieza para cancelar el frame si sigue pendiente.
 */
export function scrollCatalogCardIntoView(
  element,
  scheduleFrame = typeof globalThis.requestAnimationFrame === 'function'
    ? globalThis.requestAnimationFrame.bind(globalThis)
    : (cb) => {
        cb()
        return 0
      },
  cancelFrame = typeof globalThis.cancelAnimationFrame === 'function'
    ? globalThis.cancelAnimationFrame.bind(globalThis)
    : () => {}
) {
  if (!element || typeof element.scrollIntoView !== 'function') {
    return undefined
  }

  const frameId = scheduleFrame(() => {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest',
    })
  })

  return () => {
    if (frameId) {
      cancelFrame(frameId)
    }
  }
}
