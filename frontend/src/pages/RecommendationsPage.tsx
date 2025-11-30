import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { projectsApi, DesignRecommendation, DesignRecommendationsResult } from '../api/projects'

export default function RecommendationsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [recommendations, setRecommendations] = useState<DesignRecommendationsResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'recycled_content': return '♻️'
      case 'material_substitution': return '🔄'
      case 'transport_optimization': return '🚚'
      case 'scarcity_alert': return '⚠️'
      case 'lifespan_extension': return '⏱️'
      case 'design_for_disassembly': return '🔧'
      default: return '💡'
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
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate(`/projects/${id}`)}
            className="text-purple-600 hover:text-purple-700"
          >
            ← Back to Project
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => navigate(`/projects/${id}`)}
          className="text-purple-600 hover:text-purple-700 mb-4 flex items-center gap-2"
        >
          ← Back to Project
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-lg p-6 mb-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🤖</span>
            <h1 className="text-3xl font-bold">AI Design Advisor</h1>
          </div>
          <p className="text-purple-100 mb-4">
            Engine 4: Intelligent recommendations to optimize circularity and reduce environmental impact
          </p>
          
          {recommendations && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="bg-white/20 rounded-lg p-3">
                <p className="text-sm text-purple-100">Total Recommendations</p>
                <p className="text-2xl font-bold">{recommendations.total_recommendations}</p>
              </div>
              <div className="bg-white/20 rounded-lg p-3">
                <p className="text-sm text-purple-100">🔴 High Priority</p>
                <p className="text-2xl font-bold">{recommendations.summary.high_priority}</p>
              </div>
              <div className="bg-white/20 rounded-lg p-3">
                <p className="text-sm text-purple-100">🟡 Medium Priority</p>
                <p className="text-2xl font-bold">{recommendations.summary.medium_priority}</p>
              </div>
              <div className="bg-white/20 rounded-lg p-3">
                <p className="text-sm text-purple-100">🟢 Low Priority</p>
                <p className="text-2xl font-bold">{recommendations.summary.low_priority}</p>
              </div>
            </div>
          )}
        </div>

        {/* No Recommendations State */}
        {recommendations && recommendations.recommendations.length === 0 && (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Looking Good!</h2>
            <p className="text-gray-600 mb-4">
              {recommendations.message || 'No major optimization recommendations at this time. Your design is well-optimized!'}
            </p>
            <button
              onClick={() => navigate(`/projects/${id}/analysis`)}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              View Full Analysis →
            </button>
          </div>
        )}

        {/* Recommendations List */}
        {recommendations && recommendations.recommendations.length > 0 && (
          <div className="space-y-4">
            {recommendations.recommendations.map((rec: DesignRecommendation, index: number) => (
              <div 
                key={index} 
                className={`bg-white rounded-xl shadow-md overflow-hidden border-l-4 ${
                  rec.priority === 'high' ? 'border-l-red-500' :
                  rec.priority === 'medium' ? 'border-l-yellow-500' :
                  'border-l-green-500'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{getTypeIcon(rec.type)}</span>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{rec.title}</h3>
                        {rec.material && (
                          <p className="text-sm text-gray-500">Material: {rec.material}</p>
                        )}
                      </div>
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

                  {/* Confidence */}
                  <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                    <span>AI Confidence: {Math.round(rec.confidence * 100)}%</span>
                    <button 
                      onClick={() => navigate(`/projects/${id}/scenario`)}
                      className="text-purple-600 hover:text-purple-700 font-medium"
                    >
                      Test in Scenario Tool →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex gap-4">
          <button
            onClick={() => navigate(`/projects/${id}/analysis`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            📊 View Analysis
          </button>
          <button
            onClick={() => navigate(`/projects/${id}/scenario`)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            🔬 What-if Scenarios
          </button>
          <button
            onClick={loadRecommendations}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            🔄 Refresh Recommendations
          </button>
        </div>
      </div>
    </div>
  )
}
