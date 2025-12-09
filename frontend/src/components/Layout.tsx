import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useLanguageStore, useTranslation, Language } from '../stores/languageStore';
import AIChatPanel from './AIChatPanel';
import WasteToResearchWidget from './WasteToResearchWidget';
import { Building, Star, Globe, ChevronDown, Recycle, Trophy } from 'lucide-react';

interface NavbarProps {
  children: React.ReactNode;
}

export default function Layout({ children }: NavbarProps) {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { language, setLanguage } = useLanguageStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const languageDropdownRef = useRef<HTMLDivElement>(null);

  const languages: { code: Language; name: string; nativeName: string; flag: string }[] = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳' },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) {
        setIsLanguageOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Apply dark mode to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', String(isDarkMode));
  }, [isDarkMode]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Don't show nav on homepage, login, or register pages
  const hideNav = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register';

  if (hideNav) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-3 text-xl font-bold">
                <img src="/images/ministryofmines.png" alt="Ministry of Mines" className="h-12 w-auto object-contain" />
                <img src="/images/logo.png" alt="JNARDDC" className="h-12 w-auto object-contain" />
                <span className="text-blue-900 hidden sm:inline">JNARDDC LCA Portal</span>
              </Link>
              {isAuthenticated && (
                <div className="ml-10 flex space-x-4">
                  <Link
                    to="/dashboard"
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    {t('nav.dashboard')}
                  </Link>
                  <Link
                    to="/projects"
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    {t('nav.projects')}
                  </Link>
                  <Link
                    to="/scrap-yard-connect"
                    className="text-gray-700 hover:text-green-600 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1"
                  >
                    <Recycle className="w-4 h-4" /> {t('nav.scrapYard')}
                    <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">{t('common.new')}</span>
                  </Link>
                  <Link
                    to="/teams"
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    {t('nav.teams')}
                  </Link>
                  <Link
                    to="/comparison"
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    {t('nav.compare')}
                  </Link>
                  <Link
                    to="/leaderboard"
                    className="text-gray-700 hover:text-yellow-600 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1"
                  >
                    <Trophy className="w-4 h-4" /> Leaderboard
                  </Link>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  {/* Wallet/Coins Display */}
                  <Link
                    to="/wallet"
                    className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 rounded-lg text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all"
                    title="Carbon Wallet"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                    </svg>
                    <span>0 MCT</span>
                  </Link>
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setIsProfileOpen(!isProfileOpen)}
                      className="flex items-center space-x-3 focus:outline-none hover:opacity-80 transition"
                    >
                      <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md">
                        {user?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <span className="text-sm text-gray-700 font-medium">
                        {user?.full_name || user?.email?.split('@')[0]}
                      </span>
                      <svg className={`w-4 h-4 text-gray-500 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {isProfileOpen && (
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                        {/* User Info */}
                        <div className="px-4 py-3 border-b border-gray-100">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{user?.full_name || 'User'}</p>
                              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                            </div>
                            {/* Tier Badge */}
                            <span className={`px-2 py-1 text-xs font-bold rounded-full flex items-center gap-1 ${user?.tier === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                              user?.tier === 'pro' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                              {user?.tier === 'enterprise' ? (
                                <><Building className="w-3 h-3" /> Enterprise</>
                              ) : user?.tier === 'pro' ? (
                                <><Star className="w-3 h-3" /> Pro</>
                              ) : 'Free'}
                            </span>
                          </div>
                          {/* Project Usage */}
                          {user?.tier === 'free' && (
                            <div className="mt-2">
                              <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Projects</span>
                                <span>{user?.project_count || 0} / {user?.project_limit || 3}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div
                                  className="bg-blue-600 h-1.5 rounded-full"
                                  style={{ width: `${Math.min(((user?.project_count || 0) / (user?.project_limit || 3)) * 100, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Dark Mode Toggle */}
                        <div className="px-4 py-3 border-b border-gray-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {isDarkMode ? (
                                <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                                </svg>
                              )}
                              <span className="text-sm text-gray-700">{t('nav.darkMode')}</span>
                            </div>
                            <button
                              onClick={toggleDarkMode}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isDarkMode ? 'bg-blue-600' : 'bg-gray-300'}`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                          </div>
                        </div>

                        {/* Menu Items */}
                        <div className="py-1">
                          <button
                            onClick={() => {
                              setIsProfileOpen(false);
                              navigate('/profile');
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                          >
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>{t('nav.profile')}</span>
                          </button>
                          <button
                            onClick={() => {
                              setIsProfileOpen(false);
                              navigate('/settings');
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                          >
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>{t('nav.settings')}</span>
                          </button>
                          <button
                            onClick={() => {
                              setIsProfileOpen(false);
                              navigate('/pricing');
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                          >
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{t('nav.pricing')}</span>
                          </button>
                        </div>

                        {/* Logout */}
                        <div className="border-t border-gray-100 pt-1">
                          <button
                            onClick={() => {
                              setIsProfileOpen(false);
                              handleLogout();
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span>{t('nav.logout')}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Language Switcher */}
                  <div className="relative" ref={languageDropdownRef}>
                    <button
                      onClick={() => setIsLanguageOpen(!isLanguageOpen)}
                      className="flex items-center space-x-1.5 px-3 py-2 rounded-lg hover:bg-gray-100 transition text-sm font-medium text-gray-700"
                    >
                      <Globe className="w-4 h-4" />
                      <span>{languages.find(l => l.code === language)?.flag}</span>
                      <span className="hidden sm:inline">{languages.find(l => l.code === language)?.nativeName}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isLanguageOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isLanguageOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                        <div className="px-3 py-2 border-b border-gray-100">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Select Language</p>
                        </div>
                        {languages.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => {
                              setLanguage(lang.code);
                              setIsLanguageOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-sm flex items-center space-x-3 hover:bg-gray-50 transition ${language === lang.code ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                              }`}
                          >
                            <span className="text-lg">{lang.flag}</span>
                            <div className="flex-1">
                              <p className="font-medium">{lang.nativeName}</p>
                              <p className="text-xs text-gray-500">{lang.name}</p>
                            </div>
                            {language === lang.code && (
                              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Language Switcher for non-authenticated users */}
                  <div className="relative" ref={languageDropdownRef}>
                    <button
                      onClick={() => setIsLanguageOpen(!isLanguageOpen)}
                      className="flex items-center space-x-1.5 px-3 py-2 rounded-lg hover:bg-gray-100 transition text-sm font-medium text-gray-700"
                    >
                      <Globe className="w-4 h-4" />
                      <span>{languages.find(l => l.code === language)?.flag}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isLanguageOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isLanguageOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                        <div className="px-3 py-2 border-b border-gray-100">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Select Language</p>
                        </div>
                        {languages.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => {
                              setLanguage(lang.code);
                              setIsLanguageOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-sm flex items-center space-x-3 hover:bg-gray-50 transition ${language === lang.code ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                              }`}
                          >
                            <span className="text-lg">{lang.flag}</span>
                            <div className="flex-1">
                              <p className="font-medium">{lang.nativeName}</p>
                              <p className="text-xs text-gray-500">{lang.name}</p>
                            </div>
                            {language === lang.code && (
                              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    {t('nav.login')}
                  </Link>
                  <Link
                    to="/register"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
                  >
                    {t('nav.getStarted')}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-1">{children}</main>

      {/* Footer Strip - hide on profile and settings pages */}
      {location.pathname !== '/profile' && location.pathname !== '/settings' && (
        <footer className="mt-auto">
          <img
            src="/images/footer.jpeg"
            alt="JNARDDC Footer"
            className="w-full h-auto object-cover"
          />
        </footer>
      )}

      {/* Floating Action Button Menu - only for authenticated users */}
      {isAuthenticated && (
        <>
          {/* FAB Menu Container */}
          <div className="fixed bottom-6 right-6 z-40">
            {/* Expanded Menu Items - shown when FAB is open */}
            <div className={`absolute bottom-20 right-0 flex flex-col gap-3 items-end transition-all duration-300 ${isFabOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
              {/* Scrap Yard Connect */}
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg shadow-lg whitespace-nowrap transition-all duration-200 ${isFabOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`} style={{ transitionDelay: '100ms' }}>
                  Scrap Yard Connect
                </span>
                <button
                  onClick={() => {
                    navigate('/scrap-yard-connect');
                    setIsFabOpen(false);
                  }}
                  className="w-12 h-12 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-full shadow-lg hover:scale-110 transition-all duration-200 flex items-center justify-center"
                  title="Scrap Yard Connect"
                >
                  <Recycle className="w-6 h-6" />
                </button>
              </div>

              {/* Waste to Resource */}
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg shadow-lg whitespace-nowrap transition-all duration-200 ${isFabOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`} style={{ transitionDelay: '50ms' }}>
                  Waste to Resource
                </span>
                <button
                  onClick={() => {
                    // Navigate to waste to research - check if on project page
                    const path = window.location.pathname;
                    const projectMatch = path.match(/\/projects\/([^\/]+)/);
                    if (projectMatch) {
                      navigate(`/projects/${projectMatch[1]}/waste-to-research`);
                    } else {
                      navigate('/projects');
                    }
                    setIsFabOpen(false);
                  }}
                  className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-full shadow-lg hover:scale-110 transition-all duration-200 flex items-center justify-center"
                  title="Waste to Resource Connect"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </button>
              </div>

              {/* AI Assistant */}
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg shadow-lg whitespace-nowrap transition-all duration-200 ${isFabOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
                  AI Assistant
                </span>
                <button
                  onClick={() => {
                    setIsChatOpen(true);
                    setIsFabOpen(false);
                  }}
                  className="w-12 h-12 bg-white text-emerald-600 rounded-full shadow-lg hover:scale-110 transition-all duration-200 flex items-center justify-center border border-gray-100"
                  title="AI Assistant"
                >
                  <img src="/images/ai.png" alt="AI" className="w-7 h-7 object-contain" />
                </button>
              </div>
            </div>

            {/* Main FAB Button */}
            <button
              onClick={() => setIsFabOpen(!isFabOpen)}
              className={`w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-2xl hover:shadow-blue-500/30 transition-all duration-300 flex items-center justify-center ${isFabOpen ? 'rotate-45' : ''}`}
              title={isFabOpen ? 'Close menu' : 'Open quick actions'}
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* Backdrop when FAB is open */}
          {isFabOpen && (
            <div
              className="fixed inset-0 bg-black/20 z-30"
              onClick={() => setIsFabOpen(false)}
            />
          )}

          <AIChatPanel
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
          />
        </>
      )}
    </div>
  );
}