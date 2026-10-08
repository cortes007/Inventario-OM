import { useCallback, useMemo, useState } from 'react'
import { Eye, Pencil, Plus, Search } from 'lucide-react'
import { movementService, toolDocumentService, toolService } from '../container'
import { useResource } from '../hooks/useResource'
import { useInventoryRealtime } from '../hooks/useInventoryRealtime'
import { currentToolStatus, statusLabel } from '../utils/inventory'
import { Alert, Badge, Button, Card, Combobox, Field, Modal } from '../components/ui'
import ToolDetail from '../components/ToolDetail'
import ToolDocuments from '../components/ToolDocuments'
import { createAssetCode } from '../utils/id'

const DEFAULT_CATEGORIES = ['General', 'Eléctrica', 'Seguridad', 'Medición']

const EMPTY_FORM = (categories) => ({
  codigo: createAssetCode(),
  nombre: '',
  categoria: categories[0] || 'General',
  ubicacion: '',
  estado: 'DISPONIBLE',
})

const FILTERS = [
  ['DISPONIBLE', 'Disponible'],
  ['EN_USO', 'En uso'],
  ['EN_REPARACION', 'En reparación'],
  ['BAJA', 'Dada de baja'],
]

export default function Tools() {
  const { data, initialLoading: loading, error, reload } = useResource(() => toolService.list())
  const { data: outstanding, error: loanError, reload: reloadOutstanding } = useResource(() => movementService.outstandingByTool())
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('TODOS')
  const [form, setForm] = useState(null)
  const [detail, setDetail] = useState(null)
  const [pendingFiles, setPendingFiles] = useState([])
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const refreshInventory = useCallback(async () => {
    await Promise.all([reload(), reloadOutstanding()])
  }, [reload, reloadOutstanding])
  const { error: realtimeError } = useInventoryRealtime(refreshInventory)
  const categories = useMemo(() => {
    const fromData = [...new Set(data.map((tool) => tool.categoria).filter(Boolean))]
    const merged = [...new Set([...DEFAULT_CATEGORIES, ...fromData])]
    return merged.sort((a, b) => {
      const aIndex = DEFAULT_CATEGORIES.indexOf(a)
      const bIndex = DEFAULT_CATEGORIES.indexOf(b)
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
      if (aIndex !== -1) return -1
      if (bIndex !== -1) return 1
      return a.localeCompare(b)
    })
  }, [data])
  const activeFilters = useMemo(() => FILTERS.filter(([status]) => {
    return data.some((tool) => currentToolStatus(tool, outstanding[tool.id] || 0) === status)
  }), [data, outstanding])
  const rows = useMemo(() => data.filter((tool) => {
    const matchesSearch = `${tool.codigo} ${tool.nombre} ${tool.categoria} ${tool.ubicacion || ''}`.toLowerCase().includes(q.trim().toLowerCase())
    const status = currentToolStatus(tool, outstanding[tool.id] || 0)
    const matchesStatus = statusFilter === 'TODOS' || status === statusFilter
    return matchesSearch && matchesStatus
  }), [data, q, statusFilter, outstanding])
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  const openNewForm = () => {
    setErr('')
    setPendingFiles([])
    setForm(EMPTY_FORM(categories))
  }
  const closeForm = () => {
    setForm(null)
    setPendingFiles([])
    setErr('')
  }
  const save = async (event) => {
    event.preventDefault()
    setErr('')
    setSaving(true)
    const values = form
    try {
      const savedTool = form.id
        ? await toolService.update(form.id, values)
        : await toolService.create(values)
      if (pendingFiles.length) {
        setForm(savedTool)
        const failedFiles = []
        for (const pending of pendingFiles) {
          try {
            await toolDocumentService.upload(savedTool.id, pending.file)
          } catch (uploadError) {
            failedFiles.push({ ...pending, error: uploadError.message })
          }
        }
        setPendingFiles(failedFiles)
        if (failedFiles.length) {
          setErr(`La herramienta quedó guardada, pero no se pudieron subir todos los documentos: ${failedFiles.map((item) => `${item.file.name} (${item.error})`).join('; ')}. Puedes volver a guardar para reintentarlo.`)
          await reload()
          return
        }
      }
      setForm(null)
      setPendingFiles([])
      await reload()
    } catch (saveError) {
      setErr(saveError.message)
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0"><h2 className="text-xl font-semibold">Herramientas</h2>
          <p className="text-sm text-muted">{data.length} activos registrados</p></div>
        <Button className="shrink-0" onClick={openNewForm}><Plus size={16} />Nueva herramienta</Button>
      </div>
      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(240px,1fr)_auto] xl:items-center">
        <div className="relative min-w-0">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="inp" style={{ paddingLeft: '2.5rem' }} placeholder="Buscar por código, nombre, categoría o ubicación" value={q} onChange={(event) => setQ(event.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
          <button type="button" onClick={() => setStatusFilter('TODOS')}
            className={`rounded-md border px-3 py-2 text-xs ${statusFilter === 'TODOS' ? 'border-brand text-brand' : 'border-line text-muted hover:text-white'}`}>Todos</button>
          {activeFilters.map(([status, label]) => <button type="button" key={status} onClick={() => setStatusFilter(status)}
            className={`rounded-md border px-3 py-2 text-xs ${statusFilter === status ? 'border-brand text-brand' : 'border-line text-muted hover:text-white'}`}>{label}</button>)}
        </div>
      </div>
      <Alert>{error || loanError || err}</Alert>
      {realtimeError && <p role="status" className="text-xs text-amber-400">Realtime no conectado ({realtimeError}). Actualizando cada 5 segundos.</p>}
      <div className="hidden min-w-0 md:block">
        <Card className="min-w-0 overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead className="border-b border-line"><tr>{['Código de activo', 'Nombre', 'Categoría', 'Ubicación actual', 'Estado', 'Acciones'].map((heading) => <th key={heading} className="th whitespace-nowrap">{heading}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((tool) => {
              const loaned = outstanding[tool.id] || 0
              const status = currentToolStatus(tool, loaned)
              return <tr key={tool.id} className="hover:bg-white/[0.02]">
                <td className="td whitespace-nowrap font-mono text-brand">{tool.codigo}</td><td className="td">{tool.nombre}</td><td className="td text-muted">{tool.categoria}</td>
                <td className="td text-muted">{tool.ubicacion || '—'}</td>
                <td className="td whitespace-nowrap"><Badge v={status} /><span className="sr-only">{statusLabel(status)}</span></td>
                <td className="td whitespace-nowrap text-right">
                  <button aria-label={`Ver detalle ${tool.codigo}`} title="Ver detalle" className="p-1 text-muted hover:text-white" onClick={() => setDetail(tool)}><Eye size={16} /></button>
                  <button aria-label={`Editar ${tool.codigo}`} title="Editar" className="p-1 text-muted hover:text-white" onClick={() => { setErr(''); setPendingFiles([]); setForm({ ...tool }) }}><Pencil size={16} /></button>
                </td>
              </tr>
            })}
            {!loading && !rows.length && <tr><td colSpan={6} className="td py-10 text-center text-muted">{data.length ? 'No hay herramientas que coincidan con esos filtros.' : 'Aún no hay herramientas. Crea la primera con “Nueva herramienta”.'}</td></tr>}
          </tbody>
        </table>
        </Card>
      </div>
      <div className="space-y-3 md:hidden">
        {rows.map((tool) => {
          const loaned = outstanding[tool.id] || 0
          const status = currentToolStatus(tool, loaned)
          return <Card key={tool.id} className="min-w-0 overflow-hidden">
            <div className="flex min-w-0 items-start justify-between gap-3 border-b border-line p-3">
              <div className="min-w-0">
                <p className="break-all font-mono text-sm text-brand">{tool.codigo}</p>
                <h3 className="mt-1 break-words font-medium">{tool.nombre}</h3>
              </div>
              <Badge v={status} />
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-3 p-3">
              <div className="min-w-0"><p className="text-xs text-muted">Categoría</p><p className="break-words text-sm">{tool.categoria}</p></div>
              <div className="min-w-0"><p className="text-xs text-muted">Ubicación actual</p><p className="break-words text-sm">{tool.ubicacion || '—'}</p></div>
            </div>
            <div className="flex justify-end gap-2 border-t border-line p-2">
              <button aria-label={`Ver detalle ${tool.codigo}`} title="Ver detalle" className="rounded-md p-2 text-muted hover:bg-line hover:text-white" onClick={() => setDetail(tool)}><Eye size={18} /></button>
              <button aria-label={`Editar ${tool.codigo}`} title="Editar" className="rounded-md p-2 text-muted hover:bg-line hover:text-white" onClick={() => { setErr(''); setPendingFiles([]); setForm({ ...tool }) }}><Pencil size={18} /></button>
            </div>
          </Card>
        })}
        {!loading && !rows.length && <Card className="px-4 py-8 text-center text-sm text-muted">{data.length ? 'No hay herramientas que coincidan con esos filtros.' : 'Aún no hay herramientas. Crea la primera con “Nueva herramienta”.'}</Card>}
      </div>
      {form && <Modal title={form.id ? `Editar ${form.codigo}` : 'Nueva herramienta'} onClose={closeForm}>
        <form onSubmit={save} className="space-y-3">
          <Field label="ID único / código de activo"><input className="inp font-mono" required maxLength={100} value={form.codigo} onChange={set('codigo')} /></Field>
          <Field label="Nombre"><input className="inp" required value={form.nombre} onChange={set('nombre')} /></Field>
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <Combobox label="Categoría" value={form.categoria} options={categories} onChange={(value) => setForm({ ...form, categoria: value })} allowCustom placeholder="Buscar o escribir categoría" required />
            <Field label="Ubicación actual"><input className="inp" value={form.ubicacion ?? ''} onChange={set('ubicacion')} /></Field>
            <Field label="Condición"><select className="inp" value={form.estado} onChange={set('estado')}>
              <option value="DISPONIBLE">Disponible</option>{form.estado === 'EN_USO' && <option value="EN_USO">En uso</option>}<option value="EN_REPARACION">En reparación</option><option value="BAJA">Dada de baja</option>
            </select></Field>
          </div>
          <ToolDocuments
            toolId={form.id}
            pendingFiles={pendingFiles}
            onPendingFilesChange={setPendingFiles}
          />
          {!form.id && <p className="text-xs text-muted">Cada registro representa una herramienta física única (1 unidad). Para documentar otra herramienta igual, crea otro registro con su propio código y documentos.</p>}
          <Alert>{err}</Alert>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={closeForm}>Cancelar</Button><Button disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button></div>
        </form>
      </Modal>}
      {detail && <ToolDetail tool={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}
