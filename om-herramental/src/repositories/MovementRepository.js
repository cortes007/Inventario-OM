import { BaseRepository } from './BaseRepository'
// Los movimientos son inmutables (historial de auditoría): no se editan ni eliminan.
export class MovementRepository extends BaseRepository {
  constructor(client) { super(client, 'movimientos', '*, herramientas(codigo, nombre)') }
  update() { throw new Error('Los movimientos no se editan') }
  remove() { throw new Error('Los movimientos no se eliminan') }
  between({ desde, hasta, tipo }) {
    let q = this.c.from(this.t).select(this.s).order('created_at', { ascending: false })
    if (desde) q = q.gte('created_at', `${desde}T00:00:00`)
    if (hasta) q = q.lte('created_at', `${hasta}T23:59:59`)
    if (tipo) q = q.eq('tipo', tipo)
    return this._run(q)
  }
}
