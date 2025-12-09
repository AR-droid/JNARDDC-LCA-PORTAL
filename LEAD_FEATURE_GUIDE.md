# Lead Lifecycle Detection Feature

## Overview
The system now automatically detects when a project description mentions "lead" and dynamically changes the LCIA and Lifecycle pages to show lead-specific lifecycle processes instead of aluminum.

## How It Works

### 1. Detection Logic (`utils/metalDetection.ts`)
- Scans project description for lead-related keywords: `lead`, `pb`, `lead-acid`, `lead acid`, `battery lead`, `lead oxide`
- Returns `'lead'` or `'aluminum'` metal type
- Used by both LCIA and Lifecycle pages

### 2. LCIA Page Changes (`pages/LCIAPage.tsx`)
When lead is detected, the Energy Consumption Breakdown section shows:

**Lead-Specific Energy Breakdown:**
- Mining & Extraction: 0.5 kWh
- Beneficiation: 0.4 kWh  
- Sintering: 1.2 kWh
- Blast Furnace: 2.5 kWh
- Refining: 0.8 kWh
- Manufacturing: 0.6 kWh
- Recycling: 1.5 kWh
- **Total Energy: 7.5 kWh**
- **Grid GWP: 6.15 kg CO₂-eq**

**Special Note:**
- Shows "Lead Lifecycle" badge
- Includes recycling benefit: "35-40% less energy than primary production"
- Highlights Cradle-to-Cradle loop with 50%+ recycled content

### 3. Lifecycle Page Changes (`pages/MetalLifecyclePage.tsx`)
When lead is detected, all 7 lifecycle stages are replaced with lead-specific data:

**Lead Lifecycle Stages:**
1. **⛏️ Mining & Extraction** (10% GWP)
   - Galena (PbS) ore extraction
   - Crushing and froth flotation
   - 50-70% lead concentrate production

2. **🔬 Beneficiation** (8% GWP)
   - Concentration via flotation
   - Gravity/magnetic separation
   - 60-70% Pb concentrate

3. **🔥 Sintering** (15% GWP)
   - Sulfur removal → lead oxide
   - SO₂ capture for H₂SO₄ production
   - Preparation for smelting

4. **🏭 Blast Furnace Smelting** (35% GWP) - HIGHEST IMPACT
   - Chemical reduction with coke
   - Molten lead bullion production
   - Limestone flux addition

5. **⚗️ Refining** (12% GWP)
   - Kettle refining to 99.97-99.99% purity
   - Parkes process for silver recovery
   - By-product extraction (Ag, Au)

6. **🔧 Manufacturing** (10% GWP)
   - Lead-acid battery production (85% of use)
   - Grid and paste manufacturing
   - Radiation shielding, ammunition

7. **♻️ Battery Recycling** (10% GWP)
   - ~99% collection rate
   - Component separation (plastic, acid, lead)
   - Secondary smelting

**Key Differences from Aluminum:**
- Title changes to "Lead Lifecycle Flow" with "Cradle-to-Cradle" badge
- Recycling saves: "35-40%" (vs 95% for aluminum)
- Circular loop note: "~99% battery recycling rate, infinite recyclability"
- All process descriptions updated to lead-specific operations

## Testing Instructions

### Test Case 1: Aluminum Project (Default)
1. Create/open a project with description: `"Aluminum extrusion for automotive parts"`
2. Navigate to LCIA page: `http://localhost:3000/projects/{id}/lcia`
3. Navigate to Lifecycle page: `http://localhost:3000/projects/{id}/lifecycle`
4. **Expected:** Shows aluminum processes (Mining → Refining → Smelting)

### Test Case 2: Lead Project
1. Create/open a project with description: `"Lead-acid battery manufacturing for automotive applications"`
2. Navigate to LCIA page: `http://localhost:3000/projects/{id}/lcia`
3. **Expected in LCIA:**
   - "Lead Lifecycle" badge visible
   - 7 energy stages shown (Mining, Beneficiation, Sintering, Blast Furnace, Refining, Manufacturing, Recycling)
   - Total Energy: 7.5 kWh
   - Note about 35-40% energy savings from recycling

4. Navigate to Lifecycle page: `http://localhost:3000/projects/{id}/lifecycle`
5. **Expected in Lifecycle:**
   - Title: "Lead Lifecycle Flow" with "Cradle-to-Cradle" badge
   - Subtitle: "Near-perfect circular loop: 50%+ of global supply from recycled sources"
   - Recycling stat shows "35-40%" instead of "95%"
   - Stage names changed: "Sintering", "Blast Furnace Smelting", "Battery Recycling"
   - All stage descriptions show lead-specific processes
   - Circular loop banner mentions ~99% battery recycling rate

### Test Case 3: Lead Keywords
Test with these descriptions to verify detection:
- `"pb metal casting"` ✓
- `"Lead oxide production"` ✓
- `"battery lead recycling"` ✓
- `"lead-acid batteries"` ✓
- `"Steel manufacturing"` ✗ (should show aluminum)

## Implementation Details

### Files Modified:
1. `frontend/src/utils/metalDetection.ts` - New utility file
2. `frontend/src/pages/LCIAPage.tsx` - Dynamic energy breakdown
3. `frontend/src/pages/MetalLifecyclePage.tsx` - Dynamic lifecycle stages

### Data Sources:
All lead lifecycle data is based on:
- Primary production: Galena ore → Sintering → Blast Furnace → Refining
- Secondary production: Battery breaking → Desulfurization → Secondary smelting
- Energy values from typical lead smelting operations
- GWP contributions from lead production LCA studies

### No Backend Changes Required
This is a pure frontend implementation that:
- Fetches project description from existing API
- Detects metal type client-side
- Renders appropriate UI dynamically
- Does not affect other pages or calculations

## Future Enhancements
- Add more metals (copper, zinc, steel)
- Support multi-metal projects
- Add metal-specific impact categories
- Customize waste stream data per metal
