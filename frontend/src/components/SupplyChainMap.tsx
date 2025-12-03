import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Truck, Train, Ship, Plane, Factory } from 'lucide-react'
import { renderToStaticMarkup } from 'react-dom/server'

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

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
  destinationLat?: number
  destinationLng?: number
}

// Custom marker icons
const createCustomIcon = (color: string, IconComponent: any) => {
  const iconMarkup = renderToStaticMarkup(
    <div style={{
      backgroundColor: color,
      borderRadius: '50%',
      width: '32px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '3px solid white',
      boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
    }}>
      <IconComponent size={16} color="white" />
    </div>
  )
  
  return L.divIcon({
    html: iconMarkup,
    className: 'custom-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  })
}

// Get color based on tier
const getTierColor = (tier: number) => {
  switch (tier) {
    case 1: return '#22c55e' // green
    case 2: return '#f59e0b' // amber
    case 3: return '#ef4444' // red
    default: return '#6b7280' // gray
  }
}

// Get transport icon
const getTransportIcon = (mode: string) => {
  switch (mode?.toLowerCase()) {
    case 'rail': return Train
    case 'sea': return Ship
    case 'air': return Plane
    default: return Truck
  }
}

// Get line color based on transport mode
const getTransportColor = (mode: string) => {
  switch (mode?.toLowerCase()) {
    case 'rail': return '#9333ea' // purple
    case 'sea': return '#0ea5e9' // sky blue
    case 'air': return '#06b6d4' // cyan
    default: return '#f97316' // orange
  }
}

// Get line style based on transport mode
const getLineStyle = (mode: string): L.PolylineOptions => {
  const color = getTransportColor(mode)
  switch (mode?.toLowerCase()) {
    case 'rail':
      return { color, weight: 3, dashArray: '10, 10' }
    case 'sea':
      return { color, weight: 3, dashArray: '5, 10' }
    case 'air':
      return { color, weight: 2, dashArray: '2, 8' }
    default:
      return { color, weight: 3 }
  }
}

// Component to fit map bounds
function FitBounds({ entries, destinationLat, destinationLng }: { 
  entries: SupplyChainEntry[], 
  destinationLat: number, 
  destinationLng: number 
}) {
  const map = useMap()
  
  useEffect(() => {
    if (entries.length === 0) {
      // Default to India view
      map.setView([20.5937, 78.9629], 5)
      return
    }
    
    const points: [number, number][] = entries
      .filter(e => {
        const lat = Number(e.latitude)
        const lng = Number(e.longitude)
        return isFinite(lat) && isFinite(lng) && lat !== 0 && lng !== 0
      })
      .map(e => [Number(e.latitude), Number(e.longitude)])
    
    // Add destination if valid
    if (isFinite(destinationLat) && isFinite(destinationLng)) {
      points.push([destinationLat, destinationLng])
    }
    
    if (points.length > 1) {
      try {
        const bounds = L.latLngBounds(points)
        map.fitBounds(bounds, { padding: [50, 50] })
      } catch (e) {
        console.error('Error fitting bounds:', e)
        map.setView([20.5937, 78.9629], 5)
      }
    } else if (points.length === 1) {
      map.setView(points[0], 8)
    } else {
      map.setView([20.5937, 78.9629], 5)
    }
  }, [entries, destinationLat, destinationLng, map])
  
  return null
}

// Create curved path for routes (for visual appeal)
const createCurvedPath = (
  start: [number, number], 
  end: [number, number],
  curveOffset: number = 0.2
): [number, number][] => {
  // Validate inputs
  if (!start || !end || 
      !isFinite(start[0]) || !isFinite(start[1]) || 
      !isFinite(end[0]) || !isFinite(end[1])) {
    return [start, end].filter(p => p && isFinite(p[0]) && isFinite(p[1]))
  }

  const midLat = (start[0] + end[0]) / 2
  const midLng = (start[1] + end[1]) / 2
  
  // Calculate perpendicular offset for curve
  const dx = end[1] - start[1]
  const dy = end[0] - start[0]
  const distance = Math.sqrt(dx * dx + dy * dy)
  
  // If points are too close, just return straight line
  if (distance < 0.01) {
    return [start, end]
  }
  
  // Normalize and rotate 90 degrees for perpendicular
  const offsetLat = midLat + (dx / distance) * curveOffset * distance
  const offsetLng = midLng - (dy / distance) * curveOffset * distance
  
  // Create bezier-like curve with multiple points
  const points: [number, number][] = []
  for (let t = 0; t <= 1; t += 0.05) {
    const lat = Math.pow(1-t, 2) * start[0] + 2 * (1-t) * t * offsetLat + Math.pow(t, 2) * end[0]
    const lng = Math.pow(1-t, 2) * start[1] + 2 * (1-t) * t * offsetLng + Math.pow(t, 2) * end[1]
    if (isFinite(lat) && isFinite(lng)) {
      points.push([lat, lng])
    }
  }
  
  return points.length > 0 ? points : [start, end]
}

export default function SupplyChainMap({ 
  entries, 
  destinationName = 'Manufacturing Plant',
  destinationLat = 19.076,  // Mumbai default
  destinationLng = 72.8777
}: Props) {
  
  // Filter entries with valid coordinates - must be real numbers within valid lat/lng ranges
  const validEntries = useMemo(() => 
    entries.filter(e => {
      const lat = Number(e.latitude)
      const lng = Number(e.longitude)
      return (
        isFinite(lat) && isFinite(lng) &&
        lat >= -90 && lat <= 90 &&
        lng >= -180 && lng <= 180 &&
        (lat !== 0 || lng !== 0) // Exclude 0,0 which is likely missing data
      )
    }),
    [entries]
  )
  
  // Calculate stats
  const stats = useMemo(() => {
    const domestic = validEntries.filter(e => e.supplier_country?.toLowerCase() === 'india').length
    const international = validEntries.length - domestic
    const makeInIndia = validEntries.length > 0 ? Math.round((domestic / validEntries.length) * 100) : 0
    return { domestic, international, makeInIndia, total: validEntries.length }
  }, [validEntries])

  // Factory icon for destination
  const factoryIcon = createCustomIcon('#1e40af', Factory)

  return (
    <div className="relative">
      {/* Stats Bar */}
      <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur rounded-lg shadow-lg p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
          <span className="text-xl">🇮🇳</span> Make in India
        </div>
        <div className="text-2xl font-bold text-green-600">{stats.makeInIndia}%</div>
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex justify-between gap-4">
            <span>Domestic:</span>
            <span className="font-medium text-green-600">{stats.domestic}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Import:</span>
            <span className="font-medium text-orange-600">{stats.international}</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur rounded-lg shadow-lg p-3">
        <div className="text-xs font-semibold text-gray-700 mb-2">Transport Mode</div>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-orange-500"></div>
            <Truck size={12} className="text-orange-500" />
            <span>Road</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-purple-600" style={{backgroundImage: 'repeating-linear-gradient(90deg, #9333ea 0, #9333ea 4px, transparent 4px, transparent 8px)'}}></div>
            <Train size={12} className="text-purple-600" />
            <span>Rail</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-sky-500" style={{backgroundImage: 'repeating-linear-gradient(90deg, #0ea5e9 0, #0ea5e9 2px, transparent 2px, transparent 6px)'}}></div>
            <Ship size={12} className="text-sky-500" />
            <span>Sea</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-cyan-500" style={{backgroundImage: 'repeating-linear-gradient(90deg, #06b6d4 0, #06b6d4 1px, transparent 1px, transparent 5px)'}}></div>
            <Plane size={12} className="text-cyan-500" />
            <span>Air</span>
          </div>
        </div>
        <div className="border-t mt-2 pt-2 text-xs font-semibold text-gray-700">Supplier Tier</div>
        <div className="space-y-1 mt-1.5 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Tier 1 (Direct)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span>Tier 2</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Tier 3</span>
          </div>
        </div>
      </div>

      {/* Map */}
      <MapContainer
        center={[20.5937, 78.9629]}
        zoom={5}
        style={{ height: '500px', width: '100%' }}
        className="rounded-b-lg"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <FitBounds 
          entries={validEntries} 
          destinationLat={destinationLat} 
          destinationLng={destinationLng} 
        />
        
        {/* Supply Routes */}
        {validEntries.map((entry) => {
          const lat = Number(entry.latitude)
          const lng = Number(entry.longitude)
          if (!isFinite(lat) || !isFinite(lng)) return null
          
          const start: [number, number] = [lat, lng]
          const end: [number, number] = [destinationLat, destinationLng]
          const curvedPath = createCurvedPath(start, end, 0.15)
          
          if (curvedPath.length < 2) return null
          
          return (
            <Polyline
              key={`route-${entry.id}`}
              positions={curvedPath}
              pathOptions={getLineStyle(entry.transport_mode)}
            />
          )
        })}
        
        {/* Supplier Markers */}
        {validEntries.map((entry) => {
          const lat = Number(entry.latitude)
          const lng = Number(entry.longitude)
          if (!isFinite(lat) || !isFinite(lng)) return null
          
          const TransportIconComponent = getTransportIcon(entry.transport_mode)
          const icon = createCustomIcon(getTierColor(entry.supplier_tier), TransportIconComponent)
          
          return (
            <Marker
              key={entry.id}
              position={[lat, lng]}
              icon={icon}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <div className="font-bold text-gray-900">{entry.supplier_name}</div>
                  <div className="text-sm text-gray-600">{entry.material_name}</div>
                  <div className="mt-2 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Location:</span>
                      <span className="font-medium">
                        {entry.supplier_city && `${entry.supplier_city}, `}
                        {entry.supplier_state && `${entry.supplier_state}, `}
                        {entry.supplier_country}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tier:</span>
                      <span className={`font-medium ${
                        entry.supplier_tier === 1 ? 'text-green-600' :
                        entry.supplier_tier === 2 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        Tier {entry.supplier_tier}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Transport:</span>
                      <span className="font-medium capitalize">{entry.transport_mode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Distance:</span>
                      <span className="font-medium">{entry.transport_distance_km.toLocaleString()} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Lead Time:</span>
                      <span className="font-medium">{entry.lead_time_days} days</span>
                    </div>
                  </div>
                  {entry.supplier_country?.toLowerCase() === 'india' && (
                    <div className="mt-2 text-xs bg-green-50 text-green-700 px-2 py-1 rounded flex items-center gap-1">
                      <span>🇮🇳</span> Make in India Supplier
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}
        
        {/* Destination Marker (Factory) */}
        <Marker position={[destinationLat, destinationLng]} icon={factoryIcon}>
          <Popup>
            <div className="font-bold text-gray-900 flex items-center gap-2">
              <Factory size={16} className="text-blue-700" />
              {destinationName}
            </div>
            <div className="text-xs text-gray-500 mt-1">Manufacturing Destination</div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}
