import { BaseRepository } from './BaseRepository'

export class ToolDocumentRepository extends BaseRepository {
  constructor(client) {
    super(client, 'tool_documents')
    this.storage = client.storage.from('tool-documents')
  }

  listForTool(toolId) {
    return this._run(this.c.from(this.t).select('*').eq('tool_id', toolId).order('created_at', { ascending: false }))
  }

  async uploadObject(path, file) {
    const { error } = await this.storage.upload(path, file, { contentType: file.type || undefined, upsert: false })
    if (error) throw new Error(`No se pudo subir ${file.name}: ${error.message}`)
  }

  async removeObject(path) {
    const { error } = await this.storage.remove([path])
    if (error) throw new Error(`No se pudo eliminar el archivo: ${error.message}`)
  }

  async signedUrl(path) {
    const { data, error } = await this.storage.createSignedUrl(path, 60 * 5)
    if (error) throw new Error(`No se pudo preparar la descarga: ${error.message}`)
    return data.signedUrl
  }
}
