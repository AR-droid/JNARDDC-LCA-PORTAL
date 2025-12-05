import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface MaterialComparisonChartProps {
  data: { name: string; gwp: number; percentage: number }[];
  title?: string;
}

// Base colors for gradients
const COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

export default function MaterialComparisonChart({
  data,
  title = "GWP by Material",
}: MaterialComparisonChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-md shadow-sm p-4">
        <h3 className="text-sm font-medium mb-3">{title}</h3>
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
          No data available
        </div>
      </div>
    );
  }

  // Sort by GWP, take top 8
  const sortedData = [...data]
    .sort((a, b) => b.gwp - a.gwp)
    .slice(0, 8);

  return (
    <div className="bg-white rounded-md shadow-sm p-4">
      <h3 className="text-sm font-medium mb-3">{title}</h3>

      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sortedData}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
          >
            {/* Soft grid */}
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

            <XAxis
              type="number"
              unit=" kg"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              axisLine={{ stroke: "#d1d5db" }}
            />

            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: "#374151" }}
              width={90}
            />

            {/* Better tooltip */}
            <Tooltip
              formatter={(value: number) => [
                `${value.toFixed(2)} kg CO₂-eq`,
                "Carbon Footprint",
              ]}
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                fontSize: "12px",
              }}
            />

            {/* Bar with gradients + rounded edges */}
            <Bar dataKey="gwp" barSize={26} radius={[6, 6, 6, 6]}>
              {sortedData.map((_, index) => (
                <Cell key={index} fill={`url(#grad-${index})`} />
              ))}
            </Bar>

            {/* Gradient definitions */}
            <defs>
              {sortedData.map((_, index) => (
                <linearGradient
                  id={`grad-${index}`}
                  key={index}
                  x1="0"
                  x2="1"
                  y1="0"
                  y2="0"
                >
                  <stop
                    offset="0%"
                    stopColor={COLORS[index]}
                    stopOpacity={0.9}
                  />
                  <stop
                    offset="70%"
                    stopColor={COLORS[index]}
                    stopOpacity={0.7}
                  />
                  <stop
                    offset="100%"
                    stopColor={COLORS[index]}
                    stopOpacity={1}
                  />
                </linearGradient>
              ))}
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 text-2xs text-gray-400 text-center">
        Showing top {sortedData.length} materials by carbon footprint
      </div>
    </div>
  );
}
