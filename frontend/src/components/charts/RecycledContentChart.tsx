import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface RecycledContentChartProps {
  data: { name: string; recycled_content: number; quantity: number; gwp: number }[]
  title?: string
}

export default function RecycledContentChart({ data, title = 'Recycled Content Analysis' }: RecycledContentChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-md shadow-sm p-4">
        <h3 className="text-sm font-medium mb-3">{title}</h3>
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
          No data available
        </div>
      </div>
    )
  }

  // Add colors based on recycled content
  const chartData = data.map(item => ({
    ...item,
    name: item.name.length > 10 ? item.name.substring(0, 10) + '...' : item.name,
    fullName: item.name
  }))

  const getColor = (recycledContent: number) => {
    if (recycledContent >= 80) return '#22c55e' // Green
    if (recycledContent >= 50) return '#84cc16' // Lime
    if (recycledContent >= 30) return '#eab308' // Yellow
    if (recycledContent >= 10) return '#f97316' // Orange
    return '#ef4444' // Red
  }

  const avgRecycled = data.reduce((sum, d) => sum + d.recycled_content, 0) / data.length

  return (
    <div className="bg-white rounded-md shadow-sm p-4">
      <h3 className="text-sm font-medium mb-3">{title}</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 10, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="name" 
              angle={-30}
              textAnchor="end"
              height={50}
              tick={{ fontSize: 9 }}
            />
            <YAxis 
              domain={[0, 100]}
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload
                  return (
                    <div className="bg-white border border-gray-200 rounded shadow-lg p-2 text-xs">
                      <p className="font-medium text-gray-900">{data.fullName}</p>
                      <div className="mt-1 space-y-0.5">
                        <p className="text-gray-600">
                          Recycled: <span className="font-medium" style={{ color: getColor(data.recycled_content) }}>
                            {data.recycled_content}%
                          </span>
                        </p>
                        <p className="text-gray-600">
                          Quantity: <span className="font-medium">{data.quantity} kg</span>
                        </p>
                        <p className="text-gray-600">
                          GWP: <span className="font-medium">{data.gwp.toFixed(2)} kg CO₂</span>
                        </p>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar dataKey="recycled_content" radius={[3, 3, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.recycled_content)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex items-center justify-between text-2xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0.5">
            <div className="w-2 h-2 rounded bg-green-500" />
            <span className="text-gray-500">≥80%</span>
          </div>
          <div className="flex items-center gap-0.5">
            <div className="w-2 h-2 rounded bg-yellow-500" />
            <span className="text-gray-500">30-50%</span>
          </div>
          <div className="flex items-center gap-0.5">
            <div className="w-2 h-2 rounded bg-red-500" />
            <span className="text-gray-500">&lt;10%</span>
          </div>
        </div>
        <div className="text-gray-500">
          Avg: <span className="font-medium text-blue-600">{avgRecycled.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  )
}
