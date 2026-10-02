const MAX_FILE_SIZE = 20 * 1024 * 1024

export class ToolDocumentService {
  constructor(documentRepo) { this.documents = documentRepo }

  listForTool(toolId) { return this.documents.listForTool(toolId) }

  async upload(toolId, file) {
    if (!toolId) throw new Error('Guarda la herramienta antes de adjuntar documentos')
    if (!file || file.size <= 0) throw new Error('Selecciona un archivo válido')
    if (file.size > MAX_FILE_SIZE) throw new Error('El archivo supera el límite de 20 MB')
    const path = `${toolId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, '_')}`
    await this.documents.uploadObject(path, file)
    try {
      return await this.documents.create({
        tool_id: toolId,
        storage_path: path,
        file_name: file.name,
        content_type: file.type || null,
        byte_size: file.size,
      })
    } catch (error) {
      try {
        await this.documents.removeObject(path)
      } catch (cleanupError) {
        throw new Error(`${error.message}. Además, no se pudo limpiar el archivo subido: ${cleanupError.message}`)
      }
      throw error
    }
  }

  async download(document) {
    const url = await this.documents.signedUrl(document.storage_path)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async remove(document) {
    await this.documents.removeObject(document.storage_path)
    try {
      await this.documents.remove(document.id)
    } catch (error) {
      throw new Error(`El archivo se eliminó, pero no se pudo borrar su registro: ${error.message}`)
    }
  }
}
