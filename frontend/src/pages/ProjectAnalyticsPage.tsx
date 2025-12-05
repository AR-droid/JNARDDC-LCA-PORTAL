import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getProjectAnalytics, ProjectAnalytics, projectsApi } from '../api/projects'
import {
  GWPBreakdownChart,
  MaterialComparisonChart,
  LifecycleChart,
  MCIGauge,
  MCIBreakdownChart,
  ProcessFlowDiagram,
  ProcessTree,
  RecycledContentChart
} from '../components/charts'
import { AIIcon, FlaskIcon, ArrowLeftIcon } from '../components/Icons'

export default function AnalyticsPage() {
  const { id } = useParams<{ id: string }>()
  const [analytics, setAnalytics] = useState<ProjectAnalytics | null>(null)
  const [projectName, setProjectName] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      loadAnalytics()
    }
  }, [id])

  const loadAnalytics = async () => {
    if (!id) return
    
    try {
      setIsLoading(true)
      setError(null)
      
      const [analyticsData, project] = await Promise.all([
        getProjectAnalytics(id),
        projectsApi.getById(id)
      ])
      
      setAnalytics(analyticsData)
      setProjectName(project.name)
    } catch (err: any) {
      console.error('Error loading analytics:', err)
      setError(err.response?.data?.detail || 'Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Analytics</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link to={`/projects/${id}`} className="text-blue-600 hover:text-blue-700">
            ← Back to Project
          </Link>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No analytics data available</p>
          <Link to={`/projects/${id}`} className="text-blue-600 hover:text-blue-700">
            ← Back to Project
          </Link>
        </div>
      </div>
    )
  }

  const { summary, gwp_by_material, gwp_by_type, recycled_analysis, mci_breakdown, lifecycle_stages, process_flow } = analytics

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
            <Link to="/projects" className="hover:text-blue-600">Projects</Link>
            <span>/</span>
            <Link to={`/projects/${id}`} className="hover:text-blue-600">{projectName}</Link>
            <span>/</span>
            <span className="text-gray-700">Analytics</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Project Analytics</h1>
          <p className="text-sm text-gray-500">Comprehensive environmental impact analysis</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-white rounded-md shadow-sm p-3">
            <p className="text-xs text-gray-500">Total GWP</p>
            <p className="text-lg font-semibold text-green-600">{summary.total_gwp.toFixed(1)}</p>
            <p className="text-2xs text-gray-400">kg CO₂-eq</p>
            <p className="text-2xs text-gray-300 italic">IPCC AR6</p>
          </div>
          <div className="bg-white rounded-md shadow-sm p-3">
            <p className="text-xs text-gray-500">Total Mass</p>
            <p className="text-lg font-semibold text-blue-600">{summary.total_mass.toFixed(1)}</p>
            <p className="text-2xs text-gray-400">kg</p>
          </div>
          <div className="bg-white rounded-md shadow-sm p-3">
            <p className="text-xs text-gray-500">Materials</p>
            <p className="text-lg font-semibold text-purple-600">{summary.material_count}</p>
            <p className="text-2xs text-gray-400">items</p>
          </div>
          <div className="bg-white rounded-md shadow-sm p-3">
            <p className="text-xs text-gray-500">Avg Recycled</p>
            <p className="text-lg font-semibold text-cyan-600">{summary.avg_recycled_content.toFixed(1)}%</p>
            <p className="text-2xs text-gray-400">content</p>
          </div>
          <div className="bg-white rounded-md shadow-sm p-3">
            <p className="text-xs text-gray-500">MCI Score</p>
            <p className="text-lg font-semibold text-orange-600">{(summary.mci_score * 100).toFixed(0)}%</p>
            <p className="text-2xs text-gray-400">circularity</p>
          </div>
          <div className="bg-white rounded-md shadow-sm p-3">
            <p className="text-xs text-gray-500">Circular Score</p>
            <p className="text-lg font-semibold text-pink-600">{summary.circular_design_score.toFixed(0)}</p>
            <p className="text-2xs text-gray-400">/ 100</p>
          </div>
        </div>

        {/* MCI Gauges */}
        <div className="bg-white rounded-md shadow-sm p-5 mb-6">
          <h2 className="text-base font-semibold mb-4">Circularity Indicators</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center">
              <MCIGauge score={summary.mci_score} size="md" label="Material Circularity Index" />
              <p className="text-xs text-gray-500 mt-3 text-center">
                Based on recycled input and end-of-life recyclability
              </p>
            </div>
            <div className="flex flex-col items-center">
              <MCIGauge score={summary.circular_design_score / 100} size="md" label="Circular Design Score" />
              <p className="text-xs text-gray-500 mt-3 text-center">
                Includes design for disassembly and lifespan factors
              </p>
            </div>
            <div className="flex flex-col items-center">
              <MCIGauge score={summary.avg_recycled_content / 100} size="md" label="Recycled Content" />
              <p className="text-xs text-gray-500 mt-3 text-center">
                Average recycled input across all materials
              </p>
            </div>
          </div>
        </div>
        
{/* Process Tree */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-base font-semibold mb-4">Manufacturing Process Tree</h3>
            <ProcessTree />
          </div>
        </div>


        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <GWPBreakdownChart data={gwp_by_type} title="GWP by Material Type" />
          <MaterialComparisonChart data={gwp_by_material} title="Carbon Footprint by Material" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <LifecycleChart data={lifecycle_stages} title="GWP by Lifecycle Stage" />
          <RecycledContentChart data={recycled_analysis} title="Recycled Content Analysis" />
        </div>

        {/* MCI Breakdown */}
        <div className="mb-6">
          <MCIBreakdownChart 
            data={mci_breakdown} 
            overallMCI={summary.mci_score} 
            title="MCI Score by Material" 
          />
        </div>

        

        {/* Process Flow */}
        <div className="mb-6">
          <ProcessFlowDiagram 
            nodes={process_flow.nodes} 
            links={process_flow.links}
            title="Material Flow Through Lifecycle"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-3 mt-6">
          <Link
            to={`/projects/${id}`}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition flex items-center gap-1.5"
          >
            <ArrowLeftIcon size={14} /> Back to Project
          </Link>
          <Link
            to={`/projects/${id}/recommendations`}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition flex items-center gap-1.5"
          >
            <AIIcon size={14} /> AI Recommendations
          </Link>
          <Link
            to={`/projects/${id}/scenario`}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition flex items-center gap-1.5"
          >
            <FlaskIcon size={14} /> What-If Scenarios
          </Link>
        </div>
      </div>
    </div>
  )
}
