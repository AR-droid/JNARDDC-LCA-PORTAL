import { useEffect, useState } from "react";

interface MCIGaugeProps {
  score: number; // 0 to 1
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  label?: string;
}

export default function MCIGauge({
  score,
  size = "md",
  showLabel = true,
  label = "MCI Score",
}: MCIGaugeProps) {
  // --- Animated score value (0 → final) ---
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    let start = 0;
    let final = Math.max(0, Math.min(1, score));
    let startTime = performance.now();
    const duration = 900; // animation time ms

    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // smooth ease-out
      setAnimatedScore(start + (final - start) * eased);

      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [score]);

  // Size presets
  const sizes = {
    sm: { width: 120, height: 80, strokeWidth: 10, fontSize: 14 },
    md: { width: 160, height: 110, strokeWidth: 12, fontSize: 18 },
    lg: { width: 220, height: 150, strokeWidth: 14, fontSize: 22 },
  };

  const { width, height, strokeWidth, fontSize } = sizes[size];

  const radius = width / 2 - strokeWidth;
  const cx = width / 2;
  const cy = height - 5;

  // Color logic
  const getColor = (value: number) => {
    if (value >= 0.8) return "#22c55e";
    if (value >= 0.6) return "#84cc16";
    if (value >= 0.4) return "#eab308";
    if (value >= 0.2) return "#f97316";
    return "#ef4444";
  };

  const color = getColor(animatedScore);

  // Needle angle
  const angle = 180 - animatedScore * 180;
  const needleLength = radius - 10;

  const needleX = cx + needleLength * Math.cos((angle * Math.PI) / 180);
  const needleY = cy - needleLength * Math.sin((angle * Math.PI) / 180);

  // Rating text
  const getRating = (v: number) => {
    if (v >= 0.8) return "Excellent";
    if (v >= 0.6) return "Good";
    if (v >= 0.4) return "Moderate";
    if (v >= 0.2) return "Low";
    return "Very Low";
  };

  return (
    <div className="flex flex-col items-center">
      {showLabel && (
        <span className="text-xs font-medium text-gray-600 mb-2">{label}</span>
      )}

      <svg width={width} height={height}>
        {/* Background Arc */}
        <path
          d={`M ${cx - radius} ${cy}
             A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Animated Arc */}
        <path
          d={`M ${cx - radius} ${cy}
             A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={Math.PI * radius}
          strokeDashoffset={(1 - animatedScore) * Math.PI * radius}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease-out" }}
        />

        {/* Animated Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={needleX}
          y2={needleY}
          stroke="#000"
          strokeWidth="4"
          strokeLinecap="round"
          style={{ transition: "all 0.4s ease-out" }}
        />

        {/* Center Hub */}
        <circle cx={cx} cy={cy} r="6" fill="#000" />
      </svg>

      {/* Percentage */}
      <span className="font-bold mt-1" style={{ fontSize, color }}>
        {(animatedScore * 100).toFixed(0)}%
      </span>

      {/* Rating */}
      <span className="text-2xs text-gray-500">{getRating(animatedScore)}</span>

      {/* Scale */}
      <div
        className="flex justify-between w-full text-2xs text-gray-400 mt-1"
        style={{ maxWidth: width - 20 }}
      >
        <span>0</span>
        <span>0.5</span>
        <span>1.0</span>
      </div>

      <p className="text-2xs text-gray-400 text-center mt-1 italic">
        Ellen MacArthur Foundation
      </p>
    </div>
  );
}
