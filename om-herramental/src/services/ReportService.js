// Responsabilidad única: transformar datos en informes exportables.
import { toCSV } from '../utils/csv'
const fecha = (d) => new Date(d).toLocaleString('es-CO')
export class ReportService {
  constructor(movRepo) { this.movs = movRepo }
  movements(filters) { return this.movs.between(filters) }
  summary(rows) {
    const sum = (t) => rows.filter((r) => r.tipo === t).reduce((a, r) => a + r.cantidad, 0)
    return { entradas: sum('ENTRADA'), salidas: sum('SALIDA'), total: rows.length }
  }
  movementsCSV(rows) {
    return toCSV(rows.map((r) => ({
      Referencia: r.codigo, Fecha: fecha(r.created_at), Tipo: r.tipo, Código: r.herramientas?.codigo, Herramienta: r.herramientas?.nombre,
      Cantidad: r.cantidad, Responsable: r.responsable, Destino: r.destino ?? '', Observación: r.observacion ?? '',
    })))
  }
  inventoryCSV(tools) {
    return toCSV(tools.map((t) => ({ Código: t.codigo, Nombre: t.nombre, Categoría: t.categoria, Ubicación: t.ubicacion ?? '', Stock: t.stock_actual, 'Stock mínimo': t.stock_minimo, Estado: t.estado })))
  }
}
