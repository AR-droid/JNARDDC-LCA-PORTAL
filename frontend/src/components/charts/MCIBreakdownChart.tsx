import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

interface MCIBreakdownChartProps {
  data: { name: string; mci: number; recycled_input: number; recyclability: number }[]
  overallMCI?: number
  title?: string
}

export default function MCIBreakdownChart({ data, overallMCI, title = 'MCI by Material' }: MCIBreakdownChartProps) {
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

  // Transform data for chart
  const chartData = data.map(item => ({
    name: item.name.length > 12 ? item.name.substring(0, 12) + '...' : item.name,
    fullName: item.name,
    mci: item.mci,
    'Recycled Input': item.recycled_input,
    'Recyclability': item.recyclability
  }))

  const getBarColor = (mci: number) => {
    if (mci >= 0.8) return '#22c55e'
    if (mci >= 0.6) return '#84cc16'
    if (mci >= 0.4) return '#eab308'
    if (mci >= 0.2) return '#f97316'
    return '#ef4444'
  }

  return (
    <div className="bg-white rounded-md shadow-sm p-4">
      <h3 className="text-sm font-medium mb-3">{title}</h3>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 10, bottom: 50 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="name" 
              angle={-30}
              textAnchor="end"
              height={60}
              tick={{ fontSize: 9 }}
            />
            <YAxis 
              domain={[0, 1]}
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
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
                          MCI: <span className="font-medium" style={{ color: getBarColor(data.mci) }}>
                            {(data.mci * 100).toFixed(0)}%
                          </span>
                        </p>
                        <p className="text-gray-600">
                          Recycled Input: <span className="font-medium">{data['Recycled Input']}%</span>
                        </p>
                        <p className="text-gray-600">
                          Recyclability: <span className="font-medium">{data['Recyclability']}%</span>
                        </p>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            {overallMCI !== undefined && (
              <ReferenceLine 
                y={overallMCI} 
                stroke="#6366f1" 
                strokeDasharray="5 5"
                label={{ value: `Avg: ${(overallMCI * 100).toFixed(0)}%`, position: 'right', fill: '#6366f1', fontSize: 10 }}
              />
            )}
            <Bar 
              dataKey="mci" 
              radius={[3, 3, 0, 0]}
              fill="#3b82f6"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex items-center justify-center gap-4 text-2xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-green-500" />
          <span className="text-gray-500">≥80% Excellent</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-yellow-500" />
          <span className="text-gray-500">40-60% Moderate</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-red-500" />
          <span className="text-gray-500">&lt;20% Low</span>
        </div>
      </div>
    </div>
  )
}
