import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import api from '../api/client'

interface AccountStats {
  project_count: number
  total_gwp: number
  analyses_run: number
  reports_generated: number
}

export default function ProfilePage() {
  const { user, checkAuth } = useAuthStore()
  const navigate = useNavigate()
  
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [stats, setStats] = useState<AccountStats>({
    project_count: 0,
    total_gwp: 0,
    analyses_run: 0,
    reports_generated: 0
  })
  
  const [formData, setFormData] = useState({
    full_name: '',
    organization_name: '',
  })

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        organization_name: user.organization_name || '',
      })
    }
    loadAccountStats()
  }, [user])

  const loadAccountStats = async () => {
    try {
      const response = await api.get('/auth/stats')
      setStats(response.data)
    } catch (error) {
      // Stats not available, use defaults
      console.log('Could not load account stats')
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)
    
    try {
      await api.put('/auth/profile', formData)
      await checkAuth() // Refresh user data
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      setIsEditing(false)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to update profile' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      full_name: user?.full_name || '',
      organization_name: user?.organization_name || '',
    })
    setIsEditing(false)
    setMessage(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:text-blue-700 mb-6 flex items-center gap-2"
        >
          ← Back
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600 mt-1">View and manage your account information</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header with Avatar */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                {user?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="text-white">
                <h2 className="text-2xl font-bold">{user?.full_name || 'User'}</h2>
                <p className="text-white/80">{user?.email}</p>
                <div className="mt-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    user?.tier === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                    user?.tier === 'pro' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user?.tier === 'enterprise' ? '🏢 Enterprise' :
                     user?.tier === 'pro' ? '⭐ Pro' : '🆓 Free Plan'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Account Details</h3>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    className="text-gray-600 hover:text-gray-700 text-sm font-medium px-3 py-1 border border-gray-300 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-blue-600 text-white text-sm font-medium px-3 py-1 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your full name"
                  />
                ) : (
                  <p className="text-gray-900 py-2">{user?.full_name || <span className="text-gray-400 italic">Not set</span>}</p>
                )}
              </div>

              {/* Email (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <p className="text-gray-900 py-2">{user?.email}</p>
                <p className="text-xs text-gray-500">Email cannot be changed</p>
              </div>

              {/* Organization */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.organization_name}
                    onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your organization name"
                  />
                ) : (
                  <p className="text-gray-900 py-2">{user?.organization_name || <span className="text-gray-400 italic">Not set</span>}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Info */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Current Plan</p>
              <p className="text-xl font-bold text-gray-900 capitalize">{user?.tier || 'Free'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Projects Used</p>
              <p className="text-xl font-bold text-gray-900">
                {user?.project_count || 0} / {user?.project_limit === -1 ? '∞' : user?.project_limit || 3}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Features</p>
              <p className="text-sm font-medium text-gray-900">
                {user?.tier === 'enterprise' ? 'All features + Verification' :
                 user?.tier === 'pro' ? 'Full access' : 'Basic features'}
              </p>
            </div>
          </div>

          {user?.tier === 'free' && (
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Upgrade to Pro</p>
                  <p className="text-sm text-gray-600">Get unlimited projects and advanced features</p>
                </div>
                <button
                  onClick={() => navigate('/pricing')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
                >
                  View Plans
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Account Stats */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Activity</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{stats.project_count}</p>
              <p className="text-sm text-gray-600">Projects</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {stats.total_gwp > 0 ? `${stats.total_gwp.toFixed(1)}` : '0'}
              </p>
              <p className="text-sm text-gray-600">Total kg CO₂-eq</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{stats.analyses_run}</p>
              <p className="text-sm text-gray-600">Analyses Run</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">{stats.reports_generated}</p>
              <p className="text-sm text-gray-600">Reports Generated</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
