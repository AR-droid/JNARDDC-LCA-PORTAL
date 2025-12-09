import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { projectsApi, Project, MCIResult } from '../api/projects'
import { materialsApi, Material } from '../api/materials'
import { ChartIcon, AnalyticsIcon, AIIcon, FlaskIcon } from '../components/Icons'
import { FileSpreadsheet, Lock, BarChart3, Recycle, Target, Wrench, Truck, Microscope, Building2, RotateCcw } from 'lucide-react'
import { IndustryMode, shouldHideParameter } from '../utils/industryModeUtils'

import { useAuthStore } from '../stores/authStore'

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [project, setProject] = useState<Project | null>(null)
  const [materials, setMaterials] = useState<Material[]>([])
  const [mciResult, setMciResult] = useState<MCIResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCalculatingMCI, setIsCalculatingMCI] = useState(false)
  const [industryMode, setIndustryMode] = useState<IndustryMode>('manufacturing')

  const hasVerificationAccess = user?.tier === 'enterprise'
  const hasCBAMAccess = user?.tier === 'pro' || user?.tier === 'enterprise'

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
      // Auto-detect industry mode
      if (materialsData.length > 0) {
        try {
          const result = await projectsApi.detectIndustryMode(id)
          setIndustryMode(result.industry_mode)
        } catch (error) {
          console.error('Error auto-detecting industry mode:', error)
          if (projectData.industry_mode) {
            setIndustryMode(projectData.industry_mode)
          }
        }
      } else {
        // When no materials, detect from project name/description
        const projectText = `${projectData.name || ''} ${projectData.description || ''}`.toLowerCase()
        const miningKeywords = ['ore', 'mining', 'mine', 'bauxite', 'extraction', 'mineral', 'quarry', 'pit', 'laterite', 'tailings', 'overburden', 'alumina']
        const hasMiningKeyword = miningKeywords.some(keyword => projectText.includes(keyword))

        if (hasMiningKeyword) {
          setIndustryMode('mining')
        } else if (projectData.industry_mode) {
          setIndustryMode(projectData.industry_mode)
        }
      }

      // Calculate MCI if materials exist
      if (materialsData.length > 0) {
        setIsCalculatingMCI(true)
        try {
          const mci = await projectsApi.calculateMCI(id)
          setMciResult(mci)
        } catch (err) {
          console.error('Error calculating MCI:', err)
        } finally {
          setIsCalculatingMCI(false)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Industry mode is now auto-detected, no manual toggle needed

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analysis...</p>
        </div>
      </div>
    )
  }

  if (!project || materials.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <BarChart3 className="w-16 h-16 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Data Available</h2>
          <p className="text-gray-600 mb-4">Add materials to your project to see analysis</p>
          <button
            onClick={() => navigate(`/projects/${id}`)}
            className="text-blue-600 hover:text-blue-700"
          >
            ← Back to Project
          </button>
        </div>
      </div>
    )
  }

  // Calculate metrics
  const totalGWP = materials.reduce((sum, m) => sum + m.gwp, 0)
  const totalMass = materials.reduce((sum, m) => sum + m.quantity, 0)
  const avgRecycledContent = materials.reduce((sum, m) => sum + m.recycled_content, 0) / materials.length

  // GWP breakdown by material
  const gwpByMaterial = materials.map(m => ({
    name: m.material_name,
    gwp: m.gwp,
    percentage: (m.gwp / totalGWP) * 100
  })).sort((a, b) => b.gwp - a.gwp)

  // Material composition by mass
  const materialComposition = materials.map(m => ({
    name: m.material_name,
    mass: m.quantity,
    percentage: (m.quantity / totalMass) * 100
  })).sort((a, b) => b.mass - a.mass)

  // Recycled vs Virgin content
  const totalRecycledMass = materials.reduce((sum, m) => sum + (m.quantity * m.recycled_content / 100), 0)
  const totalVirginMass = totalMass - totalRecycledMass
  const recycledPercentage = (totalRecycledMass / totalMass) * 100
  const virginPercentage = 100 - recycledPercentage

  // Material type breakdown
  const materialTypes = materials.reduce((acc, m) => {
    const type = m.material_type
    if (!acc[type]) {
      acc[type] = { count: 0, gwp: 0, mass: 0 }
    }
    acc[type].count++
    acc[type].gwp += m.gwp
    acc[type].mass += m.quantity
    return acc
  }, {} as Record<string, { count: number; gwp: number; mass: number }>)

  // Recommendations
  const recommendations = []

  if (avgRecycledContent < 30) {
    recommendations.push({
      icon: 'recycle',
      title: 'Increase Recycled Content',
      description: `Current average recycled content is ${avgRecycledContent.toFixed(1)}%. Aim for at least 30% to significantly reduce GWP.`,
      impact: 'high'
    })
  }

  const highImpactMaterials = gwpByMaterial.filter(m => m.percentage > 20)
  if (highImpactMaterials.length > 0) {
    recommendations.push({
      icon: 'target',
      title: 'Focus on High-Impact Materials',
      description: `${highImpactMaterials[0].name} contributes ${highImpactMaterials[0].percentage.toFixed(1)}% of total GWP. Consider using recycled alternatives or material substitution.`,
      impact: 'high'
    })
  }

  if (!project.is_designed_for_disassembly) {
    recommendations.push({
      icon: 'wrench',
      title: 'Design for Disassembly',
      description: 'Enable easy disassembly to improve end-of-life recyclability and material recovery.',
      impact: 'medium'
    })
  }

  if (materials.some(m => m.transport_distance > 500)) {
    recommendations.push({
      icon: 'truck',
      title: 'Optimize Transport Distance',
      description: 'Some materials are transported over 500 km. Consider local sourcing to reduce transport emissions.',
      impact: 'medium'
    })
  }

  const maxBarValue = Math.max(...gwpByMaterial.map(m => m.gwp))

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
              className="px-4 py-2 text-sm font-medium bg-green-50 text-green-700 rounded-md transition-colors flex items-center gap-2"
            >
              <AnalyticsIcon size={16} /> Analysis
            </button>
            <button
              onClick={() => navigate(`/projects/${id}/lifecycle`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors flex items-center gap-2"
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

        {/* Industry Mode Indicator (Read-only, auto-detected) */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{project.name}</h2>
              <p className="text-sm text-gray-600">Project Analysis</p>
            </div>
            <span
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${industryMode === 'mining'
                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                : 'bg-blue-100 text-blue-800 border border-blue-200'
                }`}
              title={industryMode === 'mining' ? 'Mining mode - auto-detected from materials' : 'Manufacturing mode - auto-detected from materials'}
            >
              {industryMode === 'mining' ? '⛏️ Mining Mode' : '🏭 Manufacturing Mode'}
            </span>
          </div>
        </div>

        {/* MCI and Circular Design Score - Only for Manufacturing mode */}
        {!shouldHideParameter('mci_score', industryMode) && mciResult && (
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg shadow p-6 mb-6 text-white">
            <h2 className="text-xl font-bold mb-4">Circularity Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white/20 rounded-lg p-4">
                <p className="text-sm text-emerald-100 mb-1">MCI Score</p>
                <p className="text-4xl font-bold">{mciResult.mci_score}</p>
                <p className="text-xs text-emerald-100">vs {mciResult.benchmark.avg_mci} industry avg</p>
              </div>
              <div className="bg-white/20 rounded-lg p-4">
                <p className="text-sm text-emerald-100 mb-1">Circular Design Score</p>
                <p className="text-4xl font-bold">{mciResult.circular_design_score}</p>
                <p className="text-xs text-emerald-100">out of 100</p>
              </div>
              <div className="bg-white/20 rounded-lg p-4">
                <p className="text-sm text-emerald-100 mb-1">Recycled Output (Est.)</p>
                <p className="text-4xl font-bold">{mciResult.recycled_content_output}%</p>
                <p className="text-xs text-emerald-100">end-of-life recovery</p>
              </div>
              <div className="bg-white/20 rounded-lg p-4">
                <p className="text-sm text-emerald-100 mb-1">Lifespan vs Avg</p>
                <p className="text-4xl font-bold">{mciResult.target_lifespan}y</p>
                <p className="text-xs text-emerald-100">vs {mciResult.industry_avg_lifespan}y industry</p>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => navigate(`/projects/${id}/scenario`)}
                className="px-4 py-2 bg-white text-emerald-700 rounded-lg hover:bg-emerald-50 font-medium flex items-center gap-2"
              >
                <Microscope className="w-4 h-4" /> Run What-if Scenarios
              </button>
            </div>
          </div>
        )}

        {/* Mining Metrics - Only for Mining mode */}
        {shouldHideParameter('mci_score', industryMode) && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg shadow p-6 mb-6 text-white">
            <h2 className="text-xl font-bold mb-4">⛏️ Mining Impact Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white/20 rounded-lg p-4">
                <p className="text-sm text-amber-100 mb-1">Scarcity Score (Avg)</p>
                <p className="text-4xl font-bold">
                  {materials.length > 0
                    ? Math.round(materials.reduce((sum, m) => sum + ((m as any).scarcity_score || 30), 0) / materials.length)
                    : 'N/A'}
                </p>
                <p className="text-xs text-amber-100">Resource Depletion Risk</p>
              </div>
              <div className="bg-white/20 rounded-lg p-4">
                <p className="text-sm text-amber-100 mb-1">Total GWP</p>
                <p className="text-4xl font-bold">{totalGWP.toFixed(1)}</p>
                <p className="text-xs text-amber-100">kg CO₂-eq</p>
              </div>
              <div className="bg-white/20 rounded-lg p-4">
                <p className="text-sm text-amber-100 mb-1">Materials Count</p>
                <p className="text-4xl font-bold">{materials.length}</p>
                <p className="text-xs text-amber-100">inputs tracked</p>
              </div>
              <div className="bg-white/20 rounded-lg p-4">
                <p className="text-sm text-amber-100 mb-1">Total Mass</p>
                <p className="text-4xl font-bold">{totalMass.toFixed(0)}</p>
                <p className="text-xs text-amber-100">kg processed</p>
              </div>
            </div>
          </div>
        )}

        {isCalculatingMCI && (
          <div className="bg-emerald-50 rounded-lg p-6 mb-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-2 text-emerald-700">Calculating circularity metrics...</p>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Total GWP</p>
            <p className="text-3xl font-bold text-blue-600">{totalGWP.toFixed(2)}</p>
            <p className="text-xs text-gray-500">kg CO₂-eq</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Total Mass</p>
            <p className="text-3xl font-bold text-green-600">{totalMass.toFixed(2)}</p>
            <p className="text-xs text-gray-500">kg</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Avg Recycled Content</p>
            <p className="text-3xl font-bold text-purple-600">{avgRecycledContent.toFixed(1)}%</p>
            <p className="text-xs text-gray-500">by material count</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Materials</p>
            <p className="text-3xl font-bold text-orange-600">{materials.length}</p>
            <p className="text-xs text-gray-500">total items</p>
          </div>
        </div>

        {/* GWP Breakdown */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">GWP Breakdown by Material</h2>
          <div className="space-y-3">
            {gwpByMaterial.map((item, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{item.name}</span>
                  <span className="text-gray-600">{item.gwp.toFixed(2)} kg CO₂-eq ({item.percentage.toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-6">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-6 rounded-full flex items-center justify-end px-2"
                    style={{ width: `${(item.gwp / maxBarValue) * 100}%` }}
                  >
                    <span className="text-white text-xs font-medium">{item.percentage.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Material Composition */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Material Composition by Mass</h2>
          <div className="space-y-3">
            {materialComposition.map((item, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{item.name}</span>
                  <span className="text-gray-600">{item.mass.toFixed(2)} kg ({item.percentage.toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-6">
                  <div
                    className="bg-gradient-to-r from-green-500 to-green-600 h-6 rounded-full flex items-center justify-end px-2"
                    style={{ width: `${item.percentage}%` }}
                  >
                    <span className="text-white text-xs font-medium">{item.percentage.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recycled vs Virgin Content - Only for Manufacturing mode */}
        {!shouldHideParameter('recycled_content', industryMode) && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recycled vs Virgin Content</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">Recycled Content</span>
                  <span className="text-gray-600">{totalRecycledMass.toFixed(2)} kg ({recycledPercentage.toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-8 rounded-full flex items-center justify-center"
                    style={{ width: `${recycledPercentage}%` }}
                  >
                    <span className="text-white text-sm font-bold">{recycledPercentage.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">Virgin Content</span>
                  <span className="text-gray-600">{totalVirginMass.toFixed(2)} kg ({virginPercentage.toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8">
                  <div
                    className="bg-gradient-to-r from-red-500 to-red-600 h-8 rounded-full flex items-center justify-center"
                    style={{ width: `${virginPercentage}%` }}
                  >
                    <span className="text-white text-sm font-bold">{virginPercentage.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Material Types Summary */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Summary by Material Type</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4 font-semibold text-gray-700">Material Type</th>
                  <th className="text-right py-2 px-4 font-semibold text-gray-700">Count</th>
                  <th className="text-right py-2 px-4 font-semibold text-gray-700">Total Mass (kg)</th>
                  <th className="text-right py-2 px-4 font-semibold text-gray-700">Total GWP (kg CO₂-eq)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(materialTypes).map(([type, data]) => (
                  <tr key={type} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4 font-medium">{type}</td>
                    <td className="py-2 px-4 text-right">{data.count}</td>
                    <td className="py-2 px-4 text-right">{data.mass.toFixed(2)}</td>
                    <td className="py-2 px-4 text-right font-semibold text-blue-600">{data.gwp.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recommendations for Improvement</h2>
            <div className="space-y-4">
              {recommendations.map((rec, index) => {
                const IconComponent =
                  rec.icon === 'recycle' ? Recycle :
                    rec.icon === 'target' ? Target :
                      rec.icon === 'wrench' ? Wrench :
                        rec.icon === 'truck' ? Truck : Recycle;

                return (
                  <div
                    key={index}
                    className={`border-l-4 p-4 rounded ${rec.impact === 'high'
                      ? 'border-red-500 bg-red-50'
                      : 'border-yellow-500 bg-yellow-50'
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <IconComponent className="w-6 h-6 text-gray-600 mt-1" />
                      <div>
                        <h3 className="font-bold text-gray-900 mb-1">{rec.title}</h3>
                        <p className="text-gray-700 text-sm">{rec.description}</p>
                        <span className={`inline-block mt-2 text-xs font-semibold px-2 py-1 rounded ${rec.impact === 'high'
                          ? 'bg-red-200 text-red-800'
                          : 'bg-yellow-200 text-yellow-800'
                          }`}>
                          {rec.impact.toUpperCase()} IMPACT
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
