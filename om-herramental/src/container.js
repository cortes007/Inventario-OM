// Composition root: único lugar donde se conectan las implementaciones concretas.
import { supabase } from './lib/supabase'
import { ToolRepository } from './repositories/ToolRepository'
import { MovementRepository } from './repositories/MovementRepository'
import { ToolDocumentRepository } from './repositories/ToolDocumentRepository'
import { ToolStatusRepository } from './repositories/ToolStatusRepository'
import { InventoryRealtimeRepository } from './repositories/InventoryRealtimeRepository'
import { ToolService } from './services/ToolService'
import { MovementService } from './services/MovementService'
import { ReportService } from './services/ReportService'
import { ToolDocumentService } from './services/ToolDocumentService'
import { ToolStatusService } from './services/ToolStatusService'
import { InventoryRealtimeService } from './services/InventoryRealtimeService'

const toolRepo = new ToolRepository(supabase)
const movRepo = new MovementRepository(supabase)
const documentRepo = new ToolDocumentRepository(supabase)
const statusRepo = new ToolStatusRepository(supabase)
const realtimeRepo = new InventoryRealtimeRepository(supabase)
export const toolService = new ToolService(toolRepo, movRepo)
export const movementService = new MovementService(movRepo)
export const reportService = new ReportService(movRepo)
export const toolDocumentService = new ToolDocumentService(documentRepo)
export const toolStatusService = new ToolStatusService(statusRepo)
export const inventoryRealtimeService = new InventoryRealtimeService(realtimeRepo)
