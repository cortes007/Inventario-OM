export class MovementService {
  constructor(movRepo) { this.movs = movRepo }
  history() { return this.movs.recent(10) }
  forTool(toolId) { return this.movs.forTool(toolId) }
  outstandingByTool() { return this.movs.outstandingByTool() }
  register(m) {
    if (!m.herramienta_id) throw new Error('Selecciona una herramienta')
    if (!m.responsable?.trim()) throw new Error('Indica quién recibe o devuelve')
    if (!m.destino?.trim()) throw new Error('Indica la ubicación de destino')
    return this.movs.create({ ...m, cantidad: 1, responsable: m.responsable.trim(), destino: m.destino.trim() })
  }
  registerBatch({ items, tipo = 'SALIDA', responsable, destino, observacion }) {
    if (!['SALIDA', 'ENTRADA'].includes(tipo)) throw new Error('Selecciona un tipo de movimiento válido')
    if (!Array.isArray(items) || !items.length) throw new Error('Agrega al menos una herramienta a la operación')
    if (!responsable?.trim()) throw new Error(tipo === 'SALIDA' ? 'Indica quién recibe las herramientas' : 'Indica quién devuelve las herramientas')
    if (!destino?.trim()) throw new Error('Indica la nueva ubicación de la herramienta')
    const uniqueTools = new Set()
    const normalizedItems = items.map((item) => {
      if (!item.herramienta_id) throw new Error('Selecciona una herramienta en cada fila')
      if (uniqueTools.has(item.herramienta_id)) throw new Error('No repitas la misma herramienta en la operación')
      uniqueTools.add(item.herramienta_id)
      return { herramienta_id: item.herramienta_id, cantidad: 1 }
    })
    return this.movs.createBatch({
      items: normalizedItems,
      tipo,
      responsable: responsable.trim(),
      destino: destino?.trim() || '',
      observacion: observacion?.trim() || '',
    })
  }
}
