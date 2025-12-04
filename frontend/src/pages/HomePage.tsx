import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Leaf, Target, Award, Menu, X, ChevronLeft, ChevronRight, Quote, BarChart3, Globe, FileCheck, Star, Briefcase, User, LayoutDashboard, LogOut } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

// Custom hook for scroll-triggered animations using Intersection Observer
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
        }
      },
      { threshold }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [threshold])

  return { ref, isInView }
}

// Animated counter hook for stats
function useAnimatedCounter(target: number, duration: number = 2000, startAnimation: boolean = false) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!startAnimation) return
    
    let startTime: number
    let animationFrame: number

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      setCount(Math.floor(easeOutQuart * target))

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [target, duration, startAnimation])

  return count
}

// Animated section wrapper component
function AnimatedSection({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, isInView } = useInView(0.1)
  
  return (
    <div 
      ref={ref}
      className={`transition-all duration-700 ease-out ${className}`}
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? 'translateY(0)' : 'translateY(40px)',
        transitionDelay: `${delay}ms`
      }}
    >
      {children}
    </div>
  )
}

// Testimonials data
const testimonials = [
  {
    quote: "The NLP-based input saved us weeks of manual data entry. We simply described our aluminium extrusion process and the system understood everything.",
    author: "Rajesh Kumar",
    role: "Production Manager",
    company: "Hindalco Industries",
    rating: 5
  },
  {
    quote: "CBAM compliance was a nightmare before this portal. Now we generate EU-ready reports in minutes. Essential for any metal exporter.",
    author: "Priya Sharma",
    role: "Sustainability Director",
    company: "Tata Steel Ltd",
    rating: 5
  },
  {
    quote: "As an MSME, we couldn't afford expensive LCA consultants. This free tier gives us everything we need to track our carbon footprint.",
    author: "Mohammed Ismail",
    role: "Owner",
    company: "Precision Castings Pvt Ltd",
    rating: 5
  },
  {
    quote: "The circularity metrics helped us identify that switching to 60% recycled aluminium could reduce our GWP by 45%. Game-changing insights.",
    author: "Anita Desai",
    role: "Environmental Engineer",
    company: "JSW Steel",
    rating: 5
  }
]

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currentTestimonial, setCurrentTestimonial] = useState(0)
  const { isAuthenticated, user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }
  
  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen">
      {/* CSS Keyframe Animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out forwards;
        }
        .animate-slide-down {
          animation: slideDown 0.4s ease-out forwards;
        }
        .animate-scale-in {
          animation: scaleIn 0.5s ease-out forwards;
        }
        .animation-delay-100 { animation-delay: 100ms; }
        .animation-delay-200 { animation-delay: 200ms; }
        .animation-delay-300 { animation-delay: 300ms; }
        .animation-delay-400 { animation-delay: 400ms; }
        .animation-delay-500 { animation-delay: 500ms; }
      `}</style>

      {/* Header */}
      <header className="border-b bg-white/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src="/images/ministryofmines.png" alt="Ministry of Mines" className="h-12 md:h-14 w-auto object-contain" />
            <img src="/images/logo.png" alt="JNARDDC" className="h-12 md:h-14 w-auto object-contain" />
            <h1 className="text-lg md:text-2xl font-bold text-gray-900 hidden sm:block">JNARDDC LCA Portal</h1>
          </div>
          
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-6">
            <a href="#features" className="text-gray-600 hover:text-blue-600 transition">Features</a>
            <a href="#how-it-works" className="text-gray-600 hover:text-blue-600 transition">How It Works</a>
            <a href="#pricing" className="text-gray-600 hover:text-blue-600 transition">Pricing</a>
            <a href="#testimonials" className="text-gray-600 hover:text-blue-600 transition">Testimonials</a>
          </nav>
          
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <Link 
                  to="/dashboard" 
                  className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>
                <Link 
                  to="/profile" 
                  className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition"
                >
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                    {user?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <span>{user?.full_name?.split(' ')[0] || 'Profile'}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition transform hover:scale-105"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-600 hover:text-blue-600 transition">Login</Link>
                <Link 
                  to="/register" 
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition transform hover:scale-105"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
          
          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white animate-slide-down">
            <nav className="container mx-auto px-4 py-4 flex flex-col space-y-3">
              <a href="#features" className="text-gray-600 hover:text-blue-600 py-2">Features</a>
              <a href="#how-it-works" className="text-gray-600 hover:text-blue-600 py-2">How It Works</a>
              <a href="#pricing" className="text-gray-600 hover:text-blue-600 py-2">Pricing</a>
              <a href="#testimonials" className="text-gray-600 hover:text-blue-600 py-2">Testimonials</a>
              <hr className="my-2" />
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard" className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 py-2">
                    <LayoutDashboard className="w-5 h-5" />
                    <span>Dashboard</span>
                  </Link>
                  <Link 
                    to="/profile" 
                    className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 py-2"
                  >
                    <User className="w-5 h-5" />
                    <span>{user?.full_name?.split(' ')[0] || 'Profile'}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center space-x-2 bg-red-500 text-white px-4 py-3 rounded-lg hover:bg-red-600 transition font-semibold"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-gray-600 hover:text-blue-600 py-2">Login</Link>
                  <Link 
                    to="/register" 
                    className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition text-center font-semibold"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section with Video Background */}
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Video Background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          <source src="/videos/mining.mp4" type="video/mp4" />
        </video>
        
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70 z-10"></div>
        
        {/* Content */}
        <div className="relative z-20 container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 drop-shadow-lg animate-fade-in-up opacity-0" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
              AI-Powered LCA for the Indian Metal Sector
            </h2>
            <p className="text-xl md:text-2xl text-gray-200 mb-8 drop-shadow animate-fade-in-up opacity-0" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
              Measure, model, and minimize the environmental footprint of metals. 
              From MSMEs to large enterprises, democratizing Life Cycle Assessment through Natural Language Processing.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 animate-fade-in-up opacity-0" style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}>
              {isAuthenticated ? (
                <Link 
                  to="/dashboard" 
                  className="group bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-all flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <LayoutDashboard className="mr-2 w-5 h-5" /> Go to Dashboard <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <Link 
                  to="/register" 
                  className="group bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-all flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Start Free Assessment <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              )}
              <a 
                href="#features" 
                className="bg-white/20 backdrop-blur-sm border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white/30 transition-all hover:scale-105"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 animate-bounce">
          <div className="w-8 h-12 border-2 border-white/50 rounded-full flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-white/70 rounded-full animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* Stats Section with Animated Counters */}
      <StatsSection />

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20">
        <AnimatedSection>
          <h3 className="text-3xl font-bold text-center mb-4">Key Features</h3>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">Everything you need to assess and optimize the environmental impact of your metal products</p>
        </AnimatedSection>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <AnimatedSection delay={100}>
            <FeatureCard
              icon={<Leaf className="w-8 h-8" />}
              title="Natural Language Input"
              description="Simply describe your materials in plain language. Our AI understands '1000 Al-6063 profiles, anodized, 10% scrap'"
              color="green"
            />
          </AnimatedSection>
          <AnimatedSection delay={200}>
            <FeatureCard
              icon={<Target className="w-8 h-8" />}
              title="Circularity Metrics"
              description="Track MCI scores, recycled content, and circular design scores. Get actionable recommendations for improvement"
              color="blue"
            />
          </AnimatedSection>
          <AnimatedSection delay={300}>
            <FeatureCard
              icon={<Award className="w-8 h-8" />}
              title="CBAM Compliant"
              description="Export-ready reports for EU Carbon Border Adjustment Mechanism and SEBI BRSR compliance"
              color="purple"
            />
          </AnimatedSection>
        </div>
        
        {/* Additional Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
          <AnimatedSection delay={400}>
            <FeatureCard
              icon={<BarChart3 className="w-8 h-8" />}
              title="Interactive Dashboards"
              description="Visualize your environmental impact with real-time charts, breakdowns by lifecycle stage, and trend analysis"
              color="orange"
            />
          </AnimatedSection>
          <AnimatedSection delay={500}>
            <FeatureCard
              icon={<Globe className="w-8 h-8" />}
              title="Indian Grid Factors"
              description="Uses CEA 2023 data for regional electricity emission factors. Supports captive power and renewable sources"
              color="cyan"
            />
          </AnimatedSection>
          <AnimatedSection delay={600}>
            <FeatureCard
              icon={<FileCheck className="w-8 h-8" />}
              title="JNARDDC Verification"
              description="Get your LCA reports verified by JNARDDC experts. Adds credibility for regulatory and customer requirements"
              color="rose"
            />
          </AnimatedSection>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <AnimatedSection>
            <h3 className="text-3xl font-bold text-center mb-4">How It Works</h3>
            <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">Get your LCA report in 5 simple steps</p>
          </AnimatedSection>
          <div className="max-w-3xl mx-auto space-y-6">
            <AnimatedSection delay={100}><Step number={1} title="Create Project" description="Sign up and create your LCA project in seconds" /></AnimatedSection>
            <AnimatedSection delay={200}><Step number={2} title="Input Materials" description="Use natural language or upload your Bill of Materials (BOM)" /></AnimatedSection>
            <AnimatedSection delay={300}><Step number={3} title="AI Analysis" description="Our engines calculate GWP, water usage, and circularity metrics" /></AnimatedSection>
            <AnimatedSection delay={400}><Step number={4} title="Get Insights" description="View interactive dashboards and optimization recommendations" /></AnimatedSection>
            <AnimatedSection delay={500}><Step number={5} title="Verify & Export" description="Submit for JNARDDC verification and export compliance reports" /></AnimatedSection>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="container mx-auto px-4 py-20">
        <AnimatedSection>
          <h3 className="text-3xl font-bold text-center mb-4">What Our Users Say</h3>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">Trusted by leading metal manufacturers across India</p>
        </AnimatedSection>
        
        <AnimatedSection delay={200}>
          <div className="max-w-4xl mx-auto relative">
            {/* Main Testimonial Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-gray-100 relative overflow-hidden">
              <Quote className="absolute top-6 left-6 w-12 h-12 text-blue-100" />
              
              <div className="relative z-10">
                <p className="text-xl md:text-2xl text-gray-700 italic mb-8 leading-relaxed">
                  "{testimonials[currentTestimonial].quote}"
                </p>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900">{testimonials[currentTestimonial].author}</p>
                    <p className="text-gray-500">{testimonials[currentTestimonial].role}</p>
                    <p className="text-blue-600 font-medium">{testimonials[currentTestimonial].company}</p>
                  </div>
                  <div className="flex gap-1">
                    {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Navigation Arrows */}
            <button 
              onClick={() => setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length)}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-6 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition transform hover:scale-110"
            >
              <ChevronLeft className="w-6 h-6 text-gray-600" />
            </button>
            <button 
              onClick={() => setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-6 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition transform hover:scale-110"
            >
              <ChevronRight className="w-6 h-6 text-gray-600" />
            </button>
            
            {/* Dot Indicators */}
            <div className="flex justify-center gap-2 mt-6">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === currentTestimonial 
                      ? 'bg-blue-600 w-8' 
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <AnimatedSection>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
              <p className="text-xl text-gray-600">Choose the plan that fits your organization's needs</p>
            </div>
          </AnimatedSection>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Free Tier */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 relative">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Free</h3>
              <p className="text-gray-500 text-sm">For MSMEs & Individual Users</p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900">₹0</span>
                <span className="text-gray-500">/month</span>
              </div>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span className="text-gray-600">Up to 3 projects</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span className="text-gray-600">Basic LCA calculator</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span className="text-gray-600">Natural language input</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span className="text-gray-600">Watermarked reports</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span className="text-gray-600">Community support</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-300 mt-0.5">✗</span>
                <span className="text-gray-400">CBAM & ISO reports</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-300 mt-0.5">✗</span>
                <span className="text-gray-400">Scenario comparison</span>
              </li>
            </ul>
            <Link 
              to="/register" 
              className="block w-full text-center py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition"
            >
              Get Started Free
            </Link>
          </div>

          {/* Pro Tier */}
          <div className="bg-gradient-to-b from-blue-600 to-blue-700 rounded-2xl shadow-xl p-8 relative transform scale-105">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</span>
            </div>
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white mb-2">Pro</h3>
              <p className="text-blue-100 text-sm">For Exporters & Growing Businesses</p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-white">₹15,000</span>
                <span className="text-blue-200">/month</span>
              </div>
              <p className="text-blue-200 text-xs mt-1">or $180/month</p>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2">
                <span className="text-green-300 mt-0.5">✓</span>
                <span className="text-white">Unlimited projects</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-300 mt-0.5">✓</span>
                <span className="text-white">CBAM & ISO 14040 reports</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-300 mt-0.5">✓</span>
                <span className="text-white">Scenario comparison tool</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-300 mt-0.5">✓</span>
                <span className="text-white">Premium Indian datasets</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-300 mt-0.5">✓</span>
                <span className="text-white">AI Design Advisor</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-300 mt-0.5">✓</span>
                <span className="text-white">BRSR export</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-300 mt-0.5">✓</span>
                <span className="text-white">Email support</span>
              </li>
            </ul>
            <Link 
              to="/register" 
              className="block w-full text-center py-3 px-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition"
            >
              Start 14-Day Trial
            </Link>
          </div>

          {/* Enterprise Tier */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 relative">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Enterprise</h3>
              <p className="text-gray-500 text-sm">For Large Organizations & PSUs</p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900">Custom</span>
              </div>
              <p className="text-gray-500 text-xs mt-1">Contact for pricing</p>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span className="text-gray-600">Everything in Pro</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span className="text-gray-600">Team management (unlimited)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span className="text-gray-600">API access</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span className="text-gray-600">Private dataset uploads</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span className="text-gray-600">JNARDDC verification</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span className="text-gray-600">Dedicated account manager</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span className="text-gray-600">White-label options</span>
              </li>
            </ul>
            <a 
              href="mailto:contact@JNARDDC.gov.in" 
              className="block w-full text-center py-3 px-4 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition"
            >
              Contact Sales
            </a>
          </div>
        </div>

        {/* Consultant License */}
        <div className="mt-12 max-w-3xl mx-auto">
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">Consultant License</h4>
                  <p className="text-sm text-gray-600">Multi-client management with verified badge • ₹25,000/month</p>
                </div>
              </div>
              <a 
                href="mailto:consultants@JNARDDC.gov.in" 
                className="px-6 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition whitespace-nowrap"
              >
                Apply Now
              </a>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <AnimatedSection>
          <div className="max-w-2xl mx-auto">
            <h3 className="text-3xl font-bold mb-4">Ready to Start Your Circularity Journey?</h3>
            <p className="text-xl text-gray-600 mb-8">
              Join the National Circularity Platform and contribute to India's sustainable metal sector
            </p>
            <Link 
              to="/register" 
              className="group bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-all inline-flex items-center transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Get Started Free <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </AnimatedSection>
      </section>

      {/* Partners / Initiative Section */}
      <section className="bg-gray-100 py-12">
        <div className="container mx-auto px-4">
          <p className="text-center text-gray-500 text-sm uppercase tracking-wider mb-6">A Government of India Initiative</p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            <img src="/images/logo.png" alt="JNARDDC" className="h-16 md:h-20 object-contain grayscale hover:grayscale-0 transition" />
            <img src="/images/make-in-india.png" alt="Make in India" className="h-16 md:h-20 object-contain grayscale hover:grayscale-0 transition" />
          </div>
          <p className="text-center text-gray-400 text-xs mt-6">Supporting India's vision for sustainable manufacturing and circular economy</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300">
        {/* Footer Strip Image */}
        <div className="w-full">
          <img 
            src="/images/footer.jpeg" 
            alt="JNARDDC Footer Banner" 
            className="w-full h-auto object-cover"
          />
        </div>
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <img src="/images/logo.png" alt="JNARDDC" className="w-8 h-8 object-contain" />
                <span className="text-xl font-bold text-white">JNARDDC LCA Portal</span>
              </div>
              <p className="text-sm">National Circularity Platform for JNARDDC</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features">Features</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="#docs">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#about">About</a></li>
                <li><a href="#contact">Contact</a></li>
                <li><a href="#JNARDDC">JNARDDC Partnership</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#privacy">Privacy Policy</a></li>
                <li><a href="#terms">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            © 2025 JNARDDC LCA Portal. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

// Stats Section with Animated Counters
function StatsSection() {
  const { ref, isInView } = useInView(0.3)
  const msmesCount = useAnimatedCounter(500, 2000, isInView)
  const accuracyCount = useAnimatedCounter(80, 1500, isInView)
  const reportsCount = useAnimatedCounter(10000, 2500, isInView)

  return (
    <section ref={ref} className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="transform hover:scale-105 transition-transform">
            <div className="text-5xl font-bold mb-2">
              {msmesCount}+
            </div>
            <div className="text-blue-100 text-lg">MSMEs Onboarded (Target Year 1)</div>
          </div>
          <div className="transform hover:scale-105 transition-transform">
            <div className="text-5xl font-bold mb-2">
              {accuracyCount}%+
            </div>
            <div className="text-blue-100 text-lg">NLP Mapping Accuracy</div>
          </div>
          <div className="transform hover:scale-105 transition-transform">
            <div className="text-5xl font-bold mb-2">
              {reportsCount.toLocaleString()}+
            </div>
            <div className="text-blue-100 text-lg">Verified LCA Reports</div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Enhanced Feature Card with hover animations
function FeatureCard({ 
  icon, 
  title, 
  description,
  color = 'blue'
}: { 
  icon: React.ReactNode
  title: string
  description: string
  color?: string
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white',
    green: 'bg-green-100 text-green-600 group-hover:bg-green-600 group-hover:text-white',
    purple: 'bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white',
    orange: 'bg-orange-100 text-orange-600 group-hover:bg-orange-600 group-hover:text-white',
    cyan: 'bg-cyan-100 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white',
    rose: 'bg-rose-100 text-rose-600 group-hover:bg-rose-600 group-hover:text-white',
  }

  return (
    <div className="group bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-gray-200 transition-all duration-300 transform hover:-translate-y-2 h-full">
      <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-6 transition-all duration-300 ${colorClasses[color]}`}>
        {icon}
      </div>
      <h4 className="text-xl font-bold mb-3 text-gray-900">{title}</h4>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  )
}

// Enhanced Step component with connecting line
function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex items-start space-x-4 group">
      <div className="flex-shrink-0 relative">
        <div className="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold shadow-lg group-hover:scale-110 group-hover:bg-blue-700 transition-all duration-300">
          {number}
        </div>
        {number < 5 && (
          <div className="absolute top-14 left-1/2 w-0.5 h-6 bg-blue-200 -translate-x-1/2"></div>
        )}
      </div>
      <div className="pt-2">
        <h4 className="text-xl font-semibold mb-1 text-gray-900 group-hover:text-blue-600 transition-colors">{title}</h4>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  )
}
