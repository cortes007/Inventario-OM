import { BaseRepository } from './BaseRepository'

export class ToolStatusRepository extends BaseRepository {
  constructor(client) { super(client, 'herramienta_estado_historial') }

  forTool(toolId) {
    return this._run(this.c.from(this.t).select('*').eq('herramienta_id', toolId).order('created_at', { ascending: false }))
  }
}
