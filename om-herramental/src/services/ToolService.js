// DIP: depende de abstracciones (repositorios inyectados), no de Supabase.
export class ToolService {
  constructor(toolRepo, movRepo) { this.tools = toolRepo; this.movs = movRepo }
  list() { return this.tools.list() }
  _validate(t) {
    if (!t.nombre?.trim()) throw new Error('El nombre es obligatorio')
    if (t.codigo !== undefined && !t.codigo.trim()) throw new Error('El código de activo es obligatorio')
    if (!Number.isInteger(Number(t.stock_minimo)) || Number(t.stock_minimo) < 0) throw new Error('El stock mínimo debe ser un entero igual o mayor que 0')
    if (!['DISPONIBLE', 'EN_USO', 'EN_REPARACION', 'BAJA'].includes(t.estado)) throw new Error('Selecciona un estado válido')
  }
  async create({ stock_inicial = 0, ...t }) {
    this._validate(t)
    if (!Number.isInteger(Number(stock_inicial)) || Number(stock_inicial) < 0) throw new Error('La cantidad inicial debe ser un entero igual o mayor que 0')
    const tool = await this.tools.create({ ...t, codigo: t.codigo?.trim() || undefined, nombre: t.nombre.trim(), stock_minimo: Number(t.stock_minimo) })
    if (stock_inicial > 0)
      await this.movs.create({ herramienta_id: tool.id, tipo: 'ENTRADA', cantidad: stock_inicial, responsable: 'Sistema', observacion: 'Stock inicial' })
    return tool
  }
  update(id, { stock_inicial, stock_actual, created_at, id: _id, ...t }) {
    this._validate(t)
    return this.tools.update(id, { ...t, codigo: t.codigo.trim(), nombre: t.nombre.trim(), stock_minimo: Number(t.stock_minimo) })
  }
  remove(id) { return this.tools.remove(id) }
}
