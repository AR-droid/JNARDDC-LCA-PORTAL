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

interface RecycledContentChartProps {
  data: {
    name: string;
    recycled_content: number;
    quantity: number;
    gwp: number;
  }[];
  title?: string;
}

// COLOR SCALE
const getColor = (value: number) => {
  if (value >= 80) return "#22c55e"; // green
  if (value >= 50) return "#84cc16"; // lime
  if (value >= 30) return "#eab308"; // yellow
  if (value >= 10) return "#f97316"; // orange
  return "#ef4444"; // red
};

// 3D BAR SHAPE
const ThreeDBar = (props: any) => {
  const { x, y, width, height, fill } = props;

  const top = 8; // top face depth
  const side = 8; // right face depth

  return (
    <g>
      {/* Shadow */}
      <ellipse
        cx={x + width / 2}
        cy={y + height + 15}
        rx={width / 1.4}
        ry={7}
        fill="rgba(0,0,0,0.25)"
      />

      {/* Front face */}
      <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} />

      {/* Right 3D face */}
      <polygon
        points={`
          ${x + width},${y}
          ${x + width + side},${y - top}
          ${x + width + side},${y + height - top}
          ${x + width},${y + height}
        `}
        fill={fill}
        opacity={0.5}
      />

      {/* Top 3D face */}
      <polygon
        points={`
          ${x},${y}
          ${x + side},${y - top}
          ${x + width + side},${y - top}
          ${x + width},${y}
        `}
        fill={fill}
        opacity={0.75}
      />
    </g>
  );
};

export default function RecycledContentChart({
  data,
  title = "Recycled Content Analysis",
}: RecycledContentChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-md shadow-sm p-4">
        <h3 className="text-sm font-medium mb-3">{title}</h3>
        <div className="h-48 flex items-center justify-center text-gray-400">
          No data available
        </div>
      </div>
    );
  }

  // Format names + colors
  const chartData = data.map((item) => ({
    ...item,
    shortName: item.name.length > 10 ? item.name.slice(0, 10) + "..." : item.name,
    fullName: item.name,
    fill: getColor(item.recycled_content),
  }));

  const avgRecycled =
    data.reduce((sum, d) => sum + d.recycled_content, 0) / data.length;

  return (
    <div className="bg-white rounded-md shadow-sm p-4">
      <h3 className="text-sm font-medium mb-3">{title}</h3>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 10, bottom: 50 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />

            <XAxis
              dataKey="shortName"
              angle={-25}
              textAnchor="end"
              height={50}
              tick={{ fontSize: 10 }}
            />

            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `${v}%`}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white rounded border border-gray-200 p-2 text-xs shadow-md">
                      <p className="font-medium text-gray-900">{d.fullName}</p>
                      <p className="text-gray-600">
                        Recycled:{" "}
                        <span className="font-semibold" style={{ color: d.fill }}>
                          {d.recycled_content}%
                        </span>
                      </p>
                      <p className="text-gray-600">
                        Quantity:{" "}
                        <span className="font-semibold">{d.quantity} kg</span>
                      </p>
                      <p className="text-gray-600">
                        GWP:{" "}
                        <span className="font-semibold">
                          {d.gwp.toFixed(2)} kg CO₂
                        </span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* 3D Bars */}
            <Bar dataKey="recycled_content" shape={<ThreeDBar />}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend + Average */}
      <div className="mt-4 flex justify-between text-xs">
        <div className="flex gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span> ≥80%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-yellow-500 rounded-full"></span> 30–50%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span> &lt;10%
          </span>
        </div>

        <div className="text-gray-600">
          Avg:{" "}
          <span className="font-semibold text-blue-600">
            {avgRecycled.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
