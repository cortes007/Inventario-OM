// Responsabilidad única: transformar datos en informes exportables.
import { toCSV } from '../utils/csv'
import { currentToolStatus, statusLabel } from '../utils/inventory'
const fecha = (d) => new Date(d).toLocaleString('es-CO')
export class ReportService {
  constructor(movRepo) { this.movs = movRepo }
  movements(filters) { return this.movs.between(filters) }
  summary(rows) {
    const sum = (t) => rows.filter((r) => r.tipo === t).reduce((a, r) => a + r.cantidad, 0)
    return { entradas: sum('ENTRADA'), salidas: sum('SALIDA'), total: rows.length }
  }
  movementsCSV(rows) {
    return toCSV(this.movementRows(rows))
  }
  movementRows(rows) {
    return rows.map((movement) => ({
      Referencia: movement.codigo,
      Fecha: fecha(movement.created_at),
      Tipo: movement.tipo,
      'Código de activo': movement.herramientas?.codigo ?? '',
      Herramienta: movement.herramientas?.nombre ?? '',
      Cantidad: movement.cantidad,
      Responsable: movement.responsable,
      Destino: movement.destino ?? '',
      Observación: movement.observacion ?? '',
    }))
  }
  inventoryCSV(tools) {
    return toCSV(tools.map((t) => ({ Código: t.codigo, Nombre: t.nombre, Categoría: t.categoria, Ubicación: t.ubicacion ?? '', Stock: t.stock_actual, 'Stock mínimo': t.stock_minimo, Estado: t.estado })))
  }
  inventoryRows(tools) {
    return this.inventoryRowsWithMovements(tools, [])
  }
  inventoryRowsWithMovements(tools, outstanding = {}) {
    return tools.map((t) => ({
      'Código de activo': t.codigo,
      Herramienta: t.nombre,
      Categoría: t.categoria,
      Ubicación: t.ubicacion ?? '',
      'Unidades en bodega': t.stock_actual,
      'Unidades en obra': Math.max(0, outstanding[t.id] || 0),
      'Stock mínimo': t.stock_minimo,
      Estado: statusLabel(currentToolStatus(t, outstanding[t.id] || 0)),
      'Alerta de stock': t.estado !== 'BAJA' && t.stock_actual <= t.stock_minimo ? 'Bajo' : 'Normal',
    }))
  }
}
