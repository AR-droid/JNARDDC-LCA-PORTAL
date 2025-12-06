import { useState, FormEvent } from 'react'
import { materialsApi, Material, UpdateMaterialData } from '../api/materials'
import { Pencil, X, Loader2 } from 'lucide-react'

interface Props {
  projectId: string
  material: Material
  onClose: () => void
  onSuccess: () => void
}

export default function MaterialEditModal({ projectId, material, onClose, onSuccess }: Props) {
  const [formData, setFormData] = useState<UpdateMaterialData>({
    material_name: material.material_name,
    material_type: material.material_type,
    quantity: material.quantity,
    unit: material.unit,
    recycled_content: material.recycled_content,
    transport_distance: material.transport_distance,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.quantity || formData.quantity <= 0) {
      setError('Please enter a valid quantity')
      return
    }

    try {
      setIsLoading(true)
      await materialsApi.update(projectId, material.id, formData)
      onSuccess()
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to update material')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Pencil className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Edit Material</h2>
                <p className="text-sm text-gray-500">{material.material_name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Material Name (read-only for now) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Material Name
              </label>
              <input
                type="text"
                value={formData.material_name}
                onChange={(e) => setFormData({ ...formData, material_name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Material Type (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Material Type
              </label>
              <input
                type="text"
                value={formData.material_type}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>

            {/* Quantity and Unit */}
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
            </div>

            {/* Recycled Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recycled Content (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.recycled_content ?? ''}
                onChange={(e) => setFormData({ ...formData, recycled_content: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Higher recycled content = lower carbon footprint
              </p>
            </div>

            {/* Transport Distance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transport Distance (km)
              </label>
              <input
                type="number"
                min="0"
                value={formData.transport_distance ?? ''}
                onChange={(e) => setFormData({ ...formData, transport_distance: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
            </div>

            {/* Current GWP Info */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Current GWP:</span> {material.gwp.toFixed(2)} kg CO₂-eq
              </p>
              <p className="text-xs text-blue-600 mt-1">
                GWP will be recalculated after saving
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-medium flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

