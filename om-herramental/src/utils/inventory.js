export function outstandingByTool(movements) {
  return movements.reduce((totals, movement) => {
    const isOpeningStock = movement.tipo === 'ENTRADA' && movement.observacion === 'Stock inicial'
    const delta = movement.tipo === 'SALIDA' ? movement.cantidad : isOpeningStock ? 0 : -movement.cantidad
    totals[movement.herramienta_id] = (totals[movement.herramienta_id] || 0) + delta
    return totals
  }, {})
}

export function currentToolStatus(tool, outstanding = 0) {
  if (tool.estado === 'BAJA') return 'BAJA'
  if (tool.estado === 'EN_REPARACION') return 'EN_REPARACION'
  if ((outstanding > 0 && tool.stock_actual === 0) || tool.estado === 'EN_USO') return 'EN_USO'
  return 'DISPONIBLE'
}

export function statusLabel(status) {
  return ({
    DISPONIBLE: 'Disponible',
    EN_USO: 'En uso',
    EN_REPARACION: 'En reparación',
    BAJA: 'Dada de baja',
  })[status] || status
}
