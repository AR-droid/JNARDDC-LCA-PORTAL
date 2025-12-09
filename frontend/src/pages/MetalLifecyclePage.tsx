import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Mountain,
  FlaskConical,
  Factory,
  Flame,
  Building2,
  Wrench,
  Recycle,
  ChevronUp,
  Zap,
  Droplets,
  Wind,
  Leaf,
  ArrowRight,
  ArrowDown,
  RotateCcw,
  FileSpreadsheet,
  Lock,
  Info,
  TrendingDown,
  Loader2
} from 'lucide-react'
import { ChartIcon, AnalyticsIcon, AIIcon, FlaskIcon } from '../components/Icons'
import { useAuthStore } from '../stores/authStore'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

// Default GWP contributions (used as fallback)
const DEFAULT_GWP_CONTRIBUTIONS: Record<string, number> = {
  mining: 8,
  beneficiation: 7,
  refining: 18,
  smelting: 45,
  casting: 8,
  fabrication: 7,
  recycle: 7
}

// Mapping function: Convert 5-stage backend data to 7-stage frontend data
function mapBackendToFrontendStages(backendData: {
  lifecycle_stages: Array<{ stage: string; percentage: number }>;
  summary: { avg_recycled_content: number };
}): Record<string, number> {
  const stages = backendData.lifecycle_stages || []
  const recycledContent = backendData.summary?.avg_recycled_content || 0

  // Find backend stage percentages
  const extraction = stages.find(s => s.stage.includes('Extraction'))?.percentage || 40
  const processing = stages.find(s => s.stage.includes('Processing') || s.stage.includes('Manufacturing'))?.percentage || 25
  const eol = stages.find(s => s.stage.includes('End of Life'))?.percentage || 8

  // Adjust ratios based on recycled content (higher recycled = lower extraction stages)
  const virginRatio = (100 - recycledContent) / 100

  // Split extraction into Mining, Beneficiation, Refining
  // Ratios based on typical metal processing: Mining ~15%, Beneficiation ~13%, Refining ~72%
  const miningRatio = 0.25 * virginRatio
  const beneficiationRatio = 0.22 * virginRatio
  const refiningRatio = 0.53 * virginRatio

  // Processing is mostly smelting (~85%) + casting (~15%)
  const smeltingRatio = 0.85
  const castingRatio = 0.15

  // EOL splits between fabrication and recycle
  const fabricationRatio = 0.5
  const recycleRatio = 0.5

  // Calculate final percentages
  const mining = Math.round(extraction * miningRatio)
  const beneficiation = Math.round(extraction * beneficiationRatio)
  const refining = Math.round(extraction * refiningRatio)
  const smelting = Math.round(processing * smeltingRatio + (recycledContent / 100) * 20) // Smelting gets bonus from recycled
  const casting = Math.round(processing * castingRatio + 5)
  const fabrication = Math.round(eol * fabricationRatio + 5)
  const recycle = Math.round(eol * recycleRatio + (recycledContent / 100) * 5)

  // Normalize to 100%
  const total = mining + beneficiation + refining + smelting + casting + fabrication + recycle
  const factor = 100 / total

  return {
    mining: Math.round(mining * factor) || 1,
    beneficiation: Math.round(beneficiation * factor) || 1,
    refining: Math.round(refining * factor) || 1,
    smelting: Math.round(smelting * factor) || 45,
    casting: Math.round(casting * factor) || 8,
    fabrication: Math.round(fabrication * factor) || 7,
    recycle: Math.round(recycle * factor) || 7
  }
}

// Types
interface WasteStream {
  name: string
  quantity: string
  composition: string
}

interface LifecycleStage {
  id: string
  name: string
  emoji: string
  icon: React.ReactNode
  color: string
  bgColor: string
  borderColor: string
  textColor: string
  description: string
  keyProcesses: string[]
  wasteStreams: WasteStream[]
  energyIntensity: 'Very High' | 'High' | 'Medium' | 'Low'
  gwpContribution: number // percentage
  wastageContribution: number // percentage of total wastage
}

// Lifecycle stages data
const LIFECYCLE_STAGES: LifecycleStage[] = [
  {
    id: 'mining',
    name: 'Mining',
    emoji: '⛏️',
    icon: <Mountain className="w-6 h-6" />,
    color: 'amber',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    textColor: 'text-amber-700',
    description: 'Extraction of raw ores from the earth through open-pit or underground mining',
    keyProcesses: [
      'Ore excavation & blasting',
      'Transportation to surface',
      'Initial crushing & screening',
      'Stockpiling'
    ],
    wasteStreams: [
      { name: 'Overburden', quantity: '50,000 tonnes/year', composition: 'Soil, rock, clay' },
      { name: 'Waste Rock', quantity: '35,000 tonnes/year', composition: 'Low-grade ore, gangue minerals' },
      { name: 'Tailings', quantity: '25,000 tonnes/year', composition: 'Fine particles, process water' },
      { name: 'Mine Water', quantity: '100,000 kL/year', composition: 'Dissolved minerals, suspended solids' }
    ],
    energyIntensity: 'Medium',
    gwpContribution: 8,
    wastageContribution: 35
  },
  {
    id: 'beneficiation',
    name: 'Beneficiation',
    emoji: '🔬',
    icon: <FlaskConical className="w-6 h-6" />,
    color: 'purple',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    textColor: 'text-purple-700',
    description: 'Processing to separate valuable minerals from gangue (unwanted material)',
    keyProcesses: [
      'Flotation separation',
      'Magnetic separation',
      'Gravity separation',
      'Dewatering & filtering'
    ],
    wasteStreams: [
      { name: 'Flotation Tailings', quantity: '18,000 tonnes/year', composition: 'Silica, alumina, trace metals' },
      { name: 'Filter Cake', quantity: '8,500 tonnes/year', composition: 'Dewatered mineral residue' },
      { name: 'Spent Reagents', quantity: '2,000 kL/year', composition: 'Collectors, frothers, modifiers' }
    ],
    energyIntensity: 'Medium',
    gwpContribution: 7,
    wastageContribution: 12
  },
  {
    id: 'refining',
    name: 'Refining',
    emoji: '⚗️',
    icon: <Factory className="w-6 h-6" />,
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    textColor: 'text-blue-700',
    description: 'Purification of metals through chemical or electrolytic processes',
    keyProcesses: [
      'Electrolytic refining',
      'Hydrometallurgical processing',
      'Acid leaching',
      'Solvent extraction'
    ],
    wasteStreams: [
      { name: 'Slag', quantity: '12,000 tonnes/year', composition: 'Metal oxides, silicates' },
      { name: 'Dross', quantity: '4,500 tonnes/year', composition: 'Oxidized metal, flux residue' },
      { name: 'Acid Waste', quantity: '5,000 kL/year', composition: 'Spent acids, dissolved metals' },
      { name: 'Anode Slime', quantity: '800 tonnes/year', composition: 'Precious metals, selenium' }
    ],
    energyIntensity: 'High',
    gwpContribution: 18,
    wastageContribution: 10
  },
  {
    id: 'smelting',
    name: 'Smelting',
    emoji: '🔥',
    icon: <Flame className="w-6 h-6" />,
    color: 'orange',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    textColor: 'text-orange-700',
    description: 'High-temperature extraction of metals from concentrated ores',
    keyProcesses: [
      'Blast furnace operations',
      'Electric arc furnace (EAF)',
      'Reduction of metal oxides',
      'Flux addition for impurity removal'
    ],
    wasteStreams: [
      { name: 'Furnace Slag', quantity: '22,000 tonnes/year', composition: 'Calcium silicate, alumina' },
      { name: 'Dust & Fumes', quantity: '3,500 tonnes/year', composition: 'Metal oxides, carbon particles' },
      { name: 'Spent Refractory', quantity: '1,200 tonnes/year', composition: 'Alumina, magnesia, chrome' },
      { name: 'Skimmings', quantity: '2,800 tonnes/year', composition: 'Metal-rich oxide layer' }
    ],
    energyIntensity: 'Very High',
    gwpContribution: 45,
    wastageContribution: 12
  },
  {
    id: 'casting',
    name: 'Casting',
    emoji: '🏗️',
    icon: <Building2 className="w-6 h-6" />,
    color: 'slate',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-300',
    textColor: 'text-slate-700',
    description: 'Shaping molten metal into desired forms (ingots, billets, shapes)',
    keyProcesses: [
      'Sand casting',
      'Die casting',
      'Continuous casting',
      'Investment casting'
    ],
    wasteStreams: [
      { name: 'Used Sand Molds', quantity: '15,000 tonnes/year', composition: 'Silica sand, binders, additives' },
      { name: 'Metal Scraps', quantity: '4,200 tonnes/year', composition: 'Runners, risers, defective castings' },
      { name: 'Core Butts', quantity: '2,100 tonnes/year', composition: 'Resin-bonded sand cores' },
      { name: 'Shot Blast Dust', quantity: '800 tonnes/year', composition: 'Metal fines, abrasive particles' }
    ],
    energyIntensity: 'Medium',
    gwpContribution: 8,
    wastageContribution: 9
  },
  {
    id: 'fabrication',
    name: 'Fabrication',
    emoji: '🔧',
    icon: <Wrench className="w-6 h-6" />,
    color: 'teal',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-300',
    textColor: 'text-teal-700',
    description: 'Machining and forming of metal components into final products',
    keyProcesses: [
      'Cutting, milling, drilling',
      'Rolling, forging, extrusion',
      'Welding and joining',
      'Surface treatment (anodizing)'
    ],
    wasteStreams: [
      { name: 'Metal Shavings', quantity: '3,200 tonnes/year', composition: 'Aluminium, copper, steel turnings' },
      { name: 'Cutting Fluid Waste', quantity: '1,800 kL/year', composition: 'Spent coolants, lubricants' },
      { name: 'Scrap Offcuts', quantity: '2,500 tonnes/year', composition: 'Sheet metal trimmings' },
      { name: 'Grinding Swarf', quantity: '650 tonnes/year', composition: 'Fine metal particles, abrasive' }
    ],
    energyIntensity: 'Low',
    gwpContribution: 7,
    wastageContribution: 8
  },
  {
    id: 'recycle',
    name: 'End-of-Life / Recycle',
    emoji: '♻️',
    icon: <Recycle className="w-6 h-6" />,
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    textColor: 'text-green-700',
    description: 'End-of-life processing and material recovery for circular economy',
    keyProcesses: [
      'Collection and sorting',
      'Shredding and separation',
      'Remelting and re-refining',
      'Quality testing for reuse'
    ],
    wasteStreams: [
      { name: 'Non-recyclable Fraction', quantity: '5,500 tonnes/year', composition: 'Mixed plastics, composites' },
      { name: 'Process Residue', quantity: '3,200 tonnes/year', composition: 'Shredder light fraction' },
      { name: 'Hazardous Waste', quantity: '800 tonnes/year', composition: 'Batteries, e-waste residue' },
      { name: 'Fluff', quantity: '2,400 tonnes/year', composition: 'Textiles, foam, rubber' }
    ],
    energyIntensity: 'Low',
    gwpContribution: 7,
    wastageContribution: 14
  }
]

// Energy intensity badge color
const getEnergyBadgeColor = (intensity: string) => {
  switch (intensity) {
    case 'Very High': return 'bg-red-100 text-red-700 border-red-200'
    case 'High': return 'bg-orange-100 text-orange-700 border-orange-200'
    case 'Medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    case 'Low': return 'bg-green-100 text-green-700 border-green-200'
    default: return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

export default function MetalLifecyclePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, token } = useAuthStore()

  const [expandedStage, setExpandedStage] = useState<string | null>('smelting')
  const [gwpContributions, setGwpContributions] = useState<Record<string, number>>(DEFAULT_GWP_CONTRIBUTIONS)
  const [isLoading, setIsLoading] = useState(true)
  const [recycledContent, setRecycledContent] = useState(0)

  const hasVerificationAccess = user?.tier === 'enterprise' || user?.features?.verification
  const hasCBAMAccess = user?.tier === 'pro' || user?.tier === 'enterprise' || user?.features?.cbam_export

  // Fetch analytics data and map to 7-stage model
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!id || !token) {
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(`${API_BASE}/projects/${id}/analytics`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const data = await response.json()
          const mappedStages = mapBackendToFrontendStages(data)
          setGwpContributions(mappedStages)
          setRecycledContent(data.summary?.avg_recycled_content || 0)
        }
      } catch (error) {
        console.error('Failed to fetch lifecycle analytics:', error)
        // Keep default values on error
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalytics()
  }, [id, token])

  // Create dynamic stages with fetched GWP values and dynamic wastage based on recycled content
  const dynamicStages = LIFECYCLE_STAGES.map(stage => {
    const virginRatio = (100 - recycledContent) / 100; // 0-1, where 0 = 100% recycled
    const recycledRatio = recycledContent / 100; // 0-1, where 1 = 100% recycled

    // Calculate dynamic wastage based on recycled content
    let dynamicWastage = stage.wastageContribution;

    if (stage.id === 'mining') {
      // Mining wastage decreases significantly with recycled content
      dynamicWastage = Math.round(stage.wastageContribution * virginRatio);
    } else if (stage.id === 'beneficiation') {
      // Beneficiation also decreases with recycled content
      dynamicWastage = Math.round(stage.wastageContribution * virginRatio);
    } else if (stage.id === 'refining') {
      // Refining decreases with recycled content
      dynamicWastage = Math.round(stage.wastageContribution * virginRatio);
    } else if (stage.id === 'smelting') {
      // Smelting still generates waste but increases slightly with recycled (remelting)
      dynamicWastage = Math.round(stage.wastageContribution * (0.3 + 0.7 * virginRatio) + 5 * recycledRatio);
    } else if (stage.id === 'recycle') {
      // Recycle stage increases with recycled content
      dynamicWastage = Math.round(stage.wastageContribution * (0.5 + 1.5 * recycledRatio));
    }
    // Casting and Fabrication stay relatively constant

    return {
      ...stage,
      gwpContribution: gwpContributions[stage.id] || stage.gwpContribution,
      wastageContribution: Math.max(dynamicWastage, 1) // Minimum 1%
    };
  });

  const toggleStage = (stageId: string) => {
    setExpandedStage(expandedStage === stageId ? null : stageId)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
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
              className="px-4 py-2 text-sm font-medium bg-indigo-50 text-indigo-700 rounded-md transition-colors flex items-center gap-2"
            >
              <RotateCcw size={16} /> Lifecycle
            </button>
            <button
              onClick={() => navigate(`/projects/${id}/recommendations`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-md transition-colors flex items-center gap-2"
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
            {hasVerificationAccess ? (
              <button
                onClick={() => navigate(`/projects/${id}/verification`)}
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
        </div>

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-700"></div>
          <div className="absolute inset-0 bg-[url('/images/smelting.jpg')] bg-cover bg-center opacity-20"></div>

          <div className="relative px-8 py-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <RotateCcw className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                  Metal Lifecycle Flow
                </h1>
                <p className="text-indigo-100 mt-1">
                  From extraction to end-of-life: Understanding the complete metal journey
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-yellow-300" />
                  <span className="text-indigo-100 text-sm">Highest Impact</span>
                </div>
                <p className="text-2xl font-bold text-white">Smelting</p>
                <p className="text-xs text-indigo-200">45% of total GWP</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <Leaf className="w-5 h-5 text-green-300" />
                  <span className="text-indigo-100 text-sm">Recycling Saves</span>
                </div>
                <p className="text-2xl font-bold text-white">95%</p>
                <p className="text-xs text-indigo-200">Energy vs Primary</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <Droplets className="w-5 h-5 text-blue-300" />
                  <span className="text-indigo-100 text-sm">Lifecycle Stages</span>
                </div>
                <p className="text-2xl font-bold text-white">7</p>
                <p className="text-xs text-indigo-200">Complete chain</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <Wind className="w-5 h-5 text-cyan-300" />
                  <span className="text-indigo-100 text-sm">Circular Loop</span>
                </div>
                <p className="text-2xl font-bold text-white">Active</p>
                <p className="text-xs text-indigo-200">Material recovery</p>
              </div>
            </div>
          </div>
        </div>

        {/* Circular Economy Highlight Banner */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 mb-8 relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 flex items-center justify-center opacity-10">
            <Recycle className="w-48 h-48 text-white animate-spin-slow" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <TrendingDown className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Circular Economy Loop</h2>
                <p className="text-green-100">
                  Recycled metals bypass Mining → Smelting stages, saving <span className="font-bold">95% energy</span> and reducing CO₂ by <span className="font-bold">~17 kg/kg Al</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/scrap-yard-connect?project=${id}`)}
              className="flex items-center gap-2 px-6 py-3 bg-white text-green-700 rounded-xl font-semibold hover:bg-green-50 transition shadow-lg"
            >
              <Recycle className="w-5 h-5" />
              Find Recycled Materials
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Visual Flow Diagram - Horseshoe Circular Layout */}
        <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 mb-8 overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Click any stage to view details</h2>
            </div>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading data...</span>
              </div>
            ) : recycledContent > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 text-sm font-medium rounded-full border border-green-200">
                <Recycle className="w-4 h-4" />
                <span>{Math.round(recycledContent)}% Recycled Content</span>
              </div>
            )}
          </div>

          {/* Horseshoe Flow Diagram with SVG Connection */}
          <div className="relative">

            {/* Top Row: All 7 stages in a single line */}
            <div className="flex flex-wrap md:flex-nowrap gap-1 md:gap-2 mb-2 relative z-10">
              {dynamicStages.map((stage, index) => (
                <div key={stage.id} className="relative flex-1 min-w-[80px]">
                  {/* Mini Stage Card */}
                  <div
                    onClick={() => toggleStage(stage.id)}
                    className={`relative cursor-pointer rounded-lg border-2 transition-all duration-300 hover:shadow-lg hover:scale-105 ${expandedStage === stage.id
                      ? `${stage.borderColor} ${stage.bgColor} shadow-md scale-105`
                      : 'border-gray-200 bg-white hover:border-gray-300'
                      } ${stage.id === 'smelting' ? 'ring-2 ring-orange-400 ring-offset-1' : ''} 
                      ${stage.id === 'recycle' ? 'ring-2 ring-green-400 ring-offset-1' : ''}`}
                  >
                    <div className="p-2 text-center">
                      <span className="text-xl md:text-2xl block">{stage.emoji}</span>
                      <h3 className={`font-bold text-[10px] md:text-xs truncate ${expandedStage === stage.id ? stage.textColor : 'text-gray-900'}`}>
                        {stage.id === 'beneficiation' ? 'Benefic.' : stage.id === 'fabrication' ? 'Fabric.' : stage.id === 'recycle' ? 'Recycle' : stage.name}
                      </h3>
                      <div className={`text-sm md:text-base font-bold ${stage.textColor}`}>{stage.wastageContribution}%</div>
                      {/* Mini Wastage Bar */}
                      <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full ${stage.wastageContribution >= 30 ? 'bg-red-500' :
                            stage.wastageContribution >= 15 ? 'bg-orange-500' :
                              'bg-green-500'
                            }`}
                          style={{ width: `${Math.min(stage.wastageContribution * 2.5, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Smelting receives scrap indicator */}
                    {stage.id === 'smelting' && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20">
                        <div className="px-1 py-0.5 bg-green-500 text-white text-[8px] font-bold rounded whitespace-nowrap">
                          +SCRAP
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Arrow to next stage */}
                  {index < 6 && (
                    <div className="hidden md:flex absolute -right-2.5 top-1/2 -translate-y-1/2 z-20">
                      <div className="w-5 h-5 bg-white rounded-full shadow-sm border border-gray-200 flex items-center justify-center">
                        <ArrowRight className="w-3 h-3 text-gray-500" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Circular Loop - U-Shape Connection: Recycle → Down → Left → Up → Smelting */}
            <div className="relative mt-2 mx-auto w-full h-24 sm:h-28">
              {/* SVG Gradient Path */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" preserveAspectRatio="none" viewBox="0 0 1000 100">
                <defs>
                  <linearGradient id="loopGradient" x1="100%" y1="0%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#22c55e" /> {/* green-500 */}
                    <stop offset="50%" stopColor="#34d399" /> {/* emerald-400 */}
                    <stop offset="100%" stopColor="#f97316" /> {/* orange-500 */}
                  </linearGradient>
                </defs>

                {/* 
                  Path logic (based on 1000 width):
                  Recycle (Index 6) Center ~ 92.8% -> 928
                  Smelting (Index 3) Center ~ 50.0% -> 500 
                */}
                <path
                  d="M 928 0 V 60 Q 928 90 898 90 H 530 Q 500 90 500 60 V 15"
                  fill="none"
                  stroke="url(#loopGradient)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  className="drop-shadow-sm"
                />
              </svg>

              {/* Labels & Icons positioned absolutely to avoid distortion */}

              {/* From Recycle Label */}
              <div className="absolute top-0 right-[7.14%] translate-x-1/2 flex flex-col items-center gap-0.5">
                <span className="text-[10px] font-bold text-green-600 bg-white/80 px-1 rounded">from Recycle</span>
                <ArrowDown className="w-4 h-4 text-green-500 animate-bounce" style={{ animationDuration: '2s' }} />
              </div>

              {/* To Smelting Label */}
              <div className="absolute bottom-[25px] left-[50%] -translate-x-1/2 flex flex-col items-center gap-0.5" style={{ bottom: 'calc(100% - 25px)' }}>
                {/* Positioned at the tip of the arrow (approx y=15 in SVG which is 15%) */}
                <div className="absolute top-[8px] flex flex-col items-center">
                  <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-orange-500"></div>
                </div>
                <span className="absolute top-[20px] text-[10px] font-bold text-orange-600 bg-white/80 px-1 rounded whitespace-nowrap">↑ to Smelting</span>
              </div>

              {/* Center Banner */}
              <div className="absolute bottom-1 sm:bottom-2 left-1/2 -translate-x-1/2 z-10">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-800 text-xs font-bold rounded-full border border-green-200 shadow-sm whitespace-nowrap">
                  <RotateCcw className="w-3 h-3" />
                  <span>CIRCULAR LOOP: Scrap returns to Smelting</span>
                </div>
              </div>
            </div>


          </div>
        </div>

        {/* Expanded Stage Details */}
        {expandedStage && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8 animate-in slide-in-from-top duration-300">
            {dynamicStages.filter(s => s.id === expandedStage).map(stage => (
              <div key={stage.id}>
                {/* Header */}
                <div className={`${stage.bgColor} px-6 py-4 border-b ${stage.borderColor}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-4xl">{stage.emoji}</span>
                      <div>
                        <h2 className={`text-2xl font-bold ${stage.textColor}`}>{stage.name}</h2>
                        <p className="text-gray-600">{stage.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setExpandedStage(null)}
                      className="p-2 hover:bg-white/50 rounded-lg transition"
                    >
                      <ChevronUp className="w-6 h-6 text-gray-600" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Usage / Key Processes */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Zap className={`w-5 h-5 ${stage.textColor}`} />
                        Key Processes (Usage)
                      </h3>
                      <div className="space-y-3">
                        {stage.keyProcesses.map((process, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center gap-3 p-3 rounded-lg ${stage.bgColor} border ${stage.borderColor}`}
                          >
                            <div className={`w-8 h-8 rounded-full bg-white flex items-center justify-center font-bold ${stage.textColor}`}>
                              {idx + 1}
                            </div>
                            <span className="font-medium text-gray-800">{process}</span>
                          </div>
                        ))}
                      </div>

                      {/* Energy & GWP Summary */}
                      <div className="mt-6 grid grid-cols-2 gap-4">
                        <div className={`p-4 rounded-xl ${stage.bgColor} border ${stage.borderColor}`}>
                          <p className="text-sm text-gray-600 mb-1">Energy Intensity</p>
                          <p className={`text-xl font-bold ${stage.textColor}`}>{stage.energyIntensity}</p>
                        </div>
                        <div className={`p-4 rounded-xl ${stage.bgColor} border ${stage.borderColor}`}>
                          <p className="text-sm text-gray-600 mb-1">GWP Contribution</p>
                          <p className={`text-xl font-bold ${stage.textColor}`}>{stage.gwpContribution}%</p>
                        </div>
                      </div>
                    </div>

                    {/* Wastage / Waste Streams */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Droplets className="w-5 h-5 text-red-500" />
                        Waste Streams (Wastage)
                      </h3>
                      <div className="space-y-3">
                        {stage.wasteStreams.map((waste, idx) => (
                          <div
                            key={idx}
                            className="p-4 rounded-lg bg-gray-50 border border-gray-200 hover:border-gray-300 transition"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-gray-900">{waste.name}</h4>
                              <span className="text-sm font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                                {waste.quantity}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Composition:</span> {waste.composition}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Recovery Potential for Recycle Stage */}
                      {stage.id === 'recycle' && (
                        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                          <div className="flex items-center gap-3 mb-2">
                            <Leaf className="w-6 h-6 text-green-600" />
                            <h4 className="font-semibold text-green-800">Circular Economy Benefit</h4>
                          </div>
                          <p className="text-sm text-green-700">
                            Materials recovered here feed back into the Refining/Smelting stages,
                            creating a closed-loop system that saves <strong>95% energy</strong> compared to virgin material extraction.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Lifecycle Summary</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stage</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Energy</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Wastage %</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Waste Streams</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Key Insight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dynamicStages.map(stage => (
                  <tr
                    key={stage.id}
                    className={`hover:bg-gray-50 cursor-pointer transition ${expandedStage === stage.id ? stage.bgColor : ''}`}
                    onClick={() => toggleStage(stage.id)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{stage.emoji}</span>
                        <span className="font-medium text-gray-900">{stage.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full border ${getEnergyBadgeColor(stage.energyIntensity)}`}>
                        {stage.energyIntensity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${stage.wastageContribution >= 30 ? 'bg-red-500' :
                              stage.wastageContribution >= 15 ? 'bg-orange-500' :
                                'bg-green-500'
                              }`}
                            style={{ width: `${stage.wastageContribution * 2.5}%` }}
                          />
                        </div>
                        <span className="font-semibold text-gray-900">{stage.wastageContribution}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {stage.wasteStreams.length} types
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {stage.id === 'smelting' && <span className="text-red-600 font-medium">High energy, moderate waste</span>}
                      {stage.id === 'recycle' && <span className="text-green-600 font-medium">Recovers material, reduces overall waste</span>}
                      {stage.id === 'mining' && <span className="text-amber-600 font-medium">Highest waste generator (overburden)</span>}
                      {stage.id === 'refining' && <span className="text-blue-600 font-medium">Generates slag and chemical waste</span>}
                      {stage.id === 'beneficiation' && <span className="text-purple-600 font-medium">Tailings and flotation waste</span>}
                      {stage.id === 'casting' && <span className="text-slate-600 font-medium">Sand molds and scrap</span>}
                      {stage.id === 'fabrication' && <span className="text-teal-600 font-medium">Metal shavings, recoverable</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Custom Animation Styles */}
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
        @keyframes dash {
          to {
            stroke-dashoffset: -24;
          }
        }
        .animate-dash {
          animation: dash 1s linear infinite;
        }
      `}</style>
    </div>
  )
}

