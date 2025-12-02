import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Link } from 'react-router-dom';
import { projectsApi, getDashboardAnalytics, DashboardAnalytics } from '../api/projects';
import { GWPBreakdownChart, MCIGauge } from '../components/charts';
import { PlusIcon } from '../components/Icons';

export default function DashboardPage() {
  const { user, checkAuth } = useAuthStore();
  const [projects, setProjects] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    calculated: 0,
    avgGwp: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Refresh user data to get latest project_count
    checkAuth();
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const data = await projectsApi.list();
      setProjects(data.slice(0, 5)); // Recent 5 projects
      
      const calculated = data.filter((p: any) => p.status === 'calculated' || p.status === 'verified').length;
      const totalGwp = data.reduce((sum: number, p: any) => sum + (p.gwp_total || 0), 0);
      const avgGwp = data.length > 0 ? totalGwp / data.length : 0;
      
      setStats({
        total: data.length,
        calculated,
        avgGwp,
      });

      // Load analytics
      try {
        const analyticsData = await getDashboardAnalytics();
        setAnalytics(analyticsData);
      } catch {
        // Analytics not available yet - ignore silently
      }
    } catch {
      // Error loading dashboard
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {user?.full_name || user?.email?.split('@')[0] || 'User'}!
            </h1>
            <p className="text-gray-600">
              {user?.organization_name && `${user.organization_name} • `}
              Track your environmental impact and circularity metrics
            </p>
          </div>
          <Link
            to="/projects/new"
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition font-medium shadow-sm"
          >
            <PlusIcon size={18} /> New Project
          </Link>
        </div>

        {/* Subscription Status Card */}
        {user?.tier === 'free' ? (
          <div className="rounded-xl mb-8 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-4 shadow-lg shadow-indigo-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                  <span className="text-2xl">✨</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">Upgrade to Pro</h3>
                    <span className="px-2.5 py-0.5 bg-white/20 backdrop-blur text-white text-xs font-bold rounded-full">SAVE 20%</span>
                  </div>
                  <p className="text-white/80 text-sm">
                    Unlimited projects • CBAM/BRSR exports • AI Design Advisor
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <div className="text-sm text-white/80 mb-1">
                    <span className="font-semibold text-white">{user?.project_count || 0}</span>
                    <span className="text-white/60"> / </span>
                    <span>{user?.project_limit || 3} projects</span>
                  </div>
                  <div className="w-20 bg-white/20 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all ${
                        (user?.project_count || 0) >= (user?.project_limit || 3) ? 'bg-red-300' :
                        (user?.project_count || 0) >= (user?.project_limit || 3) - 1 ? 'bg-yellow-300' :
                        'bg-white'
                      }`}
                      style={{ width: `${Math.min(((user?.project_count || 0) / (user?.project_limit || 3)) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
                <Link
                  to="/pricing"
                  className="bg-white text-indigo-600 px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-50 hover:-translate-y-0.5 transition-all flex items-center gap-2 dark:bg-white dark:text-indigo-600 dark:hover:bg-indigo-100"
                >
                  Upgrade <span>→</span>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className={`rounded-xl p-5 mb-8 text-white ${
            user?.tier === 'enterprise' ? 'bg-gradient-to-r from-purple-600 to-indigo-600' :
            'bg-gradient-to-r from-blue-600 to-cyan-600'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl">
                    {user?.tier === 'enterprise' ? '🏢' : '⭐'}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-0.5">
                    {user?.tier === 'enterprise' ? 'Enterprise' : 'Pro'} Plan
                  </h3>
                  <p className="text-white/80 text-sm">
                    {user?.tier === 'pro'
                      ? 'Unlimited projects • Pro features enabled'
                      : 'Full access • Priority support • Custom integrations'
                    }
                  </p>
                </div>
              </div>
              {user?.tier === 'pro' && (
                <Link
                  to="/pricing"
                  className="bg-white/20 text-white px-5 py-2 rounded-lg font-medium hover:bg-white/30 transition text-sm"
                >
                  View Enterprise
                </Link>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2 text-gray-700">Total Projects</h3>
            <p className="text-4xl font-bold text-blue-600">{stats.total}</p>
            <p className="text-sm text-gray-500 mt-2">
              {stats.total === 0 ? 'Get started by creating a project' : `${stats.calculated} calculated`}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2 text-gray-700">Total Carbon Footprint</h3>
            <p className="text-4xl font-bold text-green-600">{analytics?.summary?.total_gwp?.toFixed(1) || stats.avgGwp.toFixed(1)}</p>
            <p className="text-sm text-gray-500 mt-1">kg CO₂-eq across all projects</p>
            <p className="text-2xs text-gray-400 italic mt-1">Source: IPCC AR6, Ecoinvent 3.9</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2 text-gray-700">Avg Circularity (MCI)</h3>
            <p className="text-4xl font-bold text-purple-600">{((analytics?.summary?.avg_mci || 0) * 100).toFixed(0)}%</p>
            <p className="text-sm text-gray-500 mt-1">Material Circularity Index</p>
            <p className="text-2xs text-gray-400 italic mt-1">Ellen MacArthur Foundation</p>
          </div>
        </div>

        {/* Analytics Section */}
        {analytics && analytics.material_distribution && analytics.material_distribution.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <GWPBreakdownChart 
              data={analytics.material_distribution} 
              title="GWP Distribution by Material Type" 
            />
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Circularity Overview</h3>
              <div className="flex items-center justify-around">
                <MCIGauge 
                  score={analytics.summary?.avg_mci || 0} 
                  size="lg" 
                  label="Average MCI"
                />
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">Circular Score</p>
                  <p className="text-4xl font-bold text-orange-500">
                    {(analytics.summary?.avg_circular_score || 0).toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-400">out of 100</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                to="/projects/new"
                className="flex items-center p-4 border-2 border-blue-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <span className="text-2xl">🚀</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Create New Project</h3>
                  <p className="text-sm text-gray-600">Start a new LCA assessment with NLP or manual entry</p>
                </div>
              </Link>
              <Link
                to="/projects"
                className="flex items-center p-4 border-2 border-green-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition"
              >
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                  <span className="text-2xl">📦</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">View All Projects</h3>
                  <p className="text-sm text-gray-600">Manage your LCA portfolio</p>
                </div>
              </Link>
              <Link
                to="/teams"
                className="flex items-center p-4 border-2 border-purple-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition"
              >
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                  <span className="text-2xl">👥</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Team Management</h3>
                  <p className="text-sm text-gray-600">Collaborate with your team on projects</p>
                </div>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Recent Projects</h2>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No projects yet</p>
                <Link to="/projects" className="text-blue-600 hover:text-blue-700 text-sm mt-2 inline-block">
                  Create your first project →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{project.name}</h4>
                      <p className="text-sm text-gray-500">{project.product_category || 'No category'}</p>
                    </div>
                    <div className="text-right ml-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        project.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                        project.status === 'calculated' ? 'bg-green-100 text-green-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {project.status}
                      </span>
                      {project.gwp_total && typeof project.gwp_total === 'number' && project.gwp_total > 0 && (
                        <p className="text-sm text-gray-600 mt-1">{project.gwp_total.toFixed(1)} kg CO₂</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
