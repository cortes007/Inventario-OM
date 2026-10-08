// Responsabilidad única: transformar datos en informes exportables.
import { toCSV } from '../utils/csv'
import { currentToolStatus, statusLabel } from '../utils/inventory'
const fecha = (d) => new Date(d).toLocaleString('es-CO')
export class ReportService {
  constructor(movRepo) { this.movs = movRepo }
  movements(filters) { return this.movs.between(filters) }
  summary(rows) {
    const count = (type) => rows.filter((row) => row.tipo === type).length
    return { entradas: count('ENTRADA'), salidas: count('SALIDA'), total: rows.length }
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
      Responsable: movement.responsable,
      Destino: movement.destino ?? '',
      Observación: movement.observacion ?? '',
    }))
  }
  inventoryCSV(tools) {
    return toCSV(tools.map((t) => ({
      'Código de activo': t.codigo,
      Nombre: t.nombre,
      Categoría: t.categoria,
      'Ubicación actual': t.ubicacion ?? '',
      Condición: statusLabel(t.estado),
    })))
  }
  inventoryRows(tools) {
    return this.inventoryRowsWithMovements(tools, [])
  }
  inventoryRowsWithMovements(tools, outstanding = {}) {
    return tools.map((t) => ({
      'Código de activo': t.codigo,
      Herramienta: t.nombre,
      Categoría: t.categoria,
      'Ubicación actual': t.ubicacion ?? '',
      Estado: statusLabel(currentToolStatus(t, outstanding[t.id] || 0)),
    }))
  }
}
