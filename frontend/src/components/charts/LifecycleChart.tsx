import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface LifecycleChartProps {
  data: { stage: string; gwp: number; percentage: number }[]
  title?: string
}

export default function LifecycleChart({ data, title = 'GWP by Lifecycle Stage' }: LifecycleChartProps) {
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

  // Add color to each stage
  const coloredData = data.map((item, index) => ({
    ...item,
    fill: ['#3b82f6', '#8b5cf6', '#06b6d4', '#22c55e', '#f97316'][index] || '#6b7280'
  }))

  return (
    <div className="bg-white rounded-md shadow-sm p-4">
      <h3 className="text-sm font-medium mb-3">{title}</h3>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={coloredData}
            margin={{ top: 10, right: 20, left: 10, bottom: 50 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="stage" 
              angle={-30}
              textAnchor="end"
              height={60}
              tick={{ fontSize: 9 }}
            />
            <YAxis 
              tick={{ fontSize: 10 }}
              label={{ value: 'kg CO₂-eq', angle: -90, position: 'insideLeft', fontSize: 10 }}
            />
            <Tooltip 
              formatter={(value: number) => [`${value.toFixed(2)} kg CO₂-eq`, 'GWP']}
              labelFormatter={(label) => `Stage: ${label}`}
              contentStyle={{ fontSize: '11px' }}
            />
            <Bar 
              dataKey="gwp" 
              radius={[3, 3, 0, 0]}
              fill="#3b82f6"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 grid grid-cols-5 gap-1 text-center">
        {coloredData.map((stage, index) => (
          <div key={index} className="flex flex-col items-center">
            <div 
              className="w-2 h-2 rounded-full mb-0.5" 
              style={{ backgroundColor: stage.fill }}
            />
            <span className="text-2xs text-gray-500">{stage.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
