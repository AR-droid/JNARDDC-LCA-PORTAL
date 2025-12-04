import React from "react";
import ReactECharts from "echarts-for-react";

interface MCIGauge3DProps {
  score: number;
  label: string;
}

export default function MCIGauge3D({ score, label }: MCIGauge3DProps) {
  const percent = Number((score * 100).toFixed(0));

  const getRating = (value: number) => {
    if (value >= 80) return "Excellent";
    if (value >= 60) return "Good";
    if (value >= 40) return "Moderate";
    if (value >= 20) return "Low";
    return "Very Low";
  };

  const option: any = {
   title: {
      text: label,
      left: "center",
      top: 0,
      textStyle: { fontSize: 16, fontWeight: "bold" },
    },

    graphic: {
  type: "text",
  left: "center",
  top: "72%",   // 🔥 Move UP (was 82%)
  style: {
    text: "Ellen MacArthur Foundation",
    fill: "#9ca3af",
    fontSize: 10,
    fontStyle: "italic",
    fontWeight:"bold",
  },
},


    series: [
      {
        type: "gauge",
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 100,

        radius: "65%",                // 🔥 SMALLER gauge shape
        center: ["50%", "60%"],       // move upward

        progress: {
          show: true,
          width: 10,                 // thinner arc
          itemStyle: {
            color: score >= 0.6 ? "#4ade80" : "#eab308",
          },
        },

        axisLine: {
          lineStyle: {
            width: 10,
            color: [[1, "#eee"]],
          },
        },

        pointer: { show: false },
        splitLine: { show: false },
        axisTick: { show: false },

        axisLabel: {
          color: "#999",
          fontSize: 10,
          distance: -8,
          formatter: (value: number) => {
            if (value === 0) return "0";
            if (value === 50) return "0.5";
            if (value === 100) return "1.0";
            return "";
          },
        },

        detail: {
          offsetCenter: [0, "-15%"],
          formatter: "{value}%",
          color: "#d97706",
          fontSize: 25,      // smaller value text
          fontWeight: "bold",
        },

        data: [{ value: percent }],
      },

      // ⭐ Rating text overlay
      {
        type: "gauge",
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 100,

        radius: "65%",
        center: ["50%", "60%"],

        pointer: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },

        detail: {
          formatter: getRating(percent),
          offsetCenter: [0, "10%"],
          color: "#6b7280",
          fontSize: 11,
        },

        data: [{ value: percent }],
      },
    ],
  };

  return (
    <ReactECharts option={option} style={{ height: 250, width: "100%" }} />
  );
}
