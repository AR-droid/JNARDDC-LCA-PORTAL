import { useState, useRef, useEffect } from 'react'
import { aiChat } from '../api/projects'
import { Mic, MicOff, Loader2 } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

interface Message {
  role: 'user' | 'assistant'
  content: string
  source?: string
}

interface AIChatPanelProps {
  projectId?: string
  initialContext?: string
  isOpen: boolean
  onClose: () => void
}

export default function AIChatPanel({ projectId, initialContext, isOpen, onClose }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I'm the JNARRDC LCA Assistant. I can help you understand environmental impacts, MCI scores, CBAM compliance, and provide recommendations for reducing your carbon footprint. What would you like to know?"
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const response = await aiChat({
        prompt: userMessage,
        context: initialContext,
        project_id: projectId
      })

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.response,
        source: response.source
      }])
    } catch (error) {
      console.error('AI Chat error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again."
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach(track => track.stop())
        await transcribeAudio(audioBlob)
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Could not access microphone. Please ensure you have granted permission.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true)
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const response = await fetch(`${API_BASE}/ai/transcribe`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok && data.text) {
        setInput(data.text)
      } else {
        console.error('Transcription failed:', data.detail)
        alert(data.detail || 'Failed to transcribe audio')
      }
    } catch (error) {
      console.error('Transcription error:', error)
      alert('Failed to transcribe audio. Please try again.')
    } finally {
      setIsTranscribing(false)
    }
  }

  const handleVoiceButton = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const quickQuestions = [
    "What is MCI?",
    "How to reduce GWP?",
    "Explain CBAM",
    "Best materials for circularity"
  ]

  if (!isOpen) return null

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[500px] bg-white rounded-xl shadow-2xl flex flex-col z-50 border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center overflow-hidden">
            <img src="/images/chatbot.png" alt="AI" className="w-9 h-9 object-contain" />
          </div>
          <div>
            <h3 className="font-semibold text-white">JNARRDC AI Assistant</h3>
            <p className="text-xs text-blue-100">Powered by Groq</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white/80 hover:text-white transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-gray-100 text-gray-800 rounded-bl-none'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              {msg.source && (
                <p className="text-xs mt-1 opacity-60">
                  {msg.source === 'groq_ai' ? '✨ AI Response' : '📚 Knowledge Base'}
                </p>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-3 rounded-lg rounded-bl-none">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Questions */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-500 mb-2">Quick questions:</p>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => setInput(q)}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleVoiceButton}
            disabled={isLoading || isTranscribing}
            className={`px-3 py-2 rounded-lg transition flex items-center justify-center ${
              isRecording 
                ? 'bg-red-500 text-white animate-pulse hover:bg-red-600' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isRecording ? 'Stop recording' : 'Voice input'}
          >
            {isTranscribing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isRecording ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isTranscribing ? "Transcribing..." : "Ask about LCA, MCI, CBAM..."}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            disabled={isLoading || isTranscribing}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim() || isTranscribing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        {isRecording && (
          <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            Recording... Click mic to stop
          </p>
        )}
      </form>
    </div>
  )
}
