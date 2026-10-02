export class MovementService {
  constructor(movRepo) { this.movs = movRepo }
  history() { return this.movs.recent(10) }
  forTool(toolId) { return this.movs.forTool(toolId) }
  outstandingByTool() { return this.movs.outstandingByTool() }
  register(m) {
    if (!m.herramienta_id) throw new Error('Selecciona una herramienta')
    if (!(m.cantidad > 0)) throw new Error('La cantidad debe ser mayor a 0')
    if (!m.responsable?.trim()) throw new Error('Indica quién recibe o devuelve')
    return this.movs.create({ ...m, cantidad: Number(m.cantidad), responsable: m.responsable.trim() })
  }
  registerBatch({ items, responsable, destino, observacion }) {
    if (!Array.isArray(items) || !items.length) throw new Error('Agrega al menos una herramienta a la salida')
    if (!responsable?.trim()) throw new Error('Indica quién recibe las herramientas')
    const uniqueTools = new Set()
    const normalizedItems = items.map((item) => {
      if (!item.herramienta_id) throw new Error('Selecciona una herramienta en cada fila')
      if (uniqueTools.has(item.herramienta_id)) throw new Error('No repitas la misma herramienta; cada registro corresponde a un activo único')
      uniqueTools.add(item.herramienta_id)
      if (!Number.isInteger(Number(item.cantidad)) || Number(item.cantidad) < 1) throw new Error('La cantidad por herramienta debe ser un entero mayor a 0')
      return { herramienta_id: item.herramienta_id, cantidad: Number(item.cantidad) }
    })
    return this.movs.createBatch({
      items: normalizedItems,
      responsable: responsable.trim(),
      destino: destino?.trim() || '',
      observacion: observacion?.trim() || '',
    })
  }
}
