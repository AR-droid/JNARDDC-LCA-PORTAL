import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { projectsApi } from '../api/projects';
import { Plus } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  product_category?: string;
  gwp_total?: number;
  mci_score?: number;
  created_at: string;
  updated_at: string;
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const data = await projectsApi.list();
      setProjects(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch projects');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      draft: 'bg-gray-100 text-gray-800',
      calculating: 'bg-yellow-100 text-yellow-800',
      calculated: 'bg-blue-100 text-blue-800',
      pending_review: 'bg-orange-100 text-orange-800',
      verified: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Projects</h1>
            <p className="text-gray-600 mt-1">Manage your LCA assessments</p>
          </div>
          <button
            onClick={() => navigate('/projects/new')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold shadow flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> New Project
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">No Projects Yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first LCA project to get started with circularity assessment
            </p>
            <button
              onClick={() => navigate('/projects/new')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              Create Your First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 block"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-bold text-gray-900 line-clamp-2">
                    {project.name}
                  </h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(project.status)}`}>
                    {project.status.replace('_', ' ')}
                  </span>
                </div>

                {project.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {project.description}
                  </p>
                )}

                {project.product_category && (
                  <p className="text-xs text-gray-500 mb-3">
                    Category: {project.product_category}
                  </p>
                )}

                <div className="border-t pt-3 mt-3 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">GWP Total</p>
                    <p className="text-sm font-semibold">
                      {project.gwp_total && typeof project.gwp_total === 'number' 
                        ? `${project.gwp_total.toFixed(2)} kg CO₂e` 
                        : '--'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">MCI Score</p>
                    <p className="text-sm font-semibold">
                      {project.mci_score && typeof project.mci_score === 'number' 
                        ? project.mci_score.toFixed(2) 
                        : '--'}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-gray-400 mt-3">
                  Updated {new Date(project.updated_at).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
