// DIP: depende de abstracciones (repositorios inyectados), no de Supabase.
export class ToolService {
  constructor(toolRepo, movRepo) { this.tools = toolRepo; this.movs = movRepo }
  list() { return this.tools.list() }
  _validate(t) {
    if (!t.nombre?.trim()) throw new Error('El nombre es obligatorio')
    if (t.codigo !== undefined && !t.codigo.trim()) throw new Error('El código de activo es obligatorio')
    if (!['DISPONIBLE', 'EN_USO', 'EN_REPARACION', 'BAJA'].includes(t.estado)) throw new Error('Selecciona un estado válido')
  }
  async create({ stock_inicial = 1, ...t }) {
    this._validate(t)
    if (Number(stock_inicial) !== 1) throw new Error('Cada registro representa una herramienta física; la cantidad inicial debe ser 1')
    const tool = await this.tools.create({ ...t, codigo: t.codigo?.trim() || undefined, nombre: t.nombre.trim() })
    await this.movs.create({ herramienta_id: tool.id, tipo: 'ENTRADA', cantidad: 1, responsable: 'Sistema', observacion: 'Stock inicial' })
    return tool
  }
  update(id, { stock_inicial, stock_actual, created_at, id: _id, ...t }) {
    delete t.stock_minimo
    this._validate(t)
    return this.tools.update(id, { ...t, codigo: t.codigo.trim(), nombre: t.nombre.trim() })
  }
  remove(id) { return this.tools.remove(id) }
}
