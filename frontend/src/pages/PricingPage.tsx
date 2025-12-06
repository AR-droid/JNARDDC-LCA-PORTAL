import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Check, X, CheckCircle, AlertCircle } from 'lucide-react'

const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const API_BASE = `${baseUrl.replace(/\/$/, '')}/api/v1`

export default function PricingPage() {
  const { isAuthenticated, user, checkAuth, token } = useAuthStore()
  const [upgrading, setUpgrading] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Auto-hide notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  // Refresh user data to get latest project count
  useEffect(() => {
    if (isAuthenticated) {
      checkAuth()
    }
  }, [isAuthenticated, checkAuth])

  const handleUpgrade = async (tier: string) => {
    if (!token) return

    setUpgrading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ tier })
      })

      const data = await res.json()

      if (res.ok) {
        setNotification({ type: 'success', message: data.message || `Successfully upgraded to ${tier}!` })
        checkAuth() // Refresh user data
      } else {
        setNotification({ type: 'error', message: data.detail || 'Failed to upgrade' })
      }
    } catch (error) {
      console.error('Upgrade error:', error)
      setNotification({ type: 'error', message: 'Failed to upgrade. Please try again.' })
    } finally {
      setUpgrading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Notification Banner */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 max-w-md px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slide-in ${
          notification.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
          <p className="text-sm font-medium">{notification.message}</p>
          <button 
            onClick={() => setNotification(null)}
            className="ml-auto text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 text-sm">
            <span>←</span>
            <span>{isAuthenticated ? "Back to Dashboard" : "Back to Home"}</span>
          </Link>
          {!isAuthenticated && (
            <div className="flex items-center space-x-4">
              <Link to="/login" className="text-gray-600 dark:text-gray-300 hover:text-blue-600">Login</Link>
              <Link
                to="/register"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 pt-12 pb-6 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Simple, Transparent Pricing
        </h1>
        <p className="text-base text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Choose the plan that fits your organization's needs. Upgrade anytime as you grow.
        </p>
        {user?.tier === 'free' && (
          <div className="mt-4 inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-lg text-sm">
            <span>You're on the <strong>Free Plan</strong> • {user.project_count || 0}/{user.project_limit || 3} projects used</span>
          </div>
        )}
      </section>

      {/* Pricing Cards */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">

          {/* Free Tier */}
          <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 p-6 relative ${user?.tier === 'free' ? 'border-green-500' : 'border-gray-200 dark:border-gray-700'}`}>
            {user?.tier === 'free' && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-green-500 text-white text-xs font-medium px-3 py-1 rounded-full">CURRENT PLAN</span>
              </div>
            )}
            <div className="text-center mb-5">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Free</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">For MSMEs & Individual Users</p>
              <div className="mt-3">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">₹0</span>
                <span className="text-gray-500 dark:text-gray-400 text-sm">/month</span>
              </div>
            </div>
            <ul className="space-y-3 mb-6 text-sm">
              <PricingFeature included>Up to 3 projects</PricingFeature>
              <PricingFeature included>Basic LCA calculator</PricingFeature>
              <PricingFeature included>Natural language input</PricingFeature>
              <PricingFeature included>GWP & MCI metrics</PricingFeature>
              <PricingFeature included>Community support</PricingFeature>
              <PricingFeature>CBAM & ISO reports</PricingFeature>
              <PricingFeature>Scenario comparison</PricingFeature>
              <PricingFeature>AI Design Advisor</PricingFeature>
            </ul>
            {user?.tier === 'free' ? (
              <button disabled className="block w-full text-center py-2.5 px-4 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed">
                Current Plan
              </button>
            ) : !isAuthenticated ? (
              <Link
                to="/register"
                className="block w-full text-center py-2.5 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              >
                Get Started Free
              </Link>
            ) : null}
          </div>

          {/* Pro Tier */}
          <div className={`bg-gradient-to-b from-blue-600 to-indigo-700 rounded-xl shadow-lg p-6 relative transform md:scale-105 ${user?.tier === 'pro' ? 'ring-4 ring-yellow-400' : ''}`}>
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-yellow-400 text-yellow-900 text-xs font-medium px-3 py-1 rounded-full">
                {user?.tier === 'pro' ? 'CURRENT PLAN' : 'MOST POPULAR'}
              </span>
            </div>
            <div className="text-center mb-5">
              <h3 className="text-xl font-bold text-white mb-1">Pro</h3>
              <p className="text-blue-100 text-sm">For Exporters & Growing Businesses</p>
              <div className="mt-3">
                <span className="text-4xl font-bold text-white">₹15,000</span>
                <span className="text-blue-200 text-sm">/month</span>
              </div>
              <p className="text-blue-200 text-xs mt-1">or $180/month</p>
            </div>
            <ul className="space-y-3 mb-6 text-sm">
              <PricingFeature included light>Unlimited projects</PricingFeature>
              <PricingFeature included light>CBAM & ISO 14040 reports</PricingFeature>
              <PricingFeature included light>BRSR compliance export</PricingFeature>
              <PricingFeature included light>Scenario comparison tool</PricingFeature>
              <PricingFeature included light>AI Design Advisor</PricingFeature>
              <PricingFeature included light>Premium Indian datasets</PricingFeature>
              <PricingFeature included light>Priority email support</PricingFeature>
              <PricingFeature light>JNARDDC verification</PricingFeature>
            </ul>
            {user?.tier === 'pro' ? (
              <button disabled className="block w-full text-center py-2.5 px-4 bg-white/30 text-white rounded-lg text-sm font-medium cursor-not-allowed">
                Current Plan
              </button>
            ) : isAuthenticated ? (
              <button
                onClick={() => handleUpgrade('pro')}
                disabled={upgrading}
                className="block w-full text-center py-2.5 px-4 bg-white text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-50 transition disabled:opacity-50"
              >
                {upgrading ? 'Upgrading...' : 'Upgrade Now'}
              </button>
            ) : (
              <Link
                to="/register"
                className="block w-full text-center py-2.5 px-4 bg-white text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-50 transition"
              >
                Start 14-Day Trial
              </Link>
            )}
          </div>

          {/* Enterprise Tier */}
          <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 p-6 relative ${user?.tier === 'enterprise' ? 'border-purple-500' : 'border-gray-200 dark:border-gray-700'}`}>
            {user?.tier === 'enterprise' && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-purple-500 text-white text-xs font-medium px-3 py-1 rounded-full">CURRENT PLAN</span>
              </div>
            )}
            <div className="text-center mb-5">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Enterprise</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">For Large Organizations & PSUs</p>
              <div className="mt-3">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">Custom</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Tailored to your needs</p>
            </div>
            <ul className="space-y-3 mb-6 text-sm">
              <PricingFeature included>Everything in Pro</PricingFeature>
              <PricingFeature included>JNARDDC verification badge</PricingFeature>
              <PricingFeature included>Team management (unlimited)</PricingFeature>
              <PricingFeature included>API access & integrations</PricingFeature>
              <PricingFeature included>Private dataset uploads</PricingFeature>
              <PricingFeature included>Dedicated account manager</PricingFeature>
              <PricingFeature included>White-label options</PricingFeature>
              <PricingFeature included>24/7 phone support</PricingFeature>
            </ul>
            {user?.tier === 'enterprise' ? (
              <button disabled className="block w-full text-center py-2.5 px-4 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed">
                Current Plan
              </button>
            ) : isAuthenticated ? (
              <button
                onClick={() => handleUpgrade('enterprise')}
                disabled={upgrading}
                className="block w-full text-center py-2.5 px-4 bg-gray-900 dark:bg-gray-700 text-white rounded-lg text-sm font-bold hover:bg-gray-800 dark:hover:bg-gray-600 transition disabled:opacity-50"
              >
                {upgrading ? 'Upgrading...' : 'Upgrade Now'}
              </button>
            ) : (
              <a
                href="mailto:enterprise@JNARDDC.gov.in"
                className="block w-full text-center py-2.5 px-4 bg-gray-900 dark:bg-gray-700 text-white rounded-lg text-sm font-bold hover:bg-gray-800 dark:hover:bg-gray-600 transition"
              >
                Contact Sales
              </a>
            )}
          </div>
        </div>

        {/* Consultant License */}
        <div className="mt-10 max-w-3xl mx-auto">
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700 p-5">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-base">Consultant License</h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">Multi-client management • Verified consultant badge • ₹25,000/month</p>
              </div>
              <a
                href="mailto:consultants@JNARDDC.gov.in"
                className="px-5 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition whitespace-nowrap"
              >
                Apply Now
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-6">Compare Features</h2>
        <div className="max-w-4xl mx-auto overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">Feature</th>
                <th className="text-center py-4 px-4 font-semibold text-gray-900 dark:text-white">Free</th>
                <th className="text-center py-4 px-4 font-semibold text-blue-600">Pro</th>
                <th className="text-center py-4 px-4 font-semibold text-purple-600">Enterprise</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 dark:text-gray-300">
              <CompareRow feature="Projects" free="3" pro="Unlimited" enterprise="Unlimited" />
              <CompareRow feature="GWP & MCI Calculations" free={true} pro={true} enterprise={true} />
              <CompareRow feature="NLP Input" free={true} pro={true} enterprise={true} />
              <CompareRow feature="BOM Upload (CSV/Excel)" free={true} pro={true} enterprise={true} />
              <CompareRow feature="CBAM Export" free={false} pro={true} enterprise={true} />
              <CompareRow feature="BRSR Export" free={false} pro={true} enterprise={true} />
              <CompareRow feature="ISO 14040 Reports" free={false} pro={true} enterprise={true} />
              <CompareRow feature="Scenario Comparison" free={false} pro={true} enterprise={true} />
              <CompareRow feature="AI Design Advisor" free={false} pro={true} enterprise={true} />
              <CompareRow feature="JNARDDC Verification" free={false} pro={false} enterprise={true} />
              <CompareRow feature="Team Management" free={false} pro={false} enterprise={true} />
              <CompareRow feature="API Access" free={false} pro={false} enterprise={true} />
              <CompareRow feature="Support" free="Community" pro="Email" enterprise="24/7 Phone" />
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-6">Frequently Asked Questions</h2>
        <div className="max-w-3xl mx-auto space-y-3">
          <FAQ
            question="Can I upgrade at any time?"
            answer="Yes! You can upgrade your plan at any time. Your new features will be available immediately, and billing will be prorated."
          />
          <FAQ
            question="What payment methods do you accept?"
            answer="We accept all major credit/debit cards, UPI, net banking, and wire transfers for enterprise customers."
          />
          <FAQ
            question="Is there a free trial for Pro?"
            answer="Yes, we offer a 14-day free trial of Pro plan. No credit card required to start."
          />
          <FAQ
            question="What is JNARDDC Verification?"
            answer="JNARDDC verification is an official certification from Joint National Action for Rare Earths & Defense Compliance that validates your LCA assessment for regulatory compliance and export documentation."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-600 py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Ready to get started?</h2>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto text-sm">
            Join thousands of Indian manufacturers already using JNARDDC LCA Portal for their environmental compliance needs.
          </p>
          <Link
            to={isAuthenticated ? "/dashboard" : "/register"}
            className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg text-sm font-bold hover:bg-blue-50 transition"
          >
            {isAuthenticated ? 'Go to Dashboard' : 'Start Free Today'}
          </Link>
        </div>
      </section>
    </div>
  )
}

function PricingFeature({ children, included = false, light = false }: { children: React.ReactNode; included?: boolean; light?: boolean }) {
  return (
    <li className="flex items-start gap-2">
      {included ? (
        <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${light ? 'text-green-300' : 'text-green-500'}`} />
      ) : (
        <X className={`w-4 h-4 mt-0.5 flex-shrink-0 ${light ? 'text-blue-300/50' : 'text-gray-300 dark:text-gray-600'}`} />
      )}
      <span className={included ? (light ? 'text-white' : 'text-gray-700 dark:text-gray-300') : (light ? 'text-blue-200/60' : 'text-gray-400 dark:text-gray-500')}>
        {children}
      </span>
    </li>
  )
}

function CompareRow({ feature, free, pro, enterprise }: { feature: string; free: boolean | string; pro: boolean | string; enterprise: boolean | string }) {
  const renderCell = (value: boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? <Check className="w-4 h-4 text-green-500 mx-auto" /> : <X className="w-4 h-4 text-gray-300 dark:text-gray-600 mx-auto" />
    }
    return <span>{value}</span>
  }

  return (
    <tr className="border-b border-gray-100 dark:border-gray-700/50">
      <td className="py-2.5 px-4 text-gray-700 dark:text-gray-300">{feature}</td>
      <td className="py-2.5 px-4 text-center">{renderCell(free)}</td>
      <td className="py-2.5 px-4 text-center bg-blue-50/50 dark:bg-blue-900/20">{renderCell(pro)}</td>
      <td className="py-2.5 px-4 text-center">{renderCell(enterprise)}</td>
    </tr>
  )
}

function FAQ({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <summary className="flex items-center justify-between p-3 cursor-pointer font-medium text-gray-900 dark:text-white text-sm">
        {question}
        <span className="text-gray-400 group-open:rotate-180 transition-transform text-xs">▼</span>
      </summary>
      <p className="px-3 pb-3 text-gray-600 dark:text-gray-300 text-sm">{answer}</p>
    </details>
  )
}
