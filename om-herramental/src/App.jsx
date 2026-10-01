import { useEffect, useState } from 'react'
import { ArrowLeftRight, FileBarChart, LogOut, Wrench } from 'lucide-react'
import { supabase, configured } from './lib/supabase'
import Login from './components/Login'
import Tools from './pages/Tools'
import Movements from './pages/Movements'
import Reports from './pages/Reports'

const NAV = [
  { id: 'tools', label: 'Herramientas', icon: Wrench, page: Tools },
  { id: 'movs', label: 'Entradas y salidas', icon: ArrowLeftRight, page: Movements },
  { id: 'reports', label: 'Informes', icon: FileBarChart, page: Reports },
]

export default function App() {
  const [session, setSession] = useState(undefined); const [view, setView] = useState('tools')
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
    <div className="flex min-h-screen">
      <aside className="flex w-14 flex-col border-r border-line bg-panel md:w-60">
        <div className="flex items-center gap-2 border-b border-line px-4 py-4">
          <Wrench className="shrink-0 text-brand" size={20} />
          <div className="hidden md:block"><p className="text-sm font-semibold leading-none">OM Herramental</p><p className="mt-1 text-xs text-muted">AcabadosOM SAS</p></div>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {NAV.map(({ id, label, icon: I }) => (
            <button key={id} onClick={() => setView(id)} title={label}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm ${view === id ? 'bg-line text-white' : 'text-muted hover:text-white'}`}>
              <I size={18} /><span className="hidden md:inline">{label}</span>
            </button>
          ))}
        </nav>
        <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-3 border-t border-line px-5 py-4 text-sm text-muted hover:text-white">
          <LogOut size={18} /><span className="hidden md:inline">Cerrar sesión</span>
        </button>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8"><Page /></main>
    </div>
  )
}
