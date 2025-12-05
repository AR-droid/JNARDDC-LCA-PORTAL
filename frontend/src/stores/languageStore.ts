import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'en' | 'hi';

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'language-storage',
    }
  )
);

// Translations dictionary
export const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.projects': 'Projects',
    'nav.scrapYard': 'Scrap Yard',
    'nav.teams': 'Teams',
    'nav.compare': 'Compare',
    'nav.login': 'Login',
    'nav.getStarted': 'Get Started',
    'nav.profile': 'Profile',
    'nav.settings': 'Settings',
    'nav.pricing': 'Pricing & Plans',
    'nav.logout': 'Logout',
    'nav.darkMode': 'Dark Mode',
    'nav.language': 'Language',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Welcome back',
    'dashboard.totalProjects': 'Total Projects',
    'dashboard.activeProjects': 'Active Projects',
    'dashboard.completedProjects': 'Completed Projects',
    'dashboard.avgMciScore': 'Avg MCI Score',
    'dashboard.recentProjects': 'Recent Projects',
    'dashboard.quickActions': 'Quick Actions',
    'dashboard.createProject': 'Create New Project',
    'dashboard.viewAll': 'View All',
    'dashboard.noProjects': 'No projects yet',
    'dashboard.startFirst': 'Start your first LCA project',
    
    // Projects
    'projects.title': 'Projects',
    'projects.newProject': 'New Project',
    'projects.search': 'Search projects...',
    'projects.filter': 'Filter',
    'projects.sort': 'Sort',
    'projects.status.draft': 'Draft',
    'projects.status.active': 'Active',
    'projects.status.completed': 'Completed',
    'projects.status.archived': 'Archived',
    'projects.noResults': 'No projects found',
    
    // Create Project
    'create.title': 'Create New Project',
    'create.projectName': 'Project Name',
    'create.description': 'Description',
    'create.productCategory': 'Product Category',
    'create.targetLifespan': 'Target Lifespan (years)',
    'create.designedForDisassembly': 'Designed for Disassembly',
    'create.submit': 'Create Project',
    'create.cancel': 'Cancel',
    
    // Scrap Yard Connect
    'scrapYard.title': 'Scrap Yard Connect',
    'scrapYard.subtitle': "India's Largest Recycled Metal Marketplace",
    'scrapYard.scrapYards': 'Scrap Yards',
    'scrapYard.available': 'Available',
    'scrapYard.states': 'States',
    'scrapYard.potentialSavings': 'Potential Savings',
    'scrapYard.filterByMaterial': 'Filter by Material',
    'scrapYard.filterByState': 'Filter by State',
    'scrapYard.maxPrice': 'Max Price (₹/kg)',
    'scrapYard.verifiedOnly': 'Verified Only',
    'scrapYard.search': 'Search scrap yards...',
    'scrapYard.planA': 'Plan A: Best Price',
    'scrapYard.planB': 'Plan B: Nearest Location',
    'scrapYard.planC': 'Plan C: Maximum Availability',
    'scrapYard.contactNow': 'Contact Now',
    'scrapYard.viewDetails': 'View Details',
    'scrapYard.tons': 'tons',
    'scrapYard.perKg': '/kg',
    'scrapYard.verified': 'Verified',
    'scrapYard.transactions': 'transactions',
    
    // BOM (Bill of Materials)
    'bom.title': 'Bill of Materials',
    'bom.addMaterial': 'Add Material',
    'bom.material': 'Material',
    'bom.quantity': 'Quantity',
    'bom.unit': 'Unit',
    'bom.source': 'Source',
    'bom.recycledContent': 'Recycled Content',
    'bom.actions': 'Actions',
    'bom.noMaterials': 'No materials added yet',
    
    // LCA Results
    'lca.title': 'LCA Results',
    'lca.gwpTotal': 'Total GWP',
    'lca.mciScore': 'MCI Score',
    'lca.circularDesignScore': 'Circular Design Score',
    'lca.environmentalImpact': 'Environmental Impact',
    'lca.recommendations': 'Recommendations',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.view': 'View',
    'common.download': 'Download',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.sort': 'Sort',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.confirm': 'Confirm',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.submit': 'Submit',
    'common.reset': 'Reset',
    'common.clear': 'Clear',
    'common.close': 'Close',
    'common.new': 'NEW',
    'common.live': 'LIVE',
  },
  hi: {
    // Navigation
    'nav.dashboard': 'डैशबोर्ड',
    'nav.projects': 'परियोजनाएं',
    'nav.scrapYard': 'स्क्रैप यार्ड',
    'nav.teams': 'टीमें',
    'nav.compare': 'तुलना करें',
    'nav.login': 'लॉगिन',
    'nav.getStarted': 'शुरू करें',
    'nav.profile': 'प्रोफ़ाइल',
    'nav.settings': 'सेटिंग्स',
    'nav.pricing': 'मूल्य निर्धारण और योजनाएं',
    'nav.logout': 'लॉगआउट',
    'nav.darkMode': 'डार्क मोड',
    'nav.language': 'भाषा',
    
    // Dashboard
    'dashboard.title': 'डैशबोर्ड',
    'dashboard.welcome': 'वापसी पर स्वागत है',
    'dashboard.totalProjects': 'कुल परियोजनाएं',
    'dashboard.activeProjects': 'सक्रिय परियोजनाएं',
    'dashboard.completedProjects': 'पूर्ण परियोजनाएं',
    'dashboard.avgMciScore': 'औसत MCI स्कोर',
    'dashboard.recentProjects': 'हाल की परियोजनाएं',
    'dashboard.quickActions': 'त्वरित कार्य',
    'dashboard.createProject': 'नई परियोजना बनाएं',
    'dashboard.viewAll': 'सभी देखें',
    'dashboard.noProjects': 'अभी तक कोई परियोजना नहीं',
    'dashboard.startFirst': 'अपनी पहली LCA परियोजना शुरू करें',
    
    // Projects
    'projects.title': 'परियोजनाएं',
    'projects.newProject': 'नई परियोजना',
    'projects.search': 'परियोजनाएं खोजें...',
    'projects.filter': 'फ़िल्टर',
    'projects.sort': 'क्रमबद्ध करें',
    'projects.status.draft': 'ड्राफ्ट',
    'projects.status.active': 'सक्रिय',
    'projects.status.completed': 'पूर्ण',
    'projects.status.archived': 'संग्रहीत',
    'projects.noResults': 'कोई परियोजना नहीं मिली',
    
    // Create Project
    'create.title': 'नई परियोजना बनाएं',
    'create.projectName': 'परियोजना का नाम',
    'create.description': 'विवरण',
    'create.productCategory': 'उत्पाद श्रेणी',
    'create.targetLifespan': 'लक्ष्य जीवनकाल (वर्ष)',
    'create.designedForDisassembly': 'विघटन के लिए डिज़ाइन किया गया',
    'create.submit': 'परियोजना बनाएं',
    'create.cancel': 'रद्द करें',
    
    // Scrap Yard Connect
    'scrapYard.title': 'स्क्रैप यार्ड कनेक्ट',
    'scrapYard.subtitle': 'भारत का सबसे बड़ा पुनर्नवीनीकृत धातु बाज़ार',
    'scrapYard.scrapYards': 'स्क्रैप यार्ड',
    'scrapYard.available': 'उपलब्ध',
    'scrapYard.states': 'राज्य',
    'scrapYard.potentialSavings': 'संभावित बचत',
    'scrapYard.filterByMaterial': 'सामग्री द्वारा फ़िल्टर करें',
    'scrapYard.filterByState': 'राज्य द्वारा फ़िल्टर करें',
    'scrapYard.maxPrice': 'अधिकतम मूल्य (₹/किग्रा)',
    'scrapYard.verifiedOnly': 'केवल सत्यापित',
    'scrapYard.search': 'स्क्रैप यार्ड खोजें...',
    'scrapYard.planA': 'योजना A: सर्वोत्तम मूल्य',
    'scrapYard.planB': 'योजना B: निकटतम स्थान',
    'scrapYard.planC': 'योजना C: अधिकतम उपलब्धता',
    'scrapYard.contactNow': 'अभी संपर्क करें',
    'scrapYard.viewDetails': 'विवरण देखें',
    'scrapYard.tons': 'टन',
    'scrapYard.perKg': '/किग्रा',
    'scrapYard.verified': 'सत्यापित',
    'scrapYard.transactions': 'लेनदेन',
    
    // BOM (Bill of Materials)
    'bom.title': 'सामग्री बिल',
    'bom.addMaterial': 'सामग्री जोड़ें',
    'bom.material': 'सामग्री',
    'bom.quantity': 'मात्रा',
    'bom.unit': 'इकाई',
    'bom.source': 'स्रोत',
    'bom.recycledContent': 'पुनर्नवीनीकृत सामग्री',
    'bom.actions': 'कार्य',
    'bom.noMaterials': 'अभी तक कोई सामग्री नहीं जोड़ी गई',
    
    // LCA Results
    'lca.title': 'LCA परिणाम',
    'lca.gwpTotal': 'कुल GWP',
    'lca.mciScore': 'MCI स्कोर',
    'lca.circularDesignScore': 'सर्कुलर डिज़ाइन स्कोर',
    'lca.environmentalImpact': 'पर्यावरणीय प्रभाव',
    'lca.recommendations': 'सिफारिशें',
    
    // Common
    'common.loading': 'लोड हो रहा है...',
    'common.error': 'एक त्रुटि हुई',
    'common.save': 'सहेजें',
    'common.cancel': 'रद्द करें',
    'common.delete': 'हटाएं',
    'common.edit': 'संपादित करें',
    'common.view': 'देखें',
    'common.download': 'डाउनलोड',
    'common.export': 'निर्यात',
    'common.import': 'आयात',
    'common.search': 'खोजें',
    'common.filter': 'फ़िल्टर',
    'common.sort': 'क्रमबद्ध करें',
    'common.yes': 'हाँ',
    'common.no': 'नहीं',
    'common.confirm': 'पुष्टि करें',
    'common.back': 'वापस',
    'common.next': 'अगला',
    'common.previous': 'पिछला',
    'common.submit': 'जमा करें',
    'common.reset': 'रीसेट',
    'common.clear': 'साफ़ करें',
    'common.close': 'बंद करें',
    'common.new': 'नया',
    'common.live': 'लाइव',
  },
};

// Helper hook to get translation function
export const useTranslation = () => {
  const { language } = useLanguageStore();
  
  const t = (key: string): string => {
    return translations[language][key] || key;
  };
  
  return { t, language };
};
