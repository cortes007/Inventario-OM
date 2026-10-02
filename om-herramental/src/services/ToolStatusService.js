export class ToolStatusService {
  constructor(statusRepo) { this.statuses = statusRepo }
  forTool(toolId) { return this.statuses.forTool(toolId) }
}
