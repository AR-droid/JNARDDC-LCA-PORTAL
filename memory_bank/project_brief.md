# PRODUCT REQUIREMENT DOCUMENT (PRD)

**Project Name:** MetalLCA – National Circularity Platform (JNARDDC Edition)  
**Version:** 2.0 (Final)  
**Client:** JNARDDC (Ministry of Mines, Govt. of India)

---

## 1. Executive Summary

MetalLCA is an AI-powered Digital Infrastructure designed to democratize Life Cycle Assessment (LCA) for the Indian metal sector. It allows stakeholders—from MSME recyclers to large PSUs—to measure, model, and minimize the environmental footprint of metals (Aluminium, Copper, Critical Minerals).

### Core Value Proposition:

- **For MSMEs:** Removes the technical barrier of LCA via Natural Language Processing (NLP).
- **For Exporters:** Provides CBAM & ISO 14040 compliant reporting.
- **For JNARDDC:** Acts as a sovereign data-gathering engine to build the "Indian National LCI Database."

---

## 2. Technical Architecture

### A. The Tech Stack

- **Frontend:** Next.js (React) + Tailwind CSS + D3.js (Visualization).
- **Backend:** Python (FastAPI) for high-performance math & AI handling.
- **AI/ML:** LangChain (Orchestration) + OpenAI GPT-4o (or fine-tuned Llama 3 for data sovereignty) + Pinecone (Vector DB).
- **Database:** PostgreSQL (Relational Data) + MongoDB (Unstructured BOMs).
- **Cloud:** AWS Mumbai Region (Compliance with Indian Data Localization laws).

---

## 3. Data Strategy (Closing the Gaps)

### A. The Material Library (The "Truth")

The database will be segmented into three categories to cover the full scope:

#### 1. Base Metals (The Core):
- **Aluminium:** Primary (Smelter), Secondary (Recycled), Alloys (6000, 7000 series).
- **Copper:** Grades C11000 (ETP), C26000 (Brass), Scrap grades (Berry, Birch/Cliff).

#### 2. Critical Minerals (The Strategic):
- **Battery Metals:** Lithium Carbonate, Cobalt Sulfate, Nickel (Class 1 vs Ferronickel).
- **Rare Earths:** Neodymium (for EV magnets) – tracking extraction vs. recycling flows.

#### 3. Regional Grid Mixes:
- Indian National Grid vs. Captive Coal vs. Renewable (Solar/Hydro).

### B. The User Data (The "Story")

User inputs are strictly segregated:

- **Tier 1 (Public):** Anonymized and aggregated to improve National Averages.
- **Tier 2 (Private):** Encrypted, accessible only by the specific Org and JNARDDC Auditors.

---

## 4. The 4 Logical Engines (The "Brain")

### Engine 1: NLP Translation & Gap Filling

**Input:** "10kg copper wire, PVC coated, used in a motor for 10 years."

**Logic:**
1. **Tokenize:** [Mat: Copper] [Form: Wire] [Coat: PVC] [Lifespan: 10y].
2. **Map:** Links "Copper" to LCI_ID_Cu_Wire_Drawing.
3. **Gap Fill:** If "Recycled Content" is not specified, AI queries the National Baseline (e.g., "India Avg Copper Wire contains 35% Scrap") and fills it as an assumption.

---

### Engine 2: Parametric Impact Calculator (LCA)

**Formula:**
Total GWP = (Virgin_Mass × EF_Virgin) + (Recycled_Mass × EF_Recycled) + Processing_Energy + Transport

# PRODUCT REQUIREMENT DOCUMENT (PRD)

**Project Name:** MetalLCA – National Circularity Platform (JNARDDC Edition)  
**Version:** 2.0 (Final)  
**Client:** JNARDDC (Ministry of Mines, Govt. of India)

---

## 1. Executive Summary

MetalLCA is an AI-powered Digital Infrastructure designed to democratize Life Cycle Assessment (LCA) for the Indian metal sector. It allows stakeholders—from MSME recyclers to large PSUs—to measure, model, and minimize the environmental footprint of metals (Aluminium, Copper, Critical Minerals).

### Core Value Proposition:

- **For MSMEs:** Removes the technical barrier of LCA via Natural Language Processing (NLP).
- **For Exporters:** Provides CBAM & ISO 14040 compliant reporting.
- **For JNARDDC:** Acts as a sovereign data-gathering engine to build the "Indian National LCI Database."

---

## 2. Technical Architecture

### A. The Tech Stack

- **Frontend:** Next.js (React) + Tailwind CSS + D3.js (Visualization).
- **Backend:** Python (FastAPI) for high-performance math & AI handling.
- **AI/ML:** LangChain (Orchestration) + OpenAI GPT-4o (or fine-tuned Llama 3 for data sovereignty) + Pinecone (Vector DB).
- **Database:** PostgreSQL (Relational Data) + MongoDB (Unstructured BOMs).
- **Cloud:** AWS Mumbai Region (Compliance with Indian Data Localization laws).

---

## 3. Data Strategy (Closing the Gaps)

### A. The Material Library (The "Truth")

The database will be segmented into three categories to cover the full scope:

#### 1. Base Metals (The Core):
- **Aluminium:** Primary (Smelter), Secondary (Recycled), Alloys (6000, 7000 series).
- **Copper:** Grades C11000 (ETP), C26000 (Brass), Scrap grades (Berry, Birch/Cliff).

#### 2. Critical Minerals (The Strategic):
- **Battery Metals:** Lithium Carbonate, Cobalt Sulfate, Nickel (Class 1 vs Ferronickel).
- **Rare Earths:** Neodymium (for EV magnets) – tracking extraction vs. recycling flows.

#### 3. Regional Grid Mixes:
- Indian National Grid vs. Captive Coal vs. Renewable (Solar/Hydro).

### B. The User Data (The "Story")

User inputs are strictly segregated:

- **Tier 1 (Public):** Anonymized and aggregated to improve National Averages.
- **Tier 2 (Private):** Encrypted, accessible only by the specific Org and JNARDDC Auditors.

---

## 4. The 4 Logical Engines (The "Brain")

### Engine 1: NLP Translation & Gap Filling

**Input:** "10kg copper wire, PVC coated, used in a motor for 10 years."

**Logic:**
1. **Tokenize:** [Mat: Copper] [Form: Wire] [Coat: PVC] [Lifespan: 10y].
2. **Map:** Links "Copper" to LCI_ID_Cu_Wire_Drawing.
3. **Gap Fill:** If "Recycled Content" is not specified, AI queries the National Baseline (e.g., "India Avg Copper Wire contains 35% Scrap") and fills it as an assumption.

---

### Engine 2: Parametric Impact Calculator (LCA)

**Formula:**
```
Total GWP = (Virgin_Mass × EF_Virgin) + (Recycled_Mass × EF_Recycled) + Processing_Energy + Transport
```

**Critical Mineral Logic:** For Lithium/Cobalt, the engine adds a "Scarcity Score" (Abiotic Depletion Potential) alongside GWP, as these minerals are resource-constrained.

---

### Engine 3: Circularity & Lifespan Engine (MCI)

**Formula:** Uses the Ellen MacArthur Foundation MCI Logic.

**Lifespan Variable (L):**
- **User Input:** "Target Lifespan: 15 Years."
- **Industry Avg:** System looks up "Electric Motor Avg Life = 10 Years."
- **Result:** If User Life > Avg Life, MCI Score improves (Utility factor increases).

---

### Engine 4: Design Optimization & Prediction (The Advisor)

#### Predictive Recycled Content:
- **Constraint Check:** The AI checks the alloy specification (e.g., "Brass C26000").
- **Prediction:** "Based on impurity limits for C26000, you can increase recycled content from 20% to 60% without affecting tensile strength."

#### Lifespan Extension:
- **Recommendation:** "Current material (Al-2024) has poor corrosion resistance. Switching to Al-6061 or applying Anodizing can extend product life by 5 years, reducing lifetime impact by 18%."

---

## 5. Functional Modules & User Flow

### Module A: Authentication & Onboarding

- **User Types:** Manufacturer, Recycler, Auditor, JNARDDC Admin.
- **Context Setup:** User selects "Sector" (e.g., EV Battery, Construction, Power Transmission). This loads the relevant Critical Mineral datasets.

---

### Module B: The "Smart" Input Wizard

**Step 1: The BOM**
- Upload Excel or Type Natural Language.

**Step 2: The Lifecycle Variables**
- **Durability:** "How long will this last?" (Dropdown: 5y, 10y, Custom).
- **End-of-Life:** "Is it designed for disassembly?" (Yes/No).

---

### Module C: Analysis & Visualization

- **Sankey Diagram:** Visualizes the flow of Copper/Cobalt from extraction to recycling.
- **Circular Design Score:** A composite score (0-100) combining MCI (Material flow) + Durability (Lifespan) + Toxicity (Chemical safety).

---

### Module D: Compliance & Reporting

- **CBAM Export:** Formats data into the specific XML schema required for EU Carbon Border Adjustment Mechanism.
- **BRSR Integration:** Maps "Waste Generated" and "Recycled Input" directly to SEBI BRSR Principle 6 reporting tables.

---

## 6. JNARDDC Specific Workflow (The "Verification Loop")

1. **Submission:** Manufacturer completes the LCA and clicks "Request JNARDDC Verification."
2. **Audit Interface:** JNARDDC Expert gets a notification. They view a "red-flagged" report where the AI highlights aggressive assumptions (e.g., "User claims 100% recycled Lithium - Highly Unlikely").
3. **Validation:** Expert adjusts data or approves.
4. **Issuance:** System generates a QR-Coded PDF Certificate hosted on JNARDDC.gov.in (hypothetical domain) ensuring authenticity for buyers.

---

## 7. User Roles & Access Control (RBAC)

We will use a 3-Tier Hierarchy to support the JNARDDC "Hub & Spoke" model.

### A. The Governance Tier (Super Admin)

**Role:** JNARDDC Administrators.

**Capabilities:**
- Manage the "Golden Dataset" (Background Data).
- View aggregate, anonymized industry statistics (e.g., "Total Al Recycled in India 2025").
- Approve/Revoke "Verified Consultant" badges.
- Access to the "Master Audit Log."

---

### B. The Commercial Tier (Paid/Pro)

**Roles:** Enterprise (Manufacturers), Consultants, Auditors.

**Capabilities:**
- **Team Management:** Create teams (e.g., "R&D", "Compliance").
- **Advanced Features:** CBAM Export, API Access, Private Dataset Uploads.
- **Consultant Mode:** A Consultant can switch between multiple "Client Org" views.

---

### C. The Access Tier (Free)

**Roles:** MSMEs, Students, Startups.

**Capabilities:**
- Create Projects using "Natural Language."
- View basic dashboards (Watermarked).
- Access to "Community Support."
- **Restriction:** Cannot download ISO/CBAM reports without upgrading.

---

## 8. Database Schema (Simplified)

### Table: Organizations
- `id`: UUID
- `name`: String
- `tier`: (Free, Pro, Enterprise)
- `is_consultancy`: Boolean
- `cbam_registered`: Boolean

---

### Table: Projects
- `id`: UUID
- `org_id`: Foreign Key
- `status`: (Draft, Calculated, Verified)
- `mci_score`: Float
- `gwp_total`: Float
- `circular_design_score`: Float

---

### Table: Project_Materials (The BOM)
- `id`: UUID
- `project_id`: Foreign Key
- `material_name`: String (User Input)
- `mapped_lci_id`: String (Database ID)
- `mass`: Float
- `is_recycled`: Boolean
- `recycled_content_percentage`: Float
- `target_lifespan`: Integer (years)
- `end_of_life_path`: (Recycle, Landfill, Incinerate)

---

### Table: LCI_Library (The Background Data)
- `id`: UUID
- `name`: String (e.g., "Aluminium Ingot, India")
- `material_category`: (Base_Metal, Critical_Mineral)
- `emission_factor`: Float
- `scarcity_score`: Float (for Critical Minerals)
- `region`: String
- `source`: (Ecoinvent, JNARDDC_Primary)
- `is_premium`: Boolean (Logic for Freemium lock)

---

### Table: Industry_Benchmarks
- `id`: UUID
- `product_category`: String (e.g., "Electric Motor", "Window Frame")
- `average_lifespan`: Integer (years)
- `average_mci_score`: Float
- `source`: String

---

## 9. Roadmap & Phasing

### Phase 1 (MVP - 8 Weeks):
- Aluminium & Copper Datasets.
- NLP Input & Basic GWP Calculator.
- Free Tier for MSMEs.

**Deliverable:** A working "Single Player" calculator.

---

### Phase 2 (The Circularity Update - 12 Weeks):
- MCI Engine & Lifespan Optimization.
- Critical Minerals (Li, Co, Ni) Datasets.
- Scenario Comparison Tool.
- Circular Design Score implementation.

**Deliverable:** The Full Dashboard experience.

---

### Phase 3 (The National Platform - 16 Weeks):
- CBAM & BRSR Reporting.
- JNARDDC Verification Portal.
- Auditor Role Access.
- Team/Admin Management.
- Payment Gateway Integration (Razorpay/Stripe).

**Deliverable:** Market-ready B2B SaaS.

---

### Phase 4 (The JNARDDC Integration - 20+ Weeks):
- Deploy on Government Cloud.
- Set up Super Admin dashboards for Industry Monitoring.
- Launch "Verified by JNARDDC" pilot with QR-Coded Certificates.
- API Access for third-party integration.

**Deliverable:** National Digital Infrastructure.

---

## 10. Development Checklist (Immediate Next Steps)

1. **Data Procurement:** Secure API access or license for Ecoinvent (Global) and compile JNARDDC's internal data (Local) for Al/Cu/Critical Minerals.

2. **Algorithm Definition:** Define the exact max-scrap tolerance percentages for the top 20 Copper and Aluminium alloys to power the "Predictive Engine."

3. **Industry Benchmark Database:** Compile average product lifespans for key product categories (motors, cables, structural components, battery packs) from ISO standards and industry associations.

4. **UX Prototype:** Design the "Verification Request" modal for the JNARDDC workflow.

5. **NLP Model Training:** Fine-tune language model on metal industry terminology (alloy codes, processes, coating types) for accurate material mapping.

6. **Regional Data Collection:** Document emission factors for Indian Grid Mix 2025, state-wise variations, and captive power plant configurations.

---

## 11. Key Performance Indicators (KPIs)

### For Platform Success:
- **User Adoption:** 500+ MSMEs onboarded in Year 1.
- **Data Quality:** 80%+ accuracy in NLP material mapping.
- **JNARDDC Value:** 10,000+ verified LCA reports contributing to National LCI Database.

### For Circularity Impact:
- **Average MCI Score Improvement:** 15-point increase after using Design Optimization recommendations.
- **Recycled Content Increase:** Users increase recycled material usage by average 25%.
- **Lifespan Extension:** 20% of products redesigned for longer life.

---

## 12. Compliance & Security

### Data Sovereignty:
- All data hosted in AWS Mumbai Region (or MeitY-empaneled NIC Cloud).
- Compliance with India's Data Localization requirements.

### Encryption:
- End-to-end encryption for Tier 2 (Private) user data.
- HTTPS/TLS for all API communications.

### Audit Trail:
- Complete logging of all data modifications for JNARDDC auditors.
- Tamper-proof verification certificates with blockchain-backed QR codes (Phase 4).

---

## 13. Business Model

### Free Tier:
- Basic LCA calculator
- Natural language input
- Watermarked dashboards
- Community support

### Pro Tier (₹15,000/month or $180/month):
- Unlimited projects
- CBAM & ISO report downloads
- Scenario comparison
- Premium datasets (Indian regional factors)
- Email support

### Enterprise Tier (Custom pricing):
- Team management (unlimited users)
- API access
- Private dataset uploads
- JNARDDC verification requests
- Dedicated account manager
- White-label options

### Consultant License (₹25,000/month or $300/month):
- Multi-client management
- Verified consultant badge
- Priority support
- Revenue share on client referrals

---

## 14. Success Criteria

### Technical:
- ✅ NLP engine achieves 85%+ material mapping accuracy
- ✅ Dashboard loads in <2 seconds with 1000+ BOM items
- ✅ 99.5% uptime SLA for paid users

### Business:
- ✅ 50+ paid subscriptions within 6 months of launch
- ✅ Partnership with 3+ industry associations
- ✅ Featured in Ministry of Mines annual report

### Impact:
- ✅ Enable 100+ MSMEs to access export markets via CBAM compliance
- ✅ Document 500,000+ tonnes of metal circularity through platform
- ✅ Contribute to National Climate Action targets through verified emission reductions

---

## 15. Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data Quality (LCI Database gaps) | High | Partner with Ecoinvent, supplement with JNARDDC primary research, flag data uncertainty |
| NLP Accuracy (Misclassification) | Medium | Implement human verification step, continuous model retraining, user feedback loop |
| User Adoption (Complexity) | High | Invest in UX, provide video tutorials, offer free onboarding sessions for first 100 users |
| Regulatory Changes (CBAM rules) | Medium | Modular reporting architecture, quarterly compliance review |
| Competition (International tools) | Medium | Differentiate via Indian data sovereignty, regional factors, JNARDDC partnership |

---

## Appendix A: Glossary

- **LCA:** Life Cycle Assessment - methodology to evaluate environmental impacts of a product through its entire lifecycle
- **MCI:** Material Circularity Indicator - metric measuring how well materials are kept in use
- **CBAM:** Carbon Border Adjustment Mechanism - EU carbon tariff system
- **BRSR:** Business Responsibility and Sustainability Reporting - SEBI ESG disclosure framework
- **GWP:** Global Warming Potential - measure of greenhouse gas impact (kg CO₂e)
- **LCI:** Life Cycle Inventory - database of emission factors and resource use
- **JNARDDC:** Jawaharlal Nehru Aluminium Research Development and Design Centre
- **NLP:** Natural Language Processing - AI technique for understanding human language
- **ETP:** Electrolytic Tough Pitch - high purity copper grade (C11000)

---

## Appendix B: Sample User Journeys

### Journey 1: MSME Recycler (Free Tier)
1. Signs up via Google SSO
2. Types: "We melt 2 tonnes of aluminium cans daily, use 500 kWh electricity"
3. System maps to: Secondary Aluminium + Indian Grid Mix
4. Views dashboard showing 8.5 kg CO₂e per kg Al (vs 17 for primary)
5. Receives recommendation: "Switch to renewable energy to improve score by 40%"
6. Downloads watermarked summary PDF for customers

### Journey 2: Exporter (Pro Tier)
1. Uploads Excel BOM with 50 copper components
2. Specifies: "Product used in EU, needs CBAM"
3. System calculates embedded emissions with transport
4. Uses Scenario Studio to test 3 recycled content levels
5. Downloads CBAM-compliant XML file
6. Submits to JNARDDC for verification
7. Receives QR-coded certificate within 48 hours

### Journey 3: JNARDDC Admin (Governance)
1. Logs into Super Admin portal
2. Reviews 15 pending verification requests
3. System flags one: "Claimed 95% recycled lithium - needs evidence"
4. Requests supporting documentation from user
5. Approves 14 reports, issues digital certificates
6. Views national dashboard: "Q3 2025: 45,000 tonnes Al recycled via platform users"

---

**Document End**

---

*This PRD is a living document and will be updated as the project evolves through development phases.*