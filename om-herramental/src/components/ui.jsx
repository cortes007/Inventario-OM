import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Minus, Plus, X } from 'lucide-react'
export const Button = ({ variant = 'primary', className = '', ...p }) => (
  <button {...p} className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition disabled:opacity-50 ${
    variant === 'primary' ? 'bg-brand text-black hover:bg-brand-dark' : 'border border-line text-zinc-200 hover:bg-line'} ${className}`} />
)
export const Field = ({ label, children }) => (
  <label className="block text-sm"><span className="mb-1 block text-muted">{label}</span>{children}</label>
)
export const Alert = ({ children }) => children ? <p className="rounded-md border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">{children}</p> : null
const tone = { DISPONIBLE: 'bg-emerald-950 text-brand', EN_USO: 'bg-orange-950 text-orange-400', EN_REPARACION: 'bg-amber-950 text-amber-400', BAJA: 'bg-zinc-800 text-zinc-400', ENTRADA: 'bg-emerald-950 text-brand', SALIDA: 'bg-orange-950 text-orange-400' }
export const Badge = ({ v }) => <span className={`rounded-full px-2 py-0.5 text-xs ${tone[v] || 'bg-zinc-800 text-zinc-300'}`}>{String(v || '').replaceAll('_', ' ').toLowerCase()}</span>
export const Modal = ({ title, onClose, children, className = 'max-w-lg' }) => (
  <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:items-center sm:p-4" onClick={onClose}>
    <div className={`my-auto max-h-[calc(100dvh-1.5rem)] w-full overflow-y-auto rounded-lg border border-line bg-panel p-4 sm:max-h-[90dvh] sm:p-5 ${className}`} onClick={(e) => e.stopPropagation()}>
      <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 flex items-center justify-between border-b border-line bg-panel px-4 py-3 sm:-mx-5 sm:-mt-5 sm:px-5"><h3 className="min-w-0 pr-3 font-medium">{title}</h3>
        <button onClick={onClose} aria-label="Cerrar"><X size={18} /></button></div>{children}
    </div>
  </div>
)
export const Card = ({ children, className = '' }) => <div className={`rounded-lg border border-line bg-panel ${className}`}>{children}</div>

export function NumberField({ label, value, onChange, min = 0, required = false }) {
  const update = (next) => onChange(String(Math.max(min, Number(next) || 0)))
  return (
    <Field label={label}>
      <div className="flex overflow-hidden rounded-md border border-line bg-bg focus-within:border-brand focus-within:ring-1 focus-within:ring-brand">
        <button type="button" aria-label={`Disminuir ${label}`} className="px-2 text-muted hover:text-white" onClick={() => update(Number(value || 0) - 1)}><Minus size={14} /></button>
        <input className="w-full min-w-0 bg-transparent px-1 py-2 text-center text-sm outline-none" type="text" inputMode="numeric"
          pattern="[0-9]*" required={required} value={value} onChange={(e) => {
            if (/^\d*$/.test(e.target.value)) onChange(e.target.value)
          }} />
        <button type="button" aria-label={`Aumentar ${label}`} className="px-2 text-muted hover:text-white" onClick={() => update(Number(value || 0) + 1)}><Plus size={14} /></button>
      </div>
    </Field>
  )
}

export function Combobox({ label, value, options, onChange, placeholder = 'Buscar…', allowCustom = false, required = false }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const normalized = useMemo(() => options.map((option) => typeof option === 'string'
    ? { value: option, label: option }
    : option), [options])
  const selected = normalized.find((option) => option.value === value)
  const filtered = normalized.filter((option) => `${option.label} ${option.value}`.toLowerCase().includes(query.toLowerCase())).slice(0, 100)

  useEffect(() => {
    if (!open) setQuery(selected?.label || value || '')
  }, [open, selected?.label, value])

  return (
    <Field label={label}>
      <div className="relative">
        <input className="inp pr-9" role="combobox" aria-expanded={open} aria-autocomplete="list" required={required && !value}
          value={open ? query : selected?.label || value || ''} placeholder={placeholder}
          onFocus={() => { setQuery(''); setOpen(true) }}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(e) => {
            setQuery(e.target.value)
            if (allowCustom) onChange(e.target.value)
            setOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false)
            if (e.key === 'Enter' && open && filtered.length) {
              e.preventDefault()
              onChange(filtered[0].value)
              setQuery(filtered[0].label)
              setOpen(false)
            }
          }} />
        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-2.5 text-muted" />
        {open && <div role="listbox" className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-line bg-panel shadow-xl">
          {filtered.map((option) => <button type="button" role="option" aria-selected={option.value === value} key={option.value}
            className="block w-full px-3 py-2 text-left text-sm hover:bg-line"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { onChange(option.value); setQuery(option.label); setOpen(false) }}>
            {option.label}
          </button>)}
          {!filtered.length && !allowCustom && <p className="px-3 py-2 text-sm text-muted">Sin coincidencias</p>}
        </div>}
      </div>
    </Field>
  )
}
