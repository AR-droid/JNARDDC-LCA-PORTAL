import { useState, useRef, useEffect } from 'react'
import { Plus, X, Upload, MapPin, Truck, Package, Globe, Train, Ship, Plane, RotateCcw, Loader2 } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

interface Props {
  projectId: string
  onClose: () => void
  onSuccess: () => void
}

interface ParsedSupplyChainEntry {
  material_name: string
  supplier_name: string
  supplier_country: string
  supplier_state: string
  supplier_city: string
  supplier_tier: number
  transport_mode: string
  transport_distance_km: number
  lead_time_days: number
  extraction_type: string
  extraction_location: string
  notes: string
  isValid: boolean
  error?: string
}

interface GeoData {
  states: string[]
  cities: string[]
  international_sources: string[]
}

const TRANSPORT_MODES = [
  { value: 'road', label: 'Road (Truck)', Icon: Truck, color: 'text-orange-600' },
  { value: 'rail', label: 'Rail', Icon: Train, color: 'text-purple-600' },
  { value: 'sea', label: 'Sea', Icon: Ship, color: 'text-blue-600' },
  { value: 'air', label: 'Air', Icon: Plane, color: 'text-sky-500' },
  { value: 'multimodal', label: 'Multimodal', Icon: RotateCcw, color: 'text-green-600' },
]

const EXTRACTION_TYPES = [
  { value: 'mining', label: 'Mining (Primary)' },
  { value: 'recycling', label: 'Recycling (Secondary)' },
  { value: 'refining', label: 'Refining' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'processing', label: 'Processing' },
  { value: 'trading', label: 'Trading/Import' },
]

export default function SupplyChainUploadModal({ projectId, onClose, onSuccess }: Props) {
  const [entries, setEntries] = useState<ParsedSupplyChainEntry[]>([])
  const [geoData, setGeoData] = useState<GeoData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [step, setStep] = useState<'upload' | 'review' | 'done'>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load geo data on mount
  useEffect(() => {
    fetch(`${API_BASE}/geo/india-locations`)
      .then(res => res.json())
      .then(data => setGeoData(data))
      .catch(console.error)
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsParsing(true)
    setError('')

    try {
      const content = await file.text()
      const lines = content.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        setError('CSV file must have at least a header row and one data row')
        setIsParsing(false)
        return
      }

      // Parse headers
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
      
      // Find column indices
      const materialIdx = headers.findIndex(h => ['material_name', 'material', 'name', 'item'].includes(h))
      const supplierIdx = headers.findIndex(h => ['supplier_name', 'supplier', 'vendor'].includes(h))
      const countryIdx = headers.findIndex(h => ['supplier_country', 'country', 'origin'].includes(h))
      const stateIdx = headers.findIndex(h => ['supplier_state', 'state', 'region'].includes(h))
      const cityIdx = headers.findIndex(h => ['supplier_city', 'city', 'location'].includes(h))
      const tierIdx = headers.findIndex(h => ['supplier_tier', 'tier'].includes(h))
      const transportIdx = headers.findIndex(h => ['transport_mode', 'transport', 'mode'].includes(h))
      const distanceIdx = headers.findIndex(h => ['transport_distance_km', 'distance_km', 'distance'].includes(h))
      const leadTimeIdx = headers.findIndex(h => ['lead_time_days', 'lead_time', 'days'].includes(h))
      const extractionIdx = headers.findIndex(h => ['extraction_type', 'extraction', 'type'].includes(h))
      const extractionLocIdx = headers.findIndex(h => ['extraction_location', 'mine_location', 'source'].includes(h))
      const notesIdx = headers.findIndex(h => ['notes', 'remarks', 'comments'].includes(h))

      if (materialIdx === -1) {
        setError('CSV must have a "material_name" or "material" column')
        setIsParsing(false)
        return
      }

      if (supplierIdx === -1) {
        setError('CSV must have a "supplier_name" or "supplier" column')
        setIsParsing(false)
        return
      }

      // Parse data rows
      const items: ParsedSupplyChainEntry[] = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''))
        
        const materialName = values[materialIdx] || `Material ${i}`
        const supplierName = values[supplierIdx] || ''
        
        if (!supplierName) continue // Skip rows without supplier

        const country = countryIdx >= 0 ? values[countryIdx] || 'India' : 'India'
        const state = stateIdx >= 0 ? values[stateIdx] || '' : ''
        const city = cityIdx >= 0 ? values[cityIdx] || '' : ''
        const tier = tierIdx >= 0 ? parseInt(values[tierIdx]) || 1 : 1
        const transport = transportIdx >= 0 ? values[transportIdx] || 'road' : 'road'
        const distance = distanceIdx >= 0 ? parseFloat(values[distanceIdx]) || 0 : 0
        const leadTime = leadTimeIdx >= 0 ? parseInt(values[leadTimeIdx]) || 0 : 0
        const extraction = extractionIdx >= 0 ? values[extractionIdx] || '' : ''
        const extractionLoc = extractionLocIdx >= 0 ? values[extractionLocIdx] || '' : ''
        const notes = notesIdx >= 0 ? values[notesIdx] || '' : ''

        items.push({
          material_name: materialName,
          supplier_name: supplierName,
          supplier_country: country,
          supplier_state: state,
          supplier_city: city,
          supplier_tier: tier,
          transport_mode: transport.toLowerCase(),
          transport_distance_km: distance,
          lead_time_days: leadTime,
          extraction_type: extraction.toLowerCase(),
          extraction_location: extractionLoc,
          notes: notes,
          isValid: true
        })
      }

      if (items.length === 0) {
        setError('No valid supply chain entries found in the CSV')
        setIsParsing(false)
        return
      }

      setEntries(items)
      setStep('review')
    } catch (err: any) {
      setError('Failed to parse CSV file: ' + err.message)
    } finally {
      setIsParsing(false)
    }
  }

  const updateEntry = (index: number, field: string, value: any) => {
    setEntries(items => items.map((item, i) => {
      if (i !== index) return item
      return { ...item, [field]: value }
    }))
  }

  const removeEntry = (index: number) => {
    setEntries(items => items.filter((_, i) => i !== index))
  }

  const addNewEntry = () => {
    const newEntry: ParsedSupplyChainEntry = {
      material_name: '',
      supplier_name: '',
      supplier_country: 'India',
      supplier_state: '',
      supplier_city: '',
      supplier_tier: 1,
      transport_mode: 'road',
      transport_distance_km: 0,
      lead_time_days: 0,
      extraction_type: '',
      extraction_location: '',
      notes: '',
      isValid: false
    }
    setEntries([...entries, newEntry])
  }

  const handleImportAll = async () => {
    const validEntries = entries.filter(e => e.supplier_name && e.material_name)
    
    if (validEntries.length === 0) {
      setError('No valid entries to import. Each entry needs a material name and supplier name.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        setError('Not authenticated. Please log in again.')
        setIsLoading(false)
        return
      }
      
      const response = await fetch(`${API_BASE}/projects/${projectId}/supply-chain/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ entries: validEntries })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.detail || 'Failed to import supply chain data')
      }

      setSuccess(`Successfully imported ${result.added} supply chain entries!`)
      setStep('done')
      
      setTimeout(() => {
        onSuccess()
      }, 1500)
    } catch (err: any) {
      setError('Failed to import supply chain data: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const domesticCount = entries.filter(e => e.supplier_country.toLowerCase() === 'india').length
  const makeInIndiaPercent = entries.length > 0 ? Math.round(domesticCount / entries.length * 100) : 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-orange-500 to-green-600">
          <div className="flex justify-between items-center">
            <div className="text-white">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Globe className="w-6 h-6" />
                Supply Chain Tracking
              </h2>
              <p className="text-sm text-orange-100 mt-1">
                🇮🇳 Make in India - Track your material sources and supply routes
              </p>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white text-2xl">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm">{success}</p>
            </div>
          )}

          {step === 'upload' && (
            <div className="space-y-6">
              {/* Upload Area */}
              <div 
                className="border-2 border-dashed border-orange-300 rounded-lg p-8 text-center hover:border-orange-500 transition cursor-pointer bg-orange-50/50"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="w-12 h-12 mx-auto mb-4 text-orange-500" />
                <p className="text-lg font-medium text-gray-700">
                  {isParsing ? 'Parsing...' : 'Click to upload Supply Chain CSV'}
                </p>
                <p className="text-sm text-gray-500 mt-2">or drag and drop</p>
              </div>

              {/* CSV Format Guide */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  CSV Format for Supply Chain Data
                </h3>
                <div className="bg-white rounded p-3 font-mono text-xs overflow-x-auto">
                  <p className="text-gray-600">material_name,supplier_name,supplier_country,supplier_state,supplier_city,supplier_tier,transport_mode,transport_distance_km,lead_time_days,extraction_type,extraction_location,notes</p>
                  <p className="text-gray-800">Aluminium Ingot,Hindalco,India,Odisha,Hirakud,1,rail,850,7,refining,Hirakud Smelter,Primary supplier</p>
                  <p className="text-gray-800">Copper Wire,HCL,India,Rajasthan,Khetri,1,road,500,5,mining,Khetri Copper Complex,</p>
                  <p className="text-gray-800">Lithium Carbonate,Ganfeng,China,,Shanghai,2,sea,4500,30,processing,China Hub,Import</p>
                </div>
                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="bg-orange-100 rounded p-2">
                    <strong>🇮🇳 India States:</strong> Odisha, Jharkhand, Rajasthan, Gujarat...
                  </div>
                  <div className="bg-blue-100 rounded p-2">
                    <strong>🚛 Transport:</strong> road, rail, sea, air, multimodal
                  </div>
                  <div className="bg-green-100 rounded p-2">
                    <strong>Extraction:</strong> mining, recycling, refining, manufacturing
                  </div>
                  <div className="bg-purple-100 rounded p-2">
                    <strong>Tier:</strong> 1 (Direct), 2 (Secondary), 3 (Tertiary)
                  </div>
                </div>
              </div>

              {/* Quick Template Download */}
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => {
                    const template = 'material_name,supplier_name,supplier_country,supplier_state,supplier_city,supplier_tier,transport_mode,transport_distance_km,lead_time_days,extraction_type,extraction_location,notes\nAluminium Ingot,Hindalco,India,Odisha,Hirakud,1,rail,850,7,refining,Hirakud Smelter,Primary supplier\nCopper Wire,HCL,India,Rajasthan,Khetri,1,road,500,5,mining,Khetri Copper Complex,\nSteel Sheet,SAIL,India,Jharkhand,Jamshedpur,1,rail,400,5,manufacturing,Tata Steel Works,'
                    const blob = new Blob([template], { type: 'text/csv' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'supply_chain_template.csv'
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                  className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-2 border border-blue-300 px-4 py-2 rounded-lg hover:bg-blue-50"
                >
                  📥 Download Template CSV
                </button>
                <button
                  onClick={() => { setStep('review'); addNewEntry(); }}
                  className="text-orange-600 hover:text-orange-700 text-sm flex items-center gap-2 border border-orange-300 px-4 py-2 rounded-lg hover:bg-orange-50"
                >
                  <Plus size={16} /> Add Manually
                </button>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              {/* Summary Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="bg-orange-100 rounded-lg px-3 py-2">
                    <p className="text-xs text-orange-600">Total Suppliers</p>
                    <p className="text-xl font-bold text-orange-700">{entries.length}</p>
                  </div>
                  <div className="bg-green-100 rounded-lg px-3 py-2">
                    <p className="text-xs text-green-600">🇮🇳 Make in India</p>
                    <p className="text-xl font-bold text-green-700">{makeInIndiaPercent}%</p>
                  </div>
                  <div className="bg-blue-100 rounded-lg px-3 py-2">
                    <p className="text-xs text-blue-600">Domestic / Import</p>
                    <p className="text-xl font-bold text-blue-700">{domesticCount} / {entries.length - domesticCount}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={addNewEntry}
                    className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1 px-3 py-1 border border-orange-300 rounded-lg hover:bg-orange-50"
                  >
                    <Plus size={14} /> Add Entry
                  </button>
                  <button
                    onClick={() => { setStep('upload'); setEntries([]) }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    ← Upload different file
                  </button>
                </div>
              </div>

              {/* Entries Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-2 px-3">Material</th>
                        <th className="text-left py-2 px-3">Supplier</th>
                        <th className="text-left py-2 px-3">Location</th>
                        <th className="text-center py-2 px-3">Tier</th>
                        <th className="text-left py-2 px-3">Transport</th>
                        <th className="text-right py-2 px-3">Distance</th>
                        <th className="text-right py-2 px-3">Lead Time</th>
                        <th className="text-left py-2 px-3">Extraction</th>
                        <th className="text-center py-2 px-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry, index) => (
                        <tr key={index} className={`border-t ${entry.supplier_country.toLowerCase() === 'india' ? 'bg-orange-50/30' : 'bg-blue-50/30'}`}>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={entry.material_name}
                              onChange={(e) => updateEntry(index, 'material_name', e.target.value)}
                              className="w-full px-2 py-1 border rounded text-sm"
                              placeholder="Material name"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={entry.supplier_name}
                              onChange={(e) => updateEntry(index, 'supplier_name', e.target.value)}
                              className="w-full px-2 py-1 border rounded text-sm"
                              placeholder="Supplier name"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex flex-col gap-1">
                              <select
                                value={entry.supplier_country}
                                onChange={(e) => updateEntry(index, 'supplier_country', e.target.value)}
                                className="w-full px-2 py-1 border rounded text-xs"
                              >
                                <option value="India">🇮🇳 India</option>
                                {geoData?.international_sources.map(c => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                              {entry.supplier_country === 'India' && (
                                <div className="flex gap-1">
                                  <select
                                    value={entry.supplier_state}
                                    onChange={(e) => updateEntry(index, 'supplier_state', e.target.value)}
                                    className="w-1/2 px-1 py-1 border rounded text-xs"
                                  >
                                    <option value="">State...</option>
                                    {geoData?.states.map(s => (
                                      <option key={s} value={s}>{s}</option>
                                    ))}
                                  </select>
                                  <select
                                    value={entry.supplier_city}
                                    onChange={(e) => updateEntry(index, 'supplier_city', e.target.value)}
                                    className="w-1/2 px-1 py-1 border rounded text-xs"
                                  >
                                    <option value="">City...</option>
                                    {geoData?.cities.map(c => (
                                      <option key={c} value={c}>{c}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <select
                              value={entry.supplier_tier}
                              onChange={(e) => updateEntry(index, 'supplier_tier', parseInt(e.target.value))}
                              className="w-16 px-1 py-1 border rounded text-sm text-center"
                            >
                              <option value={1}>T1</option>
                              <option value={2}>T2</option>
                              <option value={3}>T3</option>
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={entry.transport_mode}
                              onChange={(e) => updateEntry(index, 'transport_mode', e.target.value)}
                              className="w-full px-2 py-1 border rounded text-sm"
                            >
                              {TRANSPORT_MODES.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              value={entry.transport_distance_km}
                              onChange={(e) => updateEntry(index, 'transport_distance_km', parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1 border rounded text-sm text-right"
                              placeholder="km"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              value={entry.lead_time_days}
                              onChange={(e) => updateEntry(index, 'lead_time_days', parseInt(e.target.value) || 0)}
                              className="w-16 px-2 py-1 border rounded text-sm text-right"
                              placeholder="days"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={entry.extraction_type}
                              onChange={(e) => updateEntry(index, 'extraction_type', e.target.value)}
                              className="w-full px-2 py-1 border rounded text-sm"
                            >
                              <option value="">Select...</option>
                              {EXTRACTION_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              onClick={() => removeEntry(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-100 border-t-2">
                      <tr>
                        <td colSpan={5} className="py-2 px-3 font-semibold text-gray-700">
                          Total: {entries.length} suppliers
                        </td>
                        <td className="py-2 px-3 text-right font-semibold">
                          {entries.reduce((sum, e) => sum + (e.transport_distance_km || 0), 0).toLocaleString()} km
                        </td>
                        <td className="py-2 px-3 text-right font-semibold">
                          Avg: {entries.length > 0 ? Math.round(entries.reduce((sum, e) => sum + (e.lead_time_days || 0), 0) / entries.length) : 0} days
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <MapPin className="w-16 h-16 text-gray-400" />
              </div>
              <p className="text-xl font-semibold text-gray-900">{success}</p>
              <p className="text-sm text-gray-500 mt-2">View your supply chain on the map</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <MapPin size={16} className="text-orange-500" />
              <span>Supply routes will be visualized on the India map</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
              >
                {step === 'done' ? 'Close' : 'Cancel'}
              </button>
              {step === 'review' && (
                <button
                  onClick={handleImportAll}
                  disabled={isLoading || entries.filter(e => e.supplier_name && e.material_name).length === 0}
                  className="px-6 py-2 bg-gradient-to-r from-orange-500 to-green-600 text-white rounded-lg hover:from-orange-600 hover:to-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoading ? (
                    <><Loader2 size={16} className="animate-spin" /> Importing...</>
                  ) : (
                    <>
                      <Truck size={16} />
                      Import {entries.filter(e => e.supplier_name && e.material_name).length} Entries
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
