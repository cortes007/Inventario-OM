import { describe, expect, it, vi } from 'vitest'
import { ToolService } from './ToolService'

function createDeps() {
  const toolRepo = {
    list: vi.fn(),
    create: vi.fn(async (payload) => ({ id: 'tool-1', ...payload })),
    update: vi.fn(async (id, payload) => ({ id, ...payload })),
    remove: vi.fn(),
  }
  const movRepo = {
    create: vi.fn(async (payload) => ({ id: 'mov-1', ...payload })),
  }
  return { toolRepo, movRepo, service: new ToolService(toolRepo, movRepo) }
}

describe('ToolService', () => {
  it('update descarta calculatedStatus y campos no persistibles enviando solo columnas válidas', async () => {
    const { service, toolRepo } = createDeps()

    await service.update('tool-1', {
      id: 'tool-1',
      codigo: ' HER-001 ',
      nombre: ' Taladro Percutor ',
      categoria: 'Eléctrica',
      ubicacion: 'Bodega Central',
      estado: 'DISPONIBLE',
      calculatedStatus: 'EN_USO',
      stock_inicial: 1,
      stock_actual: 0,
      stock_minimo: 0,
      created_at: '2026-10-01T00:00:00Z',
      extraUiFlag: true,
    })

    expect(toolRepo.update).toHaveBeenCalledTimes(1)
    expect(toolRepo.update).toHaveBeenCalledWith('tool-1', {
      codigo: 'HER-001',
      nombre: 'Taladro Percutor',
      categoria: 'Eléctrica',
      ubicacion: 'Bodega Central',
      estado: 'DISPONIBLE',
    })
  })

  it('create envía únicamente los campos persistibles permitidos y registra el movimiento inicial', async () => {
    const { service, toolRepo, movRepo } = createDeps()

    await service.create({
      codigo: ' HER-002 ',
      nombre: ' Pulidora ',
      categoria: 'Eléctrica',
      ubicacion: 'Bodega',
      estado: 'DISPONIBLE',
      calculatedStatus: 'DISPONIBLE',
      stock_inicial: 1,
      extraUiFlag: 'ignore-me',
    })

    expect(toolRepo.create).toHaveBeenCalledWith({
      codigo: 'HER-002',
      nombre: 'Pulidora',
      categoria: 'Eléctrica',
      ubicacion: 'Bodega',
      estado: 'DISPONIBLE',
    })
    expect(movRepo.create).toHaveBeenCalledWith({
      herramienta_id: 'tool-1',
      tipo: 'ENTRADA',
      cantidad: 1,
      responsable: 'Sistema',
      observacion: 'Stock inicial',
    })
  })

  it('rechaza datos inválidos antes de invocar al repositorio', async () => {
    const { service, toolRepo } = createDeps()

    await expect(
      service.update('tool-1', {
        codigo: 'HER-001',
        nombre: '   ',
        estado: 'DISPONIBLE',
        calculatedStatus: 'DISPONIBLE',
      })
    ).rejects.toThrow('El nombre es obligatorio')

    await expect(
      service.update('tool-1', {
        codigo: '   ',
        nombre: 'Martillo',
        estado: 'DISPONIBLE',
      })
    ).rejects.toThrow('El código de activo es obligatorio')

    await expect(
      service.update('tool-1', {
        codigo: 'HER-001',
        nombre: 'Martillo',
        estado: 'INVALIDO',
      })
    ).rejects.toThrow('Selecciona un estado válido')

    expect(toolRepo.update).not.toHaveBeenCalled()
  })
})
