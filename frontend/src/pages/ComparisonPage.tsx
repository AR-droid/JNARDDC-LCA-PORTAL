import { useState, useEffect } from 'react'
import { projectsApi } from '../api/projects'
import { materialsApi } from '../api/materials'
import ComparisonLineChart from '../components/charts/ComparisionLineChart'


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
            <div className="text-6xl mb-4">📊</div>
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

  {/* LEFT SIDE: 2 CARDS */}
  <div className="space-y-6">

    {/* ⚡ GWP COMPARISON CARD */}
    <div className="bg-white rounded-xl shadow p-5 border border-gray-200">
      <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
        <span className="text-blue-600 text-xl">⚡</span>
        Total GWP Comparison
      </h3>

      <div className="space-y-5">
        {comparisonData.map((item) => {
          const max = Math.max(...comparisonData.map((d) => d.totalGwp));
          const perc = (item.totalGwp / max) * 100;

          return (
            <div key={item.project.id}>
              <div className="flex justify-between mb-1">
                <span className="font-medium text-gray-700">{item.project.name}</span>
                <span className="text-sm font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  {item.totalGwp.toFixed(2)} kg CO₂-eq
                </span>
              </div>

              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-4 rounded-full bg-gradient-to-r from-blue-500 to-blue-700"
                  style={{ width: `${perc}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>

    {/* ♻ RECYCLED CONTENT CARD */}
    <div className="bg-white rounded-xl shadow p-5 border border-gray-200">
      <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
        <span className="text-green-600 text-xl">♻️</span>
        Avg Recycled Content
      </h3>

      <div className="space-y-5">
        {comparisonData.map((item) => (
          <div key={item.project.id}>
            <div className="flex justify-between mb-1">
              <span className="font-medium text-gray-700">{item.project.name}</span>
              <span className="text-sm font-semibold bg-green-100 text-green-800 px-2 py-1 rounded-full">
                {item.avgRecycledContent.toFixed(1)}%
              </span>
            </div>

            <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-4 rounded-full bg-gradient-to-r from-green-500 to-green-700"
                style={{ width: `${item.avgRecycledContent}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>

  {/* RIGHT SIDE: LINE CHART */}
  <div>
    <ComparisonLineChart
      data={comparisonData.map((item, idx) => ({
        project: item.project,
        monthlyValues: [
          item.totalGwp * 0.8,
          item.totalGwp * 0.9,
          item.totalGwp * 1.1,
          item.totalGwp * 1.0,
          item.totalGwp * 1.2,
          item.totalGwp * 0.7,
          item.totalGwp * 0.5,
          item.totalGwp * 0.6,
          item.totalGwp * 1.3,
          item.totalGwp * 1.5,
          item.totalGwp * 1.2,
        ],
        color: ["#2563eb", "#16a34a", "#ef4444", "#f59e0b"][idx]
      }))}
    />
  </div>

</div>


                <div className="overflow-x-auto">
                <div className="overflow-x-auto">
  <table className="w-full table-fixed border-collapse">
    <thead>
      <tr className="border-b bg-gray-100/60">
        <th className="w-[32%] text-left py-3 px-4 font-semibold text-gray-700">
          Project
        </th>
        <th className="w-[10%] text-right py-3 px-4 font-semibold text-gray-700">
          Materials
        </th>
        <th className="w-[22%] text-right py-3 px-4 font-semibold text-gray-700">
          Total GWP
        </th>
        <th className="w-[16%] text-right py-3 px-4 font-semibold text-gray-700">
          Avg Recycled %
        </th>
        <th className="w-[20%] text-right py-3 px-4 font-semibold text-gray-700">
          Category
        </th>
      </tr>
    </thead>

    <tbody>
      {comparisonData.map((item) => (
        <tr
          key={item.project.id}
          className="border-b hover:bg-gray-50 align-top"
        >
          {/* Project Name */}
          <td className="py-3 px-4 font-medium whitespace-normal break-words">
            {item.project.name}
          </td>

          {/* Material Count */}
          <td className="py-3 px-4 text-right whitespace-nowrap">
            {item.materials.length}
          </td>

          {/* Total GWP */}
          <td className="py-3 px-4 text-right font-semibold text-blue-600 whitespace-nowrap">
            {item.totalGwp.toFixed(2)} kg CO₂-eq
          </td>

          {/* Recycled % */}
          <td className="py-3 px-4 text-right font-semibold text-green-600 whitespace-nowrap">
            {item.avgRecycledContent.toFixed(1)}%
          </td>

          {/* Category */}
          <td className="py-3 px-4 text-right whitespace-nowrap">
            <span className="px-2 py-1 bg-gray-200 rounded-full text-xs font-semibold">
              {item.project.product_category || "N/A"}
            </span>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

                </div>

                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">💡 Insights</h4>
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
