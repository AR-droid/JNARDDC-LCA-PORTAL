import api from './client'

export interface Project {
  id: string
  name: string
  description?: string
  organization_id: string
  created_by: string
  status: 'draft' | 'calculating' | 'calculated' | 'pending_review' | 'verified' | 'rejected'
  current_phase: number
  gwp_total?: number
  water_usage?: number
  mci_score?: number
  circular_design_score?: number
  product_category?: string
  target_lifespan?: number
  is_designed_for_disassembly: boolean
  created_at: string
  updated_at: string
}

export interface CreateProjectData {
  name: string
  description?: string
  product_category?: string
  target_lifespan?: number
  is_designed_for_disassembly: boolean
}

export interface UpdateProjectData {
  name?: string
  description?: string
  status?: string
  target_lifespan?: number
}

export const projectsApi = {
  create: async (data: CreateProjectData): Promise<Project> => {
    const response = await api.post('/projects', data)
    return response.data
  },

  list: async (skip = 0, limit = 100): Promise<Project[]> => {
    const response = await api.get('/projects', { params: { skip, limit } })
    return response.data
  },

  getById: async (projectId: string): Promise<Project> => {
    const response = await api.get(`/projects/${projectId}`)
    return response.data
  },

  /**
   * Update a project
   */
  update: async (projectId: string, data: UpdateProjectData): Promise<Project> => {
    const response = await api.put(`/projects/${projectId}`, data)
    return response.data
  },

  /**
   * Delete a project
   */
  delete: async (projectId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/projects/${projectId}`)
    return response.data
  },

  /**
   * Calculate MCI and Circular Design Score for a project
   */
  calculateMCI: async (projectId: string): Promise<MCIResult> => {
    const response = await api.post(`/projects/${projectId}/calculate-mci`)
    return response.data
  },

  /**
   * Calculate 'What-if' scenario with modified parameters
   */
  calculateScenario: async (projectId: string, params: ScenarioParams): Promise<ScenarioResult> => {
    const response = await api.post(`/projects/${projectId}/scenario`, params)
    return response.data
  },

  /**
   * Get industry benchmarks
   */
  getIndustryBenchmarks: async (): Promise<IndustryBenchmark[]> => {
    const response = await api.get('/industry-benchmarks')
    return response.data
  },

  /**
   * Get AI-powered design optimization recommendations
   */
  getRecommendations: async (projectId: string): Promise<DesignRecommendationsResult> => {
    const response = await api.get(`/projects/${projectId}/recommendations`)
    return response.data
  },

  /**
   * Get action hotspots (Scrap Yard Connect) for a project
   */
  getActionHotspots: async (projectId: string): Promise<ActionHotspotsResult> => {
    const response = await api.get(`/projects/${projectId}/action-hotspots`)
    return response.data
  },

  /**
   * Get verification status
   */
  getVerificationStatus: async (projectId: string): Promise<VerificationStatus> => {
    const response = await api.get(`/projects/${projectId}/verification`)
    return response.data
  },

  /**
   * Check verification status (alias for getVerificationStatus)
   */
  checkVerificationStatus: async (projectId: string): Promise<VerificationStatus> => {
    const response = await api.get(`/projects/${projectId}/verification`)
    return response.data
  },

  /**
   * Submit project for JNARDDC verification
   */
  submitForVerification: async (projectId: string): Promise<{ message: string; request_id: string; status: string }> => {
    const response = await api.post(`/projects/${projectId}/verification/submit`)
    return response.data
  },

  /**
   * Get verification certificate
   */
  getVerificationCertificate: async (projectId: string): Promise<VerificationCertificate> => {
    const response = await api.get(`/projects/${projectId}/verification/certificate`)
    return response.data
  },
}

export interface VerificationStatus {
  request_id?: string
  project_id?: string
  status?: 'not_submitted' | 'pending' | 'under_review' | 'verified' | 'rejected'
  verification_status?: 'not_submitted' | 'pending' | 'approved' | 'rejected' | 'verified'
  submitted_at?: string
  verification_submitted_at?: string
  verified_at?: string
  verification_reviewed_at?: string
  verifier_name?: string
  verifier_notes?: string
  verification_notes?: string
  certificate_id?: string
  flags?: { type: string; message: string }[]
}

export interface VerificationCertificate {
  certificate_id: string
  project_name: string
  organization: string
  verified_at: string
  verifier_name: string
  gwp_total: number
  mci_score: number
  validity: string
  issuer: string
  qr_code_data: string
}

export interface MCIResult {
  project_id: string
  mci_score: number
  circular_design_score: number
  avg_recycled_content: number
  recycled_content_output: number
  target_lifespan: number
  industry_avg_lifespan: number
  product_category: string
  is_designed_for_disassembly: boolean
  total_materials: number
  total_mass: number
  benchmark: {
    name: string
    avg_mci: number
  }
}

export interface ScenarioParams {
  recycled_content_modifier?: number
  lifespan_modifier?: number
  transport_reduction?: number
  design_for_disassembly?: boolean
}

export interface ScenarioResult {
  original: {
    gwp_total: number
    lifespan: number
    is_designed_for_disassembly: boolean
  }
  scenario: {
    gwp_total: number
    lifespan: number
    is_designed_for_disassembly: boolean
    avg_recycled_content: number
    mci_score: number
    circular_design_score: number
  }
  improvements: {
    gwp_reduction_percent: number
    gwp_reduction_kg: number
  }
  modifiers_applied: ScenarioParams
}

export interface IndustryBenchmark {
  category: string
  name: string
  avg_lifespan: number
  avg_mci: number
}

// Design Recommendations (Engine 4) Types
export interface RecommendationImpact {
  gwp_savings_kg?: number
  gwp_savings_percent?: number
  mci_improvement?: number
  lifetime_gwp_reduction_percent?: number
  recycled_output_improvement?: number
  cost_impact?: string
  abiotic_depletion?: string
  supply_risk?: string
}

export interface DesignRecommendation {
  type: 'recycled_content' | 'material_substitution' | 'transport_optimization' | 'scarcity_alert' | 'lifespan_extension' | 'design_for_disassembly'
  priority: 'high' | 'medium' | 'low'
  material?: string
  material_type?: string
  title: string
  description: string
  current_value?: number
  recommended_value?: number
  current_lifespan?: number
  recommended_lifespan?: number
  current_distance?: number
  recommended_distance?: number
  alternative_type?: string
  impact: RecommendationImpact
  suggestions?: string[]
  confidence: number
  before_image?: string
  after_image?: string
}

export interface DesignRecommendationsResult {
  project_id: string
  project_name: string
  recommendations: DesignRecommendation[]
  total_recommendations: number
  priority_score: number
  summary: {
    high_priority: number
    medium_priority: number
    low_priority: number
  }
  message?: string
  // Groq AI Enhancement
  source?: 'rule_based' | 'hybrid'
  ai_model?: string
  ai_insights?: AIDesignInsight[]
}

// AI-powered strategic insights from Groq
export interface AIDesignInsight {
  title: string
  description: string
  category: 'technology' | 'supply_chain' | 'regulatory' | 'cost_benefit' | 'circular_economy'
  impact_potential: 'high' | 'medium' | 'low'
  implementation_timeframe: 'short_term' | 'medium_term' | 'long_term'
}

// Action Hotspots (Scrap Yard Connect) Types
export interface ActionHotspot {
  id: string
  rank: number
  type: 'high_impact_material' | 'recycled_content' | 'transport_optimization' | 'circularity' | 'design_for_disassembly' | 'scrap_recovery'
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  material_name?: string
  material_type?: string
  current_value?: number
  recommended_value?: number
  contribution_percent: number
  impact: {
    gwp_savings_kg?: number
    gwp_savings_percent?: number
    mci_improvement?: number
    recycled_output_improvement?: number
    cost_impact?: string
  }
  confidence: number
  suggestions?: string[]
  suppliers?: {
    name: string
    location: string
    recycled_content: number
  }[]
}

export interface ActionHotspotsResult {
  hotspots: ActionHotspot[]
  total_hotspots: number
  total_gwp: number
  mci_score: number
  project_name: string
  ai_insights?: {
    text: string
    model: string
    generated_at: string
  }
  message?: string
}

// NLP Parsing Types
export interface NLPToken {
  type: string
  value?: string | number | boolean
  values?: number[]
  material?: string
  form?: string
  is_recycled?: boolean
  is_composite?: boolean
  matched_keyword?: string
}

export interface NLPAssumption {
  field: string
  value: string
  reason: string
}

export interface NLPParsedMaterial {
  material_name: string
  material_type: string
  quantity: number | null
  unit: string
  recycled_content: number
  gwp_factor: number
  transport_distance: number
  is_coating?: boolean
  is_composite?: boolean
  quantity_note?: string
}

export interface NLPParsedProject {
  product_category: string
  target_lifespan: number | null
  is_designed_for_disassembly: boolean
}

export interface NLPParseResult {
  success: boolean
  original_input: string
  parsed: {
    materials: NLPParsedMaterial[]
    project: NLPParsedProject
    assumptions: NLPAssumption[]
    tokens: NLPToken[]
    suggested_name?: string
    coatings?: string[]
    parsing_method?: 'groq_llm' | 'regex_fallback'
  }
}

/**
 * Parse natural language description into structured BOM data
 * 
 * Example input: "10kg copper wire, PVC coated, used in a motor for 10 years"
 */
export const parseNLPDescription = async (description: string): Promise<NLPParseResult> => {
  const response = await api.post('/parse-nlp', { description })
  return response.data
}

// =====================================================
// CUSTOM DATASET MANAGEMENT
// =====================================================

export interface DatasetMaterial {
  name: string
  type: string
  emission_factor: number
  recycled_content?: number
  region?: string
  scarcity_score?: number
}

export interface CustomDataset {
  id: string
  name: string
  materials: DatasetMaterial[]
  created_at: string
}

export interface UploadDatasetResult {
  success: boolean
  dataset_id: string
  name: string
  materials_count: number
  message: string
}

export interface CombinedMaterialLibrary {
  system: any[]
  india: any[]
  custom: any[]
  all: any[]
}

/**
 * Upload custom material/product dataset
 */
export const uploadDataset = async (name: string, materials: DatasetMaterial[]): Promise<UploadDatasetResult> => {
  const response = await api.post('/datasets/upload', { name, materials })
  return response.data
}

/**
 * List all custom datasets for the user
 */
export const listDatasets = async (): Promise<CustomDataset[]> => {
  const response = await api.get('/datasets')
  return response.data
}

/**
 * Get a specific dataset by ID
 */
export const getDataset = async (datasetId: string): Promise<CustomDataset> => {
  const response = await api.get(`/datasets/${datasetId}`)
  return response.data
}

/**
 * Delete a dataset
 */
export const deleteDataset = async (datasetId: string): Promise<{ message: string }> => {
  const response = await api.delete(`/datasets/${datasetId}`)
  return response.data
}

/**
 * Get combined material library (system + India + custom)
 */
export const getCombinedMaterialLibrary = async (): Promise<CombinedMaterialLibrary> => {
  const response = await api.get('/materials/combined-library')
  return response.data
}

// =====================================================
// ANALYTICS & CHARTS DATA
// =====================================================

export interface GWPByMaterial {
  name: string
  type: string
  gwp: number
  percentage: number
}

export interface GWPByType {
  name: string
  value: number
}

export interface RecycledAnalysis {
  name: string
  recycled_content: number
  quantity: number
  gwp: number
}

export interface MCIBreakdown {
  name: string
  mci: number
  recycled_input: number
  recyclability: number
}

export interface LifecycleStage {
  stage: string
  gwp: number
  percentage: number
}

export interface ProcessFlowNode {
  id: string
  name: string
}

export interface ProcessFlowLink {
  source: string
  target: string
  value: number
}

export interface ProcessFlow {
  nodes: ProcessFlowNode[]
  links: ProcessFlowLink[]
}

export interface ProjectAnalytics {
  summary: {
    total_gwp: number
    total_mass: number
    material_count: number
    avg_recycled_content: number
    mci_score: number
    circular_design_score: number
  }
  gwp_by_material: GWPByMaterial[]
  gwp_by_type: GWPByType[]
  recycled_analysis: RecycledAnalysis[]
  mci_breakdown: MCIBreakdown[]
  lifecycle_stages: LifecycleStage[]
  process_flow: ProcessFlow
}

export interface DashboardAnalytics {
  summary: {
    total_projects: number
    calculated_projects: number
    total_gwp: number
    avg_mci: number
    avg_circular_score: number
  }
  projects_timeline: {
    id: string
    name: string
    status: string
    gwp: number
    mci: number
    created_at: string
  }[]
  material_distribution: GWPByType[]
}

/**
 * Get comprehensive analytics for a project (charts data)
 */
export const getProjectAnalytics = async (projectId: string): Promise<ProjectAnalytics> => {
  const response = await api.get(`/projects/${projectId}/analytics`)
  return response.data
}

/**
 * Get dashboard-level analytics across all projects
 */
export const getDashboardAnalytics = async (): Promise<DashboardAnalytics> => {
  const response = await api.get('/dashboard/analytics')
  return response.data
}

// =====================================================
// AI CHAT ASSISTANT
// =====================================================

export interface AIChatRequest {
  prompt: string
  context?: string
  project_id?: string
}

export interface AIChatResponse {
  response: string
  model: string
  source: 'groq_ai' | 'fallback'
}

export interface AIAnalysisResponse extends AIChatResponse {
  project_id: string
}

/**
 * Chat with AI assistant
 */
export const aiChat = async (request: AIChatRequest): Promise<AIChatResponse> => {
  const response = await api.post('/ai/chat', request)
  return response.data
}

/**
 * Get AI analysis of a project
 */
export const aiAnalyzeProject = async (projectId: string): Promise<AIAnalysisResponse> => {
  const response = await api.post('/ai/analyze', { project_id: projectId })
  return response.data
}

// =====================================================
// CBAM EXPORT & COMPLIANCE
// =====================================================

export interface CBAMGood {
  product_description: string
  cn_code: string
  cbam_category: string
  quantity_kg: number
  quantity_tonnes: number
  embedded_emissions_tco2: number
  specific_embedded_emissions: number
  recycled_content_percent: number
  benchmark_ef: number
  production_country: string
  installation_name: string
  verification_status: string
}

export interface CBAMReport {
  report_metadata: {
    report_id: string
    generation_date: string
    reporting_period: string
    regulation_reference: string
    report_type: string
    software_version: string
  }
  declarant_information: {
    company_name: string
    contact_person: string
    email: string
    country_of_origin: string
    eori_number: string
  }
  project_information: {
    project_id: string
    project_name: string
    product_category: string
    description: string
  }
  goods_declaration: CBAMGood[]
  summary: {
    total_goods_categories: number
    total_quantity_tonnes: number
    total_embedded_emissions_tco2: number
    average_specific_emissions: number
    estimated_ets_price_eur: number
    estimated_cbam_liability_eur: number
  }
  verification_requirements: {
    accredited_verifier_required: boolean
    verification_deadline: string
    documentation_required: string[]
  }
  compliance_notes: string[]
}

/**
 * Get CBAM export report for a project
 */
export const getCBAMReport = async (projectId: string): Promise<CBAMReport> => {
  const response = await api.get(`/projects/${projectId}/cbam-export`)
  return response.data
}

export const getCBAMReportQr = async (
  projectId: string
): Promise<{ qr_code: string; url: string }> => {
  const response = await api.get(`/projects/${projectId}/cbam-export/qr`)
  return response.data
}

/**
 * Download CBAM CSV export
 */
export const downloadCBAMCSV = async (projectId: string): Promise<void> => {
  const response = await api.get(`/projects/${projectId}/cbam-export/csv`, {
    responseType: 'blob'
  })
  
  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `cbam_report_${projectId.slice(0, 8)}.csv`)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

/**
 * Download CBAM Excel export (letterhead format)
 */
export const downloadCBAMExcel = async (projectId: string): Promise<void> => {
  const response = await api.get(`/projects/${projectId}/cbam-export/excel`, {
    responseType: 'blob'
  })
  
  // Get filename from content-disposition header or use default
  const contentDisposition = response.headers['content-disposition']
  let filename = `CBAM_Report_${projectId.slice(0, 8)}.xlsx`
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?(.+)"?/)
    if (match) filename = match[1]
  }
  
  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

/**
 * Get BRSR (SEBI) Export data
 */
export const getBRSRExport = async (projectId: string): Promise<any> => {
  const response = await api.get(`/projects/${projectId}/brsr-export`)
  return response.data
}

/**
 * Download BRSR Excel export (SEBI format)
 */
export const downloadBRSRExcel = async (projectId: string): Promise<void> => {
  const response = await api.get(`/projects/${projectId}/brsr-export/excel`, {
    responseType: 'blob'
  })
  
  const contentDisposition = response.headers['content-disposition']
  let filename = `BRSR_Report_${projectId.slice(0, 8)}.xlsx`
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?(.+)"?/)
    if (match) filename = match[1]
  }
  
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

// =====================================================
// LCIA (Life Cycle Impact Assessment) TYPES & API
// =====================================================

export interface LCIACategoryMetadata {
  name: string
  short_name: string
  unit: string
  description: string
  methodology: string
  category_type: string
}

export interface LCIACategories {
  gwp: LCIACategoryMetadata
  ap: LCIACategoryMetadata
  ep: LCIACategoryMetadata
  odp: LCIACategoryMetadata
  pocp: LCIACategoryMetadata
  htp: LCIACategoryMetadata
  faetp: LCIACategoryMetadata
  tetp: LCIACategoryMetadata
  adp_elements: LCIACategoryMetadata
  adp_fossil: LCIACategoryMetadata
  water_use: LCIACategoryMetadata
  land_use: LCIACategoryMetadata
}

export interface EnergyBreakdown {
  mining_kwh: number
  refining_kwh: number
  smelting_kwh: number
  total_kwh: number
}

export interface LCIAImpacts {
  gwp: number
  ap: number
  ep: number
  odp: number
  pocp: number
  htp: number
  faetp: number
  tetp: number
  adp_elements: number
  adp_fossil: number
  water_use: number
  land_use: number
  energy_breakdown: EnergyBreakdown
  grid_gwp: number
}

export interface MaterialLCIA {
  name: string
  type: string
  quantity: number
  impacts: LCIAImpacts
}

export interface ProjectLCIAResult {
  project_id: string
  project_name: string
  product_category: string
  total_impacts: LCIAImpacts
  materials_breakdown: MaterialLCIA[]
  categories_metadata: LCIACategories
  grid_region: string
  grid_emission_factor: number
}

export interface LCIACategoriesResponse {
  categories: LCIACategories
  grid_factors: Record<string, number>
  transport_factors: Record<string, number>
}

/**
 * Get LCIA categories metadata
 */
export const getLCIACategories = async (): Promise<LCIACategoriesResponse> => {
  const response = await api.get('/lcia-categories')
  return response.data
}

/**
 * Calculate LCIA for a project
 */
export const calculateProjectLCIA = async (
  projectId: string, 
  gridRegion: string = 'national_average'
): Promise<ProjectLCIAResult> => {
  const response = await api.post(`/projects/${projectId}/calculate-lcia`, {
    grid_region: gridRegion
  })
  return response.data
}

/**
 * Calculate LCIA for a single material (real-time)
 */
export const calculateMaterialLCIA = async (
  materialType: string,
  quantity: number,
  recycledContent: number = 0,
  transportDistance: number = 0,
  transportMode: string = 'road_truck',
  gridRegion: string = 'national_average'
): Promise<{
  material_type: string
  quantity: number
  unit: string
  recycled_content: number
  impacts: LCIAImpacts
  categories_metadata: LCIACategories
}> => {
  const response = await api.post('/lcia/calculate-material', {
    material_type: materialType,
    quantity,
    recycled_content: recycledContent,
    transport_distance: transportDistance,
    transport_mode: transportMode,
    grid_region: gridRegion
  })
  return response.data
}

// =============================================
// GAP 8: AI Gap Filling Types and Functions
// =============================================

export interface AIGapFilledField {
  field: string
  value: number
  confidence: number
  method: string
}

export interface EOLPathway {
  pathway: string
  confidence: number
  description: string
}

export interface ImpactPrediction {
  gwp_estimate: number
  confidence_interval: { lower: number; upper: number }
  data_quality: string
  model_used: string
}

export interface AIFilledMaterial {
  material_id: string
  material_name: string
  material_type: string
  original_data: {
    recycled_content: number | null
    transport_distance: number | null
  }
  filled_data: {
    recycled_content: number | null
    transport_distance: number | null
    lifespan: number | null
    recyclability: number | null
    density: number | null
  }
  gaps_filled: AIGapFilledField[]
  eol_pathway: EOLPathway
  impact_prediction: ImpactPrediction
  overall_confidence: number
}

export interface AIModel {
  name: string
  purpose: string
  method: string
}

export interface AIGapFillResult {
  success: boolean
  project_id: string
  product_category: string
  total_gaps_filled: number
  materials_processed: number
  materials: AIFilledMaterial[]
  ai_models_used: AIModel[]
}

/**
 * AI-powered gap filling for missing material data
 * Uses ML regression, classification, and ensemble models
 */
export const aiGapFill = async (projectId: string): Promise<AIGapFillResult> => {
  const response = await api.post(`/projects/${projectId}/ai-fill-gaps`)
  return response.data
}


// ============================================================================
// SCRAP YARD CONNECT - Marketplace Types & API
// ============================================================================

export interface ScrapYard {
  id: string
  name: string
  state: string
  city: string
  address?: string
  latitude: number
  longitude: number
  material_types: string[]
  available_qty_tons: number
  price_per_kg: number
  quality_grade: string
  certifications: string[]
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  is_verified: boolean
  rating: number
  total_transactions: number
  last_updated: string
  created_at: string
  // Calculated fields
  distance_km?: number
}

export interface ScrapYardListResponse {
  scrap_yards: ScrapYard[]
  total_count: number
  summary: {
    total_available_tons: number
    average_price_per_kg: number
    verified_count: number
    states_covered: number
  }
}

export interface ScrapYardMatch {
  material: {
    id: string
    material_name: string
    material_type: string
    quantity: number
    unit: string
    recycled_content: number
  }
  matched_yards: ScrapYard[]
  match_count: number
  potential_recycled_content: number
  potential_gwp_reduction_percent: number
}

export interface ScrapYardMatchResponse {
  project_id: string
  matches: ScrapYardMatch[]
  total_materials: number
  materials_with_matches: number
}

export interface SourcingItem {
  material: string
  material_id: string
  quantity_kg: number
  yard: {
    id: string
    name: string
    city: string
    state: string
    distance_km: number
    price_per_kg: number
    quality_grade: string
    rating: number
    certifications: string[]
  }
  cost: number
  transport_co2_kg: number
}

export interface SourcingPlan {
  name: string
  description: string
  icon: string
  color: string
  sourcing: SourcingItem[]
  summary: {
    total_cost: number
    avg_distance_km: number
    total_transport_co2_kg: number
    materials_covered: number
    coverage_percent: number
  }
  savings_vs_virgin: number
  savings_percent: number
}

export interface SourcingPlansResponse {
  project_id: string
  project_name: string
  user_location: { lat: number; lng: number }
  virgin_baseline_cost: number
  plans: {
    plan_a: SourcingPlan
    plan_b: SourcingPlan
    plan_c: SourcingPlan
  }
  recommendation: 'plan_a' | 'plan_b' | 'plan_c'
}

export interface ScrapYardStats {
  total_scrap_yards: number
  total_available_tons: number
  total_transactions: number
  states_covered: number
  average_price_per_kg: number
  potential_savings_crores: number
  last_updated: string
}

export interface ScrapYardFilters {
  material_type?: string
  state?: string
  min_qty?: number
  max_price?: number
  verified_only?: boolean
}

export const scrapYardApi = {
  /**
   * Get all scrap yards with optional filtering
   */
  list: async (filters?: ScrapYardFilters): Promise<ScrapYardListResponse> => {
    const params = new URLSearchParams()
    if (filters?.material_type) params.append('material_type', filters.material_type)
    if (filters?.state) params.append('state', filters.state)
    if (filters?.min_qty) params.append('min_qty', filters.min_qty.toString())
    if (filters?.max_price) params.append('max_price', filters.max_price.toString())
    if (filters?.verified_only) params.append('verified_only', 'true')
    
    const response = await api.get(`/scrap-yards?${params.toString()}`)
    return response.data
  },

  /**
   * Get marketplace statistics for hero section
   */
  getStats: async (): Promise<ScrapYardStats> => {
    const response = await api.get('/scrap-yards/stats')
    return response.data
  },

  /**
   * Match scrap yards to project materials
   */
  matchToProject: async (projectId: string): Promise<ScrapYardMatchResponse> => {
    const response = await api.get(`/scrap-yards/match/${projectId}`)
    return response.data
  },

  /**
   * Generate Plan A/B/C sourcing options for a project
   */
  getSourcingPlans: async (projectId: string, userLocation?: { lat: number; lng: number }): Promise<SourcingPlansResponse> => {
    const params = new URLSearchParams()
    if (userLocation) {
      params.append('lat', userLocation.lat.toString())
      params.append('lng', userLocation.lng.toString())
    }
    const response = await api.get(`/scrap-yards/plans/${projectId}?${params.toString()}`)
    return response.data
  }
}
