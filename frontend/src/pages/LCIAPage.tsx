import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  calculateProjectLCIA, 
  ProjectLCIAResult, 
  LCIACategoryMetadata 
} from '../api/projects'
import { 
  ArrowLeft, 
  Droplets, 
  Wind, 
  Flame, 
  Leaf, 
  AlertTriangle, 
  Zap,
  Mountain,
  Factory,
  Gauge,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

// Icon mapping for LCIA categories
const categoryIcons: Record<string, JSX.Element> = {
  gwp: <Flame className="w-5 h-5" />,
  ap: <Wind className="w-5 h-5" />,
  ep: <Droplets className="w-5 h-5" />,
  odp: <AlertTriangle className="w-5 h-5" />,
  pocp: <Wind className="w-5 h-5" />,
  htp: <AlertTriangle className="w-5 h-5" />,
  faetp: <Droplets className="w-5 h-5" />,
  tetp: <Leaf className="w-5 h-5" />,
  adp_elements: <Mountain className="w-5 h-5" />,
  adp_fossil: <Factory className="w-5 h-5" />,
  water_use: <Droplets className="w-5 h-5" />,
  land_use: <Mountain className="w-5 h-5" />,
}

// Definitions for each impact category
const categoryDefinitions: Record<string, { definition: string; relevance: string; example: string }> = {
  gwp: {
    definition: "Global Warming Potential (GWP) measures the heat trapped by greenhouse gases relative to CO₂ over 100 years.",
    relevance: "Key indicator for climate change contribution. Critical for CBAM compliance and carbon footprint reporting.",
    example: "1 kg of methane = 28 kg CO₂-eq"
  },
  ap: {
    definition: "Acidification Potential (AP) measures emissions that cause acid rain, primarily SO₂ and NOₓ.",
    relevance: "Impacts soil quality, freshwater ecosystems, and building materials. Important for regional air quality.",
    example: "Coal power plants and metal smelting are major contributors"
  },
  ep: {
    definition: "Eutrophication Potential (EP) measures nutrient enrichment in water bodies causing algal blooms.",
    relevance: "Affects aquatic ecosystems and drinking water quality. Linked to fertilizer runoff and wastewater.",
    example: "Excess nitrogen and phosphorus deplete oxygen in lakes"
  },
  odp: {
    definition: "Ozone Depletion Potential (ODP) measures damage to the stratospheric ozone layer.",
    relevance: "Regulated under Montreal Protocol. Most CFCs are banned; some industrial chemicals still contribute.",
    example: "CFC-11 has ODP of 1.0 (reference substance)"
  },
  pocp: {
    definition: "Photochemical Ozone Creation Potential (POCP) measures ground-level smog formation.",
    relevance: "Causes respiratory issues and crop damage. VOCs and NOₓ from industrial processes are key sources.",
    example: "Common in industrial zones and high-traffic areas"
  },
  htp: {
    definition: "Human Toxicity Potential (HTP) measures toxic substances harmful to human health.",
    relevance: "Includes heavy metals, pesticides, and industrial chemicals. Critical for worker safety and community health.",
    example: "Lead, mercury, and cadmium are high contributors"
  },
  faetp: {
    definition: "Freshwater Aquatic Ecotoxicity Potential measures toxic effects on freshwater organisms.",
    relevance: "Protects fish, invertebrates, and aquatic plants. Mining effluents are major contributors.",
    example: "Heavy metals in mine tailings contaminate rivers"
  },
  tetp: {
    definition: "Terrestrial Ecotoxicity Potential measures toxic effects on land-based ecosystems.",
    relevance: "Impacts soil organisms, plants, and wildlife. Related to pesticides and industrial emissions.",
    example: "Zinc and copper from mining affect soil biodiversity"
  },
  adp_elements: {
    definition: "Abiotic Depletion Potential (Elements) measures consumption of non-renewable mineral resources.",
    relevance: "Critical for rare earths, lithium, and critical minerals. Key metric for circular economy and resource security.",
    example: "Antimony is the reference element (ADP = 1)"
  },
  adp_fossil: {
    definition: "Abiotic Depletion Potential (Fossil) measures consumption of fossil fuel resources.",
    relevance: "Indicates dependency on coal, oil, and natural gas. Important for energy transition planning.",
    example: "Measured in MJ of primary energy consumed"
  },
  water_use: {
    definition: "Water Use measures freshwater consumption throughout the product lifecycle.",
    relevance: "Critical in water-stressed regions like parts of India. Includes direct use and embedded water in materials.",
    example: "Aluminium production requires ~15,000 liters per ton"
  },
  land_use: {
    definition: "Land Use measures the area of land occupied or transformed for production.",
    relevance: "Impacts biodiversity, habitat loss, and carbon sequestration. Mining has significant land footprint.",
    example: "Open-pit mines can occupy thousands of hectares"
  },
}

// Color mapping for LCIA categories
const categoryColors: Record<string, string> = {
  gwp: 'bg-red-100 text-red-700 border-red-200',
  ap: 'bg-orange-100 text-orange-700 border-orange-200',
  ep: 'bg-blue-100 text-blue-700 border-blue-200',
  odp: 'bg-purple-100 text-purple-700 border-purple-200',
  pocp: 'bg-amber-100 text-amber-700 border-amber-200',
  htp: 'bg-rose-100 text-rose-700 border-rose-200',
  faetp: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  tetp: 'bg-green-100 text-green-700 border-green-200',
  adp_elements: 'bg-slate-100 text-slate-700 border-slate-200',
  adp_fossil: 'bg-gray-100 text-gray-700 border-gray-200',
  water_use: 'bg-sky-100 text-sky-700 border-sky-200',
  land_use: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

// Format scientific notation for small values
function formatValue(value: number, _unit?: string): string {
  if (value === 0) return '0'
  if (Math.abs(value) < 0.0001) {
    return value.toExponential(2)
  }
  if (Math.abs(value) < 1) {
    return value.toFixed(4)
  }
  if (Math.abs(value) >= 1000000) {
    return (value / 1000000).toFixed(2) + 'M'
  }
  if (Math.abs(value) >= 1000) {
    return (value / 1000).toFixed(2) + 'k'
  }
  return value.toFixed(2)
}

export default function LCIAPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [lciaResult, setLciaResult] = useState<ProjectLCIAResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gridRegion, setGridRegion] = useState('national_average')
  const [expandedMaterials, setExpandedMaterials] = useState<Set<number>>(new Set())
  const [showTooltip, setShowTooltip] = useState<string | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setShowTooltip(null)
      }
    }

    if (showTooltip) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showTooltip])

  useEffect(() => {
    if (projectId) {
      loadLCIA()
    }
  }, [projectId, gridRegion])

  const loadLCIA = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await calculateProjectLCIA(projectId!, gridRegion)
      setLciaResult(result)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to calculate LCIA')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleMaterial = (index: number) => {
    const newExpanded = new Set(expandedMaterials)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedMaterials(newExpanded)
  }

  const gridRegions = {
    regional: [
      { value: 'national_average', label: 'National Average', factor: 0.82 },
      { value: 'northern', label: 'Northern Region', factor: 0.85 },
      { value: 'western', label: 'Western Region', factor: 0.78 },
      { value: 'southern', label: 'Southern Region', factor: 0.72 },
      { value: 'eastern', label: 'Eastern Region', factor: 0.92 },
      { value: 'northeastern', label: 'Northeastern Region', factor: 0.65 },
    ],
    captive: [
      { value: 'captive_coal', label: 'Captive Coal Plant', factor: 1.05 },
      { value: 'captive_gas', label: 'Captive Gas Plant', factor: 0.45 },
    ],
    renewable: [
      { value: 'renewable_solar', label: 'Solar PV', factor: 0.05 },
      { value: 'renewable_wind', label: 'Wind Power', factor: 0.02 },
      { value: 'renewable_hydro', label: 'Hydropower', factor: 0.01 },
    ]
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Calculating LCIA impacts...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <Link to={`/projects/${projectId}`} className="flex items-center text-blue-600 hover:text-blue-700 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Project
          </Link>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-700 mb-2">Error</h2>
            <p className="text-red-600">{error}</p>
            <button
              onClick={loadLCIA}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!lciaResult) return null

  const categories = lciaResult.categories_metadata
  const impacts = lciaResult.total_impacts

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link to={`/projects/${projectId}`} className="flex items-center text-blue-600 hover:text-blue-700 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Project
          </Link>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Life Cycle Impact Assessment (LCIA)
              </h1>
              <p className="text-gray-600 mt-1">{lciaResult.project_name}</p>
            </div>
            <div className="mt-4 md:mt-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Zap className="w-4 h-4 inline mr-1" />
                Electricity Grid Region
              </label>
              <select
                value={gridRegion}
                onChange={(e) => setGridRegion(e.target.value)}
                className="block w-full md:w-80 rounded-lg border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all cursor-pointer"
              >
                <optgroup label="🇮🇳 Indian Regional Grids (CEA 2023)">
                  {gridRegions.regional.map((region) => (
                    <option key={region.value} value={region.value}>
                      {region.label} — {region.factor} kg CO₂/kWh
                    </option>
                  ))}
                </optgroup>
                <optgroup label="🏭 Captive Power Plants">
                  {gridRegions.captive.map((region) => (
                    <option key={region.value} value={region.value}>
                      {region.label} — {region.factor} kg CO₂/kWh
                    </option>
                  ))}
                </optgroup>
                <optgroup label="🌱 Renewable Energy Sources">
                  {gridRegions.renewable.map((region) => (
                    <option key={region.value} value={region.value}>
                      {region.label} — {region.factor} kg CO₂/kWh
                    </option>
                  ))}
                </optgroup>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Source: Central Electricity Authority (CEA) CO₂ Baseline Database
              </p>
            </div>
          </div>
        </div>

        {/* Methodology Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900">Methodology</h3>
              <p className="text-sm text-blue-700 mt-1">
                This assessment uses characterization factors from ReCiPe 2016, CML 2001, and TRACI 2.1 methodologies.
                Indian grid emission factors are sourced from CEA CO2 Baseline Database 2023.
              </p>
            </div>
          </div>
        </div>

        {/* Energy Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <Zap className="w-6 h-6 mr-2 text-yellow-500" />
            Energy Consumption Breakdown
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-amber-50 rounded-lg p-4 text-center">
              <p className="text-sm text-amber-600 font-medium">Mining</p>
              <p className="text-2xl font-bold text-amber-700">
                {formatValue(impacts.energy_breakdown.mining_kwh, 'kWh')} kWh
              </p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <p className="text-sm text-orange-600 font-medium">Refining</p>
              <p className="text-2xl font-bold text-orange-700">
                {formatValue(impacts.energy_breakdown.refining_kwh, 'kWh')} kWh
              </p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <p className="text-sm text-red-600 font-medium">Smelting</p>
              <p className="text-2xl font-bold text-red-700">
                {formatValue(impacts.energy_breakdown.smelting_kwh, 'kWh')} kWh
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <p className="text-sm text-purple-600 font-medium">Total Energy</p>
              <p className="text-2xl font-bold text-purple-700">
                {formatValue(impacts.energy_breakdown.total_kwh, 'kWh')} kWh
              </p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Grid-related GWP:</span>{' '}
              <span className="text-red-600 font-bold">{formatValue(impacts.grid_gwp, 'kg')} kg CO₂-eq</span>
              {' '}(based on {gridRegion.replace(/_/g, ' ')} @ {lciaResult.grid_emission_factor} kg CO₂/kWh)
            </p>
          </div>
        </div>

        {/* Impact Categories Grid */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <Gauge className="w-6 h-6 mr-2 text-blue-600" />
            Environmental Impact Categories
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(categories).map(([key, meta]: [string, LCIACategoryMetadata]) => {
              const value = impacts[key as keyof typeof impacts] as number
              return (
                <div
                  key={key}
                  className={`rounded-lg border-2 p-4 relative ${categoryColors[key] || 'bg-gray-100 text-gray-700 border-gray-200'}`}
                >
                  <div className="flex items-center mb-2">
                    {categoryIcons[key] || <Gauge className="w-5 h-5" />}
                    <span className="ml-2 font-semibold text-sm">{meta.short_name}</span>
                    <button
                      onClick={() => setShowTooltip(showTooltip === key ? null : key)}
                      className="ml-auto p-1 rounded-full hover:bg-white/30 transition-colors"
                      title={`Learn about ${meta.short_name}`}
                    >
                      <Info className="w-4 h-4 opacity-60 hover:opacity-100" />
                    </button>
                  </div>
                  {/* Tooltip */}
                  {showTooltip === key && categoryDefinitions[key] && (
                    <div 
                      ref={tooltipRef}
                      className="absolute z-10 top-full left-0 right-0 mt-2 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg"
                    >
                      <div className="font-semibold mb-1">{meta.name}</div>
                      <p className="leading-relaxed mb-2">{categoryDefinitions[key].definition}</p>
                      <p className="text-gray-300 text-[10px] italic">{categoryDefinitions[key].relevance}</p>
                      <div className="absolute -top-2 left-4 w-4 h-4 bg-gray-900 transform rotate-45"></div>
                    </div>
                  )}
                  <p className="text-2xl font-bold">{formatValue(value, meta.unit)}</p>
                  <p className="text-xs opacity-75">{meta.unit}</p>
                  <p className="text-xs mt-2 opacity-60">{meta.name}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Materials Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Materials Breakdown ({lciaResult.materials_breakdown.length} materials)
          </h2>
          <div className="space-y-3">
            {lciaResult.materials_breakdown.map((mat, index) => (
              <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleMaterial(index)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <Factory className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">{mat.name}</h3>
                      <p className="text-sm text-gray-500">{mat.type} • {mat.quantity} kg</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-600 mr-3">
                      GWP: {formatValue(mat.impacts.gwp, 'kg')} kg CO₂-eq
                    </span>
                    {expandedMaterials.has(index) ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>
                
                {expandedMaterials.has(index) && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      {Object.entries(categories).slice(0, 8).map(([key, meta]: [string, LCIACategoryMetadata]) => {
                        const value = mat.impacts[key as keyof typeof mat.impacts] as number
                        return (
                          <div key={key} className="bg-white rounded p-2">
                            <p className="text-xs text-gray-500">{meta.short_name}</p>
                            <p className="font-semibold">{formatValue(value, meta.unit)}</p>
                            <p className="text-xs text-gray-400">{meta.unit}</p>
                          </div>
                        )
                      })}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        Energy: Mining {mat.impacts.energy_breakdown.mining_kwh.toFixed(1)} kWh | 
                        Refining {mat.impacts.energy_breakdown.refining_kwh.toFixed(1)} kWh | 
                        Smelting {mat.impacts.energy_breakdown.smelting_kwh.toFixed(1)} kWh
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Category Definitions */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Impact Category Definitions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(categories).map(([key, meta]: [string, LCIACategoryMetadata]) => (
              <div key={key} className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900">{meta.name} ({meta.short_name})</h4>
                <p className="text-sm text-gray-600 mt-1">{meta.description}</p>
                <p className="text-xs text-gray-400 mt-1">Methodology: {meta.methodology} | Unit: {meta.unit}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
