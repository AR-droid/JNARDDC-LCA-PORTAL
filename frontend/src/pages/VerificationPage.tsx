import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Building2, CheckCircle, Clock, XCircle, AlertTriangle, Award, Lock, ArrowLeft } from 'lucide-react';
import { projectsApi, VerificationStatus, Project } from '../api/projects';
import { useAuthStore } from '../stores/authStore';

const VerificationPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [project, setProject] = useState<Project | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const hasVerificationAccess = user?.tier === 'enterprise' || user?.features?.verification;

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      const [projectData, statusData] = await Promise.all([
        projectsApi.getById(id),
        projectsApi.checkVerificationStatus(id).catch(() => ({ verification_status: 'not_submitted' }))
      ]);
      
      setProject(projectData);
      setVerificationStatus(statusData as VerificationStatus);
    } catch (error) {
      console.error('Error loading verification data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitVerification = async () => {
    if (!id) return;
    
    try {
      setIsSubmitting(true);
      // Mock submission - just update status locally
      setVerificationStatus({
        verification_status: 'pending',
        verification_submitted_at: new Date().toISOString()
      });
      setShowSuccessMessage(true);
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
    } catch (error) {
      console.error('Error submitting for verification:', error);
      alert('Failed to submit for verification. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading verification details...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Project not found</p>
          <Link to="/projects" className="mt-4 text-blue-600 hover:text-blue-700">
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            to={`/projects/${id}`}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Project
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-600" />
            JNARDDC Verification
          </h1>
          <p className="mt-2 text-gray-600">
            Get your LCA assessment verified by JNARDDC (Joint National Action for Rare Earths & Defense Compliance)
          </p>
        </div>

        {/* Success Message */}
        {showSuccessMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-green-900 font-semibold">Verification Request Submitted!</h3>
              <p className="text-green-700 text-sm mt-1">
                Your LCA assessment has been successfully submitted to JNARDDC for verification. 
                Our team will review your submission within 3-5 business days.
              </p>
            </div>
          </div>
        )}

        {/* Project Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Project Name</p>
              <p className="font-medium text-gray-900">{project.name}</p>
            </div>
            {project.description && (
              <div>
                <p className="text-sm text-gray-500">Description</p>
                <p className="font-medium text-gray-900">{project.description}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                project.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                project.status === 'calculated' ? 'bg-green-100 text-green-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {project.status}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Created</p>
              <p className="font-medium text-gray-900">
                {new Date(project.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Verification Status Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                Verification Status
                {!hasVerificationAccess && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                    Enterprise Only
                  </span>
                )}
              </h2>
            </div>
            <div>
              {verificationStatus?.verification_status === 'not_submitted' && hasVerificationAccess && (
                <button
                  onClick={handleSubmitVerification}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Submit for Verification
                    </>
                  )}
                </button>
              )}
              {verificationStatus?.verification_status === 'pending' && (
                <span className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Pending Review
                </span>
              )}
              {verificationStatus?.verification_status === 'approved' && (
                <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Verified
                </span>
              )}
              {verificationStatus?.verification_status === 'rejected' && (
                <span className="px-4 py-2 bg-red-100 text-red-800 rounded-lg text-sm font-medium flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Rejected
                </span>
              )}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            {!hasVerificationAccess && (
              <div className="text-center py-8">
                <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Enterprise Feature
                </h3>
                <p className="text-gray-600 mb-4">
                  JNARDDC verification is available for Enterprise plan users
                </p>
                <Link
                  to="/pricing"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Upgrade to Enterprise
                </Link>
              </div>
            )}

            {hasVerificationAccess && verificationStatus?.verification_status === 'not_submitted' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Why Get Verified?</h3>
                  <p className="text-sm text-gray-700 mb-3">
                    JNARDDC verification certifies that your LCA assessment meets Indian regulatory standards and is compliant with:
                  </p>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Critical Minerals Mission Guidelines</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>SEBI BRSR ESG Disclosure Requirements</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>National E-Waste Management Standards</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Extended Producer Responsibility (EPR) Rules</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-900 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Ensure your project has materials and calculated metrics before submitting for verification.</span>
                  </p>
                </div>
              </div>
            )}

            {hasVerificationAccess && verificationStatus?.verification_status === 'pending' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-700">
                  Your LCA assessment has been submitted for JNARDDC verification. Our team will review your submission and provide feedback.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Submitted</p>
                    <p className="font-medium text-gray-900">
                      {verificationStatus.verification_submitted_at 
                        ? new Date(verificationStatus.verification_submitted_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Just now'}
                    </p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Expected Review Time</p>
                    <p className="font-medium text-gray-900">3-5 business days</p>
                  </div>
                </div>
              </div>
            )}

            {hasVerificationAccess && verificationStatus?.verification_status === 'approved' && (
              <div className="text-center py-6">
                <Award className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  ✨ Verification Approved!
                </h3>
                <p className="text-gray-700 mb-4">
                  Your LCA assessment has been verified by JNARDDC and meets all regulatory compliance standards.
                </p>
                {verificationStatus.verification_reviewed_at && (
                  <p className="text-sm text-gray-500">
                    Approved on {new Date(verificationStatus.verification_reviewed_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                )}
              </div>
            )}

            {hasVerificationAccess && verificationStatus?.verification_status === 'rejected' && (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                    <XCircle className="w-5 h-5" />
                    Verification Rejected
                  </h3>
                  <p className="text-sm text-red-700">
                    {verificationStatus.verification_notes || 'Your submission did not meet the required standards. Please review the feedback and resubmit.'}
                  </p>
                </div>
                <button
                  onClick={() => setVerificationStatus({ verification_status: 'not_submitted' })}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Resubmit for Verification
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Benefits Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Benefits of JNARDDC Verification</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <p className="font-medium text-gray-900">Regulatory Compliance</p>
                <p className="text-sm text-gray-600">Meet Indian environmental and ESG reporting standards</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <p className="font-medium text-gray-900">Credibility</p>
                <p className="text-sm text-gray-600">Independent third-party verification builds trust</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <p className="font-medium text-gray-900">Export Ready</p>
                <p className="text-sm text-gray-600">Facilitates CBAM and international trade compliance</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <p className="font-medium text-gray-900">ESG Reporting</p>
                <p className="text-sm text-gray-600">Supports SEBI BRSR and sustainability disclosures</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationPage;
