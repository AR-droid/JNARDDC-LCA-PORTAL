import { useState, useMemo } from 'react'
import { Truck, Ship, Train, Plane, Info } from 'lucide-react'

interface SupplyChainEntry {
  id: string
  material_name: string
  supplier_name: string
  supplier_country: string
  supplier_state?: string
  supplier_city?: string
  supplier_tier: number
  transport_mode: string
  transport_distance_km: number
  lead_time_days: number
  latitude: number
  longitude: number
  destination_lat: number
  destination_lng: number
}

interface Props {
  entries: SupplyChainEntry[]
  destinationName?: string
  showInternational?: boolean
}

// SVG path for India outline (simplified)
const INDIA_PATH = "M 185 45 L 195 40 L 210 45 L 220 55 L 235 50 L 250 55 L 260 65 L 275 60 L 290 70 L 295 85 L 305 95 L 300 110 L 310 125 L 305 140 L 295 150 L 290 165 L 280 175 L 270 190 L 260 200 L 250 215 L 240 230 L 225 245 L 210 255 L 195 265 L 180 270 L 165 265 L 150 255 L 140 240 L 130 225 L 125 210 L 120 195 L 125 180 L 130 165 L 140 150 L 150 135 L 160 120 L 170 105 L 175 90 L 180 75 L 175 60 L 185 45 Z"

// Transport mode icons
const TransportIcon = ({ mode }: { mode: string }) => {
  switch (mode?.toLowerCase()) {
    case 'rail': return <Train size={12} className="text-purple-600" />
    case 'sea': return <Ship size={12} className="text-blue-600" />
    case 'air': return <Plane size={12} className="text-sky-500" />
    default: return <Truck size={12} className="text-orange-600" />
  }
}

// Tier colors
const getTierColor = (tier: number) => {
  switch (tier) {
    case 1: return { bg: '#22c55e', stroke: '#16a34a', label: 'Tier 1 (Direct)' }
    case 2: return { bg: '#f59e0b', stroke: '#d97706', label: 'Tier 2 (Secondary)' }
    case 3: return { bg: '#ef4444', stroke: '#dc2626', label: 'Tier 3 (Tertiary)' }
    default: return { bg: '#6b7280', stroke: '#4b5563', label: 'Unknown' }
  }
}

// Convert lat/lng to SVG coordinates (simplified projection for India)
const latLngToSvg = (lat: number, lng: number, bounds: { minLat: number, maxLat: number, minLng: number, maxLng: number }) => {
  // India bounds approximately: lat 8-37, lng 68-98
  const { minLat, maxLat, minLng, maxLng } = bounds
  const x = ((lng - minLng) / (maxLng - minLng)) * 380 + 30
  const y = ((maxLat - lat) / (maxLat - minLat)) * 280 + 20
  return { x, y }
}

export default function IndiaSupplyChainMap({ entries, destinationName = 'Manufacturing Hub', showInternational = true }: Props) {
  const [selectedEntry, setSelectedEntry] = useState<SupplyChainEntry | null>(null)
  const [hoveredEntry, setHoveredEntry] = useState<string | null>(null)

  // Bounds for India
  const indiaBounds = { minLat: 6, maxLat: 38, minLng: 66, maxLng: 100 }

  // Filter domestic and international entries
  const domesticEntries = entries.filter(e => e.supplier_country?.toLowerCase() === 'india')
  const internationalEntries = entries.filter(e => e.supplier_country?.toLowerCase() !== 'india')

  // Calculate destination (average or use first entry's destination)
  const destination = useMemo(() => {
    if (entries.length === 0) return { lat: 19.076, lng: 72.8777 } // Mumbai default
    return {
      lat: entries[0]?.destination_lat || 19.076,
      lng: entries[0]?.destination_lng || 72.8777
    }
  }, [entries])

  const destSvg = latLngToSvg(destination.lat, destination.lng, indiaBounds)

  // Summary stats
  const totalDistance = entries.reduce((sum, e) => sum + (e.transport_distance_km || 0), 0)
  const avgLeadTime = entries.length > 0 
    ? Math.round(entries.reduce((sum, e) => sum + (e.lead_time_days || 0), 0) / entries.length) 
    : 0
  const makeInIndiaPercent = entries.length > 0 
    ? Math.round(domesticEntries.length / entries.length * 100) 
    : 0

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 via-white to-green-600 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              🇮🇳 Supply Chain Map
            </h3>
            <p className="text-sm text-gray-600">Make in India Supply Routes</p>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="bg-white/80 rounded-lg px-3 py-1">
              <span className="text-gray-500">Suppliers:</span>
              <span className="font-bold ml-1 text-orange-600">{entries.length}</span>
            </div>
            <div className="bg-white/80 rounded-lg px-3 py-1">
              <span className="text-gray-500">🇮🇳 Domestic:</span>
              <span className="font-bold ml-1 text-green-600">{makeInIndiaPercent}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Map Area */}
        <div className="flex-1 p-4">
          <svg viewBox="0 0 440 320" className="w-full h-auto border rounded-lg bg-gradient-to-b from-blue-50 to-blue-100">
            {/* Ocean background */}
            <rect x="0" y="0" width="440" height="320" fill="#e0f2fe" />
            
            {/* India outline */}
            <path
              d={INDIA_PATH}
              fill="#fef3c7"
              stroke="#f59e0b"
              strokeWidth="2"
              className="drop-shadow-md"
            />

            {/* Grid lines for reference */}
            {[0, 1, 2, 3, 4].map(i => (
              <line key={`h${i}`} x1="30" y1={20 + i * 70} x2="410" y2={20 + i * 70} stroke="#ddd" strokeDasharray="5,5" strokeWidth="0.5" />
            ))}
            {[0, 1, 2, 3, 4, 5].map(i => (
              <line key={`v${i}`} x1={30 + i * 76} y1="20" x2={30 + i * 76} y2="300" stroke="#ddd" strokeDasharray="5,5" strokeWidth="0.5" />
            ))}

            {/* Supply routes - draw lines from suppliers to destination */}
            {domesticEntries.map((entry, idx) => {
              if (!entry.latitude || !entry.longitude) return null
              const source = latLngToSvg(entry.latitude, entry.longitude, indiaBounds)
              const tierColor = getTierColor(entry.supplier_tier)
              
              return (
                <g key={entry.id || idx}>
                  {/* Route line */}
                  <line
                    x1={source.x}
                    y1={source.y}
                    x2={destSvg.x}
                    y2={destSvg.y}
                    stroke={tierColor.bg}
                    strokeWidth={hoveredEntry === entry.id ? 3 : 1.5}
                    strokeDasharray={entry.transport_mode === 'rail' ? '8,4' : entry.transport_mode === 'sea' ? '4,4' : 'none'}
                    opacity={hoveredEntry === entry.id ? 1 : 0.6}
                    className="transition-all cursor-pointer"
                    onMouseEnter={() => setHoveredEntry(entry.id)}
                    onMouseLeave={() => setHoveredEntry(null)}
                    onClick={() => setSelectedEntry(entry)}
                  />
                  
                  {/* Arrow head */}
                  <circle
                    cx={(source.x + destSvg.x) / 2}
                    cy={(source.y + destSvg.y) / 2}
                    r={hoveredEntry === entry.id ? 4 : 3}
                    fill={tierColor.bg}
                    className="transition-all"
                  />
                </g>
              )
            })}

            {/* Supplier markers */}
            {domesticEntries.map((entry, idx) => {
              if (!entry.latitude || !entry.longitude) return null
              const pos = latLngToSvg(entry.latitude, entry.longitude, indiaBounds)
              const tierColor = getTierColor(entry.supplier_tier)
              
              return (
                <g 
                  key={`marker-${entry.id || idx}`}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredEntry(entry.id)}
                  onMouseLeave={() => setHoveredEntry(null)}
                  onClick={() => setSelectedEntry(entry)}
                >
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={hoveredEntry === entry.id ? 8 : 6}
                    fill={tierColor.bg}
                    stroke={tierColor.stroke}
                    strokeWidth="2"
                    className="transition-all drop-shadow-md"
                  />
                  {hoveredEntry === entry.id && (
                    <text
                      x={pos.x}
                      y={pos.y - 12}
                      textAnchor="middle"
                      className="text-xs font-semibold fill-gray-700"
                    >
                      {entry.supplier_name}
                    </text>
                  )}
                </g>
              )
            })}

            {/* Destination marker (Manufacturing Hub) */}
            <g>
              <circle
                cx={destSvg.x}
                cy={destSvg.y}
                r="12"
                fill="#2563eb"
                stroke="#1d4ed8"
                strokeWidth="3"
                className="drop-shadow-lg"
              />
              <text
                x={destSvg.x}
                y={destSvg.y + 4}
                textAnchor="middle"
                className="text-xs font-bold fill-white"
              >
                🏭
              </text>
              <text
                x={destSvg.x}
                y={destSvg.y + 25}
                textAnchor="middle"
                className="text-xs font-semibold fill-gray-700"
              >
                {destinationName}
              </text>
            </g>

            {/* International sources indicator */}
            {showInternational && internationalEntries.length > 0 && (
              <g>
                <rect x="10" y="10" width="100" height="30" fill="white" rx="5" opacity="0.9" />
                <text x="20" y="28" className="text-xs fill-gray-600">
                  🌍 {internationalEntries.length} imports
                </text>
              </g>
            )}

            {/* Legend */}
            <g transform="translate(320, 250)">
              <rect x="0" y="0" width="110" height="65" fill="white" rx="5" opacity="0.95" stroke="#ddd" />
              <text x="10" y="15" className="text-xs font-semibold fill-gray-700">Legend</text>
              <circle cx="15" cy="28" r="4" fill="#22c55e" />
              <text x="25" y="32" className="text-xs fill-gray-600">Tier 1 (Direct)</text>
              <circle cx="15" cy="42" r="4" fill="#f59e0b" />
              <text x="25" y="46" className="text-xs fill-gray-600">Tier 2</text>
              <circle cx="15" cy="56" r="4" fill="#ef4444" />
              <text x="25" y="60" className="text-xs fill-gray-600">Tier 3</text>
            </g>
          </svg>
        </div>

        {/* Sidebar - Entry Details */}
        <div className="w-64 border-l bg-gray-50 p-4">
          <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Info size={16} />
            {selectedEntry ? 'Supplier Details' : 'Summary'}
          </h4>
          
          {selectedEntry ? (
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-3 border">
                <p className="font-semibold text-gray-800">{selectedEntry.supplier_name}</p>
                <p className="text-sm text-gray-500">{selectedEntry.material_name}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-white rounded p-2 border">
                  <p className="text-xs text-gray-500">Location</p>
                  <p className="font-medium">{selectedEntry.supplier_city || selectedEntry.supplier_state || selectedEntry.supplier_country}</p>
                </div>
                <div className="bg-white rounded p-2 border">
                  <p className="text-xs text-gray-500">Tier</p>
                  <p className="font-medium" style={{ color: getTierColor(selectedEntry.supplier_tier).bg }}>
                    Tier {selectedEntry.supplier_tier}
                  </p>
                </div>
                <div className="bg-white rounded p-2 border">
                  <p className="text-xs text-gray-500">Distance</p>
                  <p className="font-medium">{selectedEntry.transport_distance_km?.toLocaleString()} km</p>
                </div>
                <div className="bg-white rounded p-2 border">
                  <p className="text-xs text-gray-500">Lead Time</p>
                  <p className="font-medium">{selectedEntry.lead_time_days} days</p>
                </div>
              </div>
              
              <div className="bg-white rounded p-2 border flex items-center gap-2">
                <TransportIcon mode={selectedEntry.transport_mode} />
                <span className="text-sm capitalize">{selectedEntry.transport_mode}</span>
              </div>
              
              <button
                onClick={() => setSelectedEntry(null)}
                className="w-full text-sm text-blue-600 hover:text-blue-700"
              >
                ← Back to summary
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-orange-100 rounded-lg p-3">
                <p className="text-xs text-orange-600">🇮🇳 Make in India</p>
                <p className="text-2xl font-bold text-orange-700">{makeInIndiaPercent}%</p>
              </div>
              
              <div className="bg-green-100 rounded-lg p-3">
                <p className="text-xs text-green-600">Domestic Suppliers</p>
                <p className="text-xl font-bold text-green-700">{domesticEntries.length}</p>
              </div>
              
              {internationalEntries.length > 0 && (
                <div className="bg-blue-100 rounded-lg p-3">
                  <p className="text-xs text-blue-600">Import Sources</p>
                  <p className="text-xl font-bold text-blue-700">{internationalEntries.length}</p>
                </div>
              )}
              
              <div className="bg-gray-100 rounded-lg p-3">
                <p className="text-xs text-gray-600">Total Distance</p>
                <p className="text-lg font-bold text-gray-700">{totalDistance.toLocaleString()} km</p>
              </div>
              
              <div className="bg-purple-100 rounded-lg p-3">
                <p className="text-xs text-purple-600">Avg Lead Time</p>
                <p className="text-lg font-bold text-purple-700">{avgLeadTime} days</p>
              </div>

              {/* Transport mode breakdown */}
              <div className="text-xs text-gray-600 mt-4">
                <p className="font-semibold mb-2">By Transport Mode:</p>
                <div className="space-y-1">
                  {['road', 'rail', 'sea', 'air'].map(mode => {
                    const count = entries.filter(e => e.transport_mode === mode).length
                    if (count === 0) return null
                    return (
                      <div key={mode} className="flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <TransportIcon mode={mode} />
                          <span className="capitalize">{mode}</span>
                        </span>
                        <span className="font-medium">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
