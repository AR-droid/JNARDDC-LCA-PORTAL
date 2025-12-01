import { Link } from 'react-router-dom'
import { ArrowRight, Leaf, Target, Award } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-white/90 backdrop-blur-sm sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src="/images/logo.png" alt="JNARRDC" className="w-10 h-10 object-contain" />
            <h1 className="text-2xl font-bold text-gray-900">JNARRDC LCA Portal</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/login" className="text-gray-600 hover:text-blue-600">Login</Link>
            <Link 
              to="/register" 
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Get Started
            </Link>
          </div>
        </div>
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
        <div className="absolute inset-0 bg-black/50 z-10"></div>
        
        {/* Content */}
        <div className="relative z-20 container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 drop-shadow-lg">
              AI-Powered LCA for the Indian Metal Sector
            </h2>
            <p className="text-xl md:text-2xl text-gray-200 mb-8 drop-shadow">
              Measure, model, and minimize the environmental footprint of metals. 
              From MSMEs to large enterprises, democratizing Life Cycle Assessment through Natural Language Processing.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link 
                to="/register" 
                className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center shadow-lg"
              >
                Start Free Assessment <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <a 
                href="#features" 
                className="bg-white/20 backdrop-blur-sm border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white/30 transition"
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

      {/* Stats Section */}
      <section className="bg-blue-600 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="text-blue-100">MSMEs Onboarded (Target Year 1)</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">80%+</div>
              <div className="text-blue-100">NLP Mapping Accuracy</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">10,000+</div>
              <div className="text-blue-100">Verified LCA Reports</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20">
        <h3 className="text-3xl font-bold text-center mb-12">Key Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Leaf className="w-12 h-12 text-blue-600" />}
            title="Natural Language Input"
            description="Simply describe your materials in plain language. Our AI understands '1000 Al-6063 profiles, anodized, 10% scrap'"
          />
          <FeatureCard
            icon={<Target className="w-12 h-12 text-blue-600" />}
            title="Circularity Metrics"
            description="Track MCI scores, recycled content, and circular design scores. Get actionable recommendations for improvement"
          />
          <FeatureCard
            icon={<Award className="w-12 h-12 text-blue-600" />}
            title="CBAM Compliant"
            description="Export-ready reports for EU Carbon Border Adjustment Mechanism and SEBI BRSR compliance"
          />
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12">How It Works</h3>
          <div className="max-w-3xl mx-auto space-y-8">
            <Step number={1} title="Create Project" description="Sign up and create your LCA project in seconds" />
            <Step number={2} title="Input Materials" description="Use natural language or upload your Bill of Materials (BOM)" />
            <Step number={3} title="AI Analysis" description="Our engines calculate GWP, water usage, and circularity metrics" />
            <Step number={4} title="Get Insights" description="View interactive dashboards and optimization recommendations" />
            <Step number={5} title="Verify & Export" description="Submit for JNARRDC verification and export compliance reports" />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
          <p className="text-xl text-gray-600">Choose the plan that fits your organization's needs</p>
        </div>
        
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
                <span className="text-gray-600">JNARRDC verification</span>
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
              href="mailto:contact@jnarrdc.gov.in" 
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
                <div className="text-3xl">👨‍💼</div>
                <div>
                  <h4 className="font-bold text-gray-900">Consultant License</h4>
                  <p className="text-sm text-gray-600">Multi-client management with verified badge • ₹25,000/month</p>
                </div>
              </div>
              <a 
                href="mailto:consultants@jnarrdc.gov.in" 
                className="px-6 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition whitespace-nowrap"
              >
                Apply Now
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <h3 className="text-3xl font-bold mb-4">Ready to Start Your Circularity Journey?</h3>
          <p className="text-xl text-gray-600 mb-8">
            Join the National Circularity Platform and contribute to India's sustainable metal sector
          </p>
          <Link 
            to="/register" 
            className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition inline-flex items-center"
          >
            Get Started Free <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Partners / Initiative Section */}
      <section className="bg-gray-100 py-12">
        <div className="container mx-auto px-4">
          <p className="text-center text-gray-500 text-sm uppercase tracking-wider mb-6">A Government of India Initiative</p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            <img src="/images/logo.png" alt="JNARRDC" className="h-16 md:h-20 object-contain grayscale hover:grayscale-0 transition" />
            <img src="/images/make-in-india.png" alt="Make in India" className="h-16 md:h-20 object-contain grayscale hover:grayscale-0 transition" />
          </div>
          <p className="text-center text-gray-400 text-xs mt-6">Supporting India's vision for sustainable manufacturing and circular economy</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <img src="/images/logo.png" alt="JNARRDC" className="w-8 h-8 object-contain" />
                <span className="text-xl font-bold text-white">JNARRDC LCA Portal</span>
              </div>
              <p className="text-sm">National Circularity Platform for JNARRDC</p>
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
                <li><a href="#jnarrdc">JNARRDC Partnership</a></li>
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
            © 2025 JNARRDC LCA Portal. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition">
      <div className="mb-4">{icon}</div>
      <h4 className="text-xl font-semibold mb-2">{title}</h4>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex items-start space-x-4">
      <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold">
        {number}
      </div>
      <div>
        <h4 className="text-xl font-semibold mb-2">{title}</h4>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  )
}
