import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { 
  calculateProjectLCIA, 
  ProjectLCIAResult, 
  LCIACategoryMetadata 
} from '../api/projects'
import { 
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
  ChevronUp,
  FileSpreadsheet,
  Lock,
  Building2
} from 'lucide-react'
import { ChartIcon, AnalyticsIcon, AIIcon, FlaskIcon } from '../components/Icons'
import { useAuthStore } from '../stores/authStore'

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
// Background images for each category
const categoryImages: Record<string, string> = {
  gwp: "/images/co2.jpg",
  ap: "/images/smoke.jpg",
  ep: "/images/eutrophication.jpg",
  odp: "/images/depletion.jpg",
  pocp: "/images/ozone.jpg",
  htp: "/images/human.jpg",
  faetp: "/images/polluted_water.jpg",
  tetp: "/images/soil_pollution.jpg",
  adp_elements: "/images/abiotic.jpg",
  adp_fossil: "/images/fossil.jpg",
  water_use: "/images/water.jpg",
  land_use: "/images/deforestation1.jpg"
};


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
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [lciaResult, setLciaResult] = useState<ProjectLCIAResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gridRegion, setGridRegion] = useState('national_average')
  const [expandedMaterials, setExpandedMaterials] = useState<Set<number>>(new Set())
  const [showTooltip, setShowTooltip] = useState<string | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  
  const hasCBAMAccess = user?.tier === 'pro' || user?.tier === 'enterprise'
  const hasVerificationAccess = user?.tier === 'enterprise' || user?.features?.verification

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
  const [flippedCard, setFlippedCard] = useState<string | null>(null);

const toggleFlip = (key: string) => {
  setFlippedCard(flippedCard === key ? null : key);
};


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
              onClick={() => navigate(`/projects/${projectId}`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate(`/projects/${projectId}/analytics`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors flex items-center gap-2"
            >
              <ChartIcon size={16} /> Analytics
            </button>
            <button
              className="px-4 py-2 text-sm font-medium bg-teal-50 text-teal-700 rounded-md transition-colors flex items-center gap-2"
            >
              <AnalyticsIcon size={16} /> LCIA
            </button>
            <button
              onClick={() => navigate(`/projects/${projectId}/analysis`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-md transition-colors flex items-center gap-2"
            >
              <AnalyticsIcon size={16} /> Analysis
            </button>
            <button
              onClick={() => navigate(`/projects/${projectId}/recommendations`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-md transition-colors flex items-center gap-2"
            >
              <AIIcon size={16} /> Design Advisor
            </button>
            <button
              onClick={() => navigate(`/projects/${projectId}/scenario`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors flex items-center gap-2"
            >
              <FlaskIcon size={16} /> Scenarios
            </button>
            {hasCBAMAccess ? (
              <button
                onClick={() => navigate(`/projects/${projectId}/cbam-export`)}
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
          {hasVerificationAccess ? (
            <button
              onClick={() => navigate(`/projects/${projectId}/verification`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors flex items-center gap-2"
            >
              <Building2 size={16} /> Verification
            </button>
          ) : (
            <Link
              to="/pricing"
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:bg-gray-50 rounded-md transition-colors flex items-center gap-2"
              title="JNARDDC Verification requires Enterprise plan"
            >
              <Lock size={16} /> Verification
            </Link>
          )}
        </div>
      </div>        {/* Header */}
        <div className="mb-8">
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
                <optgroup label="Captive Power Plants">
                  {gridRegions.captive.map((region) => (
                    <option key={region.value} value={region.value}>
                      {region.label} — {region.factor} kg CO₂/kWh
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Renewable Energy Sources">
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
           <div
  className="relative rounded-lg p-4 text-center bg-cover bg-center"
  style={{ backgroundImage: "url('/images/mining.jpeg')" }}
>
  <div className="absolute inset-0 bg-white/80"></div> {/* slight overlay */}

  <div className="relative z-10">
    <p className="text-sm font-medium text-amber-700">Mining</p>
    <p className="text-3xl font-bold text-amber-800">
      {formatValue(impacts.energy_breakdown.mining_kwh, 'kWh')} kWh
    </p>
  </div>
</div>


          <div
  className="relative rounded-lg p-6 text-center bg-cover bg-center"
  style={{ backgroundImage: "url('/images/refi.jpg')" }}
>
  {/* Soft white overlay for readability */}
  <div className="absolute inset-0 bg-white/70 rounded-lg"></div>

  {/* Content */}
  <div className="relative z-10">
    <p className="text-sm font-medium text-orange-600">Refining</p>
    <p className="text-3xl font-bold text-orange-700">
      {formatValue(impacts.energy_breakdown.refining_kwh, 'kWh')} kWh
    </p>
  </div>
</div>

            <div
  className="relative rounded-lg p-6 text-center bg-cover bg-center"
  style={{ backgroundImage: "url('/images/smelting.jpg')" }}
>
  {/* Soft overlay (slight red tint like your screenshot) */}
  <div className="absolute inset-0 bg-red-50/80 rounded-lg"></div>

  {/* Content */}
  <div className="relative z-10">
    <p className="text-sm font-medium text-red-600">Smelting</p>
    <p className="text-3xl font-bold text-red-700">
      {formatValue(impacts.energy_breakdown.smelting_kwh, 'kWh')} kWh
    </p>
  </div>
</div>

            <div
  className="relative rounded-lg p-4 text-center bg-cover bg-center overflow-hidden"
  style={{ backgroundImage: "url('/images/totalpower.jpg')" }}   // <-- your image path
>
  {/* Soft overlay so text remains readable */}
  <div className="absolute inset-0 bg-white/70"></div>

  {/* Foreground content */}
  <div className="relative z-10">
    <p className="text-sm text-purple-700 font-medium">Total Energy</p>
    <p className="text-2xl font-bold text-purple-800">
      {formatValue(impacts.energy_breakdown.total_kwh, 'kWh')} kWh
    </p>
  </div>
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
    className="relative h-44 cursor-pointer"
    onClick={() => toggleFlip(key)}
  >
    <div
      className={`
        relative w-full h-full transition-transform duration-500
        ${flippedCard === key ? "rotate-y-180" : ""}
      `}
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* FRONT SIDE */}
      <div
        className="absolute inset-0 rounded-lg border-2 p-4 bg-cover bg-center"
        style={{
          backgroundImage: `url(${categoryImages[key]})`,
          backfaceVisibility: "hidden",
        }}
      >
        <div className="absolute inset-0 bg-white/70"></div>

        <div className="relative z-10">
          <div className="flex items-center mb-2">
            {categoryIcons[key]}
            <span className="ml-2 font-bold text-sm text-gray-900 drop-shadow">
              {meta.short_name}
            </span>
          </div>

          <p className="text-2xl font-extrabold text-gray-900 drop-shadow-md">
            {formatValue(value, meta.unit)}
          </p>

          <p className="text-sm font-semibold text-gray-800 drop-shadow">
            {meta.unit}
          </p>

          <p className="text-sm mt-2 font-semibold text-gray-900 drop-shadow">
            {meta.name}
          </p>
        </div>
      </div>

      {/* BACK SIDE */}
      <div
        className="absolute inset-0 rounded-lg bg-gray-900 text-white p-4 overflow-auto"
        style={{
          transform: "rotateY(180deg)",
          backfaceVisibility: "hidden",
        }}
      >
        <h3 className="font-bold text-sm mb-2">
          {meta.name} ({meta.short_name})
        </h3>

        <p className="text-xs text-gray-200 mb-2">
          <span className="font-semibold">Definition: </span>
          {categoryDefinitions[key].definition}
        </p>

        <p className="text-xs text-gray-300 mb-2">
          <span className="font-semibold text-white">Relevance: </span>
          {categoryDefinitions[key].relevance}
        </p>

        <p className="text-xs text-gray-300">
          <span className="font-semibold text-white">Example: </span>
          {categoryDefinitions[key].example}
        </p>
      </div>
    </div>
  </div>
);
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
                          <div
  key={key}
  className="relative rounded-lg p-3 bg-cover bg-center shadow-sm"
  style={{
    backgroundImage: `url(${categoryImages[key]})`
  }}
>
  {/* Overlay */}
  <div className="absolute inset-0 bg-white/70 rounded-lg"></div>

  {/* Foreground content */}
  <div className="relative z-10">
    <p className="text-xs font-semibold text-gray-900 drop-shadow">
      {meta.short_name}
    </p>

    <p className="text-lg font-extrabold text-gray-900 drop-shadow-md">
      {formatValue(value, meta.unit)}
    </p>

    <p className="text-xs text-gray-700 font-medium drop-shadow">
      {meta.unit}
    </p>
  </div>
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
       
      </div>
    </div>
  )
}
