import api from './client'

export interface Material {
  id: string
  project_id: string
  material_name: string
  material_type: string
  quantity: number
  unit: string
  recycled_content: number
  gwp: number
  transport_distance: number
  created_at: string
}

export interface MaterialLibraryItem {
  id: string
  name: string
  type: string
  unit: string
  gwp_factor: number
}

export interface AddMaterialData {
  material_name: string
  material_type: string
  quantity: number
  unit: string
  recycled_content?: number
  transport_distance?: number
}

export interface UpdateMaterialData {
  material_name?: string
  material_type?: string
  quantity?: number
  unit?: string
  recycled_content?: number
  transport_distance?: number
}

export interface BatchAddResult {
  added: number
  failed: number
  materials: { id: string; material_name: string; gwp: number }[]
  errors: { material_name: string; error: string }[]
  total_gwp: number
}

export const materialsApi = {
  list: async (projectId: string): Promise<Material[]> => {
    const response = await api.get(`/projects/${projectId}/materials`)
    return response.data
  },

  add: async (projectId: string, data: AddMaterialData): Promise<Material> => {
    const response = await api.post(`/projects/${projectId}/materials`, data)
    return response.data
  },

  addBatch: async (projectId: string, materials: AddMaterialData[]): Promise<BatchAddResult> => {
    const response = await api.post(`/projects/${projectId}/materials/batch`, { materials })
    return response.data
  },

  delete: async (projectId: string, materialId: string): Promise<{ message: string; new_total_gwp: number }> => {
    const response = await api.delete(`/projects/${projectId}/materials/${materialId}`)
    return response.data
  },

  update: async (projectId: string, materialId: string, data: UpdateMaterialData): Promise<Material & { new_total_gwp: number }> => {
    const response = await api.put(`/projects/${projectId}/materials/${materialId}`, data)
    return response.data
  },

  getLibrary: async (): Promise<MaterialLibraryItem[]> => {
    const response = await api.get('/materials/library')
    return response.data
  },
}
