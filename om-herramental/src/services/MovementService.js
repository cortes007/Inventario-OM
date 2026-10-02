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
}
