import { useNavigate, useParams } from 'react-router-dom'
import { Recycle, MessageCircle, Sparkles } from 'lucide-react'

interface WasteToResearchWidgetProps {
  projectId?: string
}

export default function WasteToResearchWidget({ projectId }: WasteToResearchWidgetProps) {
  const navigate = useNavigate()
  const params = useParams<{ id: string }>()
  const id = projectId || params.id

  const handleClick = () => {
    if (id) {
      navigate(`/projects/${id}/waste-to-research`)
    } else {
      // If no project ID, check if we're on a project detail page
      const path = window.location.pathname
      const projectMatch = path.match(/\/projects\/([^\/]+)/)
      if (projectMatch) {
        navigate(`/projects/${projectMatch[1]}/waste-to-research`)
      } else {
        // Navigate to projects page to select a project
        navigate('/projects')
      }
    }
  }

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-24 right-6 w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-full shadow-2xl hover:shadow-emerald-500/30 hover:scale-110 transition-all duration-300 flex items-center justify-center z-40 group"
      title="Waste to Resource Connect - Connect waste streams to industries"
    >
      {/* Chatbot Icon */}
      <div className="relative">
        <MessageCircle className="w-8 h-8" />
        <Recycle className="w-4 h-4 absolute -bottom-1 -right-1 bg-white text-emerald-600 rounded-full p-0.5" />
      </div>
      
      {/* Pulsing indicator */}
      <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full animate-pulse border-2 border-white"></span>
      
      {/* Tooltip on hover */}
      <div className="absolute right-20 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span>Waste to Resource Connect</span>
        </div>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full">
          <div className="w-0 h-0 border-t-8 border-t-transparent border-l-8 border-l-gray-900 border-b-8 border-b-transparent"></div>
        </div>
      </div>
    </button>
  )
}

