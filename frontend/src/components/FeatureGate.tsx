import { useAuthStore } from '../stores/authStore';
import { Link } from 'react-router-dom';

type FeatureKey = 'cbam_export' | 'brsr_export' | 'scenario_compare' | 'ai_advisor' | 'verification';

interface FeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const featureNames: Record<FeatureKey, string> = {
  cbam_export: 'CBAM Export',
  brsr_export: 'BRSR Export',
  scenario_compare: 'Scenario Comparison',
  ai_advisor: 'AI Design Advisor',
  verification: 'JNARDDC Verification',
};

const featureTiers: Record<FeatureKey, 'pro' | 'enterprise'> = {
  cbam_export: 'pro',
  brsr_export: 'pro',
  scenario_compare: 'pro',
  ai_advisor: 'pro',
  verification: 'enterprise',
};

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { user } = useAuthStore();
  
  // Check if user has access to feature
  const hasAccess = user?.features?.[feature] ?? false;
  
  // Also check tier directly as fallback
  const userTier = user?.tier || 'free';
  const requiredTier = featureTiers[feature];
  
  const tierAccess = 
    requiredTier === 'pro' ? (userTier === 'pro' || userTier === 'enterprise') :
    requiredTier === 'enterprise' ? userTier === 'enterprise' :
    true;
  
  if (hasAccess || tierAccess) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  return null;
}

export function UpgradePrompt({ feature, compact = false }: { feature: FeatureKey; compact?: boolean }) {
  const requiredTier = featureTiers[feature] || 'pro';
  const featureName = featureNames[feature] || feature;
  
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="text-yellow-500">🔒</span>
        <span>{featureName} requires {requiredTier === 'enterprise' ? 'Enterprise' : 'Pro'}</span>
        <Link to="/pricing" className="text-blue-600 hover:underline font-medium">
          Upgrade
        </Link>
      </div>
    );
  }
  
  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 border-2 border-dashed border-blue-200 rounded-xl p-8 text-center">
      <div className="text-4xl mb-3">🔒</div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">
        {featureName}
      </h3>
      <p className="text-gray-600 mb-4">
        This feature is available on the{' '}
        <span className={`font-semibold ${requiredTier === 'enterprise' ? 'text-purple-600' : 'text-blue-600'}`}>
          {requiredTier === 'enterprise' ? 'Enterprise' : 'Pro'}
        </span>{' '}
        plan
      </p>
      <Link
        to="/pricing"
        className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-white transition ${
          requiredTier === 'enterprise' 
            ? 'bg-purple-600 hover:bg-purple-700' 
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        <span>⚡</span>
        Upgrade to {requiredTier === 'enterprise' ? 'Enterprise' : 'Pro'}
      </Link>
      <p className="text-xs text-gray-400 mt-3">
        {requiredTier === 'pro' ? 'Starting at ₹15,000/month' : 'Custom pricing for enterprises'}
      </p>
    </div>
  );
}

export function ProjectLimitBanner() {
  const { user } = useAuthStore();
  
  if (!user || user.tier !== 'free') return null;
  
  const projectCount = user.project_count || 0;
  const projectLimit = user.project_limit || 3;
  const remaining = projectLimit - projectCount;
  
  if (remaining > 1) return null;
  
  return (
    <div className={`rounded-lg p-4 mb-4 ${
      remaining <= 0 
        ? 'bg-red-50 border border-red-200' 
        : 'bg-yellow-50 border border-yellow-200'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{remaining <= 0 ? '🚫' : '⚠️'}</span>
          <div>
            <p className={`font-medium ${remaining <= 0 ? 'text-red-700' : 'text-yellow-700'}`}>
              {remaining <= 0 
                ? 'Project limit reached' 
                : `Only ${remaining} project${remaining === 1 ? '' : 's'} remaining`}
            </p>
            <p className="text-sm text-gray-600">
              Free tier includes {projectLimit} projects. Upgrade for unlimited projects.
            </p>
          </div>
        </div>
        <Link
          to="/pricing"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          Upgrade Now
        </Link>
      </div>
    </div>
  );
}

export function TierBadge({ tier, size = 'md' }: { tier?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };
  
  const tierConfig = {
    free: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Free' },
    pro: { bg: 'bg-blue-100', text: 'text-blue-700', label: '⭐ Pro' },
    enterprise: { bg: 'bg-purple-100', text: 'text-purple-700', label: '🏢 Enterprise' },
  };
  
  const config = tierConfig[tier as keyof typeof tierConfig] || tierConfig.free;
  
  return (
    <span className={`${config.bg} ${config.text} ${sizeClasses[size]} rounded-full font-medium`}>
      {config.label}
    </span>
  );
}
