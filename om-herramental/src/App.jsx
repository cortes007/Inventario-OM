import { useEffect, useState } from 'react'
import { ArrowLeftRight, FileBarChart, LayoutDashboard, LogOut, Wrench } from 'lucide-react'
import { supabase, configured } from './lib/supabase'
import Login from './components/Login'
import Dashboard from './pages/Dashboard'
import Tools from './pages/Tools'
import Movements from './pages/Movements'
import Reports from './pages/Reports'

const NAV = [
  { id: 'dashboard', label: 'Panel', icon: LayoutDashboard, page: Dashboard },
  { id: 'tools', label: 'Herramientas', icon: Wrench, page: Tools },
  { id: 'movs', label: 'Entradas y salidas', icon: ArrowLeftRight, page: Movements },
  { id: 'reports', label: 'Informes', icon: FileBarChart, page: Reports },
]

export default function App() {
  const [session, setSession] = useState(undefined); const [view, setView] = useState('dashboard')
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  if (!configured) return (
    <div className="flex min-h-screen items-center justify-center p-6"><div className="max-w-md rounded-lg border border-amber-900 bg-amber-950/30 p-5 text-sm">
      <p className="mb-2 font-medium text-amber-400">Falta conectar Supabase</p>
      <p className="text-zinc-300">Crea el archivo <code>.env</code> en la raíz del proyecto con <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>, y reinicia con <code>npm run dev</code>.</p></div></div>)
  if (session === undefined) return null
  if (!session) return <Login />
  const Page = NAV.find((n) => n.id === view).page
  return (
    <div className="flex min-h-dvh min-w-0">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-panel md:flex">
        <div className="flex items-center gap-2 border-b border-line px-4 py-4">
          <Wrench className="shrink-0 text-brand" size={20} />
          <div><p className="text-sm font-semibold leading-none">OM inventario</p><p className="mt-1 text-xs text-muted">OM Construcciones y Acabados SAS</p></div>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {NAV.map(({ id, label, icon: I }) => (
            <button key={id} onClick={() => setView(id)} title={label}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm ${view === id ? 'bg-line text-white' : 'text-muted hover:text-white'}`}>
              <I size={18} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-3 border-t border-line px-5 py-4 text-sm text-muted hover:text-white">
          <LogOut size={18} /><span>Cerrar sesión</span>
        </button>
      </aside>
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-panel px-4 py-3 md:hidden">
          <div className="flex items-center gap-2"><Wrench className="text-brand" size={18} /><span className="text-sm font-semibold">OM inventario</span></div>
          <button onClick={() => supabase.auth.signOut()} aria-label="Cerrar sesión" className="rounded-md p-2 text-muted hover:bg-line hover:text-white"><LogOut size={18} /></button>
        </header>
        <main className="min-w-0 flex-1 px-4 py-5 pb-24 md:p-6 lg:p-8"><Page onNavigate={setView} /></main>
      </div>
      <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-panel/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(0,0,0,0.25)] backdrop-blur md:hidden">
        {NAV.map(({ id, label, icon: I }) => (
          <button key={id} onClick={() => setView(id)} aria-current={view === id ? 'page' : undefined}
            className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] leading-tight ${view === id ? 'text-brand' : 'text-muted'}`}>
            <I size={18} /><span className="max-w-full truncate">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
