import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  X, ChevronRight, ChevronLeft, Check, Sparkles, 
  Factory, Cpu, HardHat, Building2, Car, Zap, Leaf,
  MapPin, Upload, FileSpreadsheet, Pencil
} from 'lucide-react'
import { projectsApi } from '../api/projects'

interface OnboardingWizardProps {
  onComplete: () => void
  onSkip: () => void
}

// Industry options with icons
const INDUSTRIES = [
  { id: 'automotive', name: 'Automotive', icon: Car, description: 'Vehicles, parts, EV components' },
  { id: 'electronics', name: 'Electronics', icon: Cpu, description: 'PCBs, semiconductors, devices' },
  { id: 'mining', name: 'Mining & Metals', icon: HardHat, description: 'Extraction, refining, alloys' },
  { id: 'construction', name: 'Construction', icon: Building2, description: 'Steel structures, materials' },
  { id: 'energy', name: 'Energy & Battery', icon: Zap, description: 'Solar, wind, batteries, storage' },
  { id: 'manufacturing', name: 'General Manufacturing', icon: Factory, description: 'Industrial products' },
]

// Indian states for location selection
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Puducherry'
]

export default function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  
  // Collected data
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null)
  const [productDescription, setProductDescription] = useState('')
  const [projectName, setProjectName] = useState('')
  const [selectedState, setSelectedState] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [dataSource, setDataSource] = useState<'bom' | 'manual' | null>(null)
  
  // NLP parsing result
  const [parsedData, setParsedData] = useState<any>(null)
  const [isParsing, setIsParsing] = useState(false)

  const totalSteps = 5

  const goToStep = (step: number) => {
    if (step < 0 || step > totalSteps) return
    setIsAnimating(true)
    setTimeout(() => {
      setCurrentStep(step)
      setIsAnimating(false)
    }, 200)
  }

  const canProceed = () => {
    switch (currentStep) {
      case 0: return true // Welcome step
      case 1: return selectedIndustry !== null
      case 2: return productDescription.trim().length > 10 && projectName.trim().length > 0
      case 3: return selectedState !== ''
      case 4: return dataSource !== null
      default: return true
    }
  }

  // Parse product description with NLP
  const parseDescription = async () => {
    if (!productDescription.trim()) return
    
    setIsParsing(true)
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/nlp/parse-description`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ description: productDescription })
      })
      
      if (response.ok) {
        const data = await response.json()
        setParsedData(data)
      }
    } catch (error) {
      console.error('NLP parsing error:', error)
    } finally {
      setIsParsing(false)
    }
  }

  // Auto-parse when user stops typing
  useEffect(() => {
    if (currentStep === 2 && productDescription.length > 20) {
      const timer = setTimeout(parseDescription, 1000)
      return () => clearTimeout(timer)
    }
  }, [productDescription, currentStep])

  // Create project and complete onboarding
  const handleComplete = async () => {
    setIsCreatingProject(true)
    
    try {
      // Create the project
      const project = await projectsApi.create({
        name: projectName || `${selectedIndustry} Project`,
        description: productDescription,
        product_category: selectedIndustry || 'other',
        target_lifespan: 10,
        is_designed_for_disassembly: false
      })
      
      // Mark onboarding as complete
      localStorage.setItem('onboarding_completed', 'true')
      localStorage.setItem('user_industry', selectedIndustry || '')
      localStorage.setItem('user_state', selectedState)
      
      onComplete()
      
      // Navigate based on data source choice
      if (dataSource === 'bom') {
        navigate(`/projects/${project.id}?showBOM=true`)
      } else {
        navigate(`/projects/${project.id}`)
      }
    } catch (error) {
      console.error('Failed to create project:', error)
      alert('Failed to create project. Please try again.')
    } finally {
      setIsCreatingProject(false)
    }
  }

  // Step content renderer
  const renderStep = () => {
    switch (currentStep) {
      // Step 0: Welcome
      case 0:
        return (
          <div className="text-center py-8">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <Leaf className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome to JNARDDC LCA Portal
            </h2>
            <p className="text-lg text-gray-600 mb-6 max-w-md mx-auto">
              Your intelligent platform for Life Cycle Assessment of metals and critical minerals.
            </p>
            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto text-sm">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl mb-2">📊</div>
                <div className="font-medium text-blue-900">Carbon Footprint</div>
                <div className="text-blue-600">GWP Analysis</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl mb-2">♻️</div>
                <div className="font-medium text-green-900">Circularity</div>
                <div className="text-green-600">MCI Scoring</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl mb-2">🤖</div>
                <div className="font-medium text-purple-900">AI Insights</div>
                <div className="text-purple-600">Smart Analysis</div>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-6">
              Let's set up your first project in just a few steps!
            </p>
          </div>
        )

      // Step 1: Industry Selection
      case 1:
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              What industry are you in?
            </h2>
            <p className="text-gray-600 mb-6 text-center">
              This helps us customize your LCA experience
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {INDUSTRIES.map((industry) => {
                const Icon = industry.icon
                const isSelected = selectedIndustry === industry.id
                return (
                  <button
                    key={industry.id}
                    onClick={() => setSelectedIndustry(industry.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all duration-200 hover:shadow-md ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                      isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="font-medium text-gray-900">{industry.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{industry.description}</div>
                    {isSelected && (
                      <div className="mt-2">
                        <Check className="w-4 h-4 text-blue-500" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )

      // Step 2: Product Description
      case 2:
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              Describe your product
            </h2>
            <p className="text-gray-600 mb-6 text-center">
              Our AI will extract materials and processes automatically
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., EV Battery Pack LCA"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Description *
                </label>
                <textarea
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  placeholder="Describe your product, materials used, and manufacturing processes. For example: 'We manufacture aluminium alloy 6061 heat sinks for electronics using primary ingot, CNC machining, and anodizing. We generate ~20% machining scrap.'"
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-500">
                    {productDescription.length} characters (min 10)
                  </span>
                  {isParsing && (
                    <span className="text-xs text-blue-600 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 animate-spin" /> Analyzing...
                    </span>
                  )}
                </div>
              </div>

              {/* NLP Parsed Results */}
              {parsedData && parsedData.tokens && parsedData.tokens.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">AI Detected:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {parsedData.tokens.slice(0, 8).map((token: any, idx: number) => (
                      <span
                        key={idx}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          token.type === 'material' ? 'bg-blue-100 text-blue-700' :
                          token.type === 'process' ? 'bg-purple-100 text-purple-700' :
                          token.type === 'quantity' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {token.value || token.material || token.type}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )

      // Step 3: Location
      case 3:
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              Where is your manufacturing located?
            </h2>
            <p className="text-gray-600 mb-6 text-center">
              This helps us use correct grid emission factors for your region
            </p>
            
            <div className="max-w-md mx-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  State *
                </label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select your state</option>
                  {INDIAN_STATES.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City (Optional)
                </label>
                <input
                  type="text"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  placeholder="e.g., Pune, Chennai, Bengaluru"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {selectedState && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <div className="text-sm text-blue-800">
                    <strong>🇮🇳 Make in India:</strong> Grid emission factor for {selectedState} will be applied to your electricity calculations.
                  </div>
                </div>
              )}
            </div>
          </div>
        )

      // Step 4: Data Source
      case 4:
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              How would you like to add materials?
            </h2>
            <p className="text-gray-600 mb-6 text-center">
              You can always change this later
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <button
                onClick={() => setDataSource('bom')}
                className={`p-6 rounded-xl border-2 text-left transition-all duration-200 hover:shadow-md ${
                  dataSource === 'bom'
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                  dataSource === 'bom' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div className="font-semibold text-gray-900 text-lg mb-1">Upload BOM</div>
                <div className="text-sm text-gray-500">
                  I have a Bill of Materials spreadsheet (Excel/CSV) ready to upload
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-blue-600">
                  <Upload className="w-3 h-3" />
                  Recommended for accuracy
                </div>
              </button>

              <button
                onClick={() => setDataSource('manual')}
                className={`p-6 rounded-xl border-2 text-left transition-all duration-200 hover:shadow-md ${
                  dataSource === 'manual'
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                  dataSource === 'manual' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  <Pencil className="w-6 h-6" />
                </div>
                <div className="font-semibold text-gray-900 text-lg mb-1">Enter Manually</div>
                <div className="text-sm text-gray-500">
                  I'll add materials one by one using the form interface
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-green-600">
                  <Sparkles className="w-3 h-3" />
                  AI will suggest based on your description
                </div>
              </button>
            </div>
          </div>
        )

      // Step 5: Complete
      case 5:
        return (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              You're all set! 🎉
            </h2>
            <p className="text-lg text-gray-600 mb-6 max-w-md mx-auto">
              Your project "<strong>{projectName}</strong>" is ready. Let's start your LCA journey!
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 max-w-sm mx-auto mb-6 text-left">
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Industry:</span>
                  <span className="font-medium">{INDUSTRIES.find(i => i.id === selectedIndustry)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Location:</span>
                  <span className="font-medium">{selectedState}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Data Source:</span>
                  <span className="font-medium">{dataSource === 'bom' ? 'BOM Upload' : 'Manual Entry'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleComplete}
              disabled={isCreatingProject}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {isCreatingProject ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating Project...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Create Project & Start <ChevronRight className="w-5 h-5" />
                </span>
              )}
            </button>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Modal */}
      <div className="relative w-full max-w-3xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/images/logo.png" alt="JNARDDC" className="w-8 h-8 bg-white rounded p-1" />
              <span className="text-white font-semibold">JNARDDC LCA Portal</span>
            </div>
            <button
              onClick={onSkip}
              className="text-white/80 hover:text-white transition-colors"
              title="Skip onboarding"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/80">Step {currentStep + 1} of {totalSteps + 1}</span>
              <span className="text-sm text-white/80">{Math.round((currentStep / totalSteps) * 100)}% complete</span>
            </div>
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={`p-6 min-h-[400px] transition-opacity duration-200 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
          {renderStep()}
        </div>

        {/* Footer */}
        {currentStep < 5 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div>
              {currentStep > 0 ? (
                <button
                  onClick={() => goToStep(currentStep - 1)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              ) : (
                <button
                  onClick={onSkip}
                  className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm transition-colors"
                >
                  Skip for now
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Progress dots */}
              {[0, 1, 2, 3, 4].map((step) => (
                <button
                  key={step}
                  onClick={() => step < currentStep && goToStep(step)}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    step === currentStep
                      ? 'w-6 bg-blue-600'
                      : step < currentStep
                      ? 'bg-blue-400 cursor-pointer hover:bg-blue-500'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() => goToStep(currentStep + 1)}
              disabled={!canProceed()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
            >
              {currentStep === 4 ? 'Review' : 'Next'} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
