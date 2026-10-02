import { BaseRepository } from './BaseRepository'
const dayAfter = (date) => {
  const nextDate = new Date(`${date}T00:00:00Z`)
  nextDate.setUTCDate(nextDate.getUTCDate() + 1)
  return nextDate.toISOString().slice(0, 10)
}

// Los movimientos son inmutables (historial de auditoría): no se editan ni eliminan.
export class MovementRepository extends BaseRepository {
  constructor(client) { super(client, 'movimientos', '*, herramientas(codigo, nombre)') }
  update() { throw new Error('Los movimientos no se editan') }
  remove() { throw new Error('Los movimientos no se eliminan') }
  recent(limit = 10) {
    return this._run(this.c.from(this.t).select(this.s)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit))
  }
  async createBatch({ items, responsable, destino, observacion }) {
    const { data, error } = await this.c.rpc('registrar_movimientos_lote', {
      p_movimientos: items.map(({ herramienta_id, cantidad }) => ({ herramienta_id, cantidad })),
      p_responsable: responsable,
      p_destino: destino || null,
      p_observacion: observacion || null,
    })
    if (error) throw new Error(error.message)
    return data
  }
  forTool(toolId) {
    return this._run(this.c.from(this.t).select(this.s).eq('herramienta_id', toolId).order('created_at', { ascending: false }))
  }
  async outstandingByTool() {
    const rows = await this._run(this.c.from('inventario_prestamos_resumen').select('herramienta_id, unidades_prestadas'))
    return Object.fromEntries(rows.map((row) => [row.herramienta_id, Number(row.unidades_prestadas)]))
  }
  async between({ desde, hasta, tipo }) {
    const pageSize = 1000
    const results = []
    let offset = 0
    while (true) {
      let query = this.c.from(this.t).select(this.s)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
      if (desde) query = query.gte('created_at', `${desde}T00:00:00`)
      if (hasta) query = query.lt('created_at', `${dayAfter(hasta)}T00:00:00`)
      if (tipo) query = query.eq('tipo', tipo)
      const page = await this._run(query.range(offset, offset + pageSize - 1))
      results.push(...page)
      if (page.length < pageSize) return results
      offset += pageSize
    }
  }
}
