import React from "react";
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
  backgroundColor: "rgba(30,30,30,0.9)", // dark background
  borderColor: "#444",
  textStyle: { color: "#fff", fontSize: 12 },
  borderRadius: 6,
  padding: 10
},


    legend: {
      orient: "vertical",
      right: 5,
      top: "center",

      // 🔥 Smaller legend
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 6,

      textStyle: {
        fontSize: 10,        // 🔥 Reduce label size
        color: "#555",
        transition: "all 0.2s ease",
      },
    emphasis: {
      textStyle: {
      fontSize: 14,       // enlarged size
      fontWeight: "bold",
      color: "#000",      // darker on hover
    }
  }
    },

    series: [
      {
        type: "pie",
        radius: ["30%", "55%"],
        center: ["35%", "62%"],  // Shift chart slightly left

        avoidLabelOverlap: true,

        label: {
          show: true,
          formatter: "{b}",
          fontSize: 12,        // 🔥 Smaller labels
          position: "outside",
        },

        labelLine: {
          show: true,
          length: 8,
          length2: 4,
          smooth: true,
        },

        itemStyle: {
          shadowBlur: 18,
          shadowColor: "rgba(0,0,0,0.25)",
          shadowOffsetX: 0,
          shadowOffsetY: 6,
        },

        data: chartData,
      },
    ],
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <ReactECharts option={option} style={{ height: 250 }} />
    </div>
  );
}
