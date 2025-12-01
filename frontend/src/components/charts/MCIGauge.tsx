interface MCIGaugeProps {
  score: number // 0 to 1
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  label?: string
}

export default function MCIGauge({ score, size = 'md', showLabel = true, label = 'MCI Score' }: MCIGaugeProps) {
  // Clamp score between 0 and 1
  const normalizedScore = Math.max(0, Math.min(1, score))
  
  // Size configurations
  const sizes = {
    sm: { width: 100, height: 65, strokeWidth: 6, fontSize: 14, labelSize: 'text-2xs' },
    md: { width: 140, height: 90, strokeWidth: 8, fontSize: 18, labelSize: 'text-xs' },
    lg: { width: 180, height: 120, strokeWidth: 10, fontSize: 22, labelSize: 'text-sm' }
  }
  
  const { width, height, strokeWidth, fontSize, labelSize } = sizes[size]
  const radius = width / 2 - strokeWidth
  
  // Calculate arc
  const circumference = Math.PI * radius
  const progress = normalizedScore * circumference
  
  // Color based on score
  const getColor = (score: number) => {
    if (score >= 0.8) return '#22c55e' // Green
    if (score >= 0.6) return '#84cc16' // Lime
    if (score >= 0.4) return '#eab308' // Yellow
    if (score >= 0.2) return '#f97316' // Orange
    return '#ef4444' // Red
  }
  
  const color = getColor(normalizedScore)
  
  // Rating text
  const getRating = (score: number) => {
    if (score >= 0.8) return 'Excellent'
    if (score >= 0.6) return 'Good'
    if (score >= 0.4) return 'Moderate'
    if (score >= 0.2) return 'Low'
    return 'Very Low'
  }

  return (
    <div className="flex flex-col items-center">
      {showLabel && (
        <span className={`${labelSize} font-medium text-gray-600 mb-2`}>{label}</span>
      )}
      <div className="relative" style={{ width, height }}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          {/* Background arc - semicircle from left to right */}
          <path
            d={`M ${strokeWidth / 2} ${height - strokeWidth / 2} A ${radius} ${radius} 0 0 1 ${width - strokeWidth / 2} ${height - strokeWidth / 2}`}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Progress arc */}
          <path
            d={`M ${strokeWidth / 2} ${height - strokeWidth / 2} A ${radius} ${radius} 0 0 1 ${width - strokeWidth / 2} ${height - strokeWidth / 2}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Center text - positioned in the middle of the arc */}
        <div 
          className="absolute flex flex-col items-center justify-center"
          style={{ 
            left: '50%', 
            bottom: strokeWidth / 2,
            transform: 'translateX(-50%)'
          }}
        >
          <span 
            className="font-bold leading-none" 
            style={{ fontSize, color }}
          >
            {(normalizedScore * 100).toFixed(0)}%
          </span>
          <span className="text-2xs text-gray-500 mt-0.5">
            {getRating(normalizedScore)}
          </span>
        </div>
      </div>
      {/* Scale markers */}
      <div className="flex justify-between w-full text-2xs text-gray-400 mt-1" style={{ maxWidth: width }}>
        <span>0</span>
        <span>0.5</span>
        <span>1.0</span>
      </div>
      <p className="text-2xs text-gray-400 text-center mt-1 italic">Ellen MacArthur Foundation</p>
    </div>
  )
}
