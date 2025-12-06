import ReactECharts from "echarts-for-react";

interface GWPBreakdownChart3DProps {
  data: { name: string; value: number }[];
  title: string;
}

export default function GWPBreakdownChart3D({ title, data }: GWPBreakdownChart3DProps) {
  const chartData = data.map(item => ({
    value: item.value,
    name: item.name,
  }));

  const option = {
    title: {
      text: title,
      left: "center",
      top: 0,
      textStyle: { fontSize: 16, fontWeight: "bold" },
    },

    tooltip: {
      trigger: "item",
      formatter: "{b}: {c} kg CO₂-eq ({d}%)",
      backgroundColor: "rgba(30,30,30,0.9)",
      borderColor: "#444",
      textStyle: { color: "#fff", fontSize: 12 },
      borderRadius: 6,
      padding: 10,
    },

    legend: {
      orient: "vertical",
      right: 8,
      top: "center",
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 6,
      textStyle: {
        fontSize: 10,
        color: "#555",
      },
    },

    series: [
      {
        type: "pie",
        radius: ["38%", "70%"],
        center: ["40%", "50%"],

        // 💡 Hide labels normally
        label: {
          show: false,
        },

        // 💡 Show name ONLY on hover
        emphasis: {
          label: {
            show: true,
            formatter: "{b}\n{d}%",
            fontSize: 10,
            fontWeight: "bold",
            color: "#000",
          },
          scale: true,
          scaleSize: 6,
          itemStyle: {
            shadowBlur: 20,
            shadowColor: "rgba(0,0,0,0.35)",
          },
        },

        // Connector lines appear only on hover
        labelLine: {
          show: false,
          emphasis: {
            show: true,
            length: 10,
            length2: 10,
            lineStyle: { width: 1.5, color: "#444" },
          },
        },

        data: chartData,
      },
    ]

  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <ReactECharts option={option} style={{ height: 250 }} />
    </div>
  );
}
