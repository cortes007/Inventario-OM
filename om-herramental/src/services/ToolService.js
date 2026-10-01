// DIP: depende de abstracciones (repositorios inyectados), no de Supabase.
export class ToolService {
  constructor(toolRepo, movRepo) { this.tools = toolRepo; this.movs = movRepo }
  list() { return this.tools.list() }
  _validate(t) {
    if (!t.nombre?.trim()) throw new Error('El nombre es obligatorio')
    if (t.stock_minimo < 0) throw new Error('El stock mínimo no puede ser negativo')
  }
  async create({ stock_inicial = 0, ...t }) {
    this._validate(t)
    const tool = await this.tools.create({ ...t, nombre: t.nombre.trim() })
    if (stock_inicial > 0)
      await this.movs.create({ herramienta_id: tool.id, tipo: 'ENTRADA', cantidad: stock_inicial, responsable: 'Sistema', observacion: 'Stock inicial' })
    return tool
  }
  update(id, { stock_inicial, stock_actual, codigo, created_at, id: _id, ...t }) { this._validate(t); return this.tools.update(id, t) }
  remove(id) { return this.tools.remove(id) }
}
