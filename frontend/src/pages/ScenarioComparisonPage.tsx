import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { projectsApi, Project, MCIResult } from '../api/projects'
import { materialsApi, Material } from '../api/materials'
import {
  ArrowRight,
  Factory,
  Recycle,
  Leaf,
  Flame,
  TrendingDown,
  TrendingUp,
  BarChart3,
  GitCompare,
  Sparkles,
  Info,
  CheckCircle2,
  XCircle,
  Scale,
  Zap,
  Target,
  FileSpreadsheet,
  Lock,
  ArrowLeft,
  Building2
} from 'lucide-react'
import { ChartIcon, AnalyticsIcon, AIIcon, FlaskIcon } from '../components/Icons'
import { useAuthStore } from '../stores/authStore'
import PathwayComparisonViz from '../components/PathwayComparisonViz'

interface PathwayData {
  name: string
  description: string
  gwp_total: number
  mci_score: number
  recycled_input: number
  recycled_output: number
  virgin_material: number
  energy_consumption: number
  transport_emissions: number
  waste_generated: number
  lifespan_years: number
  end_of_life_recovery: number
}

interface ComparisonResult {
  conventional: PathwayData
  circular: PathwayData
  savings: {
    gwp_kg: number
    gwp_percent: number
    energy_kwh: number
    virgin_material_kg: number
    waste_kg: number
  }
  recommendations: string[]
}

interface LifecycleStage {
  id: string
  label: string
  value: number
}

function LifecycleFlowBar({ stages, total }: { stages: LifecycleStage[]; total: number }) {
  if (!total || total <= 0) return null

  let offset = 0

  return (
    <div className="w-full mb-4">
      <div className="flex justify-between items-end mb-2">
        <p className="text-xs font-medium text-gray-600">Lifecycle impact distribution</p>
        <p className="text-xs text-gray-400">Relative contribution of each stage</p>
      </div>
      <div className="relative h-6 w-full rounded-full bg-gray-100 overflow-hidden">
        {stages.map((stage) => {
          const widthPct = (stage.value / total) * 100
          const leftPct = (offset / total) * 100
          offset += stage.value

          return (
            <div
              key={stage.id}
              className="absolute top-0 bottom-0 transition-all duration-500 ease-out"
              style={{
                left: `${leftPct}%`,
                width: `${widthPct}%`,
                background:
                  stage.id === 'materials'
                    ? '#fee2e2' // red-100
                    : stage.id === 'manufacturing'
                      ? '#e0f2fe' // sky-100
                      : stage.id === 'transport'
                        ? '#fef9c3' // yellow-100
                        : stage.id === 'use'
                          ? '#dcfce7' // green-100
                          : '#e5e7eb', // gray-200 fallback
              }}
            >
              {widthPct > 12 && (
                <div className="h-full flex items-center justify-center px-2">
                  <span className="text-[10px] font-medium text-gray-800 truncate">
                    {stage.label}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ScenarioComparisonPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [project, setProject] = useState<Project | null>(null)
  const [materials, setMaterials] = useState<Material[]>([])
  const [mciResult, setMciResult] = useState<MCIResult | null>(null)
  const [comparison, setComparison] = useState<ComparisonResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCalculating, setIsCalculating] = useState(false)
  const [activeView, setActiveView] = useState<'overview' | 'detailed' | 'lifecycle'>('overview')

  const hasCBAMAccess = user?.tier === 'pro' || user?.tier === 'enterprise'
  const hasVerificationAccess = user?.tier === 'enterprise' || user?.features?.verification

  // Circular pathway configuration
  const [circularConfig, setCircularConfig] = useState({
    recycled_input_target: 80,
    design_for_disassembly: true,
    local_sourcing: true,
    extended_lifespan: true,
    closed_loop_recycling: true
  })

  useEffect(() => {
    loadData()
  }, [id])

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

      if (materialsData.length > 0) {
        const mci = await projectsApi.calculateMCI(id)
        setMciResult(mci)
        calculateComparison(projectData, materialsData, mci)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateComparison = (proj: Project, mats: Material[], _mci: MCIResult) => {
    setIsCalculating(true)

    // Calculate total mass
    const totalMass = mats.reduce((sum, m) => sum + m.quantity, 0)

    // Calculate current averages
    const avgRecycled = mats.reduce((sum, m) => sum + (m.recycled_content || 0) * m.quantity, 0) / totalMass
    const avgTransport = mats.reduce((sum, m) => sum + (m.transport_distance || 0) * m.quantity, 0) / totalMass

    // Conventional pathway (100% virgin material, linear economy)
    const conventionalGWP = mats.reduce((sum, m) => {
      // Use emission factor with 0% recycled content
      const ef = getEmissionFactor(m.material_type || 'steel', 0)
      return sum + (m.quantity * ef)
    }, 0)

    const conventionalEnergy = totalMass * 15 // Average 15 kWh/kg for virgin metals
    const conventionalTransport = avgTransport * 0.1 * totalMass / 1000 // kg CO2 per ton-km

    // Circular pathway (maximized recycled content, local sourcing, design for recycling)
    const targetRecycled = circularConfig.recycled_input_target
    const circularGWP = mats.reduce((sum, m) => {
      const ef = getEmissionFactor(m.material_type || 'steel', targetRecycled)
      return sum + (m.quantity * ef)
    }, 0)

    const circularEnergy = totalMass * 5 // 5 kWh/kg average for recycled metals (much lower)
    const localDistance = circularConfig.local_sourcing ? avgTransport * 0.3 : avgTransport
    const circularTransport = localDistance * 0.1 * totalMass / 1000

    // Lifespan adjustment
    const baseLifespan = proj.target_lifespan || 10
    const extendedLifespan = circularConfig.extended_lifespan ? baseLifespan * 1.5 : baseLifespan

    // End of life recovery rates
    const conventionalRecovery = 30 // 30% typically recovered in linear model
    const circularRecovery = circularConfig.closed_loop_recycling ? 95 : 70

    const conventional: PathwayData = {
      name: 'Conventional (Linear) Pathway',
      description: 'Traditional manufacturing with virgin materials, standard transport, and limited end-of-life recovery',
      gwp_total: Math.round(conventionalGWP + conventionalTransport * 1000),
      mci_score: 0.1,
      recycled_input: 0,
      recycled_output: conventionalRecovery,
      virgin_material: 100,
      energy_consumption: Math.round(conventionalEnergy),
      transport_emissions: Math.round(conventionalTransport * 1000),
      waste_generated: Math.round(totalMass * (1 - conventionalRecovery / 100)),
      lifespan_years: baseLifespan,
      end_of_life_recovery: conventionalRecovery
    }

    const circular: PathwayData = {
      name: 'Circular (Sustainable) Pathway',
      description: 'Maximized recycled content, local sourcing, design for disassembly, and closed-loop recycling',
      gwp_total: Math.round(circularGWP + circularTransport * 1000),
      mci_score: parseFloat((0.1 + (targetRecycled / 100) * 0.6 + (circularRecovery / 100) * 0.3).toFixed(2)),
      recycled_input: targetRecycled,
      recycled_output: circularRecovery,
      virgin_material: 100 - targetRecycled,
      energy_consumption: Math.round(circularEnergy),
      transport_emissions: Math.round(circularTransport * 1000),
      waste_generated: Math.round(totalMass * (1 - circularRecovery / 100)),
      lifespan_years: Math.round(extendedLifespan),
      end_of_life_recovery: circularRecovery
    }

    // Calculate savings
    const savings = {
      gwp_kg: Math.round(conventional.gwp_total - circular.gwp_total),
      gwp_percent: Math.round(((conventional.gwp_total - circular.gwp_total) / conventional.gwp_total) * 100),
      energy_kwh: Math.round(conventional.energy_consumption - circular.energy_consumption),
      virgin_material_kg: Math.round(totalMass * (conventional.virgin_material - circular.virgin_material) / 100),
      waste_kg: Math.round(conventional.waste_generated - circular.waste_generated)
    }

    // Generate recommendations
    const recommendations: string[] = []
    if (avgRecycled < 50) {
      recommendations.push(`Increase recycled content from ${Math.round(avgRecycled)}% to ${targetRecycled}% to reduce GWP by up to ${savings.gwp_percent}%`)
    }
    if (avgTransport > 500) {
      recommendations.push(`Source materials locally (within 200 km) to reduce transport emissions by ${Math.round((1 - 0.3) * 100)}%`)
    }
    if (!proj.is_designed_for_disassembly) {
      recommendations.push('Implement design for disassembly to improve end-of-life recovery rate to 95%')
    }
    recommendations.push(`Extend product lifespan by ${Math.round(extendedLifespan - baseLifespan)} years through modular design`)
    recommendations.push('Partner with certified recyclers for closed-loop material recovery')

    setComparison({
      conventional,
      circular,
      savings,
      recommendations
    })

    setIsCalculating(false)
  }

  const getEmissionFactor = (materialType: string, recycledPercent: number): number => {
    // Emission factors in kg CO2-eq per kg material
    const virginFactors: Record<string, number> = {
      'aluminium': 12.5,
      'aluminum': 12.5,
      'steel': 2.1,
      'copper': 4.5,
      'zinc': 3.2,
      'lead': 2.8,
      'nickel': 15.0,
      'titanium': 35.0,
      'magnesium': 18.0,
      'default': 5.0
    }

    const recycledFactors: Record<string, number> = {
      'aluminium': 0.7,
      'aluminum': 0.7,
      'steel': 0.4,
      'copper': 0.8,
      'zinc': 0.5,
      'lead': 0.3,
      'nickel': 2.0,
      'titanium': 5.0,
      'magnesium': 2.5,
      'default': 1.0
    }

    const type = materialType.toLowerCase()
    const virgin = virginFactors[type] || virginFactors['default']
    const recycled = recycledFactors[type] || recycledFactors['default']

    return virgin * (1 - recycledPercent / 100) + recycled * (recycledPercent / 100)
  }

  const getLifecycleStagesForPathway = (pathway: PathwayData): { stages: LifecycleStage[]; total: number } => {
    const stages: LifecycleStage[] = [
      {
        id: 'materials',
        label: 'Material input',
        value: pathway.virgin_material + pathway.recycled_input,
      },
      {
        id: 'manufacturing',
        label: 'Processing & manufacturing',
        value: pathway.energy_consumption,
      },
      {
        id: 'transport',
        label: 'Transport',
        value: pathway.transport_emissions,
      },
      {
        id: 'use',
        label: 'Use phase',
        value: pathway.lifespan_years,
      },
      {
        id: 'end_of_life',
        label: 'End of life',
        value: pathway.end_of_life_recovery,
      },
    ]

    const total = stages.reduce((sum, s) => sum + (s.value || 0), 0)
    return { stages, total }
  }

  const recalculate = () => {
    if (project && materials.length > 0 && mciResult) {
      calculateComparison(project, materials, mciResult)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pathway comparison...</p>
        </div>
      </div>
    )
  }

  if (!project || materials.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <GitCompare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Data Available</h2>
          <p className="text-gray-600 mb-4">Add materials to your project to compare pathways</p>
          <Link
            to={`/projects/${id}`}
            className="text-blue-600 hover:text-blue-700 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Project
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
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
              onClick={() => navigate(`/projects/${id}/recommendations`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-md transition-colors flex items-center gap-2"
            >
              <AIIcon size={16} /> Design Advisor
            </button>
            <button
              className="px-4 py-2 text-sm font-medium bg-indigo-50 text-indigo-700 rounded-md transition-colors flex items-center gap-2"
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
              onClick={() => navigate(`/projects/${project?.id}/verification`)}
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
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <GitCompare className="w-8 h-8 text-blue-600" />
                Pathway Comparison
              </h1>
              <p className="text-gray-600 mt-1">{project.name} - Conventional vs Circular Analysis</p>
            </div>
            <div className="mt-4 md:mt-0 flex gap-2">
              {['overview', 'detailed', 'lifecycle'].map((view) => (
                <button
                  key={view}
                  onClick={() => setActiveView(view as any)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${activeView === view
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900">What is Pathway Comparison?</h3>
              <p className="text-sm text-blue-700 mt-1">
                This tool compares the environmental impact of manufacturing your product using a
                <strong> conventional linear approach</strong> (virgin materials, standard logistics, limited recycling)
                versus a <strong>circular sustainable approach</strong> (recycled inputs, local sourcing, design for disassembly, closed-loop recycling).
                This aligns with India's Circular Economy Mission and CBAM requirements.
              </p>
            </div>
          </div>
        </div>

        {comparison && (
          <>
            {/* Main Comparison Cards */}
            {activeView === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Conventional Pathway */}
                <div className="bg-white rounded-xl shadow-lg border-2 border-red-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-red-500 to-orange-500 px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                        <Factory className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Conventional Pathway</h2>
                        <p className="text-red-100 text-sm">Linear Economy Model</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-gray-600 text-sm mb-4">{comparison.conventional.description}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <MetricCard
                        label="Carbon Footprint"
                        value={comparison.conventional.gwp_total}
                        unit="kg CO₂-eq"
                        icon={<Flame className="w-5 h-5 text-red-500" />}
                        color="red"
                      />
                      <MetricCard
                        label="Circularity (MCI)"
                        value={comparison.conventional.mci_score}
                        unit=""
                        icon={<Recycle className="w-5 h-5 text-red-500" />}
                        color="red"
                      />
                      <MetricCard
                        label="Virgin Material"
                        value={comparison.conventional.virgin_material}
                        unit="%"
                        icon={<Target className="w-5 h-5 text-red-500" />}
                        color="red"
                      />
                      <MetricCard
                        label="Energy Use"
                        value={comparison.conventional.energy_consumption}
                        unit="kWh"
                        icon={<Zap className="w-5 h-5 text-red-500" />}
                        color="red"
                      />
                      <MetricCard
                        label="Waste Generated"
                        value={comparison.conventional.waste_generated}
                        unit="kg"
                        icon={<XCircle className="w-5 h-5 text-red-500" />}
                        color="red"
                      />
                      <MetricCard
                        label="End-of-Life Recovery"
                        value={comparison.conventional.end_of_life_recovery}
                        unit="%"
                        icon={<TrendingDown className="w-5 h-5 text-red-500" />}
                        color="red"
                      />
                    </div>
                  </div>
                </div>

                {/* Circular Pathway */}
                <div className="bg-white rounded-xl shadow-lg border-2 border-green-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                        <Recycle className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Circular Pathway</h2>
                        <p className="text-green-100 text-sm">Sustainable Economy Model</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-gray-600 text-sm mb-4">{comparison.circular.description}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <MetricCard
                        label="Carbon Footprint"
                        value={comparison.circular.gwp_total}
                        unit="kg CO₂-eq"
                        icon={<Flame className="w-5 h-5 text-green-500" />}
                        color="green"
                        improved
                      />
                      <MetricCard
                        label="Circularity (MCI)"
                        value={comparison.circular.mci_score}
                        unit=""
                        icon={<Recycle className="w-5 h-5 text-green-500" />}
                        color="green"
                        improved
                      />
                      <MetricCard
                        label="Virgin Material"
                        value={comparison.circular.virgin_material}
                        unit="%"
                        icon={<Target className="w-5 h-5 text-green-500" />}
                        color="green"
                        improved
                      />
                      <MetricCard
                        label="Energy Use"
                        value={comparison.circular.energy_consumption}
                        unit="kWh"
                        icon={<Zap className="w-5 h-5 text-green-500" />}
                        color="green"
                        improved
                      />
                      <MetricCard
                        label="Waste Generated"
                        value={comparison.circular.waste_generated}
                        unit="kg"
                        icon={<CheckCircle2 className="w-5 h-5 text-green-500" />}
                        color="green"
                        improved
                      />
                      <MetricCard
                        label="End-of-Life Recovery"
                        value={comparison.circular.end_of_life_recovery}
                        unit="%"
                        icon={<TrendingUp className="w-5 h-5 text-green-500" />}
                        color="green"
                        improved
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Pathway Visualization */}
            {activeView === 'overview' && (
              <div className="mb-6">
                <PathwayComparisonViz
                  conventionalRecycled={mciResult?.avg_recycled_content || 0}
                  circularRecycled={circularConfig.recycled_input_target}
                  conventionalRecovery={comparison.conventional.end_of_life_recovery}
                  circularRecovery={circularConfig.closed_loop_recycling ? 95 : 70}
                  showControls={false}
                  onRecycledChange={(val) => setCircularConfig(prev => ({ ...prev, recycled_input_target: val }))}
                />
              </div>
            )}




            {/* Detailed View */}
            {activeView === 'detailed' && (
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                  Detailed Comparison
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Parameter</th>
                        <th className="text-center py-3 px-4 font-semibold text-red-600">Conventional</th>
                        <th className="text-center py-3 px-4 font-semibold text-green-600">Circular</th>
                        <th className="text-center py-3 px-4 font-semibold text-blue-600">Improvement</th>
                      </tr>
                    </thead>
                    <tbody>
                      <ComparisonRow
                        label="Total GWP (kg CO₂-eq)"
                        conventional={comparison.conventional.gwp_total}
                        circular={comparison.circular.gwp_total}
                      />
                      <ComparisonRow
                        label="MCI Score"
                        conventional={comparison.conventional.mci_score}
                        circular={comparison.circular.mci_score}
                        higherIsBetter
                      />
                      <ComparisonRow
                        label="Recycled Input (%)"
                        conventional={comparison.conventional.recycled_input}
                        circular={comparison.circular.recycled_input}
                        higherIsBetter
                      />
                      <ComparisonRow
                        label="Virgin Material (%)"
                        conventional={comparison.conventional.virgin_material}
                        circular={comparison.circular.virgin_material}
                      />
                      <ComparisonRow
                        label="Energy Consumption (kWh)"
                        conventional={comparison.conventional.energy_consumption}
                        circular={comparison.circular.energy_consumption}
                      />
                      <ComparisonRow
                        label="Transport Emissions (kg CO₂)"
                        conventional={comparison.conventional.transport_emissions}
                        circular={comparison.circular.transport_emissions}
                      />
                      <ComparisonRow
                        label="Waste Generated (kg)"
                        conventional={comparison.conventional.waste_generated}
                        circular={comparison.circular.waste_generated}
                      />
                      <ComparisonRow
                        label="Product Lifespan (years)"
                        conventional={comparison.conventional.lifespan_years}
                        circular={comparison.circular.lifespan_years}
                        higherIsBetter
                      />
                      <ComparisonRow
                        label="End-of-Life Recovery (%)"
                        conventional={comparison.conventional.end_of_life_recovery}
                        circular={comparison.circular.end_of_life_recovery}
                        higherIsBetter
                      />
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Lifecycle View */}
            {activeView === 'lifecycle' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Conventional Lifecycle */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-red-600 mb-4 flex items-center gap-2">
                    <Factory className="w-5 h-5" />
                    Conventional (Linear) Lifecycle
                  </h3>
                  {(() => {
                    const { stages, total } = getLifecycleStagesForPathway(comparison.conventional)
                    return <LifecycleFlowBar stages={stages} total={total} />
                  })()}
                  <div className="space-y-4">
                    <LifecycleStep
                      step={1}
                      title="Raw Material Extraction"
                      description="100% virgin material mining"
                      impact="High environmental impact"
                      color="red"
                    />
                    <ArrowRight className="w-5 h-5 text-gray-400 mx-auto" />
                    <LifecycleStep
                      step={2}
                      title="Processing & Manufacturing"
                      description="Energy-intensive primary production"
                      impact={`${comparison.conventional.energy_consumption} kWh`}
                      color="red"
                    />
                    <ArrowRight className="w-5 h-5 text-gray-400 mx-auto" />
                    <LifecycleStep
                      step={3}
                      title="Transportation"
                      description="Long-distance supply chains"
                      impact={`${comparison.conventional.transport_emissions} kg CO₂`}
                      color="red"
                    />
                    <ArrowRight className="w-5 h-5 text-gray-400 mx-auto" />
                    <LifecycleStep
                      step={4}
                      title="Use Phase"
                      description="Standard product lifespan"
                      impact={`${comparison.conventional.lifespan_years} years`}
                      color="orange"
                    />
                    <ArrowRight className="w-5 h-5 text-gray-400 mx-auto" />
                    <LifecycleStep
                      step={5}
                      title="End of Life"
                      description="Limited recovery, landfill disposal"
                      impact={`${comparison.conventional.end_of_life_recovery}% recovery`}
                      color="red"
                    />
                  </div>
                </div>

                {/* Circular Lifecycle */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-green-600 mb-4 flex items-center gap-2">
                    <Recycle className="w-5 h-5" />
                    Circular (Sustainable) Lifecycle
                  </h3>
                  {(() => {
                    const { stages, total } = getLifecycleStagesForPathway(comparison.circular)
                    return <LifecycleFlowBar stages={stages} total={total} />
                  })()}
                  <div className="space-y-4">
                    <LifecycleStep
                      step={1}
                      title="Material Input"
                      description={`${comparison.circular.recycled_input}% recycled, ${comparison.circular.virgin_material}% virgin`}
                      impact="Low extraction impact"
                      color="green"
                    />
                    <ArrowRight className="w-5 h-5 text-gray-400 mx-auto" />
                    <LifecycleStep
                      step={2}
                      title="Efficient Manufacturing"
                      description="Secondary production processes"
                      impact={`${comparison.circular.energy_consumption} kWh`}
                      color="green"
                    />
                    <ArrowRight className="w-5 h-5 text-gray-400 mx-auto" />
                    <LifecycleStep
                      step={3}
                      title="Local Sourcing"
                      description="Regional supply chains"
                      impact={`${comparison.circular.transport_emissions} kg CO₂`}
                      color="green"
                    />
                    <ArrowRight className="w-5 h-5 text-gray-400 mx-auto" />
                    <LifecycleStep
                      step={4}
                      title="Extended Use"
                      description="Design for durability & repair"
                      impact={`${comparison.circular.lifespan_years} years`}
                      color="green"
                    />
                    <ArrowRight className="w-5 h-5 text-gray-400 mx-auto" />
                    <LifecycleStep
                      step={5}
                      title="Closed Loop Recovery"
                      description="Design for disassembly & recycling"
                      impact={`${comparison.circular.end_of_life_recovery}% recovery`}
                      color="green"
                    />
                    <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm text-green-700 flex items-center gap-2">
                        <Recycle className="w-4 h-4" />
                        Material loops back to Step 1
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Configuration Panel */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Scale className="w-6 h-6 text-blue-600" />
                Configure Circular Pathway
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Recycled Content: <span className="text-blue-600 font-bold">{circularConfig.recycled_input_target}%</span>
                  </label>
                  <input
                    type="range"
                    min="30"
                    max="100"
                    value={circularConfig.recycled_input_target}
                    onChange={(e) => setCircularConfig(prev => ({ ...prev, recycled_input_target: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>30%</span>
                    <span>100%</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={circularConfig.design_for_disassembly}
                      onChange={(e) => setCircularConfig(prev => ({ ...prev, design_for_disassembly: e.target.checked }))}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Design for Disassembly</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={circularConfig.local_sourcing}
                      onChange={(e) => setCircularConfig(prev => ({ ...prev, local_sourcing: e.target.checked }))}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Local Sourcing (≤200 km)</span>
                  </label>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={circularConfig.extended_lifespan}
                      onChange={(e) => setCircularConfig(prev => ({ ...prev, extended_lifespan: e.target.checked }))}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Extended Lifespan (+50%)</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={circularConfig.closed_loop_recycling}
                      onChange={(e) => setCircularConfig(prev => ({ ...prev, closed_loop_recycling: e.target.checked }))}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Closed-Loop Recycling</span>
                  </label>
                </div>
              </div>
              <button
                onClick={recalculate}
                disabled={isCalculating}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {isCalculating ? 'Recalculating...' : 'Recalculate Comparison'}
              </button>
            </div>

            {/* Recommendations */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Leaf className="w-6 h-6 text-green-600" />
                Recommendations for Circular Transition
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {comparison.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-green-800">{rec}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Savings Summary (Moved to Bottom) */}
            <div className="bg-green-600 rounded-xl shadow-xl p-6 text-white mt-6">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-6 h-6 text-green-100" />
                <h2 className="text-xl font-bold">Potential Savings with Circular Pathway</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <SavingsCard
                  label="CO₂ Reduction"
                  value={comparison.savings.gwp_kg}
                  unit="kg"
                  percent={comparison.savings.gwp_percent}
                />
                <SavingsCard
                  label="Energy Saved"
                  value={comparison.savings.energy_kwh}
                  unit="kWh"
                  percent={Math.round((comparison.savings.energy_kwh / comparison.conventional.energy_consumption) * 100)}
                />
                <SavingsCard
                  label="Virgin Material"
                  value={comparison.savings.virgin_material_kg}
                  unit="kg"
                  percent={Math.round(comparison.circular.recycled_input)}
                />
                <SavingsCard
                  label="Waste Avoided"
                  value={comparison.savings.waste_kg}
                  unit="kg"
                  percent={Math.round((comparison.savings.waste_kg / comparison.conventional.waste_generated) * 100)}
                />
                <SavingsCard
                  label="Lifespan Increase"
                  value={comparison.circular.lifespan_years - comparison.conventional.lifespan_years}
                  unit="years"
                  percent={Math.round(((comparison.circular.lifespan_years - comparison.conventional.lifespan_years) / comparison.conventional.lifespan_years) * 100)}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Helper Components
function MetricCard({ label, value, unit, icon, color, improved }: {
  label: string
  value: number
  unit: string
  icon: React.ReactNode
  color: 'red' | 'green'
  improved?: boolean
}) {
  return (
    <div className={`p-3 rounded-lg ${color === 'green' ? 'bg-green-50' : 'bg-red-50'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs ${color === 'green' ? 'text-green-600' : 'text-red-600'}`}>{label}</span>
        {icon}
      </div>
      <p className={`text-xl font-bold ${color === 'green' ? 'text-green-700' : 'text-red-700'}`}>
        {value}{unit && ` ${unit}`}
      </p>
      {improved && (
        <span className="text-xs text-green-600 flex items-center gap-1">
          <TrendingUp className="w-3 h-3" /> Improved
        </span>
      )}
    </div>
  )
}

function SavingsCard({ label, value, unit, percent }: {
  label: string
  value: number
  unit: string
  percent: number
}) {
  return (
    <div className="bg-white/20 rounded-lg p-3 text-center">
      <p className="text-green-50 text-xs mb-1">{label}</p>
      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
      <p className="text-green-50 text-xs">{unit}</p>
      <p className="text-white text-sm font-bold mt-1">↓ {percent}%</p>
    </div>
  )
}

function ComparisonRow({ label, conventional, circular, higherIsBetter = false }: {
  label: string
  conventional: number
  circular: number
  higherIsBetter?: boolean
}) {
  const diff = higherIsBetter ? circular - conventional : conventional - circular
  const percentChange = conventional !== 0 ? Math.round((diff / conventional) * 100) : 0
  const isImproved = diff > 0

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-3 px-4 text-gray-700">{label}</td>
      <td className="py-3 px-4 text-center text-red-600 font-medium">{conventional.toLocaleString()}</td>
      <td className="py-3 px-4 text-center text-green-600 font-medium">{circular.toLocaleString()}</td>
      <td className="py-3 px-4 text-center">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${isImproved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
          {isImproved ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(percentChange)}%
        </span>
      </td>
    </tr>
  )
}

function LifecycleStep({ step, title, description, impact, color }: {
  step: number
  title: string
  description: string
  impact: string
  color: 'red' | 'orange' | 'green'
}) {
  const bgColor = color === 'green' ? 'bg-green-100' : color === 'orange' ? 'bg-orange-100' : 'bg-red-100'
  const textColor = color === 'green' ? 'text-green-700' : color === 'orange' ? 'text-orange-700' : 'text-red-700'
  const borderColor = color === 'green' ? 'border-green-300' : color === 'orange' ? 'border-orange-300' : 'border-red-300'

  return (
    <div className={`p-4 rounded-lg border-2 ${bgColor} ${borderColor}`}>
      <div className="flex items-center gap-3 mb-2">
        <span className={`w-7 h-7 rounded-full ${textColor} bg-white flex items-center justify-center text-sm font-bold`}>
          {step}
        </span>
        <h4 className={`font-semibold ${textColor}`}>{title}</h4>
      </div>
      <p className="text-sm text-gray-600 mb-1">{description}</p>
      <p className={`text-xs font-medium ${textColor}`}>{impact}</p>
    </div>
  )
}
