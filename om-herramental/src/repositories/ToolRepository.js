import { BaseRepository } from './BaseRepository'
export class ToolRepository extends BaseRepository {
  constructor(client) { super(client, 'herramientas') }
}
