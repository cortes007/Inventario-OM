import { useMemo, useState } from 'react'
import { AlertTriangle, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toolService } from '../container'
import { useResource } from '../hooks/useResource'
import { Alert, Badge, Button, Card, Field, Modal } from '../components/ui'

const EMPTY = { nombre: '', categoria: 'General', ubicacion: '', stock_inicial: 0, stock_minimo: 0, estado: 'DISPONIBLE' }

export default function Tools() {
  const { data, loading, error, reload } = useResource(() => toolService.list())
  const [q, setQ] = useState(''); const [form, setForm] = useState(null); const [err, setErr] = useState('')
  const rows = useMemo(() => data.filter((t) => `${t.codigo} ${t.nombre} ${t.categoria}`.toLowerCase().includes(q.toLowerCase())), [data, q])
  const low = data.filter((t) => t.estado !== 'BAJA' && t.stock_actual <= t.stock_minimo).length
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value })

  const save = async (e) => {
    e.preventDefault(); setErr('')
    try { form.id ? await toolService.update(form.id, form) : await toolService.create(form); setForm(null); reload() }
    catch (x) { setErr(x.message) }
  }
  const del = async (t) => {
    if (!confirm(`¿Eliminar ${t.codigo} · ${t.nombre}?`)) return
    try { await toolService.remove(t.id); reload() } catch { alert('Tiene movimientos registrados. Márcala como "baja" en lugar de eliminarla.') }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-semibold">Herramientas</h2>
          <p className="text-sm text-muted">{data.length} registradas{low > 0 && <span className="ml-2 inline-flex items-center gap-1 text-amber-400"><AlertTriangle size={14} />{low} con stock bajo</span>}</p></div>
        <Button onClick={() => { setErr(''); setForm(EMPTY) }}><Plus size={16} />Nueva herramienta</Button>
      </div>
      <div className="relative max-w-sm"><Search size={16} className="absolute left-3 top-2.5 text-muted" />
        <input className="inp pl-9" placeholder="Buscar por código, nombre o categoría" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <Alert>{error}</Alert>
      <Card className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-line"><tr>{['Código', 'Nombre', 'Categoría', 'Ubicación', 'Stock', 'Estado', ''].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((t) => (
              <tr key={t.id} className="hover:bg-white/[0.02]">
                <td className="td font-mono text-brand">{t.codigo}</td><td className="td">{t.nombre}</td><td className="td text-muted">{t.categoria}</td>
                <td className="td text-muted">{t.ubicacion || '—'}</td>
                <td className={`td ${t.stock_actual <= t.stock_minimo ? 'text-amber-400' : ''}`}>{t.stock_actual}</td>
                <td className="td"><Badge v={t.estado} /></td>
                <td className="td text-right"><button aria-label="Editar" className="p-1 text-muted hover:text-white" onClick={() => { setErr(''); setForm(t) }}><Pencil size={16} /></button>
                  <button aria-label="Eliminar" className="p-1 text-muted hover:text-red-400" onClick={() => del(t)}><Trash2 size={16} /></button></td>
              </tr>))}
            {!loading && !rows.length && <tr><td colSpan={7} className="td py-10 text-center text-muted">Aún no hay herramientas. Crea la primera con “Nueva herramienta”.</td></tr>}
          </tbody>
        </table>
      </Card>
      {form && (
        <Modal title={form.id ? `Editar ${form.codigo}` : 'Nueva herramienta'} onClose={() => setForm(null)}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Nombre"><input className="inp" required value={form.nombre} onChange={set('nombre')} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Categoría"><input className="inp" value={form.categoria} onChange={set('categoria')} /></Field>
              <Field label="Ubicación"><input className="inp" value={form.ubicacion ?? ''} onChange={set('ubicacion')} /></Field>
              {!form.id && <Field label="Cantidad inicial"><input className="inp" type="number" min="0" value={form.stock_inicial} onChange={set('stock_inicial')} /></Field>}
              <Field label="Stock mínimo"><input className="inp" type="number" min="0" value={form.stock_minimo} onChange={set('stock_minimo')} /></Field>
              <Field label="Estado"><select className="inp" value={form.estado} onChange={set('estado')}>
                <option value="DISPONIBLE">Disponible</option><option value="EN_REPARACION">En reparación</option><option value="BAJA">Baja</option></select></Field>
            </div>
            {!form.id && <p className="text-xs text-muted">El código (HER-0001…) se genera automáticamente.</p>}
            <Alert>{err}</Alert>
            <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setForm(null)}>Cancelar</Button><Button>Guardar</Button></div>
          </form>
        </Modal>)}
    </div>
  )
}
