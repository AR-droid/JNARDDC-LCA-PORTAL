import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Link } from 'react-router-dom';
import { projectsApi, getDashboardAnalytics, DashboardAnalytics } from '../api/projects';
import { GWPBreakdownChart, MCIGauge } from '../components/charts';
import AIChatPanel from '../components/AIChatPanel';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [projects, setProjects] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    calculated: 0,
    avgGwp: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
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
      } catch (err) {
        console.log('Analytics not available yet');
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {user?.full_name || user?.email || 'User'}!
          </h1>
          <p className="text-gray-600">
            {user?.organization_name && `${user.organization_name} • `}
            Track your environmental impact and circularity metrics
          </p>
        </div>

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

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="text-3xl">💡</div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">Phase 1 MVP Features Active</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>✅ Aluminium & Copper material library with emission factors</li>
                <li>✅ GWP calculator with recycled content optimization</li>
                <li>✅ Bill of Materials tracking and visualization</li>
                <li>✅ Real-time carbon footprint calculation</li>
              </ul>
              <p className="text-xs text-gray-600 mt-3">
                <strong>Account:</strong> {user?.email} • <strong>Org:</strong> {user?.organization_name || 'None'}
              </p>
            </div>
          </div>
        </div>

        {/* AI Chat Button */}
        <button
          onClick={() => setShowChat(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-105 transition-transform z-40"
          title="Chat with AI Assistant"
        >
          <span className="text-2xl">🤖</span>
        </button>

        {/* AI Chat Panel */}
        <AIChatPanel isOpen={showChat} onClose={() => setShowChat(false)} />
      </div>
    </div>
  );
}
