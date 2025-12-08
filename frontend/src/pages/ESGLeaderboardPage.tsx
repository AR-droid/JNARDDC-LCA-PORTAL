import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Trophy,
  Medal,
  TrendingUp,
  TrendingDown,
  Leaf,
  Recycle,
  Factory,
  MapPin,
  ChevronUp,
  ChevronDown,
  Star,
  Award,
  Target,
  Zap,
  Globe,
  BarChart3,
  ArrowRight,
  Crown,
  Sparkles,
  Filter,
  Search
} from 'lucide-react'

// Types
interface CompanyESGData {
  id: string
  rank: number
  previousRank: number
  companyName: string
  industry: string
  location: string
  state: string
  logo?: string
  mciScore: number
  gwpReduction: number
  recycledContent: number
  circularScore: number
  carbonSaved: number // tonnes CO2
  wasteRecovered: number // tonnes
  certifications: string[]
  badges: string[]
  joinedDate: string
  projectsCompleted: number
  trend: 'up' | 'down' | 'stable'
}

// Mock Data - Top Companies
const LEADERBOARD_DATA: CompanyESGData[] = [
  {
    id: '1',
    rank: 1,
    previousRank: 2,
    companyName: 'Tata Steel Limited',
    industry: 'Steel Manufacturing',
    location: 'Jamshedpur',
    state: 'Jharkhand',
    mciScore: 0.78,
    gwpReduction: 42,
    recycledContent: 68,
    circularScore: 92,
    carbonSaved: 125000,
    wasteRecovered: 45000,
    certifications: ['ISO 14001', 'SA8000', 'OHSAS 18001'],
    badges: ['Carbon Leader', 'Circular Champion', 'Zero Waste'],
    joinedDate: '2024-01-15',
    projectsCompleted: 24,
    trend: 'up'
  },
  {
    id: '2',
    rank: 2,
    previousRank: 1,
    companyName: 'Hindalco Industries',
    industry: 'Aluminium',
    location: 'Mumbai',
    state: 'Maharashtra',
    mciScore: 0.75,
    gwpReduction: 38,
    recycledContent: 72,
    circularScore: 89,
    carbonSaved: 98000,
    wasteRecovered: 38000,
    certifications: ['ISO 14001', 'GRI Standards'],
    badges: ['Recycling Pioneer', 'Green Innovator'],
    joinedDate: '2024-02-20',
    projectsCompleted: 18,
    trend: 'down'
  },
  {
    id: '3',
    rank: 3,
    previousRank: 3,
    companyName: 'JSW Steel',
    industry: 'Steel Manufacturing',
    location: 'Bellary',
    state: 'Karnataka',
    mciScore: 0.72,
    gwpReduction: 35,
    recycledContent: 65,
    circularScore: 86,
    carbonSaved: 82000,
    wasteRecovered: 32000,
    certifications: ['ISO 14001', 'ResponsibleSteel'],
    badges: ['Energy Efficient', 'Waste Warrior'],
    joinedDate: '2024-03-10',
    projectsCompleted: 15,
    trend: 'stable'
  },
  {
    id: '4',
    rank: 4,
    previousRank: 6,
    companyName: 'Vedanta Aluminium',
    industry: 'Aluminium',
    location: 'Jharsuguda',
    state: 'Odisha',
    mciScore: 0.69,
    gwpReduction: 32,
    recycledContent: 58,
    circularScore: 82,
    carbonSaved: 75000,
    wasteRecovered: 28000,
    certifications: ['ISO 14001', 'ASI Certified'],
    badges: ['Renewable Energy'],
    joinedDate: '2024-04-05',
    projectsCompleted: 12,
    trend: 'up'
  },
  {
    id: '5',
    rank: 5,
    previousRank: 4,
    companyName: 'NALCO',
    industry: 'Aluminium',
    location: 'Bhubaneswar',
    state: 'Odisha',
    mciScore: 0.67,
    gwpReduction: 28,
    recycledContent: 52,
    circularScore: 79,
    carbonSaved: 68000,
    wasteRecovered: 25000,
    certifications: ['ISO 14001'],
    badges: ['PSU Leader'],
    joinedDate: '2024-05-12',
    projectsCompleted: 10,
    trend: 'down'
  },
  {
    id: '6',
    rank: 6,
    previousRank: 7,
    companyName: 'Adani Green Energy',
    industry: 'Renewable Energy',
    location: 'Ahmedabad',
    state: 'Gujarat',
    mciScore: 0.65,
    gwpReduction: 55,
    recycledContent: 45,
    circularScore: 77,
    carbonSaved: 180000,
    wasteRecovered: 15000,
    certifications: ['ISO 14001', 'ISO 50001'],
    badges: ['Carbon Negative', 'Solar Pioneer'],
    joinedDate: '2024-06-01',
    projectsCompleted: 8,
    trend: 'up'
  },
  {
    id: '7',
    rank: 7,
    previousRank: 5,
    companyName: 'Copper India Ltd',
    industry: 'Copper Processing',
    location: 'Tuticorin',
    state: 'Tamil Nadu',
    mciScore: 0.63,
    gwpReduction: 25,
    recycledContent: 62,
    circularScore: 75,
    carbonSaved: 45000,
    wasteRecovered: 22000,
    certifications: ['ISO 14001'],
    badges: ['Copper Champion'],
    joinedDate: '2024-07-15',
    projectsCompleted: 9,
    trend: 'down'
  },
  {
    id: '8',
    rank: 8,
    previousRank: 9,
    companyName: 'ACC Limited',
    industry: 'Cement',
    location: 'Mumbai',
    state: 'Maharashtra',
    mciScore: 0.61,
    gwpReduction: 22,
    recycledContent: 48,
    circularScore: 73,
    carbonSaved: 55000,
    wasteRecovered: 85000,
    certifications: ['ISO 14001', 'GreenPro'],
    badges: ['Waste Consumer', 'Circular Economy'],
    joinedDate: '2024-08-20',
    projectsCompleted: 14,
    trend: 'up'
  },
  {
    id: '9',
    rank: 9,
    previousRank: 8,
    companyName: 'UltraTech Cement',
    industry: 'Cement',
    location: 'Mumbai',
    state: 'Maharashtra',
    mciScore: 0.59,
    gwpReduction: 20,
    recycledContent: 45,
    circularScore: 71,
    carbonSaved: 52000,
    wasteRecovered: 78000,
    certifications: ['ISO 14001'],
    badges: ['Waste Valorization'],
    joinedDate: '2024-09-10',
    projectsCompleted: 11,
    trend: 'down'
  },
  {
    id: '10',
    rank: 10,
    previousRank: 12,
    companyName: 'Bharat Forge',
    industry: 'Forging',
    location: 'Pune',
    state: 'Maharashtra',
    mciScore: 0.57,
    gwpReduction: 18,
    recycledContent: 55,
    circularScore: 69,
    carbonSaved: 32000,
    wasteRecovered: 18000,
    certifications: ['ISO 14001', 'IATF 16949'],
    badges: ['Metal Recycler'],
    joinedDate: '2024-10-05',
    projectsCompleted: 7,
    trend: 'up'
  }
]

// Industry filters
const INDUSTRIES = ['All', 'Steel Manufacturing', 'Aluminium', 'Copper Processing', 'Cement', 'Renewable Energy', 'Forging']

// Helper functions
const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`
  return num.toString()
}

const getRankBadge = (rank: number) => {
  switch (rank) {
    case 1:
      return (
        <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-yellow-200">
          <Crown className="w-6 h-6 text-white" />
        </div>
      )
    case 2:
      return (
        <div className="w-12 h-12 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center shadow-lg">
          <Medal className="w-6 h-6 text-white" />
        </div>
      )
    case 3:
      return (
        <div className="w-12 h-12 bg-gradient-to-br from-amber-600 to-amber-700 rounded-full flex items-center justify-center shadow-lg">
          <Medal className="w-6 h-6 text-white" />
        </div>
      )
    default:
      return (
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
          <span className="text-xl font-bold text-gray-600">#{rank}</span>
        </div>
      )
  }
}

const getTrendIcon = (trend: string, rankChange: number) => {
  if (trend === 'up') {
    return (
      <div className="flex items-center gap-1 text-green-600">
        <ChevronUp className="w-4 h-4" />
        <span className="text-xs font-medium">+{rankChange}</span>
      </div>
    )
  } else if (trend === 'down') {
    return (
      <div className="flex items-center gap-1 text-red-500">
        <ChevronDown className="w-4 h-4" />
        <span className="text-xs font-medium">{rankChange}</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1 text-gray-400">
      <span className="text-xs font-medium">—</span>
    </div>
  )
}

export default function ESGLeaderboardPage() {
  const [companies, setCompanies] = useState<CompanyESGData[]>(LEADERBOARD_DATA)
  const [selectedIndustry, setSelectedIndustry] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'circularScore' | 'mciScore' | 'carbonSaved' | 'recycledContent'>('circularScore')
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null)

  // Filter and sort companies
  useEffect(() => {
    let filtered = [...LEADERBOARD_DATA]

    // Apply industry filter
    if (selectedIndustry !== 'All') {
      filtered = filtered.filter(c => c.industry === selectedIndustry)
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(c =>
        c.companyName.toLowerCase().includes(query) ||
        c.location.toLowerCase().includes(query) ||
        c.state.toLowerCase().includes(query)
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'mciScore':
          return b.mciScore - a.mciScore
        case 'carbonSaved':
          return b.carbonSaved - a.carbonSaved
        case 'recycledContent':
          return b.recycledContent - a.recycledContent
        default:
          return b.circularScore - a.circularScore
      }
    })

    // Update ranks based on current sort
    filtered = filtered.map((c, idx) => ({ ...c, rank: idx + 1 }))

    setCompanies(filtered)
  }, [selectedIndustry, searchQuery, sortBy])

  // Calculate totals
  const totalCarbonSaved = LEADERBOARD_DATA.reduce((acc, c) => acc + c.carbonSaved, 0)
  const totalWasteRecovered = LEADERBOARD_DATA.reduce((acc, c) => acc + c.wasteRecovered, 0)
  const avgMCI = LEADERBOARD_DATA.reduce((acc, c) => acc + c.mciScore, 0) / LEADERBOARD_DATA.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-700"></div>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-300/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                  <Trophy className="w-10 h-10 text-yellow-300" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                    ESG Leaderboard
                  </h1>
                  <p className="text-indigo-100 mt-1">
                    Celebrating India's sustainability champions in the metal sector
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-10">
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-5 border border-white/20 hover:bg-white/20 transition group">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white/20 rounded-xl group-hover:scale-110 transition">
                  <Factory className="w-6 h-6 text-white" />
                </div>
                <span className="text-indigo-100 text-sm font-medium">Companies Ranked</span>
              </div>
              <p className="text-4xl font-bold text-white">{LEADERBOARD_DATA.length}</p>
              <p className="text-indigo-200 text-sm mt-1">Active participants</p>
            </div>

            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-5 border border-white/20 hover:bg-white/20 transition group">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white/20 rounded-xl group-hover:scale-110 transition">
                  <Leaf className="w-6 h-6 text-white" />
                </div>
                <span className="text-indigo-100 text-sm font-medium">Carbon Saved</span>
              </div>
              <p className="text-4xl font-bold text-white">{formatNumber(totalCarbonSaved)}</p>
              <p className="text-indigo-200 text-sm mt-1">tonnes CO₂ equivalent</p>
            </div>

            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-5 border border-white/20 hover:bg-white/20 transition group">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white/20 rounded-xl group-hover:scale-110 transition">
                  <Recycle className="w-6 h-6 text-white" />
                </div>
                <span className="text-indigo-100 text-sm font-medium">Waste Recovered</span>
              </div>
              <p className="text-4xl font-bold text-white">{formatNumber(totalWasteRecovered)}</p>
              <p className="text-indigo-200 text-sm mt-1">tonnes recycled</p>
            </div>

            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-5 border border-white/20 hover:bg-white/20 transition group">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white/20 rounded-xl group-hover:scale-110 transition">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <span className="text-indigo-100 text-sm font-medium">Avg MCI Score</span>
              </div>
              <p className="text-4xl font-bold text-white">{(avgMCI * 100).toFixed(0)}%</p>
              <p className="text-indigo-200 text-sm mt-1">Material Circularity Index</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-8 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Industry Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {INDUSTRIES.map(ind => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="circularScore">Circular Score</option>
                <option value="mciScore">MCI Score</option>
                <option value="carbonSaved">Carbon Saved</option>
                <option value="recycledContent">Recycled Content</option>
              </select>
            </div>
          </div>
        </div>

        {/* Top 3 Podium */}
        {companies.length >= 3 && selectedIndustry === 'All' && !searchQuery && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="w-6 h-6 text-yellow-500" />
              <h2 className="text-2xl font-bold text-gray-900">Top Performers</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 2nd Place */}
              <div className="md:mt-8 order-2 md:order-1">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-200 p-6 text-center hover:shadow-lg transition">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <span className="text-2xl font-bold text-white">2</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{companies[1].companyName}</h3>
                  <p className="text-sm text-gray-500 mb-4">{companies[1].industry}</p>
                  <div className="text-3xl font-bold text-gray-700 mb-2">{companies[1].circularScore}</div>
                  <p className="text-sm text-gray-500">Circular Score</p>
                </div>
              </div>

              {/* 1st Place */}
              <div className="order-1 md:order-2">
                <div className="bg-gradient-to-br from-yellow-50 to-amber-100 rounded-2xl border-2 border-yellow-300 p-6 text-center hover:shadow-xl transition relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-200/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                  <div className="relative">
                    <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-yellow-200">
                      <Crown className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{companies[0].companyName}</h3>
                    <p className="text-sm text-gray-600 mb-4">{companies[0].industry}</p>
                    <div className="text-4xl font-bold text-yellow-600 mb-2">{companies[0].circularScore}</div>
                    <p className="text-sm text-gray-500">Circular Score</p>
                    <div className="flex flex-wrap justify-center gap-2 mt-4">
                      {companies[0].badges.slice(0, 2).map((badge, idx) => (
                        <span key={idx} className="px-3 py-1 bg-yellow-200 text-yellow-800 text-xs font-medium rounded-full">
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3rd Place */}
              <div className="md:mt-12 order-3">
                <div className="bg-gradient-to-br from-amber-50 to-orange-100 rounded-2xl border-2 border-amber-200 p-6 text-center hover:shadow-lg transition">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-amber-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <span className="text-2xl font-bold text-white">3</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{companies[2].companyName}</h3>
                  <p className="text-sm text-gray-500 mb-4">{companies[2].industry}</p>
                  <div className="text-3xl font-bold text-amber-700 mb-2">{companies[2].circularScore}</div>
                  <p className="text-sm text-gray-500">Circular Score</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Full Leaderboard Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" />
              Full Rankings
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-full">
                {companies.length} companies
              </span>
            </h2>
          </div>

          <div className="divide-y divide-gray-100">
            {companies.map((company) => (
              <div key={company.id}>
                <div
                  onClick={() => setExpandedCompany(expandedCompany === company.id ? null : company.id)}
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition"
                >
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className="flex-shrink-0">
                      {getRankBadge(company.rank)}
                    </div>

                    {/* Company Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {company.companyName}
                        </h3>
                        {getTrendIcon(company.trend, Math.abs(company.previousRank - company.rank))}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span>{company.industry}</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {company.location}, {company.state}
                        </span>
                      </div>
                    </div>

                    {/* Scores */}
                    <div className="hidden md:flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-indigo-600">{company.circularScore}</p>
                        <p className="text-xs text-gray-500">Circular</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{(company.mciScore * 100).toFixed(0)}%</p>
                        <p className="text-xs text-gray-500">MCI</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">{company.recycledContent}%</p>
                        <p className="text-xs text-gray-500">Recycled</p>
                      </div>
                    </div>

                    {/* Expand Icon */}
                    <div className="flex-shrink-0">
                      {expandedCompany === company.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedCompany === company.id && (
                  <div className="px-6 pb-6 bg-gradient-to-br from-gray-50 to-indigo-50/30">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-white rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Leaf className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-gray-600">Carbon Saved</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{formatNumber(company.carbonSaved)}</p>
                        <p className="text-xs text-gray-500">tonnes CO₂e</p>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Recycle className="w-4 h-4 text-purple-600" />
                          <span className="text-sm text-gray-600">Waste Recovered</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{formatNumber(company.wasteRecovered)}</p>
                        <p className="text-xs text-gray-500">tonnes</p>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingDown className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-gray-600">GWP Reduction</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{company.gwpReduction}%</p>
                        <p className="text-xs text-gray-500">vs baseline</p>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Globe className="w-4 h-4 text-indigo-600" />
                          <span className="text-sm text-gray-600">Projects</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{company.projectsCompleted}</p>
                        <p className="text-xs text-gray-500">completed</p>
                      </div>
                    </div>

                    {/* Badges & Certifications */}
                    <div className="flex flex-wrap gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Badges</p>
                        <div className="flex flex-wrap gap-2">
                          {company.badges.map((badge, idx) => (
                            <span key={idx} className="flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-full">
                              <Star className="w-3.5 h-3.5" />
                              {badge}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Certifications</p>
                        <div className="flex flex-wrap gap-2">
                          {company.certifications.map((cert, idx) => (
                            <span key={idx} className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                              {cert}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-12 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-300 rounded-full blur-3xl"></div>
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Trophy className="w-8 h-8 text-yellow-300" />
              <h2 className="text-2xl md:text-3xl font-bold text-white">
                Join the Leaderboard
              </h2>
            </div>
            <p className="text-indigo-100 max-w-2xl mx-auto mb-8">
              Start tracking your sustainability metrics with MetalLCA.
              Get recognized for your environmental achievements and compete with industry leaders.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/projects/new"
                className="flex items-center gap-2 px-8 py-4 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition shadow-lg hover:shadow-xl"
              >
                <Zap className="w-5 h-5" />
                Start Your LCA
              </Link>
              <Link
                to="/dashboard"
                className="flex items-center gap-2 px-8 py-4 bg-white/20 backdrop-blur-sm text-white rounded-xl font-bold hover:bg-white/30 transition border border-white/30"
              >
                <BarChart3 className="w-5 h-5" />
                View Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

