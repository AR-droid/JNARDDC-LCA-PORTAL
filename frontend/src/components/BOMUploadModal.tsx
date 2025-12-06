import { useState, useRef, useEffect } from 'react'
import { materialsApi, MaterialLibraryItem, AddMaterialData } from '../api/materials'
import { Plus, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

interface Props {
  projectId: string
  onClose: () => void
  onSuccess: () => void
}

interface ParsedBOMItem {
  material_name: string
  material_type: string
  quantity: number
  unit: string
  recycled_content: number
  transport_distance: number
  gwp_factor: number
  matched: boolean
  error?: string
}

// Material type mapping for common BOM terms
const MATERIAL_TYPE_MAP: Record<string, string> = {
  // Aluminium
  'aluminum': 'aluminium_primary',
  'aluminium': 'aluminium_primary',
  'al': 'aluminium_primary',
  'aluminum alloy': 'aluminium_primary',
  'aluminium alloy': 'aluminium_primary',
  'recycled aluminum': 'aluminium_secondary',
  'recycled aluminium': 'aluminium_secondary',
  'secondary aluminum': 'aluminium_secondary',
  'secondary aluminium': 'aluminium_secondary',
  
  // Copper
  'copper': 'copper_primary',
  'cu': 'copper_primary',
  'copper wire': 'copper_primary',
  'recycled copper': 'copper_secondary',
  'secondary copper': 'copper_secondary',
  
  // Steel
  'steel': 'steel_primary',
  'iron': 'steel_primary',
  'mild steel': 'steel_primary',
  'carbon steel': 'steel_primary',
  'stainless steel': 'steel_primary',
  'ss': 'steel_primary',
  'recycled steel': 'steel_secondary',
  'secondary steel': 'steel_secondary',
  'scrap steel': 'steel_secondary',
  
  // Battery metals
  'lithium': 'lithium',
  'li': 'lithium',
  'cobalt': 'cobalt',
  'co': 'cobalt',
  'nickel': 'nickel',
  'ni': 'nickel',
}

export default function BOMUploadModal({ projectId, onClose, onSuccess }: Props) {
  const [library, setLibrary] = useState<MaterialLibraryItem[]>([])
  const [parsedItems, setParsedItems] = useState<ParsedBOMItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [step, setStep] = useState<'upload' | 'review' | 'done'>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load material library on mount
  useEffect(() => {
    materialsApi.getLibrary().then(setLibrary).catch(console.error)
  }, [])

  const matchMaterialType = (name: string): { type: string; gwp: number } | null => {
    const lowerName = name.toLowerCase().trim()
    
    // Direct match from map
    if (MATERIAL_TYPE_MAP[lowerName]) {
      const matched = library.find(m => m.type === MATERIAL_TYPE_MAP[lowerName])
      if (matched) return { type: matched.type, gwp: matched.gwp_factor }
    }
    
    // Partial match
    for (const [key, type] of Object.entries(MATERIAL_TYPE_MAP)) {
      if (lowerName.includes(key) || key.includes(lowerName)) {
        const matched = library.find(m => m.type === type)
        if (matched) return { type: matched.type, gwp: matched.gwp_factor }
      }
    }
    
    // Fuzzy match against library
    for (const item of library) {
      if (item.name.toLowerCase().includes(lowerName) || 
          lowerName.includes(item.name.toLowerCase()) ||
          item.type.includes(lowerName)) {
        return { type: item.type, gwp: item.gwp_factor }
      }
    }
    
    return null
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsParsing(true)
    setError('')

    try {
      // Load library if not loaded
      if (library.length === 0) {
        const lib = await materialsApi.getLibrary()
        setLibrary(lib)
      }

      const fileName = file.name.toLowerCase()
      let content = ''
      let lines: string[] = []
      
      // Handle different file types
      if (fileName.endsWith('.pdf') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // For PDF and Excel, use backend API to parse
        const formData = new FormData()
        formData.append('file', file)
        formData.append('auto_parse', 'false') // We'll parse manually
        
        const token = localStorage.getItem('access_token')
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/v1/parse-document`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        })
        
        if (!response.ok) {
          const error = await response.json()
          setError(error.detail || 'Failed to parse file')
          setIsParsing(false)
          return
        }
        
        const result = await response.json()
        content = result.extracted_text || ''
        lines = content.split('\n').filter(line => line.trim())
      } else if (fileName.endsWith('.csv')) {
        // CSV - parse directly
        content = await file.text()
        lines = content.split('\n').filter(line => line.trim())
      } else {
        setError('Unsupported file type. Please upload PDF, Excel (.xlsx, .xls), or CSV file.')
        setIsParsing(false)
        return
      }
      
      if (lines.length < 2) {
        setError('File must have at least a header row and one data row')
        setIsParsing(false)
        return
      }

      // Parse headers - handle both CSV and table formats (with | separators)
      const separator = lines[0].includes('|') ? '|' : ','
      const headers = lines[0].split(separator).map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
      
      // Find column indices
      const nameIdx = headers.findIndex(h => 
        ['name', 'material', 'material_name', 'part', 'component', 'description', 'item'].includes(h)
      )
      const typeIdx = headers.findIndex(h => 
        ['type', 'material_type', 'category', 'material type'].includes(h)
      )
      const qtyIdx = headers.findIndex(h => 
        ['quantity', 'qty', 'amount', 'weight', 'mass'].includes(h)
      )
      const unitIdx = headers.findIndex(h => 
        ['unit', 'units', 'uom'].includes(h)
      )
      const recycledIdx = headers.findIndex(h => 
        ['recycled', 'recycled_content', 'recycled content', 'recycled %', 'recycled_pct'].includes(h)
      )
      const distanceIdx = headers.findIndex(h => 
        ['distance', 'transport', 'transport_distance', 'km'].includes(h)
      )

      if (nameIdx === -1 && typeIdx === -1) {
        setError('File must have a "name" or "material" column')
        setIsParsing(false)
        return
      }

      if (qtyIdx === -1) {
        setError('File must have a "quantity" or "qty" column')
        setIsParsing(false)
        return
      }

      // Parse data rows
      const items: ParsedBOMItem[] = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(separator).map(v => v.trim().replace(/['"]/g, ''))
        
        const materialName = values[nameIdx] || values[typeIdx] || `Material ${i}`
        const materialType = values[typeIdx] || values[nameIdx] || ''
        const quantity = parseFloat(values[qtyIdx]) || 0
        const unit = values[unitIdx] || 'kg'
        const recycled = recycledIdx >= 0 ? parseFloat(values[recycledIdx]) || 0 : 0
        const distance = distanceIdx >= 0 ? parseFloat(values[distanceIdx]) || 0 : 500

        if (quantity <= 0) continue // Skip invalid rows

        // Try to match material type
        const match = matchMaterialType(materialType || materialName)

        items.push({
          material_name: materialName,
          material_type: match?.type || materialType,
          quantity,
          unit: unit.toLowerCase() === 'kg' || unit.toLowerCase() === 'kilograms' ? 'kg' : unit,
          recycled_content: Math.min(100, Math.max(0, recycled)),
          transport_distance: distance,
          gwp_factor: match?.gwp || 0,
          matched: !!match,
          error: match ? undefined : 'Unknown material type - please select manually'
        })
      }

      if (items.length === 0) {
        setError('No valid materials found in the CSV')
        setIsParsing(false)
        return
      }

      setParsedItems(items)
      setStep('review')
    } catch (err: any) {
      setError('Failed to parse CSV file: ' + err.message)
    } finally {
      setIsParsing(false)
    }
  }

  const updateItem = (index: number, field: string, value: any) => {
    setParsedItems(items => items.map((item, i) => {
      if (i !== index) return item
      
      const updated = { ...item, [field]: value }
      
      // If material type changed, update GWP factor and recalculate
      if (field === 'material_type') {
        const matched = library.find(m => m.type === value)
        if (matched) {
          updated.gwp_factor = matched.gwp_factor
          updated.matched = true
          updated.error = undefined
        }
      }
      
      // Recalculate effective GWP when recycled_content changes
      // Primary materials have higher GWP, recycled content reduces it
      if (field === 'recycled_content' || field === 'material_type') {
        const baseGWP = library.find(m => m.type === updated.material_type)?.gwp_factor || updated.gwp_factor
        // Recycled content typically reduces GWP by 60-95% depending on material
        // Using average 80% reduction for recycled portion
        const recycledFraction = (updated.recycled_content || 0) / 100
        const effectiveGWP = baseGWP * (1 - recycledFraction * 0.8)
        updated.gwp_factor = Math.round(effectiveGWP * 100) / 100
      }
      
      return updated
    }))
  }

  const removeItem = (index: number) => {
    setParsedItems(items => items.filter((_, i) => i !== index))
  }

  const addNewItem = () => {
    const newItem: ParsedBOMItem = {
      material_name: `New Material ${parsedItems.length + 1}`,
      material_type: '',
      quantity: 0,
      unit: 'kg',
      recycled_content: 0,
      transport_distance: 500,
      gwp_factor: 0,
      matched: false,
      error: 'Please select a material type'
    }
    setParsedItems([...parsedItems, newItem])
  }

  const handleImportAll = async () => {
    const validItems = parsedItems.filter(item => item.matched && item.quantity > 0)
    
    if (validItems.length === 0) {
      setError('No valid materials to import. Please fix the unmatched items.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Prepare batch data
      const materialsData: AddMaterialData[] = validItems.map(item => ({
        material_name: item.material_name,
        material_type: item.material_type,
        quantity: item.quantity,
        unit: item.unit,
        recycled_content: item.recycled_content,
        transport_distance: item.transport_distance,
      }))

      // Use batch API for efficiency
      const result = await materialsApi.addBatch(projectId, materialsData)
      
      if (result.failed > 0) {
        setSuccess(`Imported ${result.added} materials. ${result.failed} failed.`)
      } else {
        setSuccess(`Successfully imported ${result.added} materials! Total GWP: ${result.total_gwp.toFixed(2)} kg CO₂-eq`)
      }
      
      setStep('done')
      
      // Auto-close after success
      setTimeout(() => {
        onSuccess()
      }, 1500)
    } catch (err: any) {
      console.error('Failed to import materials:', err)
      setError('Failed to import materials: ' + (err.message || 'Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Import Bill of Materials</h2>
              <p className="text-sm text-gray-500 mt-1">Upload PDF, Excel, or CSV file with your materials</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
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
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="flex justify-center mb-4">
                  <FileText className="w-16 h-16 text-gray-400" />
                </div>
                <p className="text-lg font-medium text-gray-700">
                  {isParsing ? 'Parsing...' : 'Click to upload PDF, Excel, or CSV'}
                </p>
                <p className="text-sm text-gray-500 mt-2">or drag and drop</p>
              </div>

              {/* File Format Guide */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">📋 Supported Formats</h3>
                <p className="text-sm text-blue-700 mb-3">
                  <strong>PDF:</strong> BOM tables from design documents<br/>
                  <strong>Excel (.xlsx, .xls):</strong> Spreadsheets with material data<br/>
                  <strong>CSV:</strong> Comma-separated values with columns:
                </p>
                <div className="bg-white rounded p-3 font-mono text-xs overflow-x-auto">
                  <p className="text-gray-600">name,type,quantity,unit,recycled_content,transport_distance</p>
                  <p className="text-gray-800">Copper Wire,copper,50,kg,30,500</p>
                  <p className="text-gray-800">Aluminum Sheet,aluminium,100,kg,60,300</p>
                  <p className="text-gray-800">Steel Frame,steel,200,kg,80,400</p>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  * Required: name/material, quantity. Optional: type, unit (default: kg), recycled_content (0-100%), transport_distance (km)
                </p>
              </div>

              {/* Quick Template Download */}
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    const template = 'name,type,quantity,unit,recycled_content,transport_distance\nCopper Wire,copper,50,kg,30,500\nAluminum Sheet,aluminium,100,kg,60,300\nSteel Frame,steel,200,kg,80,400'
                    const blob = new Blob([template], { type: 'text/csv' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'bom_template.csv'
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                  className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-2"
                >
                  📥 Download Template CSV
                </button>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600">
                    Found <span className="font-bold text-blue-600">{parsedItems.length}</span> materials
                    {' • '}
                    <span className="text-green-600">{parsedItems.filter(i => i.matched).length} matched</span>
                    {' • '}
                    <span className="text-orange-600">{parsedItems.filter(i => !i.matched).length} need attention</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={addNewItem}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 px-3 py-1 border border-blue-300 rounded-lg hover:bg-blue-50"
                  >
                    <Plus size={14} /> Add Material
                  </button>
                  <button
                    onClick={() => { setStep('upload'); setParsedItems([]) }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    ← Upload different file
                  </button>
                </div>
              </div>

              {/* Materials Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-2 px-3">Name</th>
                      <th className="text-left py-2 px-3">Type</th>
                      <th className="text-right py-2 px-3">Qty</th>
                      <th className="text-right py-2 px-3">Recycled %</th>
                      <th className="text-right py-2 px-3">GWP Factor</th>
                      <th className="text-right py-2 px-3">Est. GWP</th>
                      <th className="text-center py-2 px-3">Status</th>
                      <th className="text-center py-2 px-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedItems.map((item, index) => (
                      <tr key={index} className={`border-t ${!item.matched ? 'bg-orange-50' : ''}`}>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={item.material_name}
                            onChange={(e) => updateItem(index, 'material_name', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={item.material_type}
                            onChange={(e) => updateItem(index, 'material_type', e.target.value)}
                            className={`w-full px-2 py-1 border rounded text-sm ${!item.matched ? 'border-orange-300' : ''}`}
                          >
                            <option value="">Select type...</option>
                            {library.map(m => (
                              <option key={m.type} value={m.type}>{m.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border rounded text-sm text-right"
                            min="0"
                            step="0.1"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.recycled_content}
                            onChange={(e) => updateItem(index, 'recycled_content', parseFloat(e.target.value) || 0)}
                            className="w-16 px-2 py-1 border rounded text-sm text-right"
                          />
                        </td>
                        <td className="py-2 px-3 text-right text-gray-600">
                          {item.gwp_factor > 0 ? `${item.gwp_factor}` : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-blue-600">
                          {item.gwp_factor > 0 && item.quantity > 0 
                            ? `${(item.gwp_factor * item.quantity).toFixed(1)} kg`
                            : '-'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {item.matched ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <AlertCircle className="w-4 h-4 text-orange-500" title={item.error} />
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => removeItem(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Table Footer with Totals */}
                  <tfoot className="bg-gray-100 border-t-2">
                    <tr>
                      <td colSpan={2} className="py-2 px-3 font-semibold text-gray-700">Total</td>
                      <td className="py-2 px-3 text-right font-semibold">
                        {parsedItems.reduce((sum, i) => sum + (i.quantity || 0), 0).toFixed(1)} kg
                      </td>
                      <td className="py-2 px-3 text-right text-gray-500 text-xs">
                        Avg: {parsedItems.length > 0 
                          ? (parsedItems.reduce((sum, i) => sum + (i.recycled_content || 0), 0) / parsedItems.length).toFixed(0)
                          : 0}%
                      </td>
                      <td className="py-2 px-3"></td>
                      <td className="py-2 px-3 text-right font-bold text-blue-700">
                        {parsedItems.reduce((sum, i) => sum + (i.gwp_factor * i.quantity || 0), 0).toFixed(1)} kg CO₂
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {parsedItems.some(i => !i.matched) && (
                <p className="text-sm text-orange-600">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Some materials couldn't be matched automatically. Please select the correct type from the dropdown.
                  </div>
                </p>
              )}
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <CheckCircle className="w-16 h-16 text-green-500" />
              </div>
              <p className="text-xl font-semibold text-gray-900">{success}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
            >
              {step === 'done' ? 'Close' : 'Cancel'}
            </button>
            {step === 'review' && (
              <button
                onClick={handleImportAll}
                disabled={isLoading || parsedItems.filter(i => i.matched).length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Importing...
                  </>
                ) : (
                  <>
                    Import {parsedItems.filter(i => i.matched).length} Materials
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
