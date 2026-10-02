import { useRef, useState } from 'react'
import { Download, FileText, LoaderCircle, Trash2, Upload } from 'lucide-react'
import { toolDocumentService } from '../container'
import { useResource } from '../hooks/useResource'
import { Alert, Button, Card } from './ui'

const formatSize = (bytes) => bytes < 1024 * 1024
  ? `${Math.max(1, Math.round(bytes / 1024))} KB`
  : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

export default function ToolDocuments({
  toolId,
  pendingFiles = [],
  onPendingFilesChange = () => {},
}) {
  const input = useRef(null)
  const { data, loading, error, reload } = useResource(
    () => toolId ? toolDocumentService.listForTool(toolId) : Promise.resolve([]),
    [toolId],
  )
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [dragging, setDragging] = useState(false)

  const upload = async (files) => {
    if (!files.length) return
    if (!toolId) {
      onPendingFilesChange((current) => [
        ...current,
        ...files.map((file) => ({ id: crypto.randomUUID(), file })),
      ])
      setMessage(`${files.length} archivo(s) listo(s); se subirán al guardar la herramienta.`)
      setActionError('')
      return
    }
    setBusy(true)
    setMessage('')
    setActionError('')
    const failures = []
    for (const file of files) {
      try {
        await toolDocumentService.upload(toolId, file)
      } catch (uploadError) {
        failures.push(`${file.name}: ${uploadError.message}`)
      }
    }
    setBusy(false)
    if (failures.length) setActionError(failures.join(' · '))
    else setMessage(`${files.length} archivo(s) cargado(s).`)
    await reload()
  }

  const removePending = (id) => {
    onPendingFilesChange((current) => current.filter((item) => item.id !== id))
  }

  const remove = async (document) => {
    if (!window.confirm(`¿Eliminar el archivo "${document.file_name}"?`)) return
    setActionError('')
    try {
      await toolDocumentService.remove(document)
      await reload()
    } catch (removeError) {
      setActionError(removeError.message)
    }
  }

  const download = async (document) => {
    setActionError('')
    try {
      await toolDocumentService.download(document)
    } catch (downloadError) {
      setActionError(downloadError.message)
    }
  }

  return (
    <section className="space-y-3">
      <div><h4 className="font-medium">Documentos</h4><p className="text-xs text-muted">PDF, imágenes u otros archivos · máximo 20 MB por archivo.</p></div>
      <button type="button" disabled={busy} onClick={() => input.current?.click()}
        onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); upload(Array.from(event.dataTransfer.files)) }}
        className={`flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-5 text-center text-sm transition ${dragging ? 'border-brand bg-emerald-950/30 text-brand' : 'border-line text-muted hover:border-brand hover:text-white'}`}>
        {busy ? <LoaderCircle size={20} className="animate-spin" /> : <Upload size={20} />}
        {busy ? 'Cargando archivos…' : 'Arrastra archivos aquí o haz clic para seleccionarlos'}
      </button>
      <input ref={input} type="file" multiple className="hidden" onChange={(event) => {
        upload(Array.from(event.target.files || []))
        event.target.value = ''
      }} />
      {(error || actionError) && <Alert>{error || actionError}</Alert>}
      {message && <p role="status" className="text-xs text-brand">{message}</p>}
      {loading ? <p className="text-sm text-muted">Cargando documentos…</p> : (
        <div className="space-y-2">
          {data.map((document) => <Card key={document.id} className="flex items-center gap-3 p-3">
            <FileText size={18} className="shrink-0 text-brand" />
            <div className="min-w-0 flex-1"><p className="truncate text-sm">{document.file_name}</p>
              <p className="text-xs text-muted">{formatSize(document.byte_size)} · {new Date(document.created_at).toLocaleDateString('es-CO')}</p></div>
            <Button type="button" variant="ghost" className="px-2" aria-label={`Descargar ${document.file_name}`} onClick={() => download(document)}><Download size={16} /></Button>
            <Button type="button" variant="ghost" className="px-2 text-red-400" aria-label={`Eliminar ${document.file_name}`} onClick={() => remove(document)}><Trash2 size={16} /></Button>
          </Card>)}
          {pendingFiles.map(({ id, file }) => <Card key={id} className="flex items-center gap-3 p-3">
            <FileText size={18} className="shrink-0 text-amber-400" />
            <div className="min-w-0 flex-1"><p className="truncate text-sm">{file.name}</p>
              <p className="text-xs text-muted">{formatSize(file.size)} · Pendiente de guardar</p></div>
            <Button type="button" variant="ghost" className="px-2 text-red-400" aria-label={`Quitar ${file.name}`} onClick={() => removePending(id)}><Trash2 size={16} /></Button>
          </Card>)}
          {!data.length && !pendingFiles.length && !error && <p className="text-sm text-muted">No hay documentos adjuntos.</p>}
        </div>
      )}
    </section>
  )
}
