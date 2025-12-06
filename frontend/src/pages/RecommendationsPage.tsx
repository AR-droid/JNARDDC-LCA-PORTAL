import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { projectsApi, DesignRecommendation, DesignRecommendationsResult, AIDesignInsight } from '../api/projects'
import { API_URL } from '../api/client'
import { 
  FiRefreshCw, FiTruck, FiAlertTriangle, FiClock, FiTool,
  FiChevronRight, FiEye, FiExternalLink, FiCheckCircle, FiInfo, FiArrowLeft
} from 'react-icons/fi'
import { HiOutlineSparkles, HiOutlineLightBulb } from 'react-icons/hi'
import { BiLeaf, BiTargetLock, BiRecycle } from 'react-icons/bi'
import { TbArrowNarrowRight } from 'react-icons/tb'
import { ChartIcon, AnalyticsIcon, AIIcon, FlaskIcon } from '../components/Icons'
import { FileSpreadsheet, Sparkles, Lock } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

interface RecommendationImages {
  before_image?: string
  after_image?: string
}

function ImageModal({ 
  isOpen, 
  onClose, 
  images, 
  title 
}: { 
  isOpen: boolean
  onClose: () => void
  images: RecommendationImages
  title: string
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-900">
            {title} - Design Visualization
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {images.before_image && (
              <div>
                <h4 className="text-lg font-medium text-gray-800 mb-3 text-center">
                  Current Design
                </h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <img
                    src={`data:image/png;base64,${images.before_image}`}
                    alt="Current design"
                    className="w-full h-auto rounded-lg shadow-md"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const parent = target.parentElement
                      if (parent) {
                        parent.innerHTML = '<div class="text-center text-gray-500 py-8">Image generation failed</div>'
                      }
                    }}
                  />
                </div>
              </div>
            )}
            
            {images.after_image && (
              <div>
                <h4 className="text-lg font-medium text-gray-800 mb-3 text-center">
                  Recommended Design
                </h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <img
                    src={`data:image/png;base64,${images.after_image}`}
                    alt="Recommended design"
                    className="w-full h-auto rounded-lg shadow-md"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const parent = target.parentElement
                      if (parent) {
                        parent.innerHTML = '<div class="text-center text-gray-500 py-8">Image generation failed</div>'
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              AI-generated visualizations using Google Gemini • For demonstration purposes only
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RecommendationsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  
  const [recommendations, setRecommendations] = useState<DesignRecommendationsResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedRecommendation, setSelectedRecommendation] = useState<DesignRecommendation | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isGeneratingImages, setIsGeneratingImages] = useState(false)
  const [showAiInsights, setShowAiInsights] = useState(false)
  
  const hasCBAMAccess = user?.tier === 'pro' || user?.tier === 'enterprise'

  useEffect(() => {
    loadRecommendations()
  }, [id])

  const loadRecommendations = async () => {
    if (!id) return
    
    try {
      setIsLoading(true)
      const data = await projectsApi.getRecommendations(id)
      setRecommendations(data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load recommendations')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVisualize = async (rec: DesignRecommendation) => {
    console.log('handleVisualize called for:', rec)
    
    // Check if images already exist
    if (rec.before_image || rec.after_image) {
      console.log('Images already exist, showing modal')
      setSelectedRecommendation(rec)
      setIsModalOpen(true)
      return
    }
    
    // Check if user is authenticated
    const token = localStorage.getItem('access_token')
    console.log('Token from localStorage:', token ? 'Present' : 'Not found')
    
    if (!token) {
      console.error('No authentication token found')
      alert('Please log in to generate images')
      return
    }
    
    // Set selected recommendation BEFORE starting generation (for loading state)
    setSelectedRecommendation(rec)
    setIsGeneratingImages(true)
    try {
      console.log('Generating images for recommendation:', rec)
      const response = await fetch(`${API_URL}/projects/${id}/generate-images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          recommendation: rec
        })
      })
      
      console.log('Response status:', response.status)
      console.log('Response headers:', response.headers)
      
      if (response.ok) {
        const imageData = await response.json()
        console.log('Image data received:', imageData)
        
        // Update the recommendation with generated images
        const updatedRec = { ...rec, ...imageData }
        setSelectedRecommendation(updatedRec)
        
        // Update the recommendations list
        if (recommendations) {
          const updatedRecommendations = {
            ...recommendations,
            recommendations: recommendations.recommendations.map(r => 
              r === rec ? updatedRec : r
            )
          }
          setRecommendations(updatedRecommendations)
        }
        
        setIsModalOpen(true)
      } else {
        const error = await response.json()
        console.error('Error response:', error)
        alert(`Failed to generate images: ${error.detail || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Error generating images:', err)
      alert('Failed to generate images. Please try again.')
    } finally {
      setIsGeneratingImages(false)
    }
  }

  const hasImages = (rec: DesignRecommendation) => {
    return rec.before_image || rec.after_image
  }

  const canGenerateImages = (rec: DesignRecommendation) => {
    return ['recycled_content', 'material_substitution', 'design_for_disassembly'].includes(rec.type)
  }

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'high': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' }
      case 'medium': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' }
      case 'low': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' }
      default: return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-500' }
    }
  }

  const getTypeConfig = (type: string): { label: string; Icon: React.ComponentType<{ className?: string }>; color: string; bgLight: string; borderColor: string } => {
    switch (type) {
      case 'recycled_content': 
        return { 
          label: 'Recycled Content', 
          Icon: BiRecycle,
          color: 'text-emerald-600',
          bgLight: 'bg-emerald-50',
          borderColor: 'border-emerald-200'
        }
      case 'material_substitution': 
        return { 
          label: 'Material Swap', 
          Icon: FiRefreshCw,
          color: 'text-blue-600',
          bgLight: 'bg-blue-50',
          borderColor: 'border-blue-200'
        }
      case 'transport_optimization': 
        return { 
          label: 'Transport', 
          Icon: FiTruck,
          color: 'text-orange-600',
          bgLight: 'bg-orange-50',
          borderColor: 'border-orange-200'
        }
      case 'scarcity_alert': 
        return { 
          label: 'Critical Mineral', 
          Icon: FiAlertTriangle,
          color: 'text-red-600',
          bgLight: 'bg-red-50',
          borderColor: 'border-red-200'
        }
      case 'lifespan_extension': 
        return { 
          label: 'Lifespan', 
          Icon: FiClock,
          color: 'text-violet-600',
          bgLight: 'bg-violet-50',
          borderColor: 'border-violet-200'
        }
      case 'design_for_disassembly': 
        return { 
          label: 'Design for Disassembly', 
          Icon: FiTool,
          color: 'text-cyan-600',
          bgLight: 'bg-cyan-50',
          borderColor: 'border-cyan-200'
        }
      default: 
        return { 
          label: type, 
          Icon: FiInfo,
          color: 'text-gray-600',
          bgLight: 'bg-gray-50',
          borderColor: 'border-gray-200'
        }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Generating AI recommendations...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Unable to load recommendations</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate(`/projects/${id}`)}
            className="inline-flex items-center px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <span className="mr-1">&#8592;</span>
            <span>Back to project</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Secondary Navigation Bar */}
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
              onClick={() => navigate(`/projects/${id}`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              Dashboard
            </button>
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
              className="px-4 py-2 text-sm font-medium bg-purple-50 text-purple-700 rounded-md transition-colors flex items-center gap-2"
            >
              <AIIcon size={16} /> Design Advisor
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

        {/* Page header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Design recommendations</h1>
            <p className="text-sm text-gray-600 mt-1">
              Data-driven guidance to improve circularity, climate impact and material risk for this project.
            </p>
          </div>
        </div>

        {/* Summary */}
        {recommendations && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Total recommendations</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{recommendations.total_recommendations}</p>
            </div>
            <div className="bg-red-50 rounded-lg border border-red-200 p-4">
              <p className="text-xs uppercase tracking-wide text-red-600">High priority</p>
              <p className="mt-1 text-2xl font-semibold text-red-700">{recommendations.summary.high_priority}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
              <p className="text-xs uppercase tracking-wide text-yellow-700">Medium priority</p>
              <p className="mt-1 text-2xl font-semibold text-yellow-700">{recommendations.summary.medium_priority}</p>
            </div>
            <div className="bg-green-50 rounded-lg border border-green-200 p-4">
              <p className="text-xs uppercase tracking-wide text-green-700">Low priority</p>
              <p className="mt-1 text-2xl font-semibold text-green-700">{recommendations.summary.low_priority}</p>
            </div>
          </div>
        )}

        {/* AI Strategic insights - Collapsible */}
        {recommendations?.ai_insights && recommendations.ai_insights.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
            <button
              onClick={() => setShowAiInsights(!showAiInsights)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-purple-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                </span>
                <div className="text-left">
                  <h2 className="text-sm font-semibold text-gray-900">AI Strategic Insights</h2>
                  <p className="text-xs text-gray-500">{recommendations.ai_insights.length} insights available</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded">AI Generated</span>
                <svg
                  className={`h-5 w-5 text-gray-400 transition-transform ${showAiInsights ? 'rotate-180' : ''}`}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </button>

            {showAiInsights && (
              <div className="px-4 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recommendations.ai_insights.map((insight: AIDesignInsight, index: number) => (
                <div 
                  key={index}
                  className={`bg-white rounded-lg p-4 shadow-sm border-l-4 ${
                    insight.impact_potential === 'high' ? 'border-l-emerald-500' :
                    insight.impact_potential === 'medium' ? 'border-l-teal-400' :
                    'border-l-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                    <div className="flex gap-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        insight.impact_potential === 'high' ? 'bg-emerald-100 text-emerald-700' :
                        insight.impact_potential === 'medium' ? 'bg-teal-100 text-teal-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {insight.impact_potential}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
                  <div className="flex items-center gap-3 text-xs">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        insight.category === 'technology' ? 'bg-blue-50 text-blue-700' :
                        insight.category === 'supply_chain' ? 'bg-orange-50 text-orange-700' :
                        insight.category === 'regulatory' ? 'bg-red-50 text-red-700' :
                        insight.category === 'cost_benefit' ? 'bg-green-50 text-green-700' :
                        'bg-purple-50 text-purple-700'
                      }`}
                    >
                      {insight.category === 'supply_chain' ? 'Supply chain' :
                        insight.category === 'technology' ? 'Technology' :
                        insight.category === 'regulatory' ? 'Regulatory' :
                        insight.category === 'cost_benefit' ? 'Cost-benefit' :
                        'Circular economy'}
                    </span>
                    <span className="text-gray-400">|</span>
                    <span className="text-gray-500 text-xs">
                      {insight.implementation_timeframe === 'short_term' ? 'Short-term (0-6 months)' :
                        insight.implementation_timeframe === 'medium_term' ? 'Medium-term (6-18 months)' :
                        'Long-term (18+ months)'}
                    </span>
                  </div>
                </div>
              ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* No recommendations state */}
        {recommendations && recommendations.recommendations.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No critical recommendations</h2>
            <p className="text-gray-600 mb-4">
              {recommendations.message || 'At this stage there are no major optimisation opportunities detected for this design.'}
            </p>
            <button
              onClick={() => navigate(`/projects/${id}/analysis`)}
              className="inline-flex items-center px-4 py-2 rounded-md bg-gray-900 text-sm font-medium text-white hover:bg-gray-800"
            >
              View full analysis
            </button>
          </div>
        )}

        {/* Recommendations List */}
        {recommendations && recommendations.recommendations.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {recommendations.recommendations.map((rec: DesignRecommendation, index: number) => {
              const typeConfig = getTypeConfig(rec.type)
              const priorityConfig = getPriorityConfig(rec.priority)
              const TypeIcon = typeConfig.Icon
              
              return (
                <div 
                  key={index} 
                  className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  {/* Card Header */}
                  <div className="px-5 py-4 border-b border-gray-100">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${typeConfig.bgLight}`}>
                          <TypeIcon className={`w-5 h-5 ${typeConfig.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 leading-tight">{rec.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-flex items-center text-xs font-medium ${typeConfig.color}`}>
                              {typeConfig.label}
                            </span>
                            {rec.material && (
                              <>
                                <span className="text-gray-300">•</span>
                                <span className="text-xs text-gray-500">{rec.material}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${priorityConfig.bg} ${priorityConfig.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${priorityConfig.dot}`}></span>
                        {rec.priority}
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="px-5 py-4">
                    <p className="text-sm text-gray-600 leading-relaxed">{rec.description}</p>

                    {/* Current vs Recommended Values */}
                    {(rec.current_value !== undefined || rec.current_lifespan !== undefined || rec.current_distance !== undefined) && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="text-center flex-1">
                            <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Current</p>
                            <p className="text-xl font-bold text-gray-900 mt-0.5">
                              {rec.current_value !== undefined && `${rec.current_value}%`}
                              {rec.current_lifespan !== undefined && `${rec.current_lifespan} yrs`}
                              {rec.current_distance !== undefined && `${rec.current_distance} km`}
                            </p>
                          </div>
                          <div className="px-4">
                            <TbArrowNarrowRight className="w-5 h-5 text-gray-300" />
                          </div>
                          <div className="text-center flex-1">
                            <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Target</p>
                            <p className={`text-xl font-bold mt-0.5 ${typeConfig.color}`}>
                              {rec.recommended_value !== undefined && `${rec.recommended_value}%`}
                              {rec.recommended_lifespan !== undefined && `${rec.recommended_lifespan} yrs`}
                              {rec.recommended_distance !== undefined && `${rec.recommended_distance} km`}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Impact Metrics */}
                    {rec.impact && (
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {rec.impact.gwp_savings_kg !== undefined && (
                          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md">
                            <BiLeaf className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-blue-600 font-medium">CO₂ Saved</p>
                              <p className="text-sm font-semibold text-blue-900">{rec.impact.gwp_savings_kg} kg</p>
                            </div>
                          </div>
                        )}
                        {rec.impact.gwp_savings_percent !== undefined && (
                          <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-md">
                            <BiTargetLock className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-emerald-600 font-medium">GWP Reduction</p>
                              <p className="text-sm font-semibold text-emerald-900">{rec.impact.gwp_savings_percent}%</p>
                            </div>
                          </div>
                        )}
                        {rec.impact.mci_improvement !== undefined && (
                          <div className="flex items-center gap-2 p-2 bg-violet-50 rounded-md">
                            <BiRecycle className="w-4 h-4 text-violet-600 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-violet-600 font-medium">MCI Gain</p>
                              <p className="text-sm font-semibold text-violet-900">+{rec.impact.mci_improvement}</p>
                            </div>
                          </div>
                        )}
                        {rec.impact.cost_impact && (
                          <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-md">
                            <FiCheckCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-amber-600 font-medium">Cost</p>
                              <p className="text-sm font-semibold text-amber-900 capitalize">{rec.impact.cost_impact.replace(/_/g, ' ')}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Suggestions */}
                    {rec.suggestions && rec.suggestions.length > 0 && (
                      <div className="mt-4">
                        <button 
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium"
                          onClick={(e) => {
                            const content = e.currentTarget.nextElementSibling
                            const icon = e.currentTarget.querySelector('svg')
                            if (content && icon) {
                              content.classList.toggle('hidden')
                              icon.classList.toggle('rotate-90')
                            }
                          }}
                        >
                          <FiChevronRight className="w-3.5 h-3.5 transition-transform" />
                          <HiOutlineLightBulb className="w-3.5 h-3.5" />
                          {rec.suggestions.length} suggestion{rec.suggestions.length > 1 ? 's' : ''}
                        </button>
                        <ul className="hidden mt-2 space-y-1.5 pl-5">
                          {rec.suggestions.map((suggestion: string, idx: number) => (
                            <li key={idx} className="text-xs text-gray-600 leading-relaxed">
                              • {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Confidence</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              rec.confidence >= 0.8 ? 'bg-emerald-500' : 
                              rec.confidence >= 0.6 ? 'bg-amber-500' : 'bg-gray-400'
                            }`}
                            style={{ width: `${Math.round(rec.confidence * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600">{Math.round(rec.confidence * 100)}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {canGenerateImages(rec) && (
                        <button
                          onClick={() => handleVisualize(rec)}
                          disabled={isGeneratingImages}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                            hasImages(rec)
                              ? 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                              : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md hover:shadow-lg hover:scale-105'
                          }`}
                        >
                          {isGeneratingImages && selectedRecommendation === rec ? (
                            <>
                              <span className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                              Generating...
                            </>
                          ) : hasImages(rec) ? (
                            <>
                              <FiEye className="w-3.5 h-3.5" />
                              View
                            </>
                          ) : (
                            <>
                              <HiOutlineSparkles className="w-3.5 h-3.5" />
                              Generate Visualisation
                            </>
                          )}
                        </button>
                      )}
                      <button 
                        onClick={() => navigate(`/projects/${id}/scenario`)}
                        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium"
                      >
                        Scenario
                        <FiExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      
      {/* Image Modal */}
      {selectedRecommendation && (
        <ImageModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          images={{
            before_image: selectedRecommendation.before_image,
            after_image: selectedRecommendation.after_image
          }}
          title={selectedRecommendation.title}
        />
      )}
    </div>
  )
}
