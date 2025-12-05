import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface GWPBreakdownChartProps {
  data: { name: string; value: number }[];
  title?: string;
}

const COLORS = [
  "#ff6b6b",
  "#f7b731",
  "#2ecc71",
  "#1abc9c",
  "#3498db",
  "#9b59b6",
  "#e67e22",
  "#FF8042"
];

export default function GWPBreakdownChart({
  data,
  title = "GWP Breakdown by Material Type",
}: GWPBreakdownChartProps) {
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

  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Add explode offset for 3D effect
  const explodeOffset = 12;

  return (
    <div className="bg-white rounded-md shadow-sm p-4">
      <h3 className="text-sm font-medium mb-3">{title}</h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            {/* ======= FAKE 3D HEIGHT (SHADOW LAYER) ======== */}
            <Pie
              data={data}
              cx="32%"
              cy="52%"
              dataKey="value"
              outerRadius={70}
              innerRadius={25}
              paddingAngle={2}
              stroke="none"
              style={{
                filter: "drop-shadow(0px 12px 8px rgba(0,0,0,0.25))",
              }}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} opacity={0.7} />
              ))}
            </Pie>

            {/* ======= TOP LAYER (VISIBLE 3D PIE) ======== */}
            <Pie
              data={data}
              cx="32%"
              cy="48%"
              dataKey="value"
              outerRadius={70}
              innerRadius={25}
              paddingAngle={2}
              label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
              labelLine={true}
            >
              {data.map((_, index) => (
                <Cell
                  key={index}
                  fill={COLORS[index % COLORS.length]}
                  // explode effect for selected slice
                  {...(index === 0
                    ? { offsetRadius: explodeOffset }
                    : { offsetRadius: 0 })}
                />
              ))}
            </Pie>

            <Tooltip
              formatter={(value: number) => [
                `${value.toFixed(2)} kg CO₂-eq`,
                "GWP",
              ]}
            />

            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              wrapperStyle={{
                fontSize: "11px",
                paddingLeft: "10px",
                maxWidth: "40%",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 text-center">
        <span className="text-xs text-gray-500">Total: </span>
        <span className="text-sm font-semibold text-green-600">
          {total.toFixed(2)} kg CO₂-eq
        </span>
      </div>

      <p className="text-2xs text-gray-400 text-center mt-2 italic">
        Source: IPCC AR6, Ecoinvent 3.9
      </p>
    </div>
  );
}
