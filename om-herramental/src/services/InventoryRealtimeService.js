export class InventoryRealtimeService {
  constructor(repository) { this.repository = repository }
  subscribe(onChange, onError) { return this.repository.subscribe(onChange, onError) }
}
