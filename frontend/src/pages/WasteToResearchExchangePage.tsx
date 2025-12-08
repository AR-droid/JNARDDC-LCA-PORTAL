import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import WasteToResearchExchange from '../components/WasteToResearchExchange'

export default function WasteToResearchExchangePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(id ? `/projects/${id}` : '/projects')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Project</span>
          </button>
        </div>

        {/* Main Content */}
        <WasteToResearchExchange />
      </div>
    </div>
  )
}

