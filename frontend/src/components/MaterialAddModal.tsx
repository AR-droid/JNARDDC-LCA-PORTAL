import { useState, useEffect, FormEvent } from 'react'
import { materialsApi, MaterialLibraryItem } from '../api/materials'

interface Props {
  projectId: string
  onClose: () => void
  onSuccess: () => void
}

export default function MaterialAddModal({ projectId, onClose, onSuccess }: Props) {
  const [library, setLibrary] = useState<MaterialLibraryItem[]>([])
  const [formData, setFormData] = useState({
    material_name: '',
    material_type: '',
    quantity: 0,
    unit: 'kg',
    recycled_content: 0,
    transport_distance: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadLibrary()
  }, [])

  const loadLibrary = async () => {
    try {
      const data = await materialsApi.getLibrary()
      setLibrary(data)
    } catch (error) {
      console.error('Error loading material library:', error)
    }
  }

  const handleMaterialSelect = (type: string) => {
    const selected = library.find(m => m.type === type)
    if (selected) {
      setFormData({
        ...formData,
        material_name: selected.name,
        material_type: selected.type,
        unit: selected.unit,
      })
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.material_type || !formData.quantity) {
      setError('Please select a material and enter quantity')
      return
    }

    try {
      setIsLoading(true)
      await materialsApi.add(projectId, formData)
      onSuccess()
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to add material')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Add Material</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Material Type *
              </label>
              <select
                required
                value={formData.material_type}
                onChange={(e) => handleMaterialSelect(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a material...</option>
                <optgroup label="Aluminium">
                  {library.filter(m => m.type.includes('aluminium')).map(m => (
                    <option key={m.id} value={m.type}>{m.name} ({m.gwp_factor} kg CO₂-eq/kg)</option>
                  ))}
                </optgroup>
                <optgroup label="Copper">
                  {library.filter(m => m.type.includes('copper')).map(m => (
                    <option key={m.id} value={m.type}>{m.name} ({m.gwp_factor} kg CO₂-eq/kg)</option>
                  ))}
                </optgroup>
                <optgroup label="Steel">
                  {library.filter(m => m.type.includes('steel')).map(m => (
                    <option key={m.id} value={m.type}>{m.name} ({m.gwp_factor} kg CO₂-eq/kg)</option>
                  ))}
                </optgroup>
                <optgroup label="Battery Metals">
                  {library.filter(m => ['lithium', 'cobalt', 'nickel'].includes(m.type)).map(m => (
                    <option key={m.id} value={m.type}>{m.name} ({m.gwp_factor} kg CO₂-eq/kg)</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.quantity || ''}
                  onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit
                </label>
                <input
                  type="text"
                  value={formData.unit}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recycled Content (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.recycled_content}
                onChange={(e) => setFormData({ ...formData, recycled_content: parseFloat(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="0-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Higher recycled content = lower carbon footprint
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transport Distance (km)
              </label>
              <input
                type="number"
                min="0"
                value={formData.transport_distance}
                onChange={(e) => setFormData({ ...formData, transport_distance: parseFloat(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isLoading ? 'Adding...' : 'Add Material'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
