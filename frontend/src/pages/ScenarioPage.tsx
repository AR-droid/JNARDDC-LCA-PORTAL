import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { projectsApi, Project, MCIResult, ScenarioResult } from '../api/projects'
import { materialsApi, Material } from '../api/materials'

export default function ScenarioPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [project, setProject] = useState<Project | null>(null)
  const [materials, setMaterials] = useState<Material[]>([])
  const [mciResult, setMciResult] = useState<MCIResult | null>(null)
  const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCalculating, setIsCalculating] = useState(false)
  
  // Scenario modifiers
  const [recycledModifier, setRecycledModifier] = useState(0)
  const [lifespanModifier, setLifespanModifier] = useState(0)
  const [transportReduction, setTransportReduction] = useState(0)
  const [designForDisassembly, setDesignForDisassembly] = useState<boolean | null>(null)

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
      setDesignForDisassembly(projectData.is_designed_for_disassembly)
      
      // Calculate initial MCI
      if (materialsData.length > 0) {
        const mci = await projectsApi.calculateMCI(id)
        setMciResult(mci)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateScenario = async () => {
    if (!id) return
    
    try {
      setIsCalculating(true)
      const result = await projectsApi.calculateScenario(id, {
        recycled_content_modifier: recycledModifier,
        lifespan_modifier: lifespanModifier,
        transport_reduction: transportReduction,
        design_for_disassembly: designForDisassembly !== null ? designForDisassembly : undefined
      })
      setScenarioResult(result)
    } catch (error) {
      console.error('Error calculating scenario:', error)
      alert('Failed to calculate scenario')
    } finally {
      setIsCalculating(false)
    }
  }

  const resetModifiers = () => {
    setRecycledModifier(0)
    setLifespanModifier(0)
    setTransportReduction(0)
    setDesignForDisassembly(project?.is_designed_for_disassembly || false)
    setScenarioResult(null)
  }

  // Calculate current averages from materials
  const avgRecycledContent = materials.length > 0 
    ? Math.round(materials.reduce((sum, m) => sum + (m.recycled_content || 0), 0) / materials.length)
    : 0
  const avgTransportDistance = materials.length > 0
    ? Math.round(materials.reduce((sum, m) => sum + (m.transport_distance || 0), 0) / materials.length)
    : 0
  const currentLifespan = project?.target_lifespan || 0

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading scenario tool...</p>
        </div>
      </div>
    )
  }

  if (!project || materials.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔬</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Data Available</h2>
          <p className="text-gray-600 mb-4">Add materials to your project to use scenario analysis</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => navigate(`/projects/${id}`)}
          className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
        >
          ← Back to Project
        </button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Scenario Comparison</h1>
          <p className="text-gray-600">{project.name} - What-if Analysis</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scenario Controls */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Adjust Parameters</h2>
            <p className="text-sm text-gray-600 mb-6">
              Modify the parameters below to see how changes would affect your project's environmental impact.
            </p>

            <div className="space-y-6">
              {/* Current Values Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-2">
                <h3 className="text-sm font-semibold text-blue-800 mb-2">📊 Current Product Values</h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-blue-600">Avg Recycled Content</p>
                    <p className="text-lg font-bold text-blue-900">{avgRecycledContent}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600">Target Lifespan</p>
                    <p className="text-lg font-bold text-blue-900">{currentLifespan} yrs</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600">Avg Transport Distance</p>
                    <p className="text-lg font-bold text-blue-900">{avgTransportDistance} km</p>
                  </div>
                </div>
              </div>

              {/* Recycled Content Modifier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recycled Content Change: <span className="text-blue-600 font-bold">{recycledModifier > 0 ? '+' : ''}{recycledModifier}%</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Current: {avgRecycledContent}% → Simulated: <span className="font-semibold text-blue-600">{Math.min(100, Math.max(0, avgRecycledContent + recycledModifier))}%</span>
                </p>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={recycledModifier}
                  onChange={(e) => setRecycledModifier(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>-50% less</span>
                  <span>No change</span>
                  <span>+50% more</span>
                </div>
              </div>

              {/* Lifespan Modifier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lifespan Change: <span className="text-blue-600 font-bold">{lifespanModifier > 0 ? '+' : ''}{lifespanModifier} years</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Current: {currentLifespan} yrs → Simulated: <span className="font-semibold text-blue-600">{Math.max(1, currentLifespan + lifespanModifier)} yrs</span>
                </p>
                <input
                  type="range"
                  min="-10"
                  max="20"
                  value={lifespanModifier}
                  onChange={(e) => setLifespanModifier(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>-10 years</span>
                  <span>No change</span>
                  <span>+20 years</span>
                </div>
              </div>

              {/* Transport Reduction */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transport Distance Reduction: <span className="text-blue-600 font-bold">{transportReduction}%</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Current: {avgTransportDistance} km → Simulated: <span className="font-semibold text-blue-600">{Math.round(avgTransportDistance * (1 - transportReduction / 100))} km</span>
                </p>
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={transportReduction}
                  onChange={(e) => setTransportReduction(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>No change</span>
                  <span>Local sourcing (-80%)</span>
                </div>
              </div>

              {/* Design for Disassembly */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={designForDisassembly || false}
                    onChange={(e) => setDesignForDisassembly(e.target.checked)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Design for Disassembly
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-8">
                  Enabling this improves end-of-life recyclability by ~20%
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={calculateScenario}
                  disabled={isCalculating}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isCalculating ? 'Calculating...' : 'Calculate Scenario'}
                </button>
                <button
                  onClick={resetModifiers}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Results Comparison */}
          <div className="space-y-6">
            {/* Current State */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
                Current State
              </h3>
              {mciResult ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-500">Total GWP</p>
                    <p className="text-xl font-bold text-gray-900">{project.gwp_total?.toFixed(2) || 0}</p>
                    <p className="text-xs text-gray-500">kg CO₂-eq</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-500">MCI Score</p>
                    <p className="text-xl font-bold text-gray-900">{mciResult.mci_score}</p>
                    <p className="text-xs text-gray-500">vs {mciResult.benchmark.avg_mci} avg</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-500">Circular Design Score</p>
                    <p className="text-xl font-bold text-gray-900">{mciResult.circular_design_score}</p>
                    <p className="text-xs text-gray-500">out of 100</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-500">Avg Recycled Content</p>
                    <p className="text-xl font-bold text-gray-900">{mciResult.avg_recycled_content}%</p>
                    <p className="text-xs text-gray-500">by mass</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Calculating...</p>
              )}
            </div>

            {/* Scenario Result */}
            {scenarioResult && (
              <div className="bg-white rounded-lg shadow p-6 border-2 border-green-500">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  Scenario Result
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 p-3 rounded">
                    <p className="text-xs text-green-600">Total GWP</p>
                    <p className="text-xl font-bold text-green-700">{scenarioResult.scenario.gwp_total}</p>
                    <p className="text-xs text-green-600">kg CO₂-eq</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <p className="text-xs text-green-600">MCI Score</p>
                    <p className="text-xl font-bold text-green-700">{scenarioResult.scenario.mci_score}</p>
                    <p className="text-xs text-green-600">improved</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <p className="text-xs text-green-600">Circular Design Score</p>
                    <p className="text-xl font-bold text-green-700">{scenarioResult.scenario.circular_design_score}</p>
                    <p className="text-xs text-green-600">out of 100</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <p className="text-xs text-green-600">Avg Recycled Content</p>
                    <p className="text-xl font-bold text-green-700">{scenarioResult.scenario.avg_recycled_content}%</p>
                    <p className="text-xs text-green-600">by mass</p>
                  </div>
                </div>

                {/* Improvement Summary */}
                <div className="mt-4 p-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg">
                  <h4 className="font-bold text-green-800 mb-2">💡 Impact Summary</h4>
                  <div className="space-y-1 text-sm text-green-700">
                    <p>
                      <strong>GWP Reduction:</strong> {scenarioResult.improvements.gwp_reduction_kg} kg CO₂-eq 
                      ({scenarioResult.improvements.gwp_reduction_percent}% improvement)
                    </p>
                    <p>
                      <strong>New Lifespan:</strong> {scenarioResult.scenario.lifespan} years 
                      (was {scenarioResult.original.lifespan})
                    </p>
                    <p>
                      <strong>Design for Disassembly:</strong> {scenarioResult.scenario.is_designed_for_disassembly ? 'Enabled ✓' : 'Disabled'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!scenarioResult && (
              <div className="bg-gray-100 rounded-lg p-6 text-center">
                <div className="text-4xl mb-3">🔬</div>
                <p className="text-gray-600">
                  Adjust the parameters on the left and click "Calculate Scenario" to see the projected impact.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recommendations */}
        {mciResult && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Improvements</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border-l-4 border-blue-500 p-4 bg-blue-50 rounded">
                <h4 className="font-bold text-blue-800 mb-1">Increase Recycled Content</h4>
                <p className="text-sm text-blue-700">
                  Moving from {mciResult.avg_recycled_content}% to {Math.min(100, mciResult.avg_recycled_content + 20)}% 
                  recycled content could reduce GWP by up to 40%.
                </p>
              </div>
              <div className="border-l-4 border-green-500 p-4 bg-green-50 rounded">
                <h4 className="font-bold text-green-800 mb-1">Extend Product Life</h4>
                <p className="text-sm text-green-700">
                  Designing for a {mciResult.target_lifespan + 5}-year lifespan instead of {mciResult.target_lifespan} years 
                  improves your MCI score significantly.
                </p>
              </div>
              <div className="border-l-4 border-purple-500 p-4 bg-purple-50 rounded">
                <h4 className="font-bold text-purple-800 mb-1">Local Sourcing</h4>
                <p className="text-sm text-purple-700">
                  Reducing transport distances by 50% can cut transport emissions in half 
                  and improve supply chain resilience.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
