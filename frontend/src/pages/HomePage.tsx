import { Link } from 'react-router-dom'
import { ArrowRight, Leaf, Target, Award } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Leaf className="w-8 h-8 text-blue-600" />
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

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            AI-Powered LCA for the Indian Metal Sector
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Measure, model, and minimize the environmental footprint of metals. 
            From MSMEs to large enterprises, democratizing Life Cycle Assessment through Natural Language Processing.
          </p>
          <div className="flex justify-center space-x-4">
            <Link 
              to="/register" 
              className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition flex items-center"
            >
              Start Free Assessment <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <a 
              href="#demo" 
              className="border-2 border-blue-600 text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50 transition"
            >
              Watch Demo
            </a>
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

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Leaf className="w-6 h-6 text-blue-400" />
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
