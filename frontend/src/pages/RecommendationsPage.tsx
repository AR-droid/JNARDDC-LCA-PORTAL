import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { projectsApi, DesignRecommendation, DesignRecommendationsResult, AIDesignInsight } from '../api/projects'
import { API_URL } from '../api/client'

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
  
  const [recommendations, setRecommendations] = useState<DesignRecommendationsResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedRecommendation, setSelectedRecommendation] = useState<DesignRecommendation | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isGeneratingImages, setIsGeneratingImages] = useState(false)

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
    
    // Generate images if they don't exist
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'recycled_content': return 'Recycled Content'
      case 'material_substitution': return 'Material Substitution'
      case 'transport_optimization': return 'Transport'
      case 'scarcity_alert': return 'Critical Mineral'
      case 'lifespan_extension': return 'Lifespan'
      case 'design_for_disassembly': return 'Design for Disassembly'
      default: return type
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
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate(`/projects/${id}`)}
              className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-flex items-center gap-1"
            >
              <span className="text-base">&#8592;</span>
              <span>Back to project</span>
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">Design recommendations</h1>
            <p className="text-sm text-gray-600 mt-1">
              Data-driven guidance to improve circularity, climate impact and material risk for this project.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate(`/projects/${id}/analysis`)}
              className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              View analysis
            </button>
            <button
              onClick={() => navigate(`/projects/${id}/scenario`)}
              className="px-4 py-2 rounded-md bg-gray-900 text-sm font-medium text-white hover:bg-gray-800"
            >
              Scenario modelling
            </button>
            <button
              onClick={loadRecommendations}
              className="px-3 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Refresh
            </button>
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

        {/* AI Strategic insights */}
        {recommendations?.ai_insights && recommendations.ai_insights.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">AI strategic insights</h2>
                <p className="text-sm text-gray-600">Additional perspectives generated by the AI model to complement rule-based logic.</p>
              </div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">AI generated</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div className="space-y-4">
            {recommendations.recommendations.map((rec: DesignRecommendation, index: number) => (
              <div 
                key={index} 
                className={`rounded-xl shadow-sm overflow-hidden border border-gray-200 border-l-4 bg-green-50 ${
                  rec.priority === 'high'
                    ? 'border-l-red-500'
                    : rec.priority === 'medium'
                      ? 'border-l-yellow-500'
                      : 'border-l-green-500'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{rec.title}</h3>
                      {rec.material && (
                        <p className="text-sm text-gray-500 mt-0.5">Material: {rec.material}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                        {rec.priority.toUpperCase()}
                      </span>
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                        {getTypeLabel(rec.type)}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-700 mb-4">{rec.description}</p>

                  {/* Current vs Recommended Values */}
                  {(rec.current_value !== undefined || rec.current_lifespan !== undefined || rec.current_distance !== undefined) && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <h4 className="font-medium text-gray-700 mb-2">Optimization Target</h4>
                      <div className="flex items-center gap-4">
                        {rec.current_value !== undefined && (
                          <>
                            <div className="text-center">
                              <p className="text-sm text-gray-500">Current</p>
                              <p className="text-xl font-bold text-red-600">{rec.current_value}%</p>
                            </div>
                            <span className="text-2xl text-gray-400">→</span>
                            <div className="text-center">
                              <p className="text-sm text-gray-500">Recommended</p>
                              <p className="text-xl font-bold text-green-600">{rec.recommended_value}%</p>
                            </div>
                          </>
                        )}
                        {rec.current_lifespan !== undefined && (
                          <>
                            <div className="text-center">
                              <p className="text-sm text-gray-500">Current Lifespan</p>
                              <p className="text-xl font-bold text-red-600">{rec.current_lifespan} years</p>
                            </div>
                            <span className="text-2xl text-gray-400">→</span>
                            <div className="text-center">
                              <p className="text-sm text-gray-500">Recommended</p>
                              <p className="text-xl font-bold text-green-600">{rec.recommended_lifespan} years</p>
                            </div>
                          </>
                        )}
                        {rec.current_distance !== undefined && (
                          <>
                            <div className="text-center">
                              <p className="text-sm text-gray-500">Current Distance</p>
                              <p className="text-xl font-bold text-red-600">{rec.current_distance} km</p>
                            </div>
                            <span className="text-2xl text-gray-400">→</span>
                            <div className="text-center">
                              <p className="text-sm text-gray-500">Target</p>
                              <p className="text-xl font-bold text-green-600">{rec.recommended_distance} km</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Impact Metrics */}
                  {rec.impact && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      {rec.impact.gwp_savings_kg !== undefined && (
                        <div className="bg-blue-50 rounded-lg p-3">
                          <p className="text-xs text-blue-600">GWP Savings</p>
                          <p className="text-lg font-bold text-blue-800">{rec.impact.gwp_savings_kg} kg</p>
                        </div>
                      )}
                      {rec.impact.gwp_savings_percent !== undefined && (
                        <div className="bg-green-50 rounded-lg p-3">
                          <p className="text-xs text-green-600">GWP Reduction</p>
                          <p className="text-lg font-bold text-green-800">{rec.impact.gwp_savings_percent}%</p>
                        </div>
                      )}
                      {rec.impact.mci_improvement !== undefined && (
                        <div className="bg-purple-50 rounded-lg p-3">
                          <p className="text-xs text-purple-600">MCI Improvement</p>
                          <p className="text-lg font-bold text-purple-800">+{rec.impact.mci_improvement}</p>
                        </div>
                      )}
                      {rec.impact.lifetime_gwp_reduction_percent !== undefined && (
                        <div className="bg-orange-50 rounded-lg p-3">
                          <p className="text-xs text-orange-600">Lifetime GWP</p>
                          <p className="text-lg font-bold text-orange-800">-{rec.impact.lifetime_gwp_reduction_percent}%</p>
                        </div>
                      )}
                      {rec.impact.cost_impact && (
                        <div className="bg-emerald-50 rounded-lg p-3">
                          <p className="text-xs text-emerald-600">Cost Impact</p>
                          <p className="text-sm font-bold text-emerald-800 capitalize">
                            {rec.impact.cost_impact.replace(/_/g, ' ')}
                          </p>
                        </div>
                      )}
                      {rec.impact.supply_risk && (
                        <div className="bg-red-50 rounded-lg p-3">
                          <p className="text-xs text-red-600">Supply Risk</p>
                          <p className="text-sm font-bold text-red-800 capitalize">{rec.impact.supply_risk}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Suggestions */}
                  {rec.suggestions && rec.suggestions.length > 0 && (
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <h4 className="font-medium text-yellow-800 mb-2">💡 Implementation Suggestions</h4>
                      <ul className="space-y-1">
                        {rec.suggestions.map((suggestion: string, idx: number) => (
                          <li key={idx} className="text-sm text-yellow-700 flex items-center gap-2">
                            <span>•</span> {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Confidence and actions */}
                  <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                    <span>AI confidence: {Math.round(rec.confidence * 100)}%</span>
                    <div className="flex items-center gap-3">
                      {canGenerateImages(rec) && (
                        <button
                          onClick={() => handleVisualize(rec)}
                          disabled={isGeneratingImages}
                          className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed ${
                            hasImages(rec)
                              ? 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50'
                              : 'bg-gray-900 text-white hover:bg-gray-800'
                          }`}
                        >
                          {isGeneratingImages && selectedRecommendation === rec ? (
                            <>
                              <span className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2" />
                              Generating visualisation
                            </>
                          ) : hasImages(rec) ? (
                            <>
                              View visualisation
                            </>
                          ) : (
                            <>
                              Generate visualisation
                            </>
                          )}
                        </button>
                      )}
                      <button 
                        onClick={() => navigate(`/projects/${id}/scenario`)}
                        className="text-sm font-medium text-gray-700 hover:text-gray-900"
                      >
                        Open in scenario tool
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
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
