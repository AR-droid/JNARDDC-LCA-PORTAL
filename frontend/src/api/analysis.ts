import api from './client'

export interface ImpactScorecard {
  gwp_total: number
  water_usage?: number
  mci_score?: number
  circular_design_score?: number
}

export interface HotspotAnalysis {
  material_name: string
  gwp_contribution: number
  percentage_of_total: number
}

export interface AnalysisResponse {
  project_id: string
  scorecard: ImpactScorecard
  hotspots: HotspotAnalysis[]
  recommendations: string[]
}

export const analysisApi = {
  /**
   * Trigger LCA calculation for a project
   */
  calculate: async (projectId: string): Promise<{ message: string; detail?: string }> => {
    const response = await api.post(`/analysis/${projectId}/calculate`)
    return response.data
  },

  /**
   * Get analysis results for a project
   */
  getResults: async (projectId: string): Promise<AnalysisResponse> => {
    const response = await api.get(`/analysis/${projectId}`)
    return response.data
  },

  /**
   * Get Sankey diagram data
   */
  getSankeyData: async (projectId: string): Promise<any> => {
    const response = await api.get(`/analysis/${projectId}/sankey-data`)
    return response.data
  },
}
