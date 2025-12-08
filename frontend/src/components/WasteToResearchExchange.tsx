import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2, Mail, Building2, FlaskConical, ArrowRight, ExternalLink, Recycle, Factory, AlertCircle, ChevronRight, ArrowDown } from 'lucide-react'
import api from '../api/client'

interface WasteMapping {
  waste_type: string
  quantity_estimate: string
  industries: Industry[]
}

interface Industry {
  name: string
  industry: string
  application: string
  contact_email: string
  location: string
  research_potential: 'High' | 'Medium' | 'Low'
}

interface LifecycleStage {
  stage: string
  waste_mappings: WasteMapping[]
}

interface WasteToResearchData {
  project_id: string
  project_name: string
  lifecycle_stages: LifecycleStage[]
  generated_at: string
  source: string
}

const LIFECYCLE_STAGE_ICONS: Record<string, any> = {
  'Mining': Factory,
  'Beneficiation': FlaskConical,
  'Refining': Factory,
  'Smelting': Factory,
  'Casting': Factory,
  'Fabrication': Factory,
  'Recycle': Recycle
}

const STAGE_COLORS: Record<string, string> = {
  'Mining': 'bg-orange-100 text-orange-700 border-orange-200',
  'Beneficiation': 'bg-blue-100 text-blue-700 border-blue-200',
  'Refining': 'bg-purple-100 text-purple-700 border-purple-200',
  'Smelting': 'bg-red-100 text-red-700 border-red-200',
  'Casting': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Fabrication': 'bg-green-100 text-green-700 border-green-200',
  'Recycle': 'bg-emerald-100 text-emerald-700 border-emerald-200'
}

export default function WasteToResearchExchange() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<WasteToResearchData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (id) {
      loadWasteMapping()
    }
  }, [id])

  const loadWasteMapping = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      const response = await api.get(`/waste-to-research/${id}`, {
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      setData(response.data)
      // Expand first stage by default
      if (response.data.lifecycle_stages && response.data.lifecycle_stages.length > 0) {
        setExpandedStages(new Set([response.data.lifecycle_stages[0].stage]))
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.code === 'ECONNABORTED') {
        setError('Request timed out. Please try again or check your connection.')
      } else {
        setError(err.response?.data?.detail || err.message || 'Failed to load waste-to-research mapping. Using fallback data...')
        console.error('Error loading waste mapping:', err)
        
        // Try to show fallback data even on error
        // The backend should return fallback data, but if it doesn't, we can show a message
      }
    } finally {
      setIsLoading(false)
    }
  }

  const toggleStage = (stage: string) => {
    setExpandedStages(prev => {
      const newSet = new Set(prev)
      if (newSet.has(stage)) {
        newSet.delete(stage)
      } else {
        newSet.add(stage)
      }
      return newSet
    })
  }

  const handleConnect = (industry: Industry, wasteType: string, stage: string) => {
    const subject = `Waste-to-Resource Connect: ${wasteType} from ${stage} Stage`
    const emailBody = `Dear ${industry.name} Team,

I am reaching out regarding a potential waste-to-resource connection opportunity through the JNARDDC LCA Portal.

PROJECT DETAILS:
- Project: ${data?.project_name || 'LCA Project'}
- Lifecycle Stage: ${stage}
- Waste Type: ${wasteType}
- Quantity Estimate: Variable based on production scale

APPLICATION:
${industry.application}

We believe this waste stream could be valuable for your ${industry.industry} operations. We are interested in exploring:
1. Research collaboration opportunities
2. Industrial symbiosis partnerships
3. Waste valorization initiatives

Please let us know if you would be interested in discussing this further.

Best regards,
JNARDDC LCA Portal User`

    // Open email client directly
    const mailtoLink = `mailto:${industry.contact_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`
    
    // Directly open email client - this will open the default email client
    window.location.href = mailtoLink
    
    // Note: If email client doesn't open, user can manually copy the email address
    // We don't show "Copied" message anymore - just open email client
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Analyzing waste streams and mapping to industries...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-red-200 p-6">
        <div className="flex items-center gap-3 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    )
  }

  if (!data || data.lifecycle_stages.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <p className="text-gray-500">No waste mapping data available for this project.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <Recycle className="w-7 h-7" />
              Waste to Resource Connect
            </h2>
            <p className="text-blue-100">
              Map waste streams from each lifecycle stage to industries and research institutions
            </p>
            {data.source === 'groq_ai' && (
              <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-xs font-medium">
                AI-Powered Mapping
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Lifecycle Stages - Connected Flow */}
      <div className="relative w-full">
        {/* Flow Connection Lines - Animated (for 2 cards per row) */}
        <div className="absolute left-0 right-0 top-0 bottom-0 pointer-events-none hidden md:block">
          {data.lifecycle_stages.map((_, idx) => {
            if (idx === data.lifecycle_stages.length - 1) return null
            // Calculate position for 2 cards per row
            const row = Math.floor(idx / 2)
            const col = idx % 2
            const isLastInRow = col === 1
            const isLastRow = row === Math.floor((data.lifecycle_stages.length - 1) / 2)
            
            // Only show arrows for cards that are not the last in their row
            if (isLastInRow && !isLastRow) {
              // Arrow going down to next row
              const cardCenterX = (col + 1) * (100 / 2) - (100 / 4) // Center of second column
              const cardCenterY = (row + 0.5) * (100 / Math.ceil(data.lifecycle_stages.length / 2))
              return (
                <div
                  key={idx}
                  className="absolute flex items-center justify-center"
                  style={{
                    left: `${cardCenterX}%`,
                    top: `${cardCenterY}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 5
                  }}
                >
                  <ArrowDown className="w-6 h-6 text-blue-500 animate-pulse" />
                </div>
              )
            } else if (!isLastInRow) {
              // Arrow going right to next card in same row
              const cardCenterX = (col + 1) * (100 / 2) - (100 / 4)
              const cardCenterY = (row + 0.5) * (100 / Math.ceil(data.lifecycle_stages.length / 2))
              return (
                <div
                  key={idx}
                  className="absolute flex items-center justify-center"
                  style={{
                    left: `${cardCenterX}%`,
                    top: `${cardCenterY}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 5,
                    width: '60px'
                  }}
                >
                  <div className="flex items-center gap-1">
                    <div className="h-0.5 w-8 bg-gradient-to-r from-blue-400 to-purple-400"></div>
                    <ChevronRight className="w-6 h-6 text-blue-500 animate-pulse" />
                    <div className="h-0.5 w-8 bg-gradient-to-l from-blue-400 to-purple-400"></div>
                  </div>
                </div>
              )
            }
            return null
          })}
        </div>

        {/* Cards Container - Full Width, 2 Cards Per Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 w-full">
          {data.lifecycle_stages.map((stageData, idx) => {
            const StageIcon = LIFECYCLE_STAGE_ICONS[stageData.stage] || Factory
            const isExpanded = expandedStages.has(stageData.stage)
            const stageColor = STAGE_COLORS[stageData.stage] || 'bg-gray-100 text-gray-700 border-gray-200'
            const isLast = idx === data.lifecycle_stages.length - 1

            return (
              <div key={idx} className="relative">
                {/* Connection Arrow - Between cards in same row */}
                {!isLast && (idx % 2 === 0) && (
                  <div className="hidden md:block absolute -right-3 top-1/2 transform -translate-y-1/2 z-20 bg-white rounded-full p-1 shadow-md">
                    <ChevronRight className="w-5 h-5 text-blue-500" />
                  </div>
                )}
                
                {/* Connection Arrow - Between rows */}
                {!isLast && (idx % 2 === 1) && (idx < data.lifecycle_stages.length - 1) && (
                  <div className="hidden md:block absolute bottom-0 left-1/2 transform -translate-x-1/2 -mb-3 z-20 bg-white rounded-full p-1 shadow-md">
                    <ArrowDown className="w-5 h-5 text-blue-500" />
                  </div>
                )}

                {/* Stage Card */}
                <div
                  className={`bg-white rounded-xl shadow-lg border-2 border-transparent hover:border-blue-300 transition-all duration-300 overflow-hidden cursor-pointer transform hover:scale-105 hover:shadow-xl ${isExpanded ? 'border-blue-500 shadow-xl' : ''}`}
                  onClick={() => toggleStage(stageData.stage)}
                >
                  {/* Card Header */}
                  <div className={`p-5 ${stageColor} transition-all`}>
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className={`p-4 rounded-full ${stageColor.split(' ')[0]} bg-opacity-80 shadow-md`}>
                        <StageIcon className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold mb-1">{stageData.stage}</h3>
                        <p className="text-sm opacity-90">
                          {stageData.waste_mappings.length} waste{stageData.waste_mappings.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs opacity-75">
                        <span>Stage {idx + 1}</span>
                        {!isLast && (
                          <>
                            <span>•</span>
                            <span>Next: {data.lifecycle_stages[idx + 1]?.stage}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="p-4 border-t border-gray-200 bg-white space-y-3 max-h-96 overflow-y-auto">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        Waste Streams
                      </div>
                      {stageData.waste_mappings.map((mapping, mapIdx) => (
                        <div key={mapIdx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <div className="mb-2">
                            <h4 className="font-semibold text-sm text-gray-900">{mapping.waste_type}</h4>
                            <p className="text-xs text-gray-600 mt-1">
                              {mapping.quantity_estimate}
                            </p>
                          </div>

                          {/* Industries */}
                          <div className="space-y-2 mt-3">
                            {mapping.industries.map((industry, indIdx) => (
                              <div
                                key={indIdx}
                                className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-sm transition text-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      {industry.industry === 'Research Institution' ? (
                                        <FlaskConical className="w-3 h-3 text-purple-600" />
                                      ) : (
                                        <Building2 className="w-3 h-3 text-blue-600" />
                                      )}
                                      <h5 className="font-semibold text-gray-900 text-xs">{industry.name}</h5>
                                    </div>
                                    <p className="text-xs text-gray-600 mb-1">
                                      {industry.industry}
                                    </p>
                                    <p className="text-xs text-gray-700 mb-1 line-clamp-2">
                                      {industry.application}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      📍 {industry.location}
                                    </p>
                                  </div>
                                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ml-2 ${
                                    industry.research_potential === 'High' ? 'bg-green-100 text-green-700' :
                                    industry.research_potential === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {industry.research_potential}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleConnect(industry, mapping.waste_type, stageData.stage)}
                                  className="w-full mt-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-1.5 text-xs font-medium"
                                  title={`Open email to: ${industry.contact_email}`}
                                >
                                  <Mail className="w-3 h-3" />
                                  Connect
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Expand Indicator */}
                  {!isExpanded && (
                    <div className="p-3 bg-gray-50 border-t border-gray-200 text-center">
                      <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                        Click to expand
                        <ArrowDown className="w-3 h-3" />
                      </p>
                    </div>
                  )}
                </div>

                {/* Connection Arrow - Mobile */}
                {!isLast && (
                  <div className="md:hidden flex justify-center my-4">
                    <ArrowDown className="w-6 h-6 text-gray-400" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>💡 Tip:</strong> Click "Connect" to send an email to the organization. This opens your default email client with a pre-filled message.
        </p>
      </div>
    </div>
  )
}

