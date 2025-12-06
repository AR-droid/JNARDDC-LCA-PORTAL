import "chart.js/auto";
import { Line } from "react-chartjs-2";

export default function ComparisonLineChart({
  data,
}: {
  data: {
    project: { name: string };
    monthlyValues: number[];
    color?: string;
  }[];
}) {
  const labels = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];

  const chartData = {
    labels,
    datasets: data.map((item, idx) => ({
      label: item.project.name,
      data: item.monthlyValues,
      borderColor: item.color || ["#2563eb", "#16a34a", "#ef4444", "#f59e0b"][idx],
      backgroundColor: "transparent",
      borderWidth: 3,
      tension: 0.35,
      pointRadius: 4,
      pointBackgroundColor: "#fff",
      pointBorderColor: item.color || ["#2563eb", "#16a34a", "#ef4444", "#f59e0b"][idx],
    })),
  };

  return (
    <div className="w-full h-[380px] bg-white rounded-xl shadow border p-4">
      <Line data={chartData} />
    </div>
  );
}
