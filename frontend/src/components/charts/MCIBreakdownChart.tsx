import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";

interface MCIBreakdownChartProps {
  data: { name: string; mci: number; recycled_input: number; recyclability: number }[];
  overallMCI?: number;
  title?: string;
}

/* -------------------------- 3D BAR SHAPE -------------------------- */
const ThreeDBar = (props: any) => {
  const { x, y, width, height, fill } = props;

  const topHeight = 8; // top face height
  const sideWidth = 8; // side face width

  return (
    <g>
      {/* Shadow */}
      <ellipse
        cx={x + width / 2}
        cy={y + height + 10}
        rx={width / 2}
        ry={6}
        fill="rgba(0,0,0,0.25)"
      />

      {/* Side face */}
      <polygon
        points={`
          ${x + width},${y}
          ${x + width + sideWidth},${y - topHeight}
          ${x + width + sideWidth},${y + height - topHeight}
          ${x + width},${y + height}
        `}
        fill={fill}
        opacity="0.7"
      />

      {/* Top face */}
      <polygon
        points={`
          ${x},${y}
          ${x + sideWidth},${y - topHeight}
          ${x + width + sideWidth},${y - topHeight}
          ${x + width},${y}
        `}
        fill={fill}
        opacity="0.85"
      />

      {/* Main bar */}
      <rect x={x} y={y} width={width} height={height} fill={fill} />
    </g>
  );
};

/* -------------------------- MAIN COMPONENT -------------------------- */

export default function MCIBreakdownChart({
  data,
  overallMCI,
  title = "MCI Score by Material",
}: MCIBreakdownChartProps) {
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

  const chartData = data.map((item) => ({
    name: item.name.length > 12 ? item.name.substring(0, 12) + "..." : item.name,
    fullName: item.name,
    mci: item.mci,
    recycled_input: item.recycled_input,
    recyclability: item.recyclability,
  }));

  const getColor = (score: number) => {
    if (score >= 0.85) return "#2563eb";
    if (score >= 0.6) return "#3b82f6";
    if (score >= 0.4) return "#60a5fa";
    return "#93c5fd";
  };

  return (
    <div className="bg-white rounded-md shadow-sm p-4">
      <h3 className="text-sm font-medium mb-3">{title}</h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 10, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

            <XAxis
              dataKey="name"
              angle={-25}
              textAnchor="end"
              height={60}
              tick={{ fontSize: 11, fill: "#475569" }}
            />

            <YAxis
              domain={[0, 1]}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              tick={{ fontSize: 11, fill: "#475569" }}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white border border-gray-200 shadow-md rounded p-2 text-xs">
                      <p className="font-semibold">{d.fullName}</p>
                      <p>MCI: {(d.mci * 100).toFixed(0)}%</p>
                      <p>Recycled Input: {d.recycled_input}%</p>
                      <p>Recyclability: {d.recyclability}%</p>
                    </div>
                  );
                }
                return null;
              }}
            />

            {overallMCI && (
              <ReferenceLine
                y={overallMCI}
                stroke="#6366f1"
                strokeDasharray="4 4"
                label={{
                  value: `Avg: ${(overallMCI * 100).toFixed(0)}%`,
                  position: "right",
                  fill: "#6366f1",
                }}
              />
            )}

            <Bar
              dataKey="mci"
              shape={<ThreeDBar />}
              isAnimationActive={true}
              animationDuration={1400}
            >
              {chartData.map((d, i) => (
                <Cell key={i} fill={getColor(d.mci)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 flex justify-center gap-4 text-2xs">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-700"></span> 80%+ Excellent
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span> 60–80% Good
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-300"></span> 40–60% Moderate
        </span>
      </div>
    </div>
  );
}
