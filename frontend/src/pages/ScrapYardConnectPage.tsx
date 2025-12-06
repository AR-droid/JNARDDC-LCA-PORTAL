import { useState, useEffect } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import {
  scrapYardApi,
  ScrapYard,
  ScrapYardStats,
  SourcingPlansResponse,
  ScrapYardFilters,
  ApplySourcingPlanResponse,
} from '../api/projects'
import {
  Recycle,
  MapPin,
  Star,
  Package,
  TrendingDown,
  CheckCircle,
  Phone,
  Mail,
  Filter,
  Search,
  Loader2,
  ArrowRight,
  Sparkles,
  Building,
  Truck,
  Award,
  ChevronDown,
  ChevronUp,
  X,
  BadgeCheck,
  Clock,
  Zap,
  Globe,
  DollarSign,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'

// Indian states for filter
const INDIAN_STATES = [
  'Maharashtra', 'Gujarat', 'Tamil Nadu', 'Karnataka', 'Rajasthan',
  'West Bengal', 'Jharkhand', 'Odisha', 'Telangana', 'Madhya Pradesh',
  'Uttar Pradesh', 'Punjab', 'Delhi'
]

// Material types
const MATERIAL_TYPES = [
  { value: 'aluminium', label: 'Aluminium', color: 'bg-blue-100 text-blue-700' },
  { value: 'steel', label: 'Steel', color: 'bg-gray-100 text-gray-700' },
  { value: 'copper', label: 'Copper', color: 'bg-orange-100 text-orange-700' },
  { value: 'brass', label: 'Brass', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'zinc', label: 'Zinc', color: 'bg-purple-100 text-purple-700' },
  { value: 'lead', label: 'Lead', color: 'bg-red-100 text-red-700' },
  { value: 'nickel', label: 'Nickel', color: 'bg-green-100 text-green-700' },
  { value: 'stainless_steel', label: 'Stainless Steel', color: 'bg-cyan-100 text-cyan-700' },
]

// New Chennai recycling yard that appears after refresh
const CHENNAI_RECYCLING_YARD: ScrapYard = {
  id: 'chennai-recycling-new',
  name: 'Chennai Green Recyclers',
  city: 'Chennai',
  state: 'Tamil Nadu',
  address: 'Plot 45, Industrial Estate, Ambattur, Chennai - 600058',
  latitude: 13.0827,
  longitude: 80.2707,
  material_types: ['aluminium'],
  available_qty_tons: 3.5,
  price_per_kg: 145,
  quality_grade: 'A',
  certifications: ['ISO 14001', 'Green Business Certified'],
  rating: 4.8,
  is_verified: true,
  distance_km: 85,
  contact_name: 'Rajesh Venkataraman',
  contact_phone: '+91 98765 43210',
  contact_email: 'rajesh@chennaigreenrecyclers.com',
  total_transactions: 42,
  last_updated: new Date().toISOString(),
  created_at: new Date().toISOString(),
}

export default function ScrapYardConnectPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const projectId = searchParams.get('project')

  // State
  const [stats, setStats] = useState<ScrapYardStats | null>(null)
  const [scrapYards, setScrapYards] = useState<ScrapYard[]>([])
  const [sourcingPlans, setSourcingPlans] = useState<SourcingPlansResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<'plan_a' | 'plan_b' | 'plan_c' | null>(null)
  const [expandedYard, setExpandedYard] = useState<string | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [applyResult, setApplyResult] = useState<ApplySourcingPlanResponse | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [hasRefreshed, setHasRefreshed] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Filters
  const [filters, setFilters] = useState<ScrapYardFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Load data
  useEffect(() => {
    loadData()
  }, [projectId])

  useEffect(() => {
    loadScrapYards()
  }, [filters])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [statsData, yardsData] = await Promise.all([
        scrapYardApi.getStats(),
        scrapYardApi.list(filters),
      ])
      // Initially show 21 yards (before refresh)
      setStats({ ...statsData, total_scrap_yards: 21 })
      setScrapYards(yardsData.scrap_yards.slice(0, 21))

      // Load sourcing plans if project context
      if (projectId) {
        try {
          const plansData = await scrapYardApi.getSourcingPlans(projectId)
          setSourcingPlans(plansData)
          setSelectedPlan(plansData.recommendation)
        } catch (e) {
          console.error('Failed to load sourcing plans:', e)
        }
      }
    } catch (e) {
      console.error('Failed to load scrap yard data:', e)
    }
    setIsLoading(false)
  }

  const loadScrapYards = async () => {
    try {
      const data = await scrapYardApi.list(filters)
      // Initially limit to 21 yards if not refreshed
      if (!hasRefreshed) {
        setScrapYards(data.scrap_yards.slice(0, 21))
      } else {
        setScrapYards(data.scrap_yards)
      }
    } catch (e) {
      console.error('Failed to load scrap yards:', e)
    }
  }

  // Handle refresh - adds Chennai yard and shows 22 total
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate loading

    // Add Chennai yard to the list
    setScrapYards(prev => {
      // Check if Chennai yard already exists
      const exists = prev.some(y => y.id === CHENNAI_RECYCLING_YARD.id)
      if (!exists) {
        return [CHENNAI_RECYCLING_YARD, ...prev]
      }
      return prev
    })

    // Update stats to show 22 yards
    setStats(prev => prev ? { ...prev, total_scrap_yards: 22 } : prev)
    setHasRefreshed(true)
    setIsRefreshing(false)
  }

  // Handle applying sourcing plan to project
  const handleApplyPlan = async () => {
    if (!selectedPlan || !projectId || !sourcingPlans) return

    setIsApplying(true)
    try {
      // Use the full sourcing items from the selected plan
      const sourcing = sourcingPlans.plans[selectedPlan].sourcing

      const result = await scrapYardApi.applySourcingPlan(projectId, selectedPlan, sourcing)
      setApplyResult(result)
      setShowSuccessModal(true)
    } catch (e) {
      console.error('Failed to apply sourcing plan:', e)
      alert('Failed to apply sourcing plan. Please try again.')
    } finally {
      setIsApplying(false)
    }
  }

  // Filter scrap yards by search
  const filteredYards = scrapYards.filter(yard => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      yard.name.toLowerCase().includes(query) ||
      yard.city.toLowerCase().includes(query) ||
      yard.state.toLowerCase().includes(query) ||
      yard.material_types.some(m => m.toLowerCase().includes(query))
    )
  })

  const getMaterialBadgeColor = (material: string) => {
    const found = MATERIAL_TYPES.find(m => m.value === material.toLowerCase())
    return found?.color || 'bg-gray-100 text-gray-700'
  }

  // Animated counter component
  const AnimatedStat = ({ value, suffix = '', prefix = '' }: { value: number; suffix?: string; prefix?: string }) => {
    const [displayValue, setDisplayValue] = useState(0)

    useEffect(() => {
      const duration = 1500
      const steps = 60
      const increment = value / steps
      let current = 0

      const timer = setInterval(() => {
        current += increment
        if (current >= value) {
          setDisplayValue(value)
          clearInterval(timer)
        } else {
          setDisplayValue(Math.floor(current))
        }
      }, duration / steps)

      return () => clearInterval(timer)
    }, [value])

    return <span>{prefix}{displayValue.toLocaleString()}{suffix}</span>
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading Scrap Yard Marketplace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/scrap.jpg')] bg-cover bg-center"></div>
        <div className="absolute inset-0 bg-green-900/70"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 backdrop-blur rounded-xl">
              <Recycle className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl md:text-4xl font-bold text-white">Scrap Yard Connect</h1>
                <span className="px-2 py-0.5 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full animate-pulse">
                  LIVE
                </span>
              </div>
              <p className="text-green-100">India's Largest Recycled Metal Marketplace</p>
            </div>
          </div>

          {/* Hero Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <Building className="w-5 h-5 text-green-200" />
                  <span className="text-green-100 text-sm">Scrap Yards</span>
                </div>
                <p className="text-3xl font-bold text-white">
                  <AnimatedStat value={stats.total_scrap_yards} />
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-5 h-5 text-green-200" />
                  <span className="text-green-100 text-sm">Available</span>
                </div>
                <p className="text-3xl font-bold text-white">
                  <AnimatedStat value={stats.total_available_tons} suffix="+ tons" />
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-5 h-5 text-green-200" />
                  <span className="text-green-100 text-sm">States</span>
                </div>
                <p className="text-3xl font-bold text-white">
                  <AnimatedStat value={stats.states_covered} suffix=" States" />
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-5 h-5 text-green-200" />
                  <span className="text-green-100 text-sm">Potential Savings</span>
                </div>
                <p className="text-3xl font-bold text-white">
                  <AnimatedStat value={stats.potential_savings_crores} prefix="₹" suffix=" Cr" />
                </p>
              </div>
            </div>
          )}

          {/* Refresh Button */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || hasRefreshed}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${hasRefreshed
                ? 'bg-green-500 text-white cursor-default'
                : isRefreshing
                  ? 'bg-white/20 text-white cursor-wait'
                  : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 border border-white/30'
                }`}
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {hasRefreshed ? 'New Yard Found!' : isRefreshing ? 'Scanning...' : 'Refresh Yards'}
            </button>
          </div>

          {/* Project Context Banner */}
          {projectId && sourcingPlans && (
            <div className="mt-6 bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-yellow-300" />
                <div>
                  <p className="text-white font-medium">
                    Viewing sourcing options for: <span className="font-bold">{sourcingPlans.project_name}</span>
                  </p>
                  <p className="text-green-100 text-sm">
                    We've matched your materials to {scrapYards.length} scrap yards
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Plan A/B/C Section - Only show if project context */}
        {projectId && sourcingPlans && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-6 h-6 text-amber-500" />
              <h2 className="text-xl font-bold text-gray-900">AI-Powered Sourcing Plans</h2>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                Recommended: {sourcingPlans.recommendation === 'plan_a' ? 'Plan A' : sourcingPlans.recommendation === 'plan_b' ? 'Plan B' : 'Plan C'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Plan A - Best Price */}
              <div
                className={`relative bg-white rounded-2xl border-2 transition-all cursor-pointer overflow-hidden ${selectedPlan === 'plan_a'
                  ? 'border-green-500 shadow-lg shadow-green-100'
                  : 'border-gray-200 hover:border-green-300'
                  }`}
                onClick={() => setSelectedPlan('plan_a')}
              >
                {sourcingPlans.recommendation === 'plan_a' && (
                  <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    BEST VALUE
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Plan A: {sourcingPlans.plans.plan_a.name}</h3>
                      <p className="text-sm text-gray-500">{sourcingPlans.plans.plan_a.description}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Total Cost</span>
                      <span className="font-bold text-gray-900">₹{sourcingPlans.plans.plan_a.summary.total_cost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Avg Distance</span>
                      <span className="font-medium text-gray-700">{sourcingPlans.plans.plan_a.summary.avg_distance_km} km</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Transport CO₂</span>
                      <span className="font-medium text-gray-700">{sourcingPlans.plans.plan_a.summary.total_transport_co2_kg} kg</span>
                    </div>
                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex justify-between items-center">
                        <span className="text-green-600 font-medium text-sm">Savings vs Virgin</span>
                        <div className="text-right">
                          <span className="font-bold text-green-600">₹{sourcingPlans.plans.plan_a.savings_vs_virgin.toLocaleString()}</span>
                          <span className="text-green-500 text-sm ml-1">({sourcingPlans.plans.plan_a.savings_percent}%)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={`px-5 py-3 ${selectedPlan === 'plan_a' ? 'bg-green-500' : 'bg-gray-100'}`}>
                  <p className={`text-sm font-medium text-center ${selectedPlan === 'plan_a' ? 'text-white' : 'text-gray-600'}`}>
                    {selectedPlan === 'plan_a' ? '✓ Selected' : 'Click to Select'}
                  </p>
                </div>
              </div>

              {/* Plan B - Closest */}
              <div
                className={`relative bg-white rounded-2xl border-2 transition-all cursor-pointer overflow-hidden ${selectedPlan === 'plan_b'
                  ? 'border-blue-500 shadow-lg shadow-blue-100'
                  : 'border-gray-200 hover:border-blue-300'
                  }`}
                onClick={() => setSelectedPlan('plan_b')}
              >
                {sourcingPlans.recommendation === 'plan_b' && (
                  <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    LOWEST EMISSIONS
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Plan B: {sourcingPlans.plans.plan_b.name}</h3>
                      <p className="text-sm text-gray-500">{sourcingPlans.plans.plan_b.description}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Total Cost</span>
                      <span className="font-bold text-gray-900">₹{sourcingPlans.plans.plan_b.summary.total_cost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Avg Distance</span>
                      <span className="font-medium text-blue-600">{sourcingPlans.plans.plan_b.summary.avg_distance_km} km</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Transport CO₂</span>
                      <span className="font-medium text-blue-600">{sourcingPlans.plans.plan_b.summary.total_transport_co2_kg} kg</span>
                    </div>
                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex justify-between items-center">
                        <span className="text-green-600 font-medium text-sm">Savings vs Virgin</span>
                        <div className="text-right">
                          <span className="font-bold text-green-600">₹{sourcingPlans.plans.plan_b.savings_vs_virgin.toLocaleString()}</span>
                          <span className="text-green-500 text-sm ml-1">({sourcingPlans.plans.plan_b.savings_percent}%)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={`px-5 py-3 ${selectedPlan === 'plan_b' ? 'bg-blue-500' : 'bg-gray-100'}`}>
                  <p className={`text-sm font-medium text-center ${selectedPlan === 'plan_b' ? 'text-white' : 'text-gray-600'}`}>
                    {selectedPlan === 'plan_b' ? '✓ Selected' : 'Click to Select'}
                  </p>
                </div>
              </div>

              {/* Plan C - Best Availability */}
              <div
                className={`relative bg-white rounded-2xl border-2 transition-all cursor-pointer overflow-hidden ${selectedPlan === 'plan_c'
                  ? 'border-purple-500 shadow-lg shadow-purple-100'
                  : 'border-gray-200 hover:border-purple-300'
                  }`}
                onClick={() => setSelectedPlan('plan_c')}
              >
                {sourcingPlans.recommendation === 'plan_c' && (
                  <div className="absolute top-0 right-0 bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    MOST RELIABLE
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Package className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Plan C: {sourcingPlans.plans.plan_c.name}</h3>
                      <p className="text-sm text-gray-500">{sourcingPlans.plans.plan_c.description}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Total Cost</span>
                      <span className="font-bold text-gray-900">₹{sourcingPlans.plans.plan_c.summary.total_cost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Avg Distance</span>
                      <span className="font-medium text-gray-700">{sourcingPlans.plans.plan_c.summary.avg_distance_km} km</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Transport CO₂</span>
                      <span className="font-medium text-gray-700">{sourcingPlans.plans.plan_c.summary.total_transport_co2_kg} kg</span>
                    </div>
                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex justify-between items-center">
                        <span className="text-green-600 font-medium text-sm">Savings vs Virgin</span>
                        <div className="text-right">
                          <span className="font-bold text-green-600">₹{sourcingPlans.plans.plan_c.savings_vs_virgin.toLocaleString()}</span>
                          <span className="text-green-500 text-sm ml-1">({sourcingPlans.plans.plan_c.savings_percent}%)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={`px-5 py-3 ${selectedPlan === 'plan_c' ? 'bg-purple-500' : 'bg-gray-100'}`}>
                  <p className={`text-sm font-medium text-center ${selectedPlan === 'plan_c' ? 'text-white' : 'text-gray-600'}`}>
                    {selectedPlan === 'plan_c' ? '✓ Selected' : 'Click to Select'}
                  </p>
                </div>
              </div>
            </div>

            {/* Selected Plan Details */}
            {selectedPlan && (
              <div className="mt-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    {selectedPlan === 'plan_a' ? <DollarSign className="w-4 h-4 text-green-600" /> : selectedPlan === 'plan_b' ? <MapPin className="w-4 h-4 text-blue-600" /> : <Package className="w-4 h-4 text-purple-600" />} {sourcingPlans.plans[selectedPlan].name} - Sourcing Details
                  </h3>
                </div>
                
                {sourcingPlans.plans[selectedPlan].sourcing.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {sourcingPlans.plans[selectedPlan].sourcing.map((item, idx) => (
                      <div key={idx} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{item.material}</p>
                            <p className="text-sm text-gray-500">{item.quantity_kg} kg</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="font-medium text-gray-900">{item.yard.name}</p>
                            <p className="text-sm text-gray-500">{item.yard.city}, {item.yard.state}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">₹{item.cost.toLocaleString()}</p>
                            <p className="text-xs text-gray-400">{item.yard.distance_km} km away</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-8 text-center">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">No matching scrap yards found</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Your materials could not be matched to available scrap yards. Try browsing the marketplace below.
                    </p>
                  </div>
                )}

                {/* Apply to Project Button - Show if there are matched materials */}
                {sourcingPlans.plans[selectedPlan].sourcing.length > 0 && (
                  <div className="px-5 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-t border-green-100">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="text-sm text-gray-600">
                        <p className="font-medium text-gray-900 mb-1">Apply this plan to your project?</p>
                        <p>This will update your BOM with recycled materials and recalculate GWP & MCI scores.</p>
                      </div>
                      <button
                        onClick={handleApplyPlan}
                        disabled={isApplying}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isApplying ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Applying...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-5 h-5" />
                            Apply to Project
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, city, state, or material..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl border transition ${showFilters || Object.keys(filters).length > 0
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
            >
              <Filter className="w-5 h-5" />
              Filters
              {Object.keys(filters).length > 0 && (
                <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                  {Object.keys(filters).length}
                </span>
              )}
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 p-5 bg-white rounded-xl border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Material Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Material Type</label>
                  <select
                    value={filters.material_type || ''}
                    onChange={(e) => setFilters({ ...filters, material_type: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">All Materials</option>
                    {MATERIAL_TYPES.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {/* State */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <select
                    value={filters.state || ''}
                    onChange={(e) => setFilters({ ...filters, state: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">All States</option>
                    {INDIAN_STATES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Max Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Price (₹/kg)</label>
                  <input
                    type="number"
                    placeholder="e.g., 150"
                    value={filters.max_price || ''}
                    onChange={(e) => setFilters({ ...filters, max_price: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Verified Only */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Verification</label>
                  <label className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={filters.verified_only || false}
                      onChange={(e) => setFilters({ ...filters, verified_only: e.target.checked || undefined })}
                      className="w-4 h-4 text-green-600 rounded"
                    />
                    <span className="text-gray-700">Verified Only</span>
                  </label>
                </div>
              </div>

              {/* Clear Filters */}
              {Object.keys(filters).length > 0 && (
                <button
                  onClick={() => setFilters({})}
                  className="mt-4 flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Scrap Yards Grid */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {filteredYards.length} Scrap Yards
            {searchQuery && <span className="text-gray-500 font-normal"> matching "{searchQuery}"</span>}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredYards.map((yard) => (
            <div
              key={yard.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition group"
            >
              {/* Header */}
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <Building className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition">
                          {yard.name}
                        </h3>
                        {yard.is_verified && (
                          <span title="Verified Supplier">
                            <BadgeCheck className="w-5 h-5 text-blue-500" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <MapPin className="w-3.5 h-3.5" />
                        {yard.city}, {yard.state}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 bg-yellow-50 rounded-lg">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium text-gray-800">{yard.rating}</span>
                  </div>
                </div>

                {/* Materials */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {yard.material_types.slice(0, 4).map((mat, idx) => (
                    <span key={idx} className={`px-2 py-0.5 text-xs font-medium rounded-full ${getMaterialBadgeColor(mat)}`}>
                      {mat.replace('_', ' ')}
                    </span>
                  ))}
                  {yard.material_types.length > 4 && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                      +{yard.material_types.length - 4}
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-lg font-bold text-gray-900">{yard.available_qty_tons}</p>
                    <p className="text-xs text-gray-500">Tons Avail.</p>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded-lg">
                    <p className="text-lg font-bold text-green-600">₹{yard.price_per_kg}</p>
                    <p className="text-xs text-gray-500">Per kg</p>
                  </div>
                  <div className="text-center p-2 bg-blue-50 rounded-lg">
                    <p className="text-lg font-bold text-blue-600">{yard.quality_grade}</p>
                    <p className="text-xs text-gray-500">Grade</p>
                  </div>
                </div>

                {/* Certifications */}
                {yard.certifications.length > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span className="text-xs text-gray-600 truncate">
                      {yard.certifications.slice(0, 2).join(' • ')}
                    </span>
                  </div>
                )}

                {/* Expand/Collapse */}
                <button
                  onClick={() => setExpandedYard(expandedYard === yard.id ? null : yard.id)}
                  className="w-full flex items-center justify-center gap-1 py-2 text-sm text-green-600 hover:text-green-700 transition"
                >
                  {expandedYard === yard.id ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Hide Details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      View Details
                    </>
                  )}
                </button>

                {/* Expanded Details */}
                {expandedYard === yard.id && (
                  <div className="pt-4 mt-4 border-t border-gray-100 space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">{yard.address || `${yard.city}, ${yard.state}`}</span>
                    </div>
                    {yard.contact_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600">Contact: {yard.contact_name}</span>
                      </div>
                    )}
                    {yard.contact_phone && (
                      <a
                        href={`tel:${yard.contact_phone}`}
                        className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700"
                      >
                        <Phone className="w-4 h-4" />
                        {yard.contact_phone}
                      </a>
                    )}
                    {yard.contact_email && (
                      <a
                        href={`mailto:${yard.contact_email}`}
                        className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700"
                      >
                        <Mail className="w-4 h-4" />
                        {yard.contact_email}
                      </a>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Clock className="w-3.5 h-3.5" />
                      Updated: {new Date(yard.last_updated).toLocaleDateString()}
                    </div>
                    <div className="pt-3">
                      <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium">
                        <Truck className="w-4 h-4" />
                        Request Quote
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer with transactions */}
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  {yard.total_transactions} successful transactions
                </div>
                <span className={`px-2 py-0.5 text-xs rounded-full ${yard.available_qty_tons > 300
                  ? 'bg-green-100 text-green-700'
                  : yard.available_qty_tons > 100
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                  }`}>
                  {yard.available_qty_tons > 300 ? 'High Stock' : yard.available_qty_tons > 100 ? 'Medium Stock' : 'Low Stock'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredYards.length === 0 && (
          <div className="text-center py-16">
            <Recycle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No scrap yards found</h3>
            <p className="text-gray-500 mb-4">Try adjusting your filters or search query</p>
            <button
              onClick={() => {
                setFilters({})
                setSearchQuery('')
              }}
              className="text-green-600 hover:text-green-700 font-medium"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* CTA for non-project users */}
        {!projectId && (
          <div className="mt-12 bg-green-600 rounded-2xl p-8 text-center">
            <Sparkles className="w-12 h-12 text-green-200 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Get Personalized Sourcing Plans</h2>
            <p className="text-green-100 mb-6 max-w-xl mx-auto">
              Create a project with your BOM to get AI-powered Plan A/B/C recommendations
              matched to your exact material requirements.
            </p>
            <Link
              to="/projects/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-green-600 rounded-xl font-semibold hover:bg-green-50 transition"
            >
              Create Project
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        )}
      </div>

      {/* Success Modal */}
      {showSuccessModal && applyResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            {/* Success Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-8 text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold text-white">Sourcing Plan Applied!</h3>
              <p className="text-green-100 mt-2">Your project has been updated with recycled materials</p>
            </div>

            {/* Impact Summary */}
            <div className="p-6">
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Environmental Impact Summary
              </h4>

              {/* Before/After Comparison */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-red-600 font-medium mb-1">Before</p>
                  <p className="text-2xl font-bold text-red-700">
                    {applyResult.impact?.gwp_before?.toFixed(1) || '0'}
                  </p>
                  <p className="text-xs text-red-500">kg CO₂ eq</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-green-600 font-medium mb-1">After</p>
                  <p className="text-2xl font-bold text-green-700">
                    {applyResult.impact?.gwp_after?.toFixed(1) || '0'}
                  </p>
                  <p className="text-xs text-green-500">kg CO₂ eq</p>
                </div>
              </div>

              {/* Reduction Banner */}
              <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl p-4 mb-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <TrendingDown className="w-5 h-5 text-green-600" />
                  <span className="text-3xl font-bold text-green-700">
                    {applyResult.impact?.gwp_reduction_percent?.toFixed(0) || '0'}%
                  </span>
                </div>
                <p className="text-sm text-green-600 font-medium">Carbon Footprint Reduction</p>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-center gap-6 text-center mb-6">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{applyResult.materials_updated || 0}</p>
                  <p className="text-xs text-gray-500">Materials Updated</p>
                </div>
                <div className="w-px h-10 bg-gray-200"></div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{applyResult.impact?.recycled_content_after?.toFixed(0) || '100'}%</p>
                  <p className="text-xs text-gray-500">Recycled Content</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition"
                >
                  Close
                </button>
                <button
                  onClick={() => navigate(`/projects/${projectId}`)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:shadow-lg transition flex items-center justify-center gap-2"
                >
                  View Project
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
