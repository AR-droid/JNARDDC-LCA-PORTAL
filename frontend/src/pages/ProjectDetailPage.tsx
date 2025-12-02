import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { projectsApi, Project, aiGapFill, AIGapFillResult } from '../api/projects'
import { materialsApi, Material } from '../api/materials'
import MaterialAddModal from '../components/MaterialAddModal'
import ProjectEditModal from '../components/ProjectEditModal'
import BOMUploadModal from '../components/BOMUploadModal'
import { ChartIcon, AnalyticsIcon, AIIcon, FlaskIcon, UploadIcon, PlusIcon, PackageIcon } from '../components/Icons'
import { useAuthStore } from '../stores/authStore'
import { FileSpreadsheet, Sparkles } from 'lucide-react'

interface VerificationStatus {
  verification_status: 'not_submitted' | 'pending' | 'approved' | 'rejected'
  verification_submitted_at?: string
  verification_reviewed_at?: string
  verification_notes?: string
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  
  // Feature access checks
  const hasVerificationAccess = user?.tier === 'enterprise' || user?.features?.verification
  const hasCBAMAccess = user?.tier === 'pro' || user?.tier === 'enterprise' || user?.features?.cbam_export
  
  const [project, setProject] = useState<Project | null>(null)
  const [materials, setMaterials] = useState<Material[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showBOMUpload, setShowBOMUpload] = useState(false)
  const [sortField, setSortField] = useState<'material_name' | 'material_type' | 'quantity' | 'gwp' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null)
  const [isSubmittingVerification, setIsSubmittingVerification] = useState(false)
  const [isAIFilling, setIsAIFilling] = useState(false)
  const [aiGapFillResult, setAiGapFillResult] = useState<AIGapFillResult | null>(null)
  const [showAIResultModal, setShowAIResultModal] = useState(false)

  useEffect(() => {
    loadData()
    loadVerificationStatus()
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

  const loadVerificationStatus = async () => {
    if (!id) return
    
    try {
      const status = await projectsApi.checkVerificationStatus(id)
      setVerificationStatus(status)
    } catch (error) {
      console.error('Error loading verification status:', error)
      // Default to not submitted if error
      setVerificationStatus({ verification_status: 'not_submitted' })
    }
  }

  const handleSubmitVerification = async () => {
    if (!id) return
    
    try {
      setIsSubmittingVerification(true)
      await projectsApi.submitForVerification(id)
      await loadVerificationStatus()
    } catch (error) {
      console.error('Error submitting for verification:', error)
      alert('Failed to submit for verification. Please ensure you have at least one material added.')
    } finally {
      setIsSubmittingVerification(false)
    }
  }

  const handleAIGapFill = async () => {
    if (!id) return
    
    try {
      setIsAIFilling(true)
      const result = await aiGapFill(id)
      setAiGapFillResult(result)
      setShowAIResultModal(true)
      // Reload materials to show updated values
      await loadData()
    } catch (error) {
      console.error('Error filling gaps with AI:', error)
      alert('Failed to fill gaps with AI. Please try again.')
    } finally {
      setIsAIFilling(false)
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
              onClick={() => navigate(`/projects/${id}/lcia`)}
              className="px-3 py-1.5 text-sm bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors flex items-center gap-1.5"
            >
              <AnalyticsIcon size={14} /> LCIA
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
              onClick={handleAIGapFill}
              disabled={isAIFilling || materials.length === 0}
              className="px-3 py-1.5 text-sm bg-gradient-to-r from-pink-500 to-violet-500 text-white rounded-md hover:from-pink-600 hover:to-violet-600 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
              title="Use AI to estimate missing data values"
            >
              <Sparkles size={14} /> {isAIFilling ? 'Filling...' : 'AI Gap Fill'}
            </button>
            <button
              onClick={() => navigate(`/projects/${id}/scenario`)}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
            >
              <FlaskIcon size={14} /> Scenarios
            </button>
            {hasCBAMAccess ? (
              <button
                onClick={() => navigate(`/projects/${id}/cbam-export`)}
                className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors flex items-center gap-1.5"
              >
                <FileSpreadsheet size={14} /> CBAM Export
              </button>
            ) : (
              <Link
                to="/pricing"
                className="px-3 py-1.5 text-sm bg-gray-400 text-white rounded-md hover:bg-gray-500 transition-colors flex items-center gap-1.5"
                title="CBAM Export requires Pro plan"
              >
                <span>🔒</span> CBAM Export
              </Link>
            )}
          </div>
        </div>

        {/* JNARRDC Verification Section */}
        <div className="bg-white rounded-lg shadow p-5 mb-5">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                🏛️ JNARRDC Verification
                {!hasVerificationAccess && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">Enterprise</span>
                )}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Get your LCA assessment verified by JNARRDC (Joint National Action for Rare Earths & Defense Compliance)
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!hasVerificationAccess ? (
                <Link
                  to="/pricing"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                >
                  <span>🔒</span> Upgrade to Enterprise
                </Link>
              ) : verificationStatus?.verification_status === 'not_submitted' && (
                <button
                  onClick={handleSubmitVerification}
                  disabled={isSubmittingVerification || materials.length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isSubmittingVerification ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <span>✓</span> Request Verification
                    </>
                  )}
                </button>
              )}
              {verificationStatus?.verification_status === 'pending' && (
                <span className="px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium flex items-center gap-1">
                  <span className="animate-pulse">⏳</span> Pending Review
                </span>
              )}
              {verificationStatus?.verification_status === 'approved' && (
                <span className="px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center gap-1">
                  ✅ Verified
                </span>
              )}
              {verificationStatus?.verification_status === 'rejected' && (
                <span className="px-3 py-1.5 bg-red-100 text-red-800 rounded-full text-sm font-medium flex items-center gap-1">
                  ❌ Rejected
                </span>
              )}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            {verificationStatus?.verification_status === 'not_submitted' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-700">
                  <strong>Why get verified?</strong> JNARRDC verification certifies that your LCA assessment meets Indian regulatory standards and is compliant with:
                </p>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 ml-2">
                  <li>Critical Minerals Mission Guidelines</li>
                  <li>SEBI BRSR ESG Disclosure Requirements</li>
                  <li>National E-Waste Management Standards</li>
                  <li>Extended Producer Responsibility (EPR) Rules</li>
                </ul>
                {materials.length === 0 && (
                  <p className="text-sm text-amber-600 font-medium mt-3">
                    ⚠️ Add at least one material to submit for verification.
                  </p>
                )}
              </div>
            )}

            {verificationStatus?.verification_status === 'pending' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-700">
                  Your LCA assessment has been submitted for JNARRDC verification. Our team will review your submission and provide feedback.
                </p>
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-gray-500">Submitted:</span>{' '}
                    <span className="font-medium">
                      {verificationStatus.verification_submitted_at 
                        ? new Date(verificationStatus.verification_submitted_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Just now'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Expected Review:</span>{' '}
                    <span className="font-medium">3-5 business days</span>
                  </div>
                </div>
              </div>
            )}

            {verificationStatus?.verification_status === 'approved' && (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">🏆</div>
                  <div>
                    <p className="text-sm font-semibold text-green-800">JNARRDC Verified Assessment</p>
                    <p className="text-sm text-gray-700 mt-1">
                      This LCA assessment has been verified by JNARRDC and meets all Indian regulatory compliance standards.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm mt-2">
                  <div>
                    <span className="text-gray-500">Verified on:</span>{' '}
                    <span className="font-medium">
                      {verificationStatus.verification_reviewed_at 
                        ? new Date(verificationStatus.verification_reviewed_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })
                        : 'Recently'}
                    </span>
                  </div>
                </div>
                {verificationStatus.verification_notes && (
                  <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
                    <p className="text-xs font-medium text-green-700 mb-1">Reviewer Notes:</p>
                    <p className="text-sm text-green-800">{verificationStatus.verification_notes}</p>
                  </div>
                )}
              </div>
            )}

            {verificationStatus?.verification_status === 'rejected' && (
              <div className="space-y-3">
                <p className="text-sm text-red-700">
                  Your verification request was not approved. Please review the feedback below and make necessary corrections.
                </p>
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-gray-500">Reviewed on:</span>{' '}
                    <span className="font-medium">
                      {verificationStatus.verification_reviewed_at 
                        ? new Date(verificationStatus.verification_reviewed_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })
                        : 'Recently'}
                    </span>
                  </div>
                </div>
                {verificationStatus.verification_notes && (
                  <div className="mt-3 p-3 bg-red-50 rounded border border-red-200">
                    <p className="text-xs font-medium text-red-700 mb-1">Rejection Reason:</p>
                    <p className="text-sm text-red-800">{verificationStatus.verification_notes}</p>
                  </div>
                )}
                <button
                  onClick={handleSubmitVerification}
                  disabled={isSubmittingVerification}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Resubmit for Verification
                </button>
              </div>
            )}
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

      {/* AI Gap Fill Results Modal */}
      {showAIResultModal && aiGapFillResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-5 border-b bg-gradient-to-r from-pink-500 to-violet-500 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6" />
                  <div>
                    <h3 className="text-xl font-bold">AI Gap Fill Results</h3>
                    <p className="text-sm opacity-90">Powered by ML regression, classification & ensemble models</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAIResultModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="p-4 bg-gray-50 border-b">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-3 rounded-lg border">
                  <p className="text-2xl font-bold text-violet-600">{aiGapFillResult.total_gaps_filled || 0}</p>
                  <p className="text-sm text-gray-600">Gaps Filled</p>
                </div>
                <div className="bg-white p-3 rounded-lg border">
                  <p className="text-2xl font-bold text-pink-600">{aiGapFillResult.materials_processed || 0}</p>
                  <p className="text-sm text-gray-600">Materials Processed</p>
                </div>
                <div className="bg-white p-3 rounded-lg border">
                  <p className="text-2xl font-bold text-indigo-600">{aiGapFillResult.ai_models_used?.length || 0}</p>
                  <p className="text-sm text-gray-600">AI Models Used</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Materials */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-3">📦 Materials Analysis</h4>
                {!aiGapFillResult.materials || aiGapFillResult.materials.length === 0 ? (
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <p className="text-gray-600">No materials in this project to analyze.</p>
                    <p className="text-sm text-gray-400 mt-2">Add materials to your project first.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {aiGapFillResult.materials.map((material) => (
                      <div key={material.material_id} className="bg-gray-50 rounded-lg p-4 border">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h5 className="font-medium text-gray-900">{material.material_name || 'Unknown Material'}</h5>
                            <p className="text-sm text-gray-500">{material.material_type || 'Unknown Type'}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            (material.overall_confidence || 0) >= 0.7 ? 'bg-green-100 text-green-700' :
                            (material.overall_confidence || 0) >= 0.5 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {Math.round((material.overall_confidence || 0) * 100)}% confidence
                          </span>
                        </div>

                        {/* Gaps Filled */}
                        {material.gaps_filled && material.gaps_filled.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-gray-600 mb-2">Values Estimated:</p>
                            <div className="flex flex-wrap gap-2">
                              {material.gaps_filled.map((gap, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-violet-100 text-violet-700 text-xs rounded">
                                  <Sparkles size={10} />
                                  {gap.field}: {typeof gap.value === 'number' ? gap.value.toFixed(2) : gap.value}
                                  <span className="text-violet-500">({Math.round((gap.confidence || 0) * 100)}%)</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* No Gaps Message */}
                        {(!material.gaps_filled || material.gaps_filled.length === 0) && (
                          <div className="mb-3">
                            <p className="text-xs text-green-600">✓ All data complete - no gaps to fill</p>
                          </div>
                        )}

                        {/* EOL Pathway */}
                        <div className="flex items-center gap-4 text-sm flex-wrap">
                          <div>
                            <span className="text-gray-500">EOL Pathway:</span>
                            <span className="ml-1 font-medium text-gray-700">
                              {material.eol_pathway?.pathway || 'standard_recycling'}
                            </span>
                          </div>
                          {material.impact_prediction?.gwp_estimate !== undefined && (
                            <div>
                              <span className="text-gray-500">GWP Est.:</span>
                              <span className="ml-1 font-medium text-gray-700">
                                {(material.impact_prediction.gwp_estimate || 0).toFixed(2)} kg CO₂e
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AI Models Used */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-3">🤖 AI Models Used</h4>
                {aiGapFillResult.ai_models_used && aiGapFillResult.ai_models_used.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {aiGapFillResult.ai_models_used.map((model, idx) => (
                      <div key={idx} className="bg-gradient-to-br from-violet-50 to-pink-50 rounded-lg p-3 border border-violet-100">
                        <h5 className="font-medium text-violet-800">{model.name || model.model}</h5>
                        <p className="text-sm text-gray-600 mt-1">{model.purpose}</p>
                        <p className="text-xs text-gray-500 mt-2 italic">{model.method || model.technique}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No AI models information available.</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowAIResultModal(false)}
                className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
