import { useCallback, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, Plus, Trash2 } from 'lucide-react'
import { movementService, toolService } from '../container'
import { useResource } from '../hooks/useResource'
import { useInventoryRealtime } from '../hooks/useInventoryRealtime'
import { Alert, Badge, Button, Card, Combobox, Field, NumberField } from '../components/ui'

const EMPTY = { herramienta_id: '', tipo: 'SALIDA', cantidad: 1, responsable: '', destino: '', observacion: '' }
const newItem = () => ({ id: crypto.randomUUID(), herramienta_id: '', cantidad: 1 })

export default function Movements() {
  const tools = useResource(() => toolService.list())
  const hist = useResource(() => movementService.history())
  const [f, setF] = useState(EMPTY); const [err, setErr] = useState(''); const [ok, setOk] = useState('')
  const [items, setItems] = useState([newItem()])
  const [saving, setSaving] = useState(false)
  const refreshInventory = useCallback(async () => {
    await Promise.all([tools.reload(), hist.reload()])
  }, [tools.reload, hist.reload])
  const { error: realtimeError } = useInventoryRealtime(refreshInventory)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const selected = tools.data.find((t) => t.id === f.herramienta_id)
  const people = [...new Set(hist.data.map((m) => m.responsable))]
  const places = [...new Set(hist.data.map((m) => m.destino).filter(Boolean))]
  const setType = (type) => {
    setF({ ...f, tipo })
    if (type === 'SALIDA') setItems([newItem()])
  }

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setOk('')
    setSaving(true)
    try {
      if (f.tipo === 'SALIDA') {
        const saved = await movementService.registerBatch({ ...f, items })
        setOk(`Salida registrada para ${f.responsable.trim()} · ${saved.length} herramienta(s).`)
      } else {
        const movement = await movementService.register(f)
        setOk(`Registrado ${movement.codigo}`)
      }
      setF({ ...EMPTY, tipo: f.tipo })
      setItems([newItem()])
      tools.reload()
      hist.reload()
    } catch (submitError) {
      setErr(submitError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div><h2 className="text-xl font-semibold">Entradas y salidas</h2><p className="text-sm text-muted">Asigna varias herramientas a un mismo responsable en una salida; todas se registran juntas.</p></div>
      {realtimeError && <p role="status" className="text-xs text-amber-400">Realtime no conectado ({realtimeError}). Actualizando cada 5 segundos.</p>}
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(340px,380px)_minmax(0,1fr)]">
        <Card className="h-fit p-4">
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[['SALIDA', ArrowUpFromLine, 'Salida'], ['ENTRADA', ArrowDownToLine, 'Entrada']].map(([v, I, l]) => (
                <button type="button" key={v} onClick={() => setType(v)}
                  className={`flex items-center justify-center gap-2 rounded-md border py-2 text-sm ${f.tipo === v ? 'border-brand bg-emerald-950 text-brand' : 'border-line text-muted'}`}><I size={16} />{l}</button>))}
            </div>
            {f.tipo === 'SALIDA' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-muted">Herramientas a entregar</p>
                  <Button type="button" variant="ghost" className="px-2 py-1 text-xs"
                    disabled={!tools.data.some((tool) => tool.estado !== 'BAJA' && tool.stock_actual > 0 && !items.some((item) => item.herramienta_id === tool.id))}
                    onClick={() => setItems((current) => [...current, newItem()])}><Plus size={14} />Agregar</Button>
                </div>
                {items.map((item) => {
                  const tool = tools.data.find((entry) => entry.id === item.herramienta_id)
                  const selectedIds = items.filter((entry) => entry.id !== item.id).map((entry) => entry.herramienta_id)
                  const options = tools.data
                    .filter((entry) => entry.estado !== 'BAJA' && entry.stock_actual > 0 && (entry.id === item.herramienta_id || !selectedIds.includes(entry.id)))
                    .map((entry) => ({ value: entry.id, label: `${entry.codigo} · ${entry.nombre} · stock ${entry.stock_actual}` }))
                  return <div key={item.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-2 rounded-md border border-line p-2">
                    <div className="col-span-2 flex min-w-0 items-end gap-2">
                      <div className="min-w-0 flex-1">
                        <Combobox label={`Herramienta ${items.findIndex((entry) => entry.id === item.id) + 1}`} value={item.herramienta_id}
                          options={options} required placeholder="Buscar herramienta…"
                          onChange={(value) => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, herramienta_id: value } : entry))} />
                      </div>
                      {items.length > 1 && <button type="button" aria-label="Quitar herramienta de la salida" className="mb-1 rounded-md p-2 text-muted hover:bg-line hover:text-red-400"
                        onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}><Trash2 size={16} /></button>}
                    </div>
                    <div className="min-w-0">
                      <NumberField label="Cantidad" min={1} max={tool?.stock_actual || Number.POSITIVE_INFINITY} required value={String(item.cantidad)}
                        onChange={(value) => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, cantidad: value } : entry))} />
                    </div>
                    <p className="pb-2 text-right text-xs text-muted">{tool ? `${tool.stock_actual} disponible(s)` : 'Selecciona herramienta'}</p>
                  </div>
                })}
              </div>
            ) : (
              <>
                <Combobox label="Herramienta" value={f.herramienta_id} onChange={(value) => setF({ ...f, herramienta_id: value })}
                  options={tools.data.filter((t) => t.estado !== 'BAJA').map((t) => ({ value: t.id, label: `${t.codigo} · ${t.nombre}` }))} required placeholder="Buscar herramienta…" />
                {selected && <p className="text-xs text-muted">Stock actual: <b className="text-zinc-200">{selected.stock_actual}</b></p>}
                <NumberField label="Cantidad" min={1} required value={String(f.cantidad)} onChange={(value) => setF({ ...f, cantidad: value })} />
              </>
            )}
            <Field label={f.tipo === 'SALIDA' ? 'Quién la recibe' : 'Quién la devuelve'}><input className="inp" list="people" required value={f.responsable} onChange={set('responsable')} /></Field>
            <Field label="Obra o destino"><input className="inp" list="places" value={f.destino} onChange={set('destino')} /></Field>
            <Field label="Observación (opcional)"><input className="inp" value={f.observacion} onChange={set('observacion')} /></Field>
            <datalist id="people">{people.map((p) => <option key={p} value={p} />)}</datalist>
            <datalist id="places">{places.map((p) => <option key={p} value={p} />)}</datalist>
            <Alert>{err}</Alert>{ok && <p className="text-sm text-brand">{ok}</p>}
            <Button disabled={saving} className="w-full justify-center">{saving ? 'Guardando…' : `Registrar ${f.tipo === 'SALIDA' ? 'salida' : 'entrada'}`}</Button>
          </form>
        </Card>
        <Card className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-line"><tr>{['Referencia', 'Fecha', 'Tipo', 'Herramienta', 'Cant.', 'Responsable', 'Destino'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">
              {hist.data.slice(0, 10).map((m) => (
                <tr key={m.id}><td className="td font-mono text-brand">{m.codigo}</td><td className="td text-muted">{new Date(m.created_at).toLocaleString('es-CO')}</td>
                  <td className="td"><Badge v={m.tipo} /></td><td className="td">{m.herramientas?.nombre}</td><td className="td">{m.cantidad}</td>
                  <td className="td">{m.responsable}</td><td className="td text-muted">{m.destino || '—'}</td></tr>))}
              {!hist.loading && !hist.data.length && <tr><td colSpan={7} className="td py-10 text-center text-muted">Sin movimientos todavía. Registra el primero con el formulario.</td></tr>}
            </tbody>
          </table>
          {!hist.loading && hist.data.length > 10 && <p className="border-t border-line px-4 py-3 text-xs text-muted">Mostrando los 10 movimientos más recientes.</p>}
        </Card>
      </div>
    </div>
  )
}
