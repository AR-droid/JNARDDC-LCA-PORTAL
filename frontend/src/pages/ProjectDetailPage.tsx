import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { projectsApi, Project } from '../api/projects'
import { materialsApi, Material } from '../api/materials'
import MaterialAddModal from '../components/MaterialAddModal'
import ProjectEditModal from '../components/ProjectEditModal'
import BOMUploadModal from '../components/BOMUploadModal'
import { ChartIcon, AnalyticsIcon, AIIcon, FlaskIcon, EUFlagIcon, UploadIcon, PlusIcon, PackageIcon } from '../components/Icons'

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [project, setProject] = useState<Project | null>(null)
  const [materials, setMaterials] = useState<Material[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showBOMUpload, setShowBOMUpload] = useState(false)
  const [sortField, setSortField] = useState<'material_name' | 'material_type' | 'quantity' | 'gwp' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    if (!id) return
    
    try {
      setIsLoading(true)
      const [projectData, materialsData] = await Promise.all([
        projectsApi.getById(id),
        materialsApi.list(id)
      ])
      setProject(projectData)
      setMaterials(materialsData)
    } catch (error) {
      console.error('Error loading project:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMaterialAdded = () => {
    setShowAddModal(false)
    setShowBOMUpload(false)
    loadData()
  }

  const handleDeleteMaterial = async (materialId: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return
    
    try {
      await materialsApi.delete(id!, materialId)
      loadData()
    } catch (error) {
      console.error('Error deleting material:', error)
      alert('Failed to delete material')
    }
  }

  const handleUpdateProject = async (data: Partial<Project>) => {
    if (!id) return
    
    try {
      await projectsApi.update(id, data)
      await loadData()
      setShowEditModal(false)
    } catch (error) {
      console.error('Error updating project:', error)
      throw error
    }
  }

  const handleDeleteProject = async () => {
    if (!id) return

    try {
      await projectsApi.delete(id)
      navigate('/projects')
    } catch (error) {
      console.error('Error deleting project:', error)
      alert('Failed to delete project')
    }
  }

  const handleSort = (field: 'material_name' | 'material_type' | 'quantity' | 'gwp') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortedMaterials = () => {
    if (!sortField) return materials

    return [...materials].sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = (bVal as string).toLowerCase()
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    )
  }

  const totalGWP = materials.reduce((sum, m) => sum + m.gwp, 0)
  const sortedMaterials = getSortedMaterials()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Project not found</h2>
          <button
            onClick={() => navigate('/projects')}
            className="text-blue-600 hover:text-blue-700"
          >
            ← Back to Projects
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <button
          onClick={() => navigate('/projects')}
          className="text-sm text-blue-600 hover:text-blue-700 mb-3 flex items-center gap-1"
        >
          ← Back to Projects
        </button>

        <div className="bg-white rounded-lg shadow p-5 mb-5">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-1">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-gray-500">{project.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                project.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                project.status === 'calculated' ? 'bg-green-100 text-green-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {project.status}
              </span>
              <button
                onClick={() => setShowEditModal(true)}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-xs text-blue-600 font-medium">Total GWP</p>
              <p className="text-xl font-semibold text-blue-900">{totalGWP.toFixed(2)}</p>
              <p className="text-2xs text-blue-500">kg CO₂-eq</p>
              <p className="text-2xs text-blue-400 italic mt-1">IPCC AR6, Ecoinvent 3.9</p>
            </div>
            <div className="bg-green-50 p-3 rounded-md">
              <p className="text-xs text-green-600 font-medium">Materials</p>
              <p className="text-xl font-semibold text-green-900">{materials.length}</p>
              <p className="text-2xs text-green-500">items added</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-md">
              <p className="text-xs text-purple-600 font-medium">Category</p>
              <p className="text-base font-semibold text-purple-900">{project.product_category || 'Not set'}</p>
              <p className="text-2xs text-purple-500">product type</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 mt-5">
            <button
              onClick={() => navigate(`/projects/${id}/analytics`)}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1.5"
            >
              <ChartIcon size={14} /> Analytics
            </button>
            <button
              onClick={() => navigate(`/projects/${id}/analysis`)}
              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-1.5"
            >
              <AnalyticsIcon size={14} /> Analysis
            </button>
            <button
              onClick={() => navigate(`/projects/${id}/recommendations`)}
              className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center gap-1.5"
            >
              <AIIcon size={14} /> AI Advisor
            </button>
            <button
              onClick={() => navigate(`/projects/${id}/scenario`)}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
            >
              <FlaskIcon size={14} /> Scenarios
            </button>
            <button
              onClick={() => navigate(`/projects/${id}/cbam-export`)}
              className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors flex items-center gap-1.5"
            >
              <EUFlagIcon size={14} /> CBAM Export
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Bill of Materials</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBOMUpload(true)}
                className="bg-green-600 text-white px-3 py-1.5 text-sm rounded-md hover:bg-green-700 transition-colors flex items-center gap-1.5"
              >
                <UploadIcon size={14} /> Upload CSV
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 text-white px-3 py-1.5 text-sm rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1.5"
              >
                <PlusIcon size={14} /> Add Material
              </button>
            </div>
          </div>

          {materials.length === 0 ? (
            <div className="text-center py-10">
              <PackageIcon className="mx-auto text-gray-300 mb-3" size={48} />
              <h3 className="text-base font-medium text-gray-900 mb-1">No materials yet</h3>
              <p className="text-sm text-gray-500 mb-4">Start building your Bill of Materials</p>
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setShowBOMUpload(true)}
                  className="bg-green-600 text-white px-4 py-1.5 text-sm rounded-md hover:bg-green-700 flex items-center gap-1.5"
                >
                  <UploadIcon size={14} /> Upload CSV
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-blue-600 text-white px-4 py-1.5 text-sm rounded-md hover:bg-blue-700 flex items-center gap-1.5"
                >
                  <PlusIcon size={14} /> Add Material
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th 
                      className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('material_name')}
                    >
                      <div className="flex items-center">
                        Material
                        <SortIcon field="material_name" />
                      </div>
                    </th>
                    <th 
                      className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('material_type')}
                    >
                      <div className="flex items-center">
                        Type
                        <SortIcon field="material_type" />
                      </div>
                    </th>
                    <th 
                      className="text-right py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('quantity')}
                    >
                      <div className="flex items-center justify-end">
                        Quantity
                        <SortIcon field="quantity" />
                      </div>
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Recycled %</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Transport (km)</th>
                    <th 
                      className="text-right py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('gwp')}
                    >
                      <div className="flex items-center justify-end">
                        GWP (kg CO₂-eq)
                        <SortIcon field="gwp" />
                      </div>
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMaterials.map((material) => (
                    <tr key={material.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{material.material_name}</td>
                      <td className="py-3 px-4 text-gray-600">{material.material_type}</td>
                      <td className="py-3 px-4 text-right">{material.quantity} {material.unit}</td>
                      <td className="py-3 px-4 text-right">{material.recycled_content}%</td>
                      <td className="py-3 px-4 text-right">{material.transport_distance}</td>
                      <td className="py-3 px-4 text-right font-semibold text-blue-600">
                        {material.gwp.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteMaterial(material.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                          title="Delete material"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold">
                    <td colSpan={6} className="py-3 px-4 text-right">Total GWP:</td>
                    <td className="py-3 px-4 text-right text-blue-600 text-lg">
                      {totalGWP.toFixed(2)} kg CO₂-eq
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <MaterialAddModal
          projectId={id!}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleMaterialAdded}
        />
      )}

      {showBOMUpload && (
        <BOMUploadModal
          projectId={id!}
          onClose={() => setShowBOMUpload(false)}
          onSuccess={handleMaterialAdded}
        />
      )}

      {showEditModal && project && (
        <ProjectEditModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleUpdateProject}
          project={project}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Delete Project</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this project? This will also delete all {materials.length} associated material{materials.length !== 1 ? 's' : ''}. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  handleDeleteProject()
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
