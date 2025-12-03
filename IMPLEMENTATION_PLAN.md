# MetalLCA Implementation Plan

## Overview
This document outlines the detailed implementation plan for completing the MetalLCA platform according to the Master Flow specification.

---

## Current Status (As of Nov 30, 2025)

### ✅ Completed (Phase 0 - Foundation)
- **Backend Infrastructure**: FastAPI server with database models
- **Database Schemas**: Organizations, Projects, Materials, LCI Library, Benchmarks
- **Authentication System**: JWT-based auth with RBAC (Free/Pro/Enterprise)
- **Core AI Engines**:
  - Engine 1: NLP Translation & Gap Filling
  - Engine 2: LCA Calculator (GWP formulas)
  - Engine 3: MCI Calculator (Material Circularity Indicator)
- **API Endpoints**: Auth, Projects, Materials, Analysis, Admin
- **Frontend Foundation**: React + Vite with Tailwind CSS, basic routing

### 🚧 In Progress
- Frontend UI components (basic pages created)
- API integration layer

### ❌ Not Started
- Complete user flow implementation
- Data visualization components (D3.js/Recharts)
- LCI database seeding
- File upload functionality
- Real-time calculation triggers
- JNARDDC verification workflow UI

---

## Implementation Roadmap

## 🎯 **PHASE 1: Core User Flow (Week 1-2)**

### 1.1 Entry & Setup Flow
**Goal**: Enable users to register, login, and set up their context

#### Tasks:
- [ ] **Authentication Flow** (2 days)
  - Integrate login/register pages with backend API
  - Implement JWT token storage (localStorage/sessionStorage)
  - Create protected route wrapper component
  - Add authentication state management (Zustand store)
  - Handle token refresh logic
  
- [ ] **User Context Setup** (1 day)
  - Create onboarding flow after registration
  - Sector selection dropdown (Automotive, Construction, Power, etc.)
  - Load relevant datasets based on sector
  - Store user preferences

**Files to Create/Modify:**
```
frontend/src/
├── api/
│   ├── auth.ts              # API calls for authentication
│   └── client.ts            # Axios instance with interceptors
├── stores/
│   └── authStore.ts         # Zustand auth state
├── components/
│   ├── ProtectedRoute.tsx   # Route guard component
│   └── OnboardingModal.tsx  # Sector selection
└── utils/
    └── tokenManager.ts      # Token handling utilities
```

**API Endpoints to Integrate:**
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/refresh`

---

### 1.2 Project Creation (The Smart Input)
**Goal**: Implement Phase 2 of the flow - Natural Language and BOM input

#### Tasks:
- [ ] **Project Creation Modal** (1 day)
  - Create new project form
  - Fields: name, description, product category, target lifespan
  - Design for disassembly checkbox
  - Save as draft initially

- [ ] **NLP Input Interface** (2 days)
  - Text area for natural language material description
  - Real-time parsing indicator
  - Confidence score display
  - Material preview card showing parsed data
  - Edit/confirm parsed results

- [ ] **BOM Bulk Upload** (2 days)
  - Excel/CSV file upload component
  - File parsing and validation
  - Preview table with editable cells
  - Mass balance checker
  - Import confirmation

- [ ] **Material Confirmation Screen** (1 day)
  - Display all materials in project
  - Show AI assumptions (highlighted)
  - Allow user to edit assumptions
  - Transport distance/energy inputs
  - Save and proceed to calculation

**Files to Create:**
```
frontend/src/
├── components/
│   ├── ProjectCreateModal.tsx
│   ├── NLPMaterialInput.tsx
│   ├── BOMUploadModal.tsx
│   ├── MaterialConfirmationTable.tsx
│   └── MaterialCard.tsx
├── pages/
│   └── ProjectCreatePage.tsx
└── api/
    ├── projects.ts
    └── materials.ts
```

**API Endpoints to Integrate:**
- `POST /api/v1/projects/`
- `POST /api/v1/materials/nlp`
- `POST /api/v1/materials/bulk`
- `GET /api/v1/materials/project/{id}`

---

### 1.3 Calculation Trigger
**Goal**: Enable users to trigger LCA calculation

#### Tasks:
- [ ] **Calculate Button** (1 day)
  - Pre-calculation validation checks
  - Loading state with progress indicator
  - Error handling and retry logic
  - Redirect to analysis page on completion

- [ ] **Calculation Status Polling** (1 day)
  - WebSocket or polling mechanism
  - Real-time status updates
  - Estimated time remaining
  - Cancel calculation option

**Files to Create:**
```
frontend/src/
├── components/
│   ├── CalculateButton.tsx
│   └── CalculationProgress.tsx
└── hooks/
    └── useCalculationStatus.ts
```

**API Endpoints:**
- `POST /api/v1/analysis/{project_id}/calculate`
- `GET /api/v1/projects/{id}` (check status)

---

## 🎯 **PHASE 2: Analysis & Visualization (Week 3-4)**

### 2.1 Impact Scorecard
**Goal**: Display calculated environmental metrics

#### Tasks:
- [ ] **Scorecard Component** (2 days)
  - Total GWP display (kg CO₂e)
  - Water usage visualization
  - MCI Score gauge (0-1)
  - Circular Design Score (0-100)
  - Comparison to industry benchmarks

- [ ] **Metric Cards** (1 day)
  - Individual metric components
  - Trend indicators
  - Tooltip explanations
  - Color-coded performance levels

**Files to Create:**
```
frontend/src/
├── components/
│   ├── ImpactScorecard.tsx
│   ├── MetricCard.tsx
│   ├── MCIGauge.tsx
│   └── CircularityScore.tsx
└── utils/
    └── formatters.ts  # Number formatting utilities
```

---

### 2.2 Hotspot Analysis (Visualization)
**Goal**: Show which materials contribute most to environmental impact

#### Tasks:
- [ ] **Hotspot Pie Chart** (2 days)
  - D3.js or Recharts pie chart
  - Interactive segments
  - Hover tooltips with details
  - Click to filter/focus

- [ ] **Material Breakdown Table** (1 day)
  - Sortable table of materials
  - Columns: Name, Mass, GWP, Contribution %
  - Visual bars for comparison
  - Export to CSV

**Files to Create:**
```
frontend/src/
├── components/
│   ├── HotspotChart.tsx
│   ├── MaterialBreakdownTable.tsx
│   └── SankeyDiagram.tsx  # Material flow visualization
└── utils/
    └── chartHelpers.ts
```

---

### 2.3 Sankey Diagram (Material Flow)
**Goal**: Visualize material journey from extraction to end-of-life

#### Tasks:
- [ ] **Sankey Implementation** (3 days)
  - D3.js Sankey diagram
  - Nodes: Extraction → Processing → Use → End-of-Life
  - Links: Material flows with thickness = mass
  - Color coding: Virgin vs Recycled
  - Interactive hover states

**Libraries to Use:**
- `d3-sankey`
- `d3-scale`
- `d3-selection`

---

## 🎯 **PHASE 3: Optimization & Recommendations (Week 5)**

### 3.1 Design Optimization Engine
**Goal**: Generate and display AI recommendations

#### Tasks:
- [ ] **Recommendations Panel** (2 days)
  - List of actionable recommendations
  - Impact estimate for each (% reduction)
  - Priority ranking
  - "Apply Recommendation" button

- [ ] **Scenario Creation** (2 days)
  - Create scenario from recommendation
  - Side-by-side comparison view
  - Toggle between scenarios
  - Save/name scenarios

**Files to Create:**
```
frontend/src/
├── components/
│   ├── RecommendationsPanel.tsx
│   ├── RecommendationCard.tsx
│   ├── ScenarioComparison.tsx
│   └── ScenarioManager.tsx
├── pages/
│   └── OptimizationPage.tsx
└── api/
    └── scenarios.ts
```

**API Endpoints:**
- `GET /api/v1/analysis/{project_id}` (includes recommendations)
- `POST /api/v1/scenarios/`
- `GET /api/v1/scenarios/project/{id}`

---

### 3.2 Scenario Studio
**Goal**: Allow users to test different material configurations

#### Tasks:
- [ ] **Scenario Builder** (2 days)
  - Clone existing project
  - Modify materials/parameters
  - Recalculate impacts
  - Compare with baseline

- [ ] **Comparison Visualizations** (1 day)
  - Bar charts: Scenario A vs B
  - Delta indicators (+/-%)
  - Summary cards
  - Export comparison report

---

## 🎯 **PHASE 4: JNARDDC Verification (Week 6)**

### 4.1 Verification Request Flow
**Goal**: Enable users to submit projects for official verification

#### Tasks:
- [ ] **Submit for Verification Button** (1 day)
  - Eligibility check
  - Confirmation modal
  - Additional notes input
  - Submit and update status

- [ ] **Verification Status Tracker** (1 day)
  - Status badge on project
  - Timeline visualization
  - Email notifications
  - View admin comments

**Files to Create:**
```
frontend/src/
├── components/
│   ├── VerificationButton.tsx
│   ├── VerificationStatusBadge.tsx
│   └── VerificationTimeline.tsx
└── pages/
    └── VerificationPage.tsx
```

---

### 4.2 Admin Verification Portal
**Goal**: JNARDDC admins can review and approve projects

#### Tasks:
- [ ] **Admin Dashboard** (2 days)
  - List of pending verifications
  - Filter/sort options
  - Quick review interface
  - Approve/reject actions

- [ ] **Detailed Review Page** (2 days)
  - Full project details
  - Red-flagged assumptions highlighted
  - Request additional info
  - Add verification notes
  - Issue certificate

- [ ] **Certificate Generation** (1 day)
  - PDF report generation
  - QR code with verification link
  - Upload to cloud storage
  - Email to user

**Files to Create:**
```
frontend/src/
├── pages/
│   ├── AdminDashboard.tsx
│   ├── AdminReviewPage.tsx
│   └── CertificatePreview.tsx
└── api/
    └── admin.ts
```

**API Endpoints:**
- `GET /api/v1/admin/pending-verifications`
- `POST /api/v1/admin/verify/{project_id}`
- `GET /api/v1/admin/statistics`

---

## 🎯 **PHASE 5: Data & Polish (Week 7-8)**

### 5.1 LCI Database Seeding
**Goal**: Populate database with real emission factors

#### Tasks:
- [ ] **Data Collection** (2 days)
  - Source Ecoinvent data (license required)
  - JNARDDC primary data
  - Indian grid emission factors
  - Transport emission factors

- [ ] **Database Seed Script** (1 day)
  - Python script to insert LCI data
  - Categorize materials
  - Add metadata (source, year, region)
  - Validation and cleanup

**Files to Create:**
```
backend/
├── scripts/
│   ├── seed_lci_data.py
│   └── seed_benchmarks.py
└── data/
    ├── aluminium_lci.json
    ├── copper_lci.json
    └── grid_factors.json
```

**Command:**
```bash
python scripts/seed_lci_data.py
```

---

### 5.2 Error Handling & Validation
**Goal**: Robust error handling throughout the app

#### Tasks:
- [ ] **Frontend Error Boundaries** (1 day)
  - React Error Boundary components
  - Fallback UI
  - Error logging

- [ ] **Form Validation** (1 day)
  - Zod schemas for all forms
  - Real-time validation
  - Clear error messages

- [ ] **API Error Handling** (1 day)
  - Axios interceptors
  - Toast notifications
  - Retry logic for failed requests

---

### 5.3 Loading States & UX Polish
**Goal**: Professional, responsive user experience

#### Tasks:
- [ ] **Loading Skeletons** (1 day)
  - Skeleton screens for all pages
  - Progressive loading
  - Smooth transitions

- [ ] **Responsive Design** (2 days)
  - Mobile-first approach
  - Breakpoints for tablet/desktop
  - Touch-friendly interactions

- [ ] **Accessibility** (1 day)
  - ARIA labels
  - Keyboard navigation
  - Screen reader support

---

## 🎯 **PHASE 6: Testing & Deployment (Week 9-10)**

### 6.1 Testing
- [ ] **Unit Tests** (Backend services)
- [ ] **Integration Tests** (API endpoints)
- [ ] **E2E Tests** (Critical user flows)
- [ ] **Load Testing** (Database queries)

### 6.2 Deployment Setup
- [ ] **Database Migration** (Alembic)
- [ ] **Environment Configuration** (Production secrets)
- [ ] **AWS Setup** (Mumbai region)
- [ ] **CI/CD Pipeline** (GitHub Actions)

### 6.3 Documentation
- [ ] **API Documentation** (Swagger/OpenAPI)
- [ ] **User Guide** (How to use platform)
- [ ] **Admin Guide** (JNARDDC operations)
- [ ] **Developer Docs** (Setup & contribution)

---

## Technical Implementation Details

### State Management Architecture
```typescript
// Zustand stores
authStore: {
  user, token, login(), logout(), checkAuth()
}

projectStore: {
  projects[], currentProject, createProject(), updateProject()
}

materialStore: {
  materials[], addMaterial(), removeMaterial(), updateMaterial()
}

calculationStore: {
  isCalculating, progress, results, calculate()
}
```

### API Client Structure
```typescript
// frontend/src/api/client.ts
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' }
})

// Request interceptor - add auth token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor - handle errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Redirect to login
    }
    return Promise.reject(error)
  }
)
```

### Component Patterns
```typescript
// Smart Container Pattern
ProjectDetailPage.tsx (fetches data, manages state)
  └─ ProjectDetailView.tsx (presentational)
      ├─ ProjectHeader.tsx
      ├─ MaterialsSection.tsx
      └─ CalculateButton.tsx

// Hook Pattern for API calls
const useProject = (id: string) => {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.getProject(id)
  })
}
```

---

## Development Workflow

### Daily Development Cycle
1. **Morning**: Pick task from current phase
2. **Implementation**: Code + test locally
3. **Review**: Check against flow specification
4. **Commit**: Push to feature branch
5. **Document**: Update this plan with progress

### Weekly Milestones
- **Week 1**: Complete Phase 1 (Core Flow)
- **Week 2**: Demo user input and calculation
- **Week 3**: Complete Phase 2 (Visualizations)
- **Week 4**: Demo analysis dashboard
- **Week 5**: Complete Phase 3 (Optimization)
- **Week 6**: Complete Phase 4 (Verification)
- **Week 7-8**: Data seeding and polish
- **Week 9-10**: Testing and deployment

### Success Criteria for Each Phase
- ✅ All API endpoints integrated
- ✅ All user flows tested manually
- ✅ No console errors
- ✅ Responsive on mobile/desktop
- ✅ Loading states implemented
- ✅ Error handling in place

---

## Immediate Next Steps (Start Now)

### Step 1: Setup API Integration Layer (Today)
```bash
cd frontend/src
mkdir -p api stores hooks utils
```

Create these files first:
1. `api/client.ts` - Axios instance
2. `api/auth.ts` - Auth API calls
3. `stores/authStore.ts` - Auth state
4. `utils/tokenManager.ts` - Token utilities

### Step 2: Integrate Authentication (Day 1-2)
- Connect login/register pages to backend
- Implement protected routes
- Test full auth flow

### Step 3: Build Project Creation Flow (Day 3-5)
- Create project modal
- NLP input component
- Material confirmation screen

### Step 4: Implement Calculation (Day 6-7)
- Calculate button with loading state
- Redirect to analysis page
- Display results

---

## Resources & References

### Documentation
- **React Query**: https://tanstack.com/query/latest
- **Zustand**: https://github.com/pmndrs/zustand
- **D3.js Sankey**: https://github.com/d3/d3-sankey
- **Recharts**: https://recharts.org/

### Design References
- Material Design 3
- Tailwind UI Components
- Carbon Design System (IBM)

### Data Sources
- Ecoinvent Database v3.9
- JNARDDC Reports
- Indian Grid Emission Factors (CEA)

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| LCI data availability | High | Start with default values, upgrade later |
| NLP accuracy < 80% | Medium | Add confidence threshold, manual review |
| Calculation performance slow | Medium | Implement background jobs (Celery) |
| User adoption low | High | Focus on UX, provide training materials |

---

## Contact & Support

- **Technical Lead**: [Your Name]
- **Client**: JNARDDC
- **Timeline**: 10 weeks from Nov 30, 2025
- **Target Launch**: Feb 7, 2026

---

**Last Updated**: November 30, 2025
**Version**: 1.0
**Status**: Implementation In Progress
