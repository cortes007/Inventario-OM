import { X } from 'lucide-react'
export const Button = ({ variant = 'primary', className = '', ...p }) => (
  <button {...p} className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition disabled:opacity-50 ${
    variant === 'primary' ? 'bg-brand text-black hover:bg-brand-dark' : 'border border-line text-zinc-200 hover:bg-line'} ${className}`} />
)
export const Field = ({ label, children }) => (
  <label className="block text-sm"><span className="mb-1 block text-muted">{label}</span>{children}</label>
)
export const Alert = ({ children }) => children ? <p className="rounded-md border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">{children}</p> : null
const tone = { DISPONIBLE: 'bg-emerald-950 text-brand', EN_REPARACION: 'bg-amber-950 text-amber-400', BAJA: 'bg-zinc-800 text-zinc-400', ENTRADA: 'bg-emerald-950 text-brand', SALIDA: 'bg-orange-950 text-orange-400' }
export const Badge = ({ v }) => <span className={`rounded-full px-2 py-0.5 text-xs ${tone[v]}`}>{v.replace('_', ' ').toLowerCase()}</span>
export const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
    <div className="w-full max-w-lg rounded-lg border border-line bg-panel p-5" onClick={(e) => e.stopPropagation()}>
      <div className="mb-4 flex items-center justify-between"><h3 className="font-medium">{title}</h3>
        <button onClick={onClose} aria-label="Cerrar"><X size={18} /></button></div>{children}
    </div>
  </div>
)
export const Card = ({ children, className = '' }) => <div className={`rounded-lg border border-line bg-panel ${className}`}>{children}</div>
