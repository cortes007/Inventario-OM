import { describe, expect, it } from 'vitest'
import { groupToolsCatalog } from './catalog'

describe('groupToolsCatalog', () => {
  it('retorna una lista vacía si tools es null, undefined o un array vacío', () => {
    expect(groupToolsCatalog([])).toEqual([])
    expect(groupToolsCatalog(null)).toEqual([])
    expect(groupToolsCatalog(undefined)).toEqual([])
  })

  it('agrupa activos con el mismo nombre y categoría en un solo bloque de catálogo', () => {
    const tools = [
      { id: '1', codigo: 'HER-001', nombre: 'Martillo de uña', categoria: 'General', estado: 'DISPONIBLE', stock_actual: 1 },
      { id: '2', codigo: 'HER-002', nombre: 'Martillo de uña', categoria: 'General', estado: 'DISPONIBLE', stock_actual: 1 },
      { id: '3', codigo: 'HER-003', nombre: 'Martillo de uña', categoria: 'General', estado: 'EN_USO', stock_actual: 0 },
    ]
    const outstanding = { '3': 1 }

    const catalog = groupToolsCatalog(tools, outstanding)

    expect(catalog).toHaveLength(1)
    const martillo = catalog[0]
    expect(martillo.nombre).toBe('Martillo de uña')
    expect(martillo.categoria).toBe('General')
    expect(martillo.total).toBe(3)
    expect(martillo.disponibles).toBe(2)
    expect(martillo.enUso).toBe(1)
    expect(martillo.enReparacion).toBe(0)
    expect(martillo.bajas).toBe(0)
    expect(martillo.activos).toHaveLength(3)
    expect(martillo.activos[0].calculatedStatus).toBe('DISPONIBLE')
    expect(martillo.activos[2].calculatedStatus).toBe('EN_USO')
  })

  it('separa herramientas con mismo nombre pero distinta categoría, y viceversa', () => {
    const tools = [
      { id: '1', codigo: 'HER-001', nombre: 'Guantes de cuero', categoria: 'Seguridad', estado: 'DISPONIBLE', stock_actual: 1 },
      { id: '2', codigo: 'HER-002', nombre: 'Guantes de cuero', categoria: 'General', estado: 'DISPONIBLE', stock_actual: 1 },
      { id: '3', codigo: 'HER-003', nombre: 'Taladro percutor', categoria: 'Eléctrica', estado: 'DISPONIBLE', stock_actual: 1 },
    ]

    const catalog = groupToolsCatalog(tools)

    expect(catalog).toHaveLength(3)
    const nombresCategorias = catalog.map((item) => `${item.nombre} (${item.categoria})`)
    expect(nombresCategorias).toContain('Guantes de cuero (Seguridad)')
    expect(nombresCategorias).toContain('Guantes de cuero (General)')
    expect(nombresCategorias).toContain('Taladro percutor (Eléctrica)')
  })

  it('calcula correctamente los estados de reparación y baja', () => {
    const tools = [
      { id: '1', codigo: 'HER-010', nombre: 'Pulidora 4 1/2', categoria: 'Eléctrica', estado: 'EN_REPARACION', stock_actual: 1 },
      { id: '2', codigo: 'HER-011', nombre: 'Pulidora 4 1/2', categoria: 'Eléctrica', estado: 'BAJA', stock_actual: 0 },
      { id: '3', codigo: 'HER-012', nombre: 'Pulidora 4 1/2', categoria: 'Eléctrica', estado: 'DISPONIBLE', stock_actual: 1 },
    ]

    const catalog = groupToolsCatalog(tools)

    expect(catalog).toHaveLength(1)
    const pulidora = catalog[0]
    expect(pulidora.total).toBe(3)
    expect(pulidora.disponibles).toBe(1)
    expect(pulidora.enReparacion).toBe(1)
    expect(pulidora.bajas).toBe(1)
    expect(pulidora.enUso).toBe(0)
  })

  it('ordena alfabéticamente los bloques de catálogo por nombre', () => {
    const tools = [
      { id: '1', codigo: 'HER-001', nombre: 'Sierra circular', categoria: 'Eléctrica', estado: 'DISPONIBLE', stock_actual: 1 },
      { id: '2', codigo: 'HER-002', nombre: 'Alicate de presión', categoria: 'General', estado: 'DISPONIBLE', stock_actual: 1 },
      { id: '3', codigo: 'HER-003', nombre: 'Cinta métrica', categoria: 'Medición', estado: 'DISPONIBLE', stock_actual: 1 },
    ]

    const catalog = groupToolsCatalog(tools)

    expect(catalog.map((c) => c.nombre)).toEqual([
      'Alicate de presión',
      'Cinta métrica',
      'Sierra circular',
    ])
  })
})
