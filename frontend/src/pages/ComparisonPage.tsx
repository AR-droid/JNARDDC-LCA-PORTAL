import { useState, useEffect } from 'react'
import { projectsApi } from '../api/projects'
import { materialsApi } from '../api/materials'
import { BarChart3, Lightbulb } from 'lucide-react'

export default function ComparisonPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [comparisonData, setComparisonData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isComparing, setIsComparing] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProjects.length > 0) {
      loadComparisonData()
    } else {
      setComparisonData([])
    }
  }, [selectedProjects])

  const loadProjects = async () => {
    try {
      const data = await projectsApi.list()
      const calculated = data.filter((p: any) => p.status === 'calculated' || p.gwp_total > 0)
      setProjects(calculated)
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadComparisonData = async () => {
    setIsComparing(true)
    try {
      const data = await Promise.all(
        selectedProjects.map(async (id) => {
          const project = projects.find((p) => p.id === id)
          if (!project) return null
          const materials = await materialsApi.list(id)
          return {
            project,
            materials,
            totalGwp: materials.reduce((sum, m) => sum + (m.gwp || 0), 0),
            avgRecycledContent: materials.length > 0 
              ? materials.reduce((sum, m) => sum + (m.recycled_content || 0), 0) / materials.length 
              : 0,
          }
        })
      )
      // Filter out null entries (projects that weren't found)
      setComparisonData(data.filter(d => d !== null))
    } catch (error) {
      console.error('Error loading comparison data:', error)
    } finally {
      setIsComparing(false)
    }
  }

  const toggleProject = (id: string) => {
    if (selectedProjects.includes(id)) {
      setSelectedProjects(selectedProjects.filter((p) => p !== id))
    } else if (selectedProjects.length < 4) {
      setSelectedProjects([...selectedProjects, id])
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Project Comparison</h1>
          <p className="text-gray-600">Compare environmental impact across your projects</p>
        </div>

        {projects.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="flex justify-center mb-4">
              <BarChart3 className="w-16 h-16 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Calculated Projects</h3>
            <p className="text-gray-600">Add materials to your projects to see comparison data</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Select Projects to Compare (max 4)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => toggleProject(project.id)}
                    className={`p-4 rounded-lg border-2 text-left transition ${
                      selectedProjects.includes(project.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <h3 className="font-semibold text-gray-900 mb-1">{project.name}</h3>
                    <p className="text-sm text-gray-600">{project.gwp_total?.toFixed(1) || 0} kg CO₂-eq</p>
                  </button>
                ))}
              </div>
            </div>

            {selectedProjects.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-6">Comparison Results</h2>
                
                {isComparing ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading comparison data...</p>
                  </div>
                ) : comparisonData.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No data available for selected projects</p>
                  </div>
                ) : (
                  <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-3">Total GWP Comparison</h3>
                    <div className="space-y-3">
                      {comparisonData.map((item) => {
                        const maxGwp = Math.max(...comparisonData.map((d) => d.totalGwp))
                        const percentage = maxGwp > 0 ? (item.totalGwp / maxGwp) * 100 : 0
                        
                        return (
                          <div key={item.project.id}>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium">{item.project.name}</span>
                              <span className="text-sm text-gray-600">{item.totalGwp.toFixed(2)} kg CO₂-eq</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className="bg-blue-600 h-3 rounded-full"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-700 mb-3">Avg Recycled Content</h3>
                    <div className="space-y-3">
                      {comparisonData.map((item) => (
                        <div key={item.project.id}>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">{item.project.name}</span>
                            <span className="text-sm text-gray-600">{item.avgRecycledContent.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className="bg-green-600 h-3 rounded-full"
                              style={{ width: `${item.avgRecycledContent}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Project</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Materials</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Total GWP</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Avg Recycled %</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonData.map((item) => (
                        <tr key={item.project.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{item.project.name}</td>
                          <td className="py-3 px-4 text-right">{item.materials.length}</td>
                          <td className="py-3 px-4 text-right font-semibold text-blue-600">
                            {item.totalGwp.toFixed(2)} kg CO₂-eq
                          </td>
                          <td className="py-3 px-4 text-right text-green-600 font-semibold">
                            {item.avgRecycledContent.toFixed(1)}%
                          </td>
                          <td className="py-3 px-4 text-right text-gray-600">
                            {item.project.product_category || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" /> Insights
                  </h4>
                  {comparisonData.length > 0 ? (
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>
                        • Best Performer: {comparisonData.reduce((min, item) => 
                          item.totalGwp < min.totalGwp ? item : min
                        ).project.name} (lowest carbon footprint)
                      </li>
                      <li>
                        • Most Circular: {comparisonData.reduce((max, item) => 
                          item.avgRecycledContent > max.avgRecycledContent ? item : max
                        ).project.name} (highest recycled content)
                      </li>
                      <li>
                        • Average GWP: {(comparisonData.reduce((sum, item) => sum + item.totalGwp, 0) / comparisonData.length).toFixed(2)} kg CO₂-eq
                      </li>
                    </ul>
                  ) : (
                    <p className="text-sm text-blue-800">Select projects to see insights</p>
                  )}
                </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
