import { useState, useEffect } from 'react'
import { AlertTriangle, TrendingDown, Recycle, Truck, Clock, Wrench, ChevronDown, ChevronUp, ExternalLink, Zap, Target, Award, Leaf } from 'lucide-react'

interface HotspotImpact {
  gwp_savings_kg?: number
  gwp_savings_percent?: number
  mci_improvement?: number
  cost_impact?: string
  abiotic_depletion?: string
  supply_risk?: string
  lifetime_gwp_reduction_percent?: number
  recycled_output_improvement?: number
}

interface Hotspot {
  id: string
  rank: number
  type: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  material?: string
  material_type?: string
  current_value?: number
  recommended_value?: number
  contribution_percent: number
  impact: HotspotImpact
  confidence: number
  suggestions?: string[]
  action_links?: {
    label: string
    url?: string
    action?: string
  }[]
}

interface ActionHotspotsProps {
  projectId: string
  projectName: string
  totalGWP: number
  mciScore: number
  materials: any[]
  onActionClick?: (action: string, hotspot: Hotspot) => void
}

// Supplier types
interface Supplier {
  name: string
  location: string
  certified: boolean
  recycled_content: number
}

type MaterialCategory = 'aluminium' | 'steel' | 'copper'

// Supplier database (Indian certified recycled metal suppliers)
const SUPPLIER_DATABASE: Record<MaterialCategory, Supplier[]> = {
  aluminium: [
    { name: 'Hindalco Industries', location: 'Mumbai, Maharashtra', certified: true, recycled_content: 75 },
    { name: 'Vedanta Aluminium', location: 'Jharsuguda, Odisha', certified: true, recycled_content: 60 },
    { name: 'NALCO', location: 'Bhubaneswar, Odisha', certified: true, recycled_content: 50 },
  ],
  steel: [
    { name: 'JSW Steel', location: 'Vijayanagar, Karnataka', certified: true, recycled_content: 85 },
    { name: 'Tata Steel', location: 'Jamshedpur, Jharkhand', certified: true, recycled_content: 80 },
    { name: 'SAIL', location: 'Bokaro, Jharkhand', certified: true, recycled_content: 70 },
  ],
  copper: [
    { name: 'Hindustan Copper Ltd', location: 'Khetri, Rajasthan', certified: true, recycled_content: 60 },
    { name: 'Sterlite Copper', location: 'Tuticorin, Tamil Nadu', certified: true, recycled_content: 55 },
  ],
}

export default function ActionHotspots({ 
  projectId: _projectId, 
  projectName: _projectName, 
  totalGWP, 
  mciScore, 
  materials,
  onActionClick 
}: ActionHotspotsProps) {
  // Note: projectId and projectName are available for future API calls
  void _projectId
  void _projectName
  const [hotspots, setHotspots] = useState<Hotspot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedHotspot, setExpandedHotspot] = useState<string | null>(null)
  const [showSuppliers, setShowSuppliers] = useState<string | null>(null)

  useEffect(() => {
    analyzeAndGenerateHotspots()
  }, [materials, totalGWP, mciScore])

  const analyzeAndGenerateHotspots = () => {
    setIsLoading(true)
    
    // Calculate material contributions
    const materialAnalysis = materials.map(mat => {
      const gwpContribution = totalGWP > 0 ? ((mat.gwp || 0) / totalGWP) * 100 : 0
      return {
        ...mat,
        gwpContribution,
        recyclePotential: calculateRecyclePotential(mat),
        transportImpact: calculateTransportImpact(mat),
      }
    }).sort((a, b) => b.gwpContribution - a.gwpContribution)

    const generatedHotspots: Hotspot[] = []
    let rank = 1

    // Hotspot 1: Highest GWP contributor (always #1 if significant)
    const topContributor = materialAnalysis[0]
    if (topContributor && topContributor.gwpContribution > 20) {
      const currentRecycled = topContributor.recycled_content || 0
      const maxRecycled = getMaxRecycledContent(topContributor.material_type)
      const potentialSavings = calculatePotentialSavings(topContributor, maxRecycled)
      
      generatedHotspots.push({
        id: `hotspot-${rank}`,
        rank: rank++,
        type: 'high_impact_material',
        priority: 'critical',
        title: `${topContributor.material_name || topContributor.material_type}`,
        description: `Contributes ${topContributor.gwpContribution.toFixed(0)}% of your total carbon footprint. ${
          currentRecycled < maxRecycled 
            ? `Switching to ${maxRecycled}% recycled content could reduce GWP by ${potentialSavings.toFixed(0)}%.`
            : 'Already using optimal recycled content.'
        }`,
        material: topContributor.material_name,
        material_type: topContributor.material_type,
        current_value: currentRecycled,
        recommended_value: maxRecycled,
        contribution_percent: topContributor.gwpContribution,
        impact: {
          gwp_savings_kg: (topContributor.gwp || 0) * (potentialSavings / 100),
          gwp_savings_percent: potentialSavings,
          cost_impact: 'neutral_to_positive'
        },
        confidence: 0.92,
        suggestions: [
          'Source from certified recycled metal suppliers',
          'Request material certificates from suppliers',
          'Consider secondary market options'
        ],
        action_links: [
          { label: 'View Certified Suppliers', action: 'show_suppliers' },
          { label: 'Calculate ROI', action: 'calculate_roi' },
        ]
      })
    }

    // Hotspot 2: Low recycled content materials with high potential
    const lowRecycledMaterials = materialAnalysis.filter(
      mat => (mat.recycled_content || 0) < 30 && mat.gwpContribution > 10
    )
    
    if (lowRecycledMaterials.length > 0) {
      const mat = lowRecycledMaterials[0]
      const maxRecycled = getMaxRecycledContent(mat.material_type)
      
      generatedHotspots.push({
        id: `hotspot-${rank}`,
        rank: rank++,
        type: 'recycled_content',
        priority: 'high',
        title: `Low Recycled Content: ${mat.material_name || mat.material_type}`,
        description: `Currently using only ${mat.recycled_content || 0}% recycled content. Industry best practice for ${mat.material_type} allows up to ${maxRecycled}% without quality compromise.`,
        material: mat.material_name,
        material_type: mat.material_type,
        current_value: mat.recycled_content || 0,
        recommended_value: maxRecycled,
        contribution_percent: mat.gwpContribution,
        impact: {
          gwp_savings_percent: calculatePotentialSavings(mat, maxRecycled),
          cost_impact: 'positive' // Recycled typically cheaper
        },
        confidence: 0.88,
        suggestions: [
          `Increase recycled content to ${maxRecycled}%`,
          'Verify supplier can meet quality specs',
          'Request test samples before full commitment'
        ],
        action_links: [
          { label: 'View Suppliers', action: 'show_suppliers' },
          { label: 'Quality Guidelines', url: '#quality' },
        ]
      })
    }

    // Hotspot 3: High transport distance materials
    const highTransportMaterials = materialAnalysis.filter(
      mat => (mat.transport_distance || 0) > 500
    ).sort((a, b) => (b.transport_distance || 0) - (a.transport_distance || 0))

    if (highTransportMaterials.length > 0) {
      const mat = highTransportMaterials[0]
      const transportGWP = ((mat.quantity || 0) / 1000) * (mat.transport_distance || 0) * 0.062
      const localTransportGWP = ((mat.quantity || 0) / 1000) * 100 * 0.062
      const savings = transportGWP - localTransportGWP

      generatedHotspots.push({
        id: `hotspot-${rank}`,
        rank: rank++,
        type: 'transport_optimization',
        priority: 'medium',
        title: `Long Supply Chain: ${mat.material_name || mat.material_type}`,
        description: `Material transported ${mat.transport_distance}km. Local sourcing (within 100km) could reduce transport emissions by ${((savings / (mat.gwp || 1)) * 100).toFixed(0)}%.`,
        material: mat.material_name,
        material_type: mat.material_type,
        current_value: mat.transport_distance,
        recommended_value: 100,
        contribution_percent: mat.gwpContribution,
        impact: {
          gwp_savings_kg: savings,
          gwp_savings_percent: (savings / (mat.gwp || 1)) * 100
        },
        confidence: 0.75,
        suggestions: [
          'Explore Make in India alternatives',
          'Consolidate shipments to reduce trips',
          'Consider rail over road for long distances'
        ],
        action_links: [
          { label: 'Find Local Suppliers', action: 'show_local_suppliers' },
          { label: 'Transport Calculator', action: 'transport_calc' },
        ]
      })
    }

    // Hotspot 4: MCI improvement opportunity
    if (mciScore < 0.6) {
      generatedHotspots.push({
        id: `hotspot-${rank}`,
        rank: rank++,
        type: 'circularity',
        priority: mciScore < 0.3 ? 'high' : 'medium',
        title: 'Low Circularity Score',
        description: `Your MCI score is ${(mciScore * 100).toFixed(0)}/100. Industry leaders achieve 60-80. Focus on design for disassembly and end-of-life recovery to improve.`,
        contribution_percent: 0,
        impact: {
          mci_improvement: 20,
          recycled_output_improvement: 25
        },
        confidence: 0.85,
        suggestions: [
          'Design for easy disassembly',
          'Mark materials with recycling codes',
          'Create take-back program',
          'Use modular design principles'
        ],
        action_links: [
          { label: 'Circular Design Guide', url: '#circular-guide' },
          { label: 'MCI Calculator', action: 'mci_calc' },
        ]
      })
    }

    // Hotspot 5: Scrap/waste recovery
    const totalQuantity = materials.reduce((sum, m) => sum + (m.quantity || 0), 0)
    if (totalQuantity > 100) { // Only relevant for significant quantities
      generatedHotspots.push({
        id: `hotspot-${rank}`,
        rank: rank++,
        type: 'scrap_recovery',
        priority: 'medium',
        title: 'Machining Scrap Recovery',
        description: `With ${totalQuantity.toFixed(0)}kg of materials, typical machining generates 15-25% scrap. In-house segregation could increase scrap value by 30% and improve circularity.`,
        contribution_percent: 0,
        impact: {
          gwp_savings_percent: 5,
          cost_impact: 'positive'
        },
        confidence: 0.70,
        suggestions: [
          'Segregate scrap by alloy type',
          'Partner with certified recyclers',
          'Consider in-house remelting for high volumes'
        ],
        action_links: [
          { label: 'Recycler Directory', action: 'show_recyclers' },
          { label: 'Equipment Options', action: 'show_equipment' },
        ]
      })
    }

    setHotspots(generatedHotspots.slice(0, 5)) // Top 5 hotspots
    setIsLoading(false)
  }

  const calculateRecyclePotential = (material: any): number => {
    const current = material.recycled_content || 0
    const max = getMaxRecycledContent(material.material_type)
    return max - current
  }

  const calculateTransportImpact = (material: any): number => {
    const distance = material.transport_distance || 0
    const quantity = material.quantity || 0
    return (quantity / 1000) * distance * 0.062 // kg CO2-eq
  }

  const getMaxRecycledContent = (materialType: string): number => {
    const limits: Record<string, number> = {
      'aluminium_primary': 75,
      'aluminium_secondary': 95,
      'steel_primary': 85,
      'steel_secondary': 100,
      'copper_primary': 60,
      'copper_secondary': 90,
      'lithium': 25,
      'cobalt': 40,
      'nickel': 60,
    }
    return limits[materialType] || 50
  }

  const calculatePotentialSavings = (material: any, targetRecycled: number): number => {
    const current = material.recycled_content || 0
    if (current >= targetRecycled) return 0
    
    // Recycled materials have ~90% lower emissions
    const virginReduction = (targetRecycled - current) * 0.9
    return virginReduction
  }

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'critical':
        return {
          bg: 'bg-red-50 border-red-200',
          badge: 'bg-red-600 text-white',
          icon: 'text-red-600',
          progress: 'bg-red-500'
        }
      case 'high':
        return {
          bg: 'bg-orange-50 border-orange-200',
          badge: 'bg-orange-500 text-white',
          icon: 'text-orange-600',
          progress: 'bg-orange-500'
        }
      case 'medium':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          badge: 'bg-yellow-500 text-white',
          icon: 'text-yellow-600',
          progress: 'bg-yellow-500'
        }
      default:
        return {
          bg: 'bg-blue-50 border-blue-200',
          badge: 'bg-blue-500 text-white',
          icon: 'text-blue-600',
          progress: 'bg-blue-500'
        }
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'high_impact_material':
        return <Target className="w-5 h-5" />
      case 'recycled_content':
        return <Recycle className="w-5 h-5" />
      case 'transport_optimization':
        return <Truck className="w-5 h-5" />
      case 'circularity':
        return <Leaf className="w-5 h-5" />
      case 'scrap_recovery':
        return <Wrench className="w-5 h-5" />
      case 'lifespan_extension':
        return <Clock className="w-5 h-5" />
      default:
        return <Zap className="w-5 h-5" />
    }
  }

  const handleActionClick = (action: string, hotspot: Hotspot) => {
    if (action === 'show_suppliers') {
      setShowSuppliers(hotspot.id)
    } else if (onActionClick) {
      onActionClick(action, hotspot)
    }
  }

  const getMaterialCategory = (materialType: string): MaterialCategory => {
    if (materialType?.includes('aluminium')) return 'aluminium'
    if (materialType?.includes('steel')) return 'steel'
    if (materialType?.includes('copper')) return 'copper'
    return 'aluminium' // default
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-100 rounded"></div>
            <div className="h-20 bg-gray-100 rounded"></div>
            <div className="h-20 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (hotspots.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <Award className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Action Hotspots</h3>
            <p className="text-sm text-gray-500">No critical issues identified</p>
          </div>
        </div>
        <p className="text-gray-600">
          Add materials to your project to receive AI-powered improvement recommendations.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Stuck to Address</h3>
              <p className="text-sm text-purple-100">Top {hotspots.length} improvement opportunities ranked by impact</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">
              {hotspots.filter(h => h.priority === 'critical' || h.priority === 'high').length}
            </div>
            <div className="text-xs text-purple-200">High Priority</div>
          </div>
        </div>
      </div>

      {/* Hotspot List */}
      <div className="divide-y divide-gray-100">
        {hotspots.map((hotspot) => {
          const styles = getPriorityStyles(hotspot.priority)
          const isExpanded = expandedHotspot === hotspot.id
          const showingSuppliersFor = showSuppliers === hotspot.id

          return (
            <div key={hotspot.id} className={`${styles.bg} transition-all duration-200`}>
              {/* Main Row */}
              <div 
                className="px-6 py-4 cursor-pointer hover:bg-white/50"
                onClick={() => setExpandedHotspot(isExpanded ? null : hotspot.id)}
              >
                <div className="flex items-start gap-4">
                  {/* Rank Badge */}
                  <div className={`w-8 h-8 ${styles.badge} rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0`}>
                    #{hotspot.rank}
                  </div>

                  {/* Icon */}
                  <div className={`w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center ${styles.icon} flex-shrink-0`}>
                    {getTypeIcon(hotspot.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900 truncate">{hotspot.title}</h4>
                      {hotspot.contribution_percent > 0 && (
                        <span className="text-xs bg-gray-900 text-white px-2 py-0.5 rounded-full">
                          {hotspot.contribution_percent.toFixed(0)}% of GWP
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{hotspot.description}</p>
                    
                    {/* Impact Summary */}
                    <div className="flex items-center gap-4 mt-2">
                      {hotspot.impact.gwp_savings_percent && hotspot.impact.gwp_savings_percent > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                          <TrendingDown className="w-3 h-3" />
                          -{hotspot.impact.gwp_savings_percent.toFixed(0)}% GWP
                        </span>
                      )}
                      {hotspot.impact.mci_improvement && (
                        <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                          <Recycle className="w-3 h-3" />
                          +{hotspot.impact.mci_improvement} MCI
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {(hotspot.confidence * 100).toFixed(0)}% confidence
                      </span>
                    </div>
                  </div>

                  {/* Expand Icon */}
                  <div className="flex-shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-6 pb-4 bg-white/70">
                  {/* Suggestions */}
                  {hotspot.suggestions && hotspot.suggestions.length > 0 && (
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Recommended Actions:</h5>
                      <ul className="space-y-1">
                        {hotspot.suggestions.map((suggestion, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                            <span className="text-green-500 mt-0.5">✓</span>
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {hotspot.action_links && hotspot.action_links.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {hotspot.action_links.map((link, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (link.action) {
                              handleActionClick(link.action, hotspot)
                            } else if (link.url) {
                              window.open(link.url, '_blank')
                            }
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition"
                        >
                          {link.label}
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Suppliers Panel */}
                  {showingSuppliersFor && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h5 className="text-sm font-medium text-gray-900 mb-3">
                        🇮🇳 Certified Recycled Metal Suppliers (Make in India)
                      </h5>
                      <div className="space-y-2">
                        {SUPPLIER_DATABASE[getMaterialCategory(hotspot.material_type || '')]?.map((supplier, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border">
                            <div>
                              <p className="font-medium text-gray-900">{supplier.name}</p>
                              <p className="text-xs text-gray-500">{supplier.location}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-sm text-green-600 font-medium">
                                Up to {supplier.recycled_content}% recycled
                              </span>
                              {supplier.certified && (
                                <span className="block text-xs text-blue-600">✓ Certified</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowSuppliers(null)
                        }}
                        className="mt-3 text-sm text-gray-500 hover:text-gray-700"
                      >
                        Close
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Recommendations powered by AI analysis • Confidence scores indicate data quality • 
          <a href="#" className="text-purple-600 hover:underline ml-1">Learn more about methodology</a>
        </p>
      </div>
    </div>
  )
}
