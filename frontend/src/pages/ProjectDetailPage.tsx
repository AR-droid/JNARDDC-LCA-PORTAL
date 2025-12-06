import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { projectsApi, Project, aiGapFill, AIGapFillResult, VerificationStatus, parseNLPDescription, scrapYardApi, ScrapYardStats } from '../api/projects'
import { materialsApi, Material } from '../api/materials'
import MaterialAddModal from '../components/MaterialAddModal'
import ProjectEditModal from '../components/ProjectEditModal'
import BOMUploadModal from '../components/BOMUploadModal'
import SupplyChainUploadModal from '../components/SupplyChainUploadModal'
import SupplyChainMap from '../components/SupplyChainMap'
import ActionHotspots from '../components/ActionHotspots'
import { ChartIcon, AnalyticsIcon, AIIcon, FlaskIcon, UploadIcon, PlusIcon, PackageIcon } from '../components/Icons'
import { useAuthStore } from '../stores/authStore'
import { FileSpreadsheet, Sparkles, MapPin, Truck, Train, Ship, Plane, Wand2, Loader2, Recycle, ArrowRight, TrendingDown, Lightbulb, Building2, XCircle } from 'lucide-react'
import { Lock } from "lucide-react";
import { Award } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { CheckCircle } from "lucide-react";
import { Bot } from "lucide-react";
import { Clock } from "lucide-react";
import { Package } from "lucide-react";




// Transport mode icon helper
const TransportIcon = ({ mode }: { mode: string }) => {
  switch (mode?.toLowerCase()) {
    case 'rail': return <Train size={14} className="text-purple-600" />
    case 'sea': return <Ship size={14} className="text-blue-600" />
    case 'air': return <Plane size={14} className="text-sky-500" />
    default: return <Truck size={14} className="text-orange-600" />
  }
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

interface SupplyChainEntry {
  id: string
  material_name: string
  supplier_name: string
  supplier_country: string
  supplier_state?: string
  supplier_city?: string
  supplier_tier: number
  transport_mode: string
  transport_distance_km: number
  lead_time_days: number
  latitude: number
  longitude: number
  destination_lat: number
  destination_lng: number
}

interface SupplyChainSummary {
  total_suppliers: number
  domestic_suppliers: number
  import_suppliers: number
  total_transport_km: number
  avg_lead_time_days: number
  make_in_india_percentage: number
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
  const [showSupplyChainUpload, setShowSupplyChainUpload] = useState(false)
  const [supplyChainEntries, setSupplyChainEntries] = useState<SupplyChainEntry[]>([])
  const [supplyChainSummary, setSupplyChainSummary] = useState<SupplyChainSummary | null>(null)
  const [activeTab, setActiveTab] = useState<'materials' | 'supply-chain'>('materials')
  const [sortField, setSortField] = useState<'material_name' | 'material_type' | 'quantity' | 'gwp' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null)
  const [isSubmittingVerification, setIsSubmittingVerification] = useState(false)
  const [isAIFilling, setIsAIFilling] = useState(false)
  const [isGeneratingBOM, setIsGeneratingBOM] = useState(false)
  const [aiGapFillResult, setAiGapFillResult] = useState<AIGapFillResult | null>(null)
  const [showAIResultModal, setShowAIResultModal] = useState(false)
  const [scrapYardStats, setScrapYardStats] = useState<ScrapYardStats | null>(null)
  const [showScrapYardWidget, setShowScrapYardWidget] = useState(true)
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  // Auto-hide notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  useEffect(() => {
    loadData()
    loadVerificationStatus()
    loadSupplyChain()
    loadScrapYardStats()
  }, [id])

  const loadScrapYardStats = async () => {
    try {
      const stats = await scrapYardApi.getStats()
      setScrapYardStats(stats)
    } catch (e) {
      console.error('Failed to load scrap yard stats:', e)
    }
  }

  const loadSupplyChain = async () => {
    if (!id) return
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_BASE}/projects/${id}/supply-chain`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setSupplyChainEntries(data.entries || [])
        setSupplyChainSummary(data.summary || null)
      }
    } catch (error) {
      console.error('Error loading supply chain:', error)
    }
  }

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
      setVerificationStatus(status as VerificationStatus)
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

  // AI Generate BOM from project description
  const handleGenerateBOM = async () => {
    if (!id || !project?.description) {
      setNotification({ type: 'error', message: 'Project description is required to generate BOM. Please add a description first.' })
      return
    }

    try {
      setIsGeneratingBOM(true)
      
      // Parse the project description using NLP
      const nlpResult = await parseNLPDescription(project.description)
      
      if (!nlpResult.parsed.materials || nlpResult.parsed.materials.length === 0) {
        setNotification({ type: 'error', message: 'Could not extract materials from the description. Please try adding more details about the materials used.' })
        return
      }

      // Convert NLP materials to batch add format
      const materialsToAdd = nlpResult.parsed.materials.map(mat => ({
        material_name: mat.material_name,
        material_type: mat.material_type || 'other',
        quantity: mat.quantity || 1,
        unit: mat.unit || 'kg',
        recycled_content: mat.recycled_content || 0,
        transport_distance: mat.transport_distance || 500
      }))

      // Batch add the materials
      const result = await materialsApi.addBatch(id, materialsToAdd)
      
      if (result.added > 0) {
        setNotification({ type: 'success', message: `Successfully generated BOM! ${result.added} materials added from your description.${result.failed > 0 ? ` ${result.failed} materials could not be added.` : ''}` })
        await loadData()
      } else {
        setNotification({ type: 'error', message: 'No materials could be added. Please check the description or add materials manually.' })
      }
    } catch (error) {
      console.error('Error generating BOM:', error)
      setNotification({ type: 'error', message: 'Failed to generate BOM. Please try again or add materials manually.' })
    } finally {
      setIsGeneratingBOM(false)
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
  const avgRecycledContent = materials.length > 0 
    ? materials.reduce((sum, m) => sum + (m.recycled_content || 0), 0) / materials.length 
    : 0
  // MCI (Material Circularity Indicator) - simplified calculation
  // MCI = (recycled_content_fraction * 0.5) + (recyclability_fraction * 0.5)
  // For simplicity, we assume recyclability matches recycled content
  const mciScore = (avgRecycledContent / 100 * 0.5 + avgRecycledContent / 100 * 0.5).toFixed(2)
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
      {/* Notification Banner */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 max-w-md px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in ${
          notification.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
          notification.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
          'bg-blue-50 border border-blue-200 text-blue-800'
        }`}>
          {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />}
          {notification.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />}
          {notification.type === 'info' && <Bot className="w-5 h-5 text-blue-600 flex-shrink-0" />}
          <p className="text-sm font-medium">{notification.message}</p>
          <button 
            onClick={() => setNotification(null)}
            className="ml-auto text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      )}
      
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Secondary Navigation Bar - Quick Actions */}
        <div className="bg-white rounded-lg shadow mb-5">
          <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-100">
            <button
              onClick={() => navigate('/projects')}
              className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-1.5"
            >
              <span className="text-base">←</span> Back
            </button>
            <div className="w-px h-6 bg-gray-200 mx-1"></div>
            <button
              onClick={() => navigate(`/projects/${id}/analytics`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors flex items-center gap-2"
            >
              <ChartIcon size={16} /> Analytics
            </button>
            <button
              onClick={() => navigate(`/projects/${id}/lcia`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-teal-50 hover:text-teal-700 rounded-md transition-colors flex items-center gap-2"
            >
              <AnalyticsIcon size={16} /> LCIA
            </button>
            <button
              onClick={() => navigate(`/projects/${id}/analysis`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-md transition-colors flex items-center gap-2"
            >
              <AnalyticsIcon size={16} /> Analysis
            </button>
            <button
              onClick={() => navigate(`/projects/${id}/recommendations`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-md transition-colors flex items-center gap-2"
            >
              <AIIcon size={16} /> Design Advisor
            </button>
            <button
              onClick={handleAIGapFill}
              disabled={isAIFilling || materials.length === 0}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-pink-50 hover:text-pink-700 disabled:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded-md transition-colors flex items-center gap-2"
              title="Use AI to estimate missing data values"
            >
              <Sparkles size={16} /> {isAIFilling ? 'Filling...' : 'AI Gap Fill'}
            </button>
            <button
              onClick={() => navigate(`/projects/${id}/scenario`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors flex items-center gap-2"
            >
              <FlaskIcon size={16} /> Scenarios
            </button>
            {hasCBAMAccess ? (
              <button
                onClick={() => navigate(`/projects/${id}/cbam-export`)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-amber-50 hover:text-amber-700 rounded-md transition-colors flex items-center gap-2"
              >
                <FileSpreadsheet size={16} /> CBAM
              </button>
            ) : (
              <Link
                to="/pricing"
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:bg-gray-50 rounded-md transition-colors flex items-center gap-2"
                title="CBAM Export requires Pro plan"
              >
                <Lock size={16} /> CBAM
              </Link>
            )}
          </div>
        </div>

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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-5">
            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-xs text-blue-600 font-medium">Total GWP</p>
              <p className="text-xl font-semibold text-blue-900">{totalGWP.toFixed(2)}</p>
              <p className="text-2xs text-blue-500">kg CO₂-eq</p>
              <p className="text-2xs text-blue-400 italic mt-1">IPCC AR6, Ecoinvent 3.9</p>
            </div>
            <div className="bg-teal-50 p-3 rounded-md">
              <p className="text-xs text-teal-600 font-medium">MCI Score</p>
              <p className="text-xl font-semibold text-teal-900">{mciScore}</p>
              <p className="text-2xs text-teal-500">Material Circularity</p>
              <p className="text-2xs text-teal-400 italic mt-1">Ellen MacArthur Foundation</p>
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
        </div>

        {/* Tabs for Materials and Supply Chain - BOM Input Section */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="border-b">
            <div className="flex">
              <button
                onClick={() => setActiveTab('materials')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'materials'
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <PackageIcon size={16} />
                  Bill of Materials ({materials.length})
                </span>
              </button>
              <button
                onClick={() => setActiveTab('supply-chain')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'supply-chain'
                    ? 'border-orange-600 text-orange-600 bg-orange-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <MapPin size={16} />
                  🇮🇳 Supply Chain ({supplyChainEntries.length})
                </span>
              </button>
            </div>
          </div>

          {/* Materials Tab Content */}
          {activeTab === 'materials' && (
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Bill of Materials</h2>
                <div className="flex gap-2">
                  {project?.description && (
                    <button
                      onClick={handleGenerateBOM}
                      disabled={isGeneratingBOM}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGeneratingBOM ? (
                        <>
                          <Loader2 size={14} className="animate-spin" /> Generating...
                        </>
                      ) : (
                        <>
                          <Wand2 size={14} /> AI Generate
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => setShowBOMUpload(true)}
                    className="bg-green-600 text-white px-3 py-1.5 text-sm rounded-md hover:bg-green-700 transition-colors flex items-center gap-1.5"
                  >
                    <UploadIcon size={14} /> Upload BOM
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
                <div className="border-2 border-dashed border-purple-200 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 p-8">
                  <div className="text-center">
                    {/* Step indicator */}
                    <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
                      <span className="w-5 h-5 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs">2</span>
                      Next Step
                    </div>
                    
                    <Wand2 className="mx-auto text-purple-400 mb-4" size={48} />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Build Your Bill of Materials</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      {project?.description 
                        ? "Use AI to automatically extract materials from your product description, or add them manually."
                        : "Add your product's materials to calculate its environmental impact. Upload a PDF/Excel BOM or add materials one by one."
                      }
                    </p>
                    
                    <div className="flex flex-col sm:flex-row justify-center gap-3">
                      {project?.description && (
                        <button
                          onClick={handleGenerateBOM}
                          disabled={isGeneratingBOM}
                          className="bg-purple-600 text-white px-6 py-2.5 rounded-lg hover:bg-purple-700 transition-all flex items-center justify-center gap-2 font-medium shadow-lg shadow-purple-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isGeneratingBOM ? (
                            <>
                              <Loader2 size={18} className="animate-spin" /> Generating BOM...
                            </>
                          ) : (
                            <>
                              <Wand2 size={18} /> Generate BOM with AI
                            </>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => setShowBOMUpload(true)}
                        className="bg-white text-green-700 border-2 border-green-200 px-5 py-2.5 rounded-lg hover:bg-green-50 hover:border-green-300 transition-all flex items-center justify-center gap-2 font-medium"
                      >
                        <UploadIcon size={18} /> Upload BOM
                      </button>
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-white text-blue-700 border-2 border-blue-200 px-5 py-2.5 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all flex items-center justify-center gap-2 font-medium"
                      >
                        <PlusIcon size={18} /> Add Manually
                      </button>
                    </div>
                    
                    {!project?.description && (
                      <p className="text-sm text-gray-500 mt-4 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" /> Tip: Add a product description to enable AI-powered BOM generation
                      </p>
                    )}
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
          )}

          {/* Supply Chain Tab Content */}
          {activeTab === 'supply-chain' && (
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <span className="text-2xl">🇮🇳</span>
                  Supply Chain Tracking - Make in India
                </h2>
                <button
                  onClick={() => setShowSupplyChainUpload(true)}
                  className="bg-orange-600 text-white px-3 py-1.5 text-sm rounded-md hover:bg-orange-700 transition-colors flex items-center gap-1.5"
                >
                  <UploadIcon size={14} /> Upload Supply Chain CSV
                </button>
              </div>

              {/* Summary Cards */}
              {supplyChainSummary && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
                    <div className="text-xs text-green-600 font-medium">Make in India</div>
                    <div className="text-2xl font-bold text-green-700">{supplyChainSummary.make_in_india_percentage.toFixed(0)}%</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
                    <div className="text-xs text-blue-600 font-medium">Total Suppliers</div>
                    <div className="text-2xl font-bold text-blue-700">{supplyChainSummary.total_suppliers}</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 border border-orange-200">
                    <div className="text-xs text-orange-600 font-medium">Domestic</div>
                    <div className="text-2xl font-bold text-orange-700">{supplyChainSummary.domestic_suppliers}</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200">
                    <div className="text-xs text-purple-600 font-medium">Imports</div>
                    <div className="text-2xl font-bold text-purple-700">{supplyChainSummary.import_suppliers}</div>
                  </div>
                  <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg p-3 border border-cyan-200">
                    <div className="text-xs text-cyan-600 font-medium">Avg Lead Time</div>
                    <div className="text-2xl font-bold text-cyan-700">{supplyChainSummary.avg_lead_time_days.toFixed(0)} days</div>
                  </div>
                </div>
              )}

              {supplyChainEntries.length === 0 ? (
                <div className="text-center py-10">
                  <MapPin className="mx-auto text-gray-300 mb-3" size={48} />
                  <h3 className="text-base font-medium text-gray-900 mb-1">No supply chain data yet</h3>
                  <p className="text-sm text-gray-500 mb-4">Track your suppliers and visualize on the map</p>
                  <button
                    onClick={() => setShowSupplyChainUpload(true)}
                    className="bg-orange-600 text-white px-4 py-1.5 text-sm rounded-md hover:bg-orange-700 flex items-center gap-1.5 mx-auto"
                  >
                    <UploadIcon size={14} /> Upload Supply Chain CSV
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Real World Map Visualization */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-orange-500 to-green-500 px-4 py-2 text-white font-medium flex items-center gap-2">
                      <MapPin size={16} />
                      🇮🇳 Supply Chain Map - Make in India
                    </div>
                    <SupplyChainMap 
                      entries={supplyChainEntries}
                      destinationName={project?.name || 'Manufacturing Hub'}
                      destinationLat={19.076}
                      destinationLng={72.8777}
                    />
                  </div>

                  {/* Supply Chain Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Material</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Supplier</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Location</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">Tier</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Transport</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700">Distance (km)</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700">Lead Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supplyChainEntries.map((entry) => (
                          <tr key={entry.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium">{entry.material_name}</td>
                            <td className="py-3 px-4">{entry.supplier_name}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1">
                                {entry.supplier_country === 'India' && <span>🇮🇳</span>}
                                {entry.supplier_city && `${entry.supplier_city}, `}
                                {entry.supplier_state && `${entry.supplier_state}, `}
                                {entry.supplier_country}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                entry.supplier_tier === 1 ? 'bg-green-100 text-green-700' :
                                entry.supplier_tier === 2 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                Tier {entry.supplier_tier}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="flex items-center gap-1.5 capitalize">
                                <TransportIcon mode={entry.transport_mode} />
                                {entry.transport_mode}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">{entry.transport_distance_km.toLocaleString()}</td>
                            <td className="py-3 px-4 text-right">{entry.lead_time_days} days</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Scrap Yard Connect - Action Hotspots */}
        {materials.length > 0 && (
          <div className="mt-5 mb-5">
            <ActionHotspots
              projectId={id || ''}
              projectName={project.name}
              totalGWP={totalGWP}
              mciScore={project.mci_score || 0}
              materials={materials}
              onActionClick={(action, hotspot) => {
                console.log('Action clicked:', action, hotspot)
                // Handle custom actions like navigating to specific pages
                if (action === 'mci_calc') {
                  navigate(`/projects/${id}/analytics`)
                } else if (action === 'calculate_roi') {
                  navigate(`/projects/${id}/scenario`)
                }
              }}
            />
          </div>
        )}

        {/* JNARDDC Verification Section */}
        <div className="bg-white rounded-lg shadow p-5 mt-5">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Building2 className="w-5 h-5" /> JNARDDC Verification
                {!hasVerificationAccess && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">Enterprise</span>
                )}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Get your LCA assessment verified by JNARDDC (Joint National Action for Rare Earths & Defense Compliance)
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!hasVerificationAccess ? (
                <Link
                  to="/pricing"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                >
                  <span className="flex items-center gap-1">
  <Lock className="w-4 h-4 text-gray-600" />
  Upgrade to Enterprise
</span>

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
                 <span className="flex items-center gap-1 text-gray-600">
  <Clock className="w-4 h-4" />
  Pending Review
</span>

                </span>
              )}
              {verificationStatus?.verification_status === 'approved' && (
  <span className="px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center gap-1">
    <CheckCircle className="w-4 h-4" />
    Verified
  </span>
)}

              {verificationStatus?.verification_status === 'rejected' && (
                <span className="px-3 py-1.5 bg-red-100 text-red-800 rounded-full text-sm font-medium flex items-center gap-1">
                  <XCircle className="w-4 h-4" />
                  Rejected
                </span>
              )}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            {verificationStatus?.verification_status === 'not_submitted' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-700">
                  <strong>Why get verified?</strong> JNARDDC verification certifies that your LCA assessment meets Indian regulatory standards and is compliant with:
                </p>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 ml-2">
                  <li>Critical Minerals Mission Guidelines</li>
                  <li>SEBI BRSR ESG Disclosure Requirements</li>
                  <li>National E-Waste Management Standards</li>
                  <li>Extended Producer Responsibility (EPR) Rules</li>
                </ul>
                {materials.length === 0 && (
                  <p className="text-sm text-amber-600 font-medium mt-3 flex items-center gap-1">
  <AlertTriangle className="w-4 h-4" />
  Add at least one material to submit for verification.
</p>

                )}
              </div>
            )}

            {verificationStatus?.verification_status === 'pending' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-700">
                  Your LCA assessment has been submitted for JNARDDC verification. Our team will review your submission and provide feedback.
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
                  <div className="text-3xl">
  <Award className="w-8 h-8 text-yellow-500" />
</div>

                  <div>
                    <p className="text-sm font-semibold text-green-800">JNARDDC Verified Assessment</p>
                    <p className="text-sm text-gray-700 mt-1">
                      This LCA assessment has been verified by JNARDDC and meets all Indian regulatory compliance standards.
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

      {showSupplyChainUpload && (
        <SupplyChainUploadModal
          projectId={id!}
          onClose={() => setShowSupplyChainUpload(false)}
          onSuccess={() => {
            loadSupplyChain()
            setShowSupplyChainUpload(false)
          }}
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
                <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
  <Package className="w-5 h-5 text-gray-800" />
  Materials Analysis
</h4>

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
                <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
  <Bot className="w-5 h-5 text-gray-800" />
  AI Models Used
</h4>

                {aiGapFillResult.ai_models_used && aiGapFillResult.ai_models_used.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {aiGapFillResult.ai_models_used.map((model, idx) => (
                      <div key={idx} className="bg-gradient-to-br from-violet-50 to-pink-50 rounded-lg p-3 border border-violet-100">
                        <h5 className="font-medium text-violet-800">{model.name || (model as any).model}</h5>
                        <p className="text-sm text-gray-600 mt-1">{model.purpose}</p>
                        <p className="text-xs text-gray-500 mt-2 italic">{model.method || (model as any).technique}</p>
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

      {/* Floating Scrap Yard Connect Widget */}
      {showScrapYardWidget && materials.length > 0 && scrapYardStats && (
        <div className="fixed bottom-6 right-6 z-40 animate-fade-in-up">
          <div className="relative bg-green-600 rounded-2xl shadow-2xl shadow-green-200 p-5 max-w-sm border border-green-400/30 overflow-hidden group">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
            
            {/* Close button */}
            <button
              onClick={() => setShowScrapYardWidget(false)}
              className="absolute top-2 right-2 p-1 text-white/60 hover:text-white hover:bg-white/20 rounded-full transition"
              aria-label="Close widget"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="relative">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                  <Recycle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white">Scrap Yard Connect</h3>
                    <span className="px-1.5 py-0.5 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full animate-pulse">
                      NEW
                    </span>
                  </div>
                  <p className="text-green-100 text-sm">Source recycled materials</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-white">{scrapYardStats.total_scrap_yards}</p>
                  <p className="text-xs text-green-100">Scrap Yards</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-white">₹{scrapYardStats.potential_savings_crores}Cr</p>
                  <p className="text-xs text-green-100">Potential Savings</p>
                </div>
              </div>

              {/* Benefit highlight */}
              <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-white/10 backdrop-blur rounded-lg">
                <TrendingDown className="w-4 h-4 text-green-200" />
                <p className="text-sm text-white">
                  Get <span className="font-semibold">Plan A/B/C</span> sourcing options for your {materials.length} materials
                </p>
              </div>

              {/* CTA */}
              <Link
                to={`/scrap-yard-connect?project=${id}`}
                className="w-full flex items-center justify-center gap-2 py-3 bg-white text-green-600 rounded-xl font-semibold hover:bg-green-50 transition group-hover:shadow-lg"
              >
                View Sourcing Options
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
