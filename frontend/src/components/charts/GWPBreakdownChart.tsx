import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface GWPBreakdownChartProps {
  data: { name: string; value: number }[]
  title?: string
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B6B']

export default function GWPBreakdownChart({ data, title = 'GWP Breakdown by Material Type' }: GWPBreakdownChartProps) {
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

  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="bg-white rounded-md shadow-sm p-4">
      <h3 className="text-sm font-medium mb-3">{title}</h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="30%"
              cy="50%"
              labelLine={true}
              label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
              outerRadius={55}
              innerRadius={20}
              fill="#8884d8"
              dataKey="value"
              paddingAngle={2}
              fontSize={9}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [`${value.toFixed(2)} kg CO₂-eq`, 'GWP']}
              contentStyle={{ fontSize: '11px', padding: '6px 10px' }}
            />
            <Legend 
              layout="vertical"
              align="right"
              verticalAlign="middle"
              wrapperStyle={{ 
                fontSize: '10px',
                paddingLeft: '5px',
                right: 0,
                maxWidth: '45%'
              }}
              formatter={(value: string) => <span className="text-gray-700">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 text-center">
        <span className="text-xs text-gray-500">Total: </span>
        <span className="text-sm font-semibold text-green-600">{total.toFixed(2)} kg CO₂-eq</span>
      </div>
      <p className="text-2xs text-gray-400 text-center mt-2 italic">Source: IPCC AR6, Ecoinvent 3.9</p>
    </div>
  )
}
