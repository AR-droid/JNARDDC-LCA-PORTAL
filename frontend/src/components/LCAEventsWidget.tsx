import { useState } from 'react'
import { Calendar, MapPin, ExternalLink, X, Video, ArrowRight, Sparkles } from 'lucide-react'

interface LCAEvent {
    id: string
    title: string
    subtitle: string
    date: string
    time: string
    location: string
    country: string
    countryCode: string
    type: 'Presentation' | 'Conference' | 'Summit' | 'Webinar'
    actionType: 'register' | 'zoom'
    actionLink: string
    featured?: boolean
    backgroundImage: string
}

const EVENTS: LCAEvent[] = [
    {
        id: 'lcas-2025',
        title: 'LCAS-2025',
        subtitle: 'Paving the Way Forward to Sustainability in Technical Textiles',
        date: '9 January 2025',
        time: '09:00 IST',
        location: 'Mumbai, India',
        country: '🇮🇳',
        countryCode: 'IN',
        type: 'Presentation',
        actionType: 'register',
        actionLink: 'https://lcas2025.org/register',
        featured: true,
        backgroundImage: 'https://cdn.slidesharecdn.com/ss_thumbnails/20160624-lcas-presentation-160628165324-thumbnail.jpg?width=640&height=640&fit=bounds'
    },
    {
        id: 'ce-india-2025',
        title: 'Circular Economy India Summit 2025',
        subtitle: "Driving India's Transition to a Circular Economy",
        date: '15-16 March 2025',
        time: '09:00 - 18:00 IST',
        location: 'New Delhi, India',
        country: '🇮🇳',
        countryCode: 'IN',
        type: 'Summit',
        actionType: 'zoom',
        actionLink: 'https://zoom.us/j/ceindia2025',
        backgroundImage: 'https://indiacsr.in/wp-content/uploads/2021/07/Circular-Economy-at-India-CSR-Network.jpg'
    },
    {
        id: 'ilcm-2025',
        title: 'ILCM-2025',
        subtitle: 'International Life Cycle Management Conference',
        date: '23-26 June 2025',
        time: 'All Day',
        location: 'Berlin, Germany',
        country: '🇩🇪',
        countryCode: 'DE',
        type: 'Conference',
        actionType: 'register',
        actionLink: 'https://ilcm2025.org',
        backgroundImage: 'https://www.cesaref.eu/wp-content/uploads/sites/23/2024/07/LIFE-CYCLE-MANAGEMENT-sqr.png'
    }
]

export default function LCAEventsWidget() {
    const [isOpen, setIsOpen] = useState(false)

    const getTypeStyles = (type: string) => {
        switch (type) {
            case 'Presentation': return 'bg-blue-500 text-white'
            case 'Summit': return 'bg-emerald-500 text-white'
            case 'Conference': return 'bg-purple-500 text-white'
            case 'Webinar': return 'bg-orange-500 text-white'
            default: return 'bg-gray-500 text-white'
        }
    }

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 left-6 w-14 h-14 bg-indigo-600 text-white rounded-2xl shadow-lg hover:shadow-indigo-500/40 hover:scale-105 transition-all duration-300 flex items-center justify-center z-40 group ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
                title="Upcoming LCA Events"
            >
                <Calendar className="w-6 h-6" />

                {/* Animated pulse ring */}
                <span className="absolute inset-0 rounded-2xl bg-indigo-400 animate-ping opacity-20"></span>

                {/* Notification badge */}
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    {EVENTS.length}
                </span>

                {/* Tooltip */}
                <div className="absolute left-16 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">
                    <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                        LCA Events
                    </span>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full">
                        <div className="w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-gray-900 border-b-8 border-b-transparent"></div>
                    </div>
                </div>
            </button>

            {/* Expanded Panel */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    <div className="fixed bottom-6 left-6 w-[380px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                        {/* Header */}
                        <div className="bg-indigo-600 px-5 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                    <Calendar className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">LCA Events</h3>
                                    <p className="text-xs text-indigo-200">{EVENTS.length} upcoming events</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition"
                            >
                                <X className="w-4 h-4 text-white" />
                            </button>
                        </div>

                        {/* Events List */}
                        <div className="overflow-y-auto max-h-[55vh] p-4 space-y-4">
                            {EVENTS.map((event) => (
                                <div
                                    key={event.id}
                                    className="relative rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all group"
                                >
                                    {/* Background Image */}
                                    <div
                                        className="absolute inset-0 bg-cover bg-center"
                                        style={{ backgroundImage: `url(${event.backgroundImage})` }}
                                    />

                                    {/* Dark Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/40 group-hover:from-black/95 transition-all" />

                                    {/* Content */}
                                    <div className="relative z-10 p-4">
                                        {/* Featured badge */}
                                        {event.featured && (
                                            <div className="absolute top-3 right-3 px-2 py-0.5 bg-yellow-400 text-yellow-900 text-[9px] font-bold rounded-full flex items-center gap-1 shadow-sm">
                                                <Sparkles className="w-2.5 h-2.5" />
                                                FEATURED
                                            </div>
                                        )}

                                        {/* Top row: Type badge + Country */}
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg shadow-sm ${getTypeStyles(event.type)}`}>
                                                {event.type.toUpperCase()}
                                            </span>
                                            <div className="flex items-center gap-1 text-white/80 text-xs">
                                                <span className="text-base">{event.country}</span>
                                                <span className="font-medium">{event.countryCode}</span>
                                            </div>
                                        </div>

                                        {/* Title */}
                                        <h4 className="font-bold text-white text-base mb-1 leading-tight drop-shadow-md">
                                            {event.title}
                                        </h4>
                                        <p className="text-xs text-white/70 mb-4 line-clamp-2">
                                            {event.subtitle}
                                        </p>

                                        {/* Date & Location */}
                                        <div className="flex items-center gap-3 text-xs text-white/90 mb-4">
                                            <span className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-lg">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {event.date}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <MapPin className="w-3.5 h-3.5 text-white/70" />
                                                {event.location.split(',')[0]}
                                            </span>
                                        </div>

                                        {/* Action Button */}
                                        <a
                                            href={event.actionLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg ${event.actionType === 'zoom'
                                                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                                                : 'bg-white hover:bg-gray-100 text-gray-900'
                                                }`}
                                        >
                                            {event.actionType === 'zoom' ? (
                                                <>
                                                    <Video className="w-4 h-4" />
                                                    Join Zoom
                                                </>
                                            ) : (
                                                <>
                                                    Register Now
                                                    <ArrowRight className="w-4 h-4" />
                                                </>
                                            )}
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-gray-100 px-5 py-3 bg-gray-50/80">
                            <a
                                href="https://www.lcacenter.org/events"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 transition font-medium"
                            >
                                Browse all events <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </div>
                    </div>
                </>
            )}
        </>
    )
}
