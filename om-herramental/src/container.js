// Composition root: único lugar donde se conectan las implementaciones concretas.
import { supabase } from './lib/supabase'
import { ToolRepository } from './repositories/ToolRepository'
import { MovementRepository } from './repositories/MovementRepository'
import { ToolService } from './services/ToolService'
import { MovementService } from './services/MovementService'
import { ReportService } from './services/ReportService'

const toolRepo = new ToolRepository(supabase)
const movRepo = new MovementRepository(supabase)
export const toolService = new ToolService(toolRepo, movRepo)
export const movementService = new MovementService(movRepo)
export const reportService = new ReportService(movRepo)
