import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Recycle,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Search,
  Info,
  Beaker,
  Sparkles,
  ExternalLink
} from 'lucide-react'
import {
  ALLOY_DATABASE,
  SCRAP_GRADES,
  SERIES_INFO,
  detectAlloyFromName,
  calculateElementBalance,
  getScrapGradeById,
  AlloyData
} from '../data/alloyData'

interface Material {
  id: string
  material_name: string
  material_type: string
  quantity: number
  recycled_content: number
}

interface AlloyRecyclingAdvisorProps {
  materials: Material[]
  projectId: string
}

export default function AlloyRecyclingAdvisor({ materials, projectId }: AlloyRecyclingAdvisorProps) {
  const navigate = useNavigate()
  const [isExpanded, setIsExpanded] = useState(true)
  const [selectedAlloy, setSelectedAlloy] = useState<AlloyData | null>(null)
  const [recycledPercent, setRecycledPercent] = useState(80)

  // Detect alloys from materials
  const detectedAlloys = useMemo(() => {
    const alloys: { material: Material; alloy: AlloyData }[] = []
    
    for (const material of materials) {
      // Only check aluminium materials
      if (material.material_type?.toLowerCase().includes('alumin') || 
          material.material_name?.toLowerCase().includes('alumin') ||
          material.material_name?.toLowerCase().includes('aluminum')) {
        const detected = detectAlloyFromName(material.material_name)
        if (detected) {
          alloys.push({ material, alloy: detected })
        }
      }
    }
    
    return alloys
  }, [materials])

  // Get the primary alloy (first detected or selected)
  const primaryAlloy = selectedAlloy || (detectedAlloys.length > 0 ? detectedAlloys[0].alloy : null)

  // Calculate element balance for primary alloy
  const elementBalance = useMemo(() => {
    if (!primaryAlloy) return []
    return calculateElementBalance(primaryAlloy, recycledPercent)
  }, [primaryAlloy, recycledPercent])

  // Get compatible and incompatible scrap names
  const compatibleScrapNames = useMemo(() => {
    if (!primaryAlloy) return []
    return primaryAlloy.compatible_scrap
      .map(id => getScrapGradeById(id))
      .filter(Boolean)
      .map(s => s!.name)
  }, [primaryAlloy])

  const incompatibleScrapNames = useMemo(() => {
    if (!primaryAlloy) return []
    return primaryAlloy.incompatible_scrap
      .map(id => getScrapGradeById(id))
      .filter(Boolean)
      .map(s => s!.name)
  }, [primaryAlloy])

  // No aluminium materials detected
  if (detectedAlloys.length === 0 && !selectedAlloy) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div 
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Recycle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Alloy Recycling Advisor</h3>
              <p className="text-xs text-gray-500">Add aluminium materials to see recycling guidance</p>
            </div>
          </div>
          {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
        
        {isExpanded && (
          <div className="px-4 pb-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <Beaker className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">No aluminium alloys detected in your BOM.</p>
              <p className="text-xs text-gray-500 mt-1">Add materials like "6061 Aluminium" or "A356 Cast Al" to get recycling advice.</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  const seriesInfo = primaryAlloy ? SERIES_INFO[primaryAlloy.series] : null

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition bg-gradient-to-r from-blue-50 to-green-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg shadow-sm">
            <Recycle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              Alloy Recycling Advisor
              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded">
                {detectedAlloys.length} ALLOY{detectedAlloys.length > 1 ? 'S' : ''} DETECTED
              </span>
            </h3>
            <p className="text-xs text-gray-500">
              {primaryAlloy ? `Analyzing: ${primaryAlloy.name}` : 'Recycling compatibility & guidance'}
            </p>
          </div>
        </div>
        {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </div>

      {/* Expanded Content */}
      {isExpanded && primaryAlloy && (
        <div className="p-4 space-y-4">
          {/* Alloy Selector (if multiple detected) */}
          {detectedAlloys.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {detectedAlloys.map(({ material, alloy }) => (
                <button
                  key={material.id}
                  onClick={() => setSelectedAlloy(alloy)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    primaryAlloy.code === alloy.code
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {alloy.code}
                </button>
              ))}
            </div>
          )}

          {/* Alloy Info Card */}
          <div className={`rounded-lg p-3 border ${
            seriesInfo ? `bg-${seriesInfo.color}-50 border-${seriesInfo.color}-200` : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-900">{primaryAlloy.code}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    primaryAlloy.type === 'cast' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {primaryAlloy.type === 'cast' ? 'Cast' : 'Wrought'}
                  </span>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                    {primaryAlloy.series} Series
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1">{primaryAlloy.description}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">{primaryAlloy.recyclability_score}</div>
                <div className="text-[10px] text-gray-500">Recyclability</div>
              </div>
            </div>
            
            {/* Composition */}
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(primaryAlloy.composition).map(([element, percent]) => (
                <span key={element} className="px-2 py-0.5 bg-white rounded text-xs text-gray-700 border border-gray-200">
                  {element}: {percent}%
                </span>
              ))}
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Compatible Scrap */}
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <h4 className="text-sm font-semibold text-green-800 flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4" />
                Compatible Scrap
              </h4>
              <ul className="space-y-1">
                {compatibleScrapNames.slice(0, 5).map((name, idx) => (
                  <li key={idx} className="text-xs text-green-700 flex items-center gap-1">
                    <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                    {name}
                  </li>
                ))}
              </ul>
              {compatibleScrapNames.length > 5 && (
                <p className="text-[10px] text-green-600 mt-1">+{compatibleScrapNames.length - 5} more</p>
              )}
            </div>

            {/* Incompatible Scrap */}
            <div className="bg-red-50 rounded-lg p-3 border border-red-200">
              <h4 className="text-sm font-semibold text-red-800 flex items-center gap-2 mb-2">
                <XCircle className="w-4 h-4" />
                Avoid These
              </h4>
              {incompatibleScrapNames.length > 0 ? (
                <ul className="space-y-1">
                  {incompatibleScrapNames.slice(0, 5).map((name, idx) => (
                    <li key={idx} className="text-xs text-red-700 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-red-600">Very tolerant - accepts most scrap!</p>
              )}
            </div>
          </div>

          {/* End-of-Life Pathways */}
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <h4 className="text-sm font-semibold text-blue-800 flex items-center gap-2 mb-2">
              <Recycle className="w-4 h-4" />
              End-of-Life Pathways
            </h4>
            <div className="flex flex-wrap gap-2">
              {primaryAlloy.eol_pathways.map((pathway, idx) => (
                <span 
                  key={idx} 
                  className="px-2 py-1 bg-white rounded-lg text-xs text-blue-700 border border-blue-200 flex items-center gap-1"
                >
                  <ArrowRight className="w-3 h-3" />
                  {pathway.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>

          {/* Element Balance */}
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Beaker className="w-4 h-4" />
                Element Balance
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Recycled:</span>
                <select
                  value={recycledPercent}
                  onChange={(e) => setRecycledPercent(Number(e.target.value))}
                  className="px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={100}>100%</option>
                  <option value={80}>80%</option>
                  <option value={60}>60%</option>
                  <option value={40}>40%</option>
                  <option value={20}>20%</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
              {elementBalance.map(({ element, current, required, status }) => (
                <div key={element} className="flex items-center gap-3">
                  <span className="w-6 text-xs font-medium text-gray-700">{element}</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        status === 'ok' ? 'bg-green-500' :
                        status === 'low' ? 'bg-yellow-500' :
                        status === 'watch' ? 'bg-orange-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${Math.min((current / Math.max(required, 0.01)) * 100, 100)}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-medium whitespace-nowrap ${
                    status === 'ok' ? 'text-green-600' :
                    status === 'low' ? 'text-yellow-600' :
                    status === 'watch' ? 'text-orange-600' :
                    'text-red-600'
                  }`}>
                    {status === 'ok' && 'OK ✓'}
                    {status === 'low' && `Need +${(required - current).toFixed(2)}% virgin`}
                    {status === 'watch' && 'Watch ⚠️'}
                    {status === 'high' && 'Too high!'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendation */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-3 border border-purple-200">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-purple-100 rounded-lg">
                <Sparkles className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-purple-800">Recommendation</h4>
                <p className="text-xs text-purple-700 mt-1">
                  {primaryAlloy.series === '2xxx' || primaryAlloy.series === '7xxx'
                    ? `${primaryAlloy.code} is a specialty alloy. Use closed-loop recycling to maintain quality, or downcycle to cast alloys (3xx.x) for general applications.`
                    : primaryAlloy.type === 'cast'
                    ? `${primaryAlloy.code} cast alloy is very tolerant to mixed scrap. It can accept most wrought scrap and is ideal for absorbing lower-grade material.`
                    : `${primaryAlloy.code} can accept ${compatibleScrapNames.slice(0, 2).join(', ')} scrap for closed-loop recycling. Add virgin Mg if using >60% recycled content.`
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate(`/scrap-yard-connect?project=${projectId}&alloy=${primaryAlloy.code}`)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
            >
              <Search className="w-4 h-4" />
              Find Compatible Scrap
              <ExternalLink className="w-3 h-3" />
            </button>
            <button
              onClick={() => navigate(`/projects/${projectId}/lifecycle`)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition"
            >
              <Recycle className="w-4 h-4" />
              View Lifecycle
            </button>
          </div>

          {/* Applications */}
          <div className="pt-2 border-t border-gray-200">
            <p className="text-[10px] text-gray-500 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Common applications: {primaryAlloy.applications.join(', ')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

