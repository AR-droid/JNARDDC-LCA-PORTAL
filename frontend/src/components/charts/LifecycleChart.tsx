import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";

interface LifecycleChartProps {
  data: { stage: string; gwp: number; percentage: number }[];
  title?: string;
}

// 3D rectangular bar shape (light theme)
const ThreeDRectBar = (props: any) => {
  const { x, y, width, height, fill } = props;

  return (
    <g>
      {/* Light shadow under bar */}
      <ellipse
        cx={x + width / 2}
        cy={y + height + 8}
        rx={width / 1.8}
        ry={6}
        fill="rgba(0,0,0,0.15)"
      />

      {/* Back panel */}
      <rect
        x={x + 5}
        y={y - 5}
        width={width}
        height={height}
        fill={fill}
        opacity={0.25}
        rx={4}
      />

      {/* Main bar */}
      <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} />

      {/* Side face */}
      <polygon
        points={`${x + width},${y} ${x + width + 5},${y - 5} ${x + width + 5},${y + height - 5} ${x + width},${y + height}`}
        fill={fill}
        opacity={0.5}
      />

      {/* Top face */}
      <polygon
        points={`${x},${y} ${x + 5},${y - 5} ${x + width + 5},${y - 5} ${x + width},${y}`}
        fill={fill}
        opacity={0.7}
      />
    </g>
  );
};

export default function LifecycleChart({
  data,
  title = "GWP by Lifecycle Stage"
}: LifecycleChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-md shadow-sm p-4 text-gray-600">
        <h3 className="text-sm font-medium mb-3">{title}</h3>
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
          No data available
        </div>
      </div>
    );
  }

  const COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#22c55e", "#f97316"];

  const coloredData = data.map((item, index) => ({
    ...item,
    fill: COLORS[index]
  }));

  return (
    <div className="bg-white rounded-md shadow-sm p-4">
      <h3 className="text-sm font-medium mb-3 text-gray-800">{title}</h3>

      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={coloredData}
            barSize={40}
            margin={{ top: 20, right: 20, left: 10, bottom: 50 }}
          >
            <CartesianGrid stroke="#e5e7eb" strokeDasharray="4 4" />

            <XAxis
              dataKey="stage"
              angle={-25}
              textAnchor="end"
              height={60}
              tick={{ fontSize: 11, fill: "#4b5563" }}
            />

            <YAxis
              tick={{ fontSize: 11, fill: "#4b5563" }}
              label={{
                value: "kg CO₂-eq",
                angle: -90,
                position: "insideLeft",
                offset: 10,
                fill: "#4b5563",
                fontSize: 10
              }}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "12px",
                color: "#111827"
              }}
              formatter={(value: number) => [`${value.toFixed(2)} kg CO₂-eq`, "GWP"]}
            />

            <Bar dataKey="gwp" shape={<ThreeDRectBar />}>
              {coloredData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Percent legend row */}
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
  );
}
