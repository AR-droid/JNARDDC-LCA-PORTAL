import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface MaterialComparisonChartProps {
  data: { name: string; gwp: number; percentage: number }[]
  title?: string
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']

export default function MaterialComparisonChart({ data, title = 'GWP by Material' }: MaterialComparisonChartProps) {
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

  // Sort by GWP descending and take top 8
  const sortedData = [...data].sort((a, b) => b.gwp - a.gwp).slice(0, 8)

  return (
    <div className="bg-white rounded-md shadow-sm p-4">
      <h3 className="text-sm font-medium mb-3">{title}</h3>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sortedData}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" unit=" kg" tick={{ fontSize: 10 }} />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={75}
              tick={{ fontSize: 10 }}
            />
            <Tooltip 
              formatter={(value: number, name: string) => [
                `${value.toFixed(2)} kg CO₂-eq`,
                name === 'gwp' ? 'Carbon Footprint' : name
              ]}
              contentStyle={{ fontSize: '11px' }}
            />
            <Bar dataKey="gwp" radius={[0, 3, 3, 0]}>
              {sortedData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 text-2xs text-gray-400 text-center">
        Showing top {sortedData.length} materials by carbon footprint
      </div>
    </div>
  )
}
