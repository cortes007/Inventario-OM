import { useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { movementService, toolService } from '../container'
import { useResource } from '../hooks/useResource'
import { Alert, Badge, Button, Card, Field } from '../components/ui'

const EMPTY = { herramienta_id: '', tipo: 'SALIDA', cantidad: 1, responsable: '', destino: '', observacion: '' }

export default function Movements() {
  const tools = useResource(() => toolService.list())
  const hist = useResource(() => movementService.history())
  const [f, setF] = useState(EMPTY); const [err, setErr] = useState(''); const [ok, setOk] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value })
  const selected = tools.data.find((t) => t.id === f.herramienta_id)
  const people = [...new Set(hist.data.map((m) => m.responsable))]
  const places = [...new Set(hist.data.map((m) => m.destino).filter(Boolean))]

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setOk('')
    try {
      const m = await movementService.register(f)
      setOk(`Registrado ${m.codigo}`); setF({ ...EMPTY, tipo: f.tipo }); tools.reload(); hist.reload()
    } catch (x) { setErr(x.message) }
  }

  return (
    <div className="space-y-5">
      <div><h2 className="text-xl font-semibold">Entradas y salidas</h2><p className="text-sm text-muted">La referencia y la fecha se asignan solas; el stock se actualiza al guardar.</p></div>
      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <Card className="h-fit p-4">
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[['SALIDA', ArrowUpFromLine, 'Salida'], ['ENTRADA', ArrowDownToLine, 'Entrada']].map(([v, I, l]) => (
                <button type="button" key={v} onClick={() => setF({ ...f, tipo: v })}
                  className={`flex items-center justify-center gap-2 rounded-md border py-2 text-sm ${f.tipo === v ? 'border-brand bg-emerald-950 text-brand' : 'border-line text-muted'}`}><I size={16} />{l}</button>))}
            </div>
            <Field label="Herramienta"><select className="inp" required value={f.herramienta_id} onChange={set('herramienta_id')}>
              <option value="">Seleccionar…</option>
              {tools.data.filter((t) => t.estado !== 'BAJA').map((t) => <option key={t.id} value={t.id}>{t.codigo} · {t.nombre}</option>)}</select></Field>
            {selected && <p className="text-xs text-muted">Stock actual: <b className="text-zinc-200">{selected.stock_actual}</b></p>}
            <Field label="Cantidad"><input className="inp" type="number" min="1" value={f.cantidad} onChange={set('cantidad')} /></Field>
            <Field label={f.tipo === 'SALIDA' ? 'Quién la recibe' : 'Quién la devuelve'}><input className="inp" list="people" required value={f.responsable} onChange={set('responsable')} /></Field>
            <Field label="Obra o destino"><input className="inp" list="places" value={f.destino} onChange={set('destino')} /></Field>
            <Field label="Observación (opcional)"><input className="inp" value={f.observacion} onChange={set('observacion')} /></Field>
            <datalist id="people">{people.map((p) => <option key={p} value={p} />)}</datalist>
            <datalist id="places">{places.map((p) => <option key={p} value={p} />)}</datalist>
            <Alert>{err}</Alert>{ok && <p className="text-sm text-brand">{ok}</p>}
            <Button className="w-full justify-center">Registrar {f.tipo === 'SALIDA' ? 'salida' : 'entrada'}</Button>
          </form>
        </Card>
        <Card className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-line"><tr>{['Referencia', 'Fecha', 'Tipo', 'Herramienta', 'Cant.', 'Responsable', 'Destino'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">
              {hist.data.slice(0, 50).map((m) => (
                <tr key={m.id}><td className="td font-mono text-brand">{m.codigo}</td><td className="td text-muted">{new Date(m.created_at).toLocaleString('es-CO')}</td>
                  <td className="td"><Badge v={m.tipo} /></td><td className="td">{m.herramientas?.nombre}</td><td className="td">{m.cantidad}</td>
                  <td className="td">{m.responsable}</td><td className="td text-muted">{m.destino || '—'}</td></tr>))}
              {!hist.loading && !hist.data.length && <tr><td colSpan={7} className="td py-10 text-center text-muted">Sin movimientos todavía. Registra el primero con el formulario.</td></tr>}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}
