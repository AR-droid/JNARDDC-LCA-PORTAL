import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Mountain,
  FlaskConical,
  Factory,
  Flame,
  Building2,
  Wrench,
  Recycle,
  ChevronUp,
  Zap,
  Droplets,
  Wind,
  Leaf,
  ArrowRight,
  ArrowDown,
  RotateCcw,
  FileSpreadsheet,
  Lock,
  Info,
  TrendingDown,
  Loader2
} from 'lucide-react'
import { ChartIcon, AnalyticsIcon, AIIcon, FlaskIcon } from '../components/Icons'
import { useAuthStore } from '../stores/authStore'
import { projectsApi } from '../api/projects'
import {
  detectMetalType,
  MetalType,
  LEAD_LIFECYCLE_DATA,
  COPPER_LIFECYCLE_DATA,
  STEEL_LIFECYCLE_DATA,
  ZINC_LIFECYCLE_DATA
} from '../utils/metalDetection'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

// Default GWP contributions (used as fallback)
const DEFAULT_GWP_CONTRIBUTIONS: Record<string, number> = {
  mining: 8,
  beneficiation: 7,
  refining: 18,
  smelting: 45,
  casting: 8,
  fabrication: 7,
  recycle: 7
}

// Mapping function: Convert 5-stage backend data to 7-stage frontend data
function mapBackendToFrontendStages(backendData: {
  lifecycle_stages: Array<{ stage: string; percentage: number }>;
  summary: { avg_recycled_content: number };
}): Record<string, number> {
  const stages = backendData.lifecycle_stages || []
  const recycledContent = backendData.summary?.avg_recycled_content || 0

  // Find backend stage percentages
  const extraction = stages.find(s => s.stage.includes('Extraction'))?.percentage || 40
  const processing = stages.find(s => s.stage.includes('Processing') || s.stage.includes('Manufacturing'))?.percentage || 25
  const eol = stages.find(s => s.stage.includes('End of Life'))?.percentage || 8

  // Adjust ratios based on recycled content (higher recycled = lower extraction stages)
  const virginRatio = (100 - recycledContent) / 100

  // Split extraction into Mining, Beneficiation, Refining
  // Ratios based on typical metal processing: Mining ~15%, Beneficiation ~13%, Refining ~72%
  const miningRatio = 0.25 * virginRatio
  const beneficiationRatio = 0.22 * virginRatio
  const refiningRatio = 0.53 * virginRatio

  // Processing is mostly smelting (~85%) + casting (~15%)
  const smeltingRatio = 0.85
  const castingRatio = 0.15

  // EOL splits between fabrication and recycle
  const fabricationRatio = 0.5
  const recycleRatio = 0.5

  // Calculate final percentages
  const mining = Math.round(extraction * miningRatio)
  const beneficiation = Math.round(extraction * beneficiationRatio)
  const refining = Math.round(extraction * refiningRatio)
  const smelting = Math.round(processing * smeltingRatio + (recycledContent / 100) * 20) // Smelting gets bonus from recycled
  const casting = Math.round(processing * castingRatio + 5)
  const fabrication = Math.round(eol * fabricationRatio + 5)
  const recycle = Math.round(eol * recycleRatio + (recycledContent / 100) * 5)

  // Normalize to 100%
  const total = mining + beneficiation + refining + smelting + casting + fabrication + recycle
  const factor = 100 / total

  return {
    mining: Math.round(mining * factor) || 1,
    beneficiation: Math.round(beneficiation * factor) || 1,
    refining: Math.round(refining * factor) || 1,
    smelting: Math.round(smelting * factor) || 45,
    casting: Math.round(casting * factor) || 8,
    fabrication: Math.round(fabrication * factor) || 7,
    recycle: Math.round(recycle * factor) || 7
  }
}

// Types
interface WasteStream {
  name: string
  quantity: string
  composition: string
}

interface LifecycleStage {
  id: string
  name: string
  emoji: string
  icon: React.ReactNode
  color: string
  bgColor: string
  borderColor: string
  textColor: string
  description: string
  keyProcesses: string[]
  wasteStreams: WasteStream[]
  energyIntensity: 'Very High' | 'High' | 'Medium' | 'Low'
  gwpContribution: number // percentage
  wastageContribution: number // percentage of total wastage
  isScrapEntry?: boolean // Indicates scrap can enter at this stage
  isCircularHighlight?: boolean // Highlights as circular economy benefit
  hasSO2Emission?: boolean // Indicates SO2 emissions (acidification)
}

// Function to generate lifecycle stages based on metal type
const getLifecycleStages = (metalType: MetalType): LifecycleStage[] => {
  if (metalType === 'lead') {
    return [
      {
        id: 'mining',
        name: 'Mining & Extraction',
        emoji: '⛏️',
        icon: <Mountain className="w-6 h-6" />,
        color: 'amber',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-300',
        textColor: 'text-amber-700',
        description: LEAD_LIFECYCLE_DATA.stages.mining.description,
        keyProcesses: LEAD_LIFECYCLE_DATA.stages.mining.processes,
        wasteStreams: LEAD_LIFECYCLE_DATA.stages.mining.wasteStreams,
        energyIntensity: 'Medium',
        gwpContribution: LEAD_LIFECYCLE_DATA.stages.mining.gwpContribution,
        wastageContribution: 20
      },
      {
        id: 'beneficiation',
        name: 'Beneficiation',
        emoji: '🔬',
        icon: <FlaskConical className="w-6 h-6" />,
        color: 'purple',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-300',
        textColor: 'text-purple-700',
        description: LEAD_LIFECYCLE_DATA.stages.beneficiation.description,
        keyProcesses: LEAD_LIFECYCLE_DATA.stages.beneficiation.processes,
        wasteStreams: LEAD_LIFECYCLE_DATA.stages.beneficiation.wasteStreams,
        energyIntensity: 'Medium',
        gwpContribution: LEAD_LIFECYCLE_DATA.stages.beneficiation.gwpContribution,
        wastageContribution: 15
      },
      {
        id: 'refining',
        name: 'Sintering',
        emoji: '🔥',
        icon: <Flame className="w-6 h-6" />,
        color: 'orange',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-300',
        textColor: 'text-orange-700',
        description: LEAD_LIFECYCLE_DATA.stages.refining.description,
        keyProcesses: LEAD_LIFECYCLE_DATA.stages.refining.processes,
        wasteStreams: LEAD_LIFECYCLE_DATA.stages.refining.wasteStreams,
        energyIntensity: 'High',
        gwpContribution: LEAD_LIFECYCLE_DATA.stages.refining.gwpContribution,
        wastageContribution: 12
      },
      {
        id: 'smelting',
        name: 'Blast Furnace Smelting',
        emoji: '🏭',
        icon: <Factory className="w-6 h-6" />,
        color: 'red',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-300',
        textColor: 'text-red-700',
        description: LEAD_LIFECYCLE_DATA.stages.smelting.description,
        keyProcesses: LEAD_LIFECYCLE_DATA.stages.smelting.processes,
        wasteStreams: LEAD_LIFECYCLE_DATA.stages.smelting.wasteStreams,
        energyIntensity: 'Very High',
        gwpContribution: LEAD_LIFECYCLE_DATA.stages.smelting.gwpContribution,
        wastageContribution: 25,
        isScrapEntry: true // Secondary smelting for battery scrap
      },
      {
        id: 'casting',
        name: 'Refining',
        emoji: '⚗️',
        icon: <Building2 className="w-6 h-6" />,
        color: 'indigo',
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-300',
        textColor: 'text-indigo-700',
        description: LEAD_LIFECYCLE_DATA.stages.casting.description,
        keyProcesses: LEAD_LIFECYCLE_DATA.stages.casting.processes,
        wasteStreams: LEAD_LIFECYCLE_DATA.stages.casting.wasteStreams,
        energyIntensity: 'Medium',
        gwpContribution: LEAD_LIFECYCLE_DATA.stages.casting.gwpContribution,
        wastageContribution: 10,
        isScrapEntry: true // +SCRAP from battery plates
      },
      {
        id: 'fabrication',
        name: 'Manufacturing',
        emoji: '🔧',
        icon: <Wrench className="w-6 h-6" />,
        color: 'blue',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-300',
        textColor: 'text-blue-700',
        description: LEAD_LIFECYCLE_DATA.stages.fabrication.description,
        keyProcesses: LEAD_LIFECYCLE_DATA.stages.fabrication.processes,
        wasteStreams: LEAD_LIFECYCLE_DATA.stages.fabrication.wasteStreams,
        energyIntensity: 'Medium',
        gwpContribution: LEAD_LIFECYCLE_DATA.stages.fabrication.gwpContribution,
        wastageContribution: 8,
        isScrapEntry: true // +SCRAP from production scrap
      },
      {
        id: 'recycle',
        name: 'Battery Recycling',
        emoji: '♻️',
        icon: <Recycle className="w-6 h-6" />,
        color: 'green',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-300',
        textColor: 'text-green-700',
        description: LEAD_LIFECYCLE_DATA.stages.recycle.description,
        keyProcesses: LEAD_LIFECYCLE_DATA.stages.recycle.processes,
        wasteStreams: LEAD_LIFECYCLE_DATA.stages.recycle.wasteStreams,
        energyIntensity: 'Low',
        gwpContribution: LEAD_LIFECYCLE_DATA.stages.recycle.gwpContribution,
        wastageContribution: 14,
        isScrapEntry: true, // +SCRAP from batteries/e-waste
        isCircularHighlight: true // 99% battery recycling rate
      }
    ]
  }

  // Copper stages
  if (metalType === 'copper') {
    return [
      {
        id: 'mining',
        name: 'Mining',
        emoji: '⛏️',
        icon: <Mountain className="w-6 h-6" />,
        color: 'amber',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-300',
        textColor: 'text-amber-700',
        description: COPPER_LIFECYCLE_DATA.stages.mining.description,
        keyProcesses: COPPER_LIFECYCLE_DATA.stages.mining.processes,
        wasteStreams: COPPER_LIFECYCLE_DATA.stages.mining.wasteStreams,
        energyIntensity: 'High',
        gwpContribution: COPPER_LIFECYCLE_DATA.stages.mining.gwpContribution,
        wastageContribution: 15
      },
      {
        id: 'beneficiation',
        name: 'Flotation',
        emoji: '🔬',
        icon: <FlaskConical className="w-6 h-6" />,
        color: 'purple',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-300',
        textColor: 'text-purple-700',
        description: COPPER_LIFECYCLE_DATA.stages.beneficiation.description,
        keyProcesses: COPPER_LIFECYCLE_DATA.stages.beneficiation.processes,
        wasteStreams: COPPER_LIFECYCLE_DATA.stages.beneficiation.wasteStreams,
        energyIntensity: 'High',
        gwpContribution: COPPER_LIFECYCLE_DATA.stages.beneficiation.gwpContribution,
        wastageContribution: 18
      },
      {
        id: 'refining',
        name: 'Smelting (Matte)',
        emoji: '🔥',
        icon: <Flame className="w-6 h-6" />,
        color: 'orange',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-300',
        textColor: 'text-orange-700',
        description: COPPER_LIFECYCLE_DATA.stages.refining.description,
        keyProcesses: COPPER_LIFECYCLE_DATA.stages.refining.processes,
        wasteStreams: COPPER_LIFECYCLE_DATA.stages.refining.wasteStreams,
        energyIntensity: 'Very High',
        gwpContribution: COPPER_LIFECYCLE_DATA.stages.refining.gwpContribution,
        wastageContribution: 20
      },
      {
        id: 'smelting',
        name: 'Converting',
        emoji: '🏭',
        icon: <Factory className="w-6 h-6" />,
        color: 'red',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-300',
        textColor: 'text-red-700',
        description: COPPER_LIFECYCLE_DATA.stages.smelting.description,
        keyProcesses: COPPER_LIFECYCLE_DATA.stages.smelting.processes,
        wasteStreams: COPPER_LIFECYCLE_DATA.stages.smelting.wasteStreams,
        energyIntensity: 'Very High',
        gwpContribution: COPPER_LIFECYCLE_DATA.stages.smelting.gwpContribution,
        wastageContribution: 15,
        isScrapEntry: true // Scrap can enter here
      },
      {
        id: 'casting',
        name: 'Electro-Refining',
        emoji: '⚡',
        icon: <Building2 className="w-6 h-6" />,
        color: 'indigo',
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-300',
        textColor: 'text-indigo-700',
        description: COPPER_LIFECYCLE_DATA.stages.casting.description,
        keyProcesses: COPPER_LIFECYCLE_DATA.stages.casting.processes,
        wasteStreams: COPPER_LIFECYCLE_DATA.stages.casting.wasteStreams,
        energyIntensity: 'High',
        gwpContribution: COPPER_LIFECYCLE_DATA.stages.casting.gwpContribution,
        wastageContribution: 8
      },
      {
        id: 'fabrication',
        name: 'Fabrication',
        emoji: '🔧',
        icon: <Wrench className="w-6 h-6" />,
        color: 'blue',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-300',
        textColor: 'text-blue-700',
        description: COPPER_LIFECYCLE_DATA.stages.fabrication.description,
        keyProcesses: COPPER_LIFECYCLE_DATA.stages.fabrication.processes,
        wasteStreams: COPPER_LIFECYCLE_DATA.stages.fabrication.wasteStreams,
        energyIntensity: 'Medium',
        gwpContribution: COPPER_LIFECYCLE_DATA.stages.fabrication.gwpContribution,
        wastageContribution: 12
      },
      {
        id: 'recycle',
        name: '100% Recycling',
        emoji: '♻️',
        icon: <Recycle className="w-6 h-6" />,
        color: 'green',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-300',
        textColor: 'text-green-700',
        description: COPPER_LIFECYCLE_DATA.stages.recycle.description,
        keyProcesses: COPPER_LIFECYCLE_DATA.stages.recycle.processes,
        wasteStreams: COPPER_LIFECYCLE_DATA.stages.recycle.wasteStreams,
        energyIntensity: 'Low',
        gwpContribution: COPPER_LIFECYCLE_DATA.stages.recycle.gwpContribution,
        wastageContribution: 12
      }
    ]
  }

  // Steel stages (EAF route - circular economy champion)
  if (metalType === 'steel') {
    const eafRoute = STEEL_LIFECYCLE_DATA.routes['eaf']
    return [
      {
        id: 'mining',
        name: 'Scrap Collection',
        emoji: '♻️',
        icon: <Recycle className="w-6 h-6" />,
        color: 'green',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-300',
        textColor: 'text-green-700',
        description: eafRoute.stages.mining.description,
        keyProcesses: eafRoute.stages.mining.processes,
        wasteStreams: eafRoute.stages.mining.wasteStreams,
        energyIntensity: 'Low',
        gwpContribution: 8,
        wastageContribution: 8
      },
      {
        id: 'beneficiation',
        name: 'Scrap Preparation',
        emoji: '🔬',
        icon: <FlaskConical className="w-6 h-6" />,
        color: 'purple',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-300',
        textColor: 'text-purple-700',
        description: eafRoute.stages.beneficiation.description,
        keyProcesses: eafRoute.stages.beneficiation.processes,
        wasteStreams: eafRoute.stages.beneficiation.wasteStreams,
        energyIntensity: 'Low',
        gwpContribution: 5,
        wastageContribution: 5
      },
      {
        id: 'refining',
        name: 'Electric Arc Furnace',
        emoji: '⚡',
        icon: <Factory className="w-6 h-6" />,
        color: 'yellow',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-300',
        textColor: 'text-yellow-700',
        description: eafRoute.stages.refining.description + ' (75% less CO₂ than BF-BOF!)',
        keyProcesses: eafRoute.stages.refining.processes,
        wasteStreams: eafRoute.stages.refining.wasteStreams,
        energyIntensity: 'High',
        gwpContribution: 20,
        wastageContribution: 20,
        isScrapEntry: true, // Scrap enters here from recycling
        isCircularHighlight: true // Highlight as circular economy champion
      },
      {
        id: 'smelting',
        name: 'Ladle Refining',
        emoji: '🔥',
        icon: <Flame className="w-6 h-6" />,
        color: 'orange',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-300',
        textColor: 'text-orange-700',
        description: eafRoute.stages.smelting.description,
        keyProcesses: eafRoute.stages.smelting.processes,
        wasteStreams: eafRoute.stages.smelting.wasteStreams,
        energyIntensity: 'Medium',
        gwpContribution: 10,
        wastageContribution: 10
      },
      {
        id: 'casting',
        name: 'Continuous Casting',
        emoji: '🏗️',
        icon: <Building2 className="w-6 h-6" />,
        color: 'slate',
        bgColor: 'bg-slate-50',
        borderColor: 'border-slate-300',
        textColor: 'text-slate-700',
        description: eafRoute.stages.casting.description,
        keyProcesses: eafRoute.stages.casting.processes,
        wasteStreams: eafRoute.stages.casting.wasteStreams,
        energyIntensity: 'Medium',
        gwpContribution: 12,
        wastageContribution: 12
      },
      {
        id: 'fabrication',
        name: 'Rolling & Fabrication',
        emoji: '🔧',
        icon: <Wrench className="w-6 h-6" />,
        color: 'blue',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-300',
        textColor: 'text-blue-700',
        description: eafRoute.stages.fabrication.description,
        keyProcesses: eafRoute.stages.fabrication.processes,
        wasteStreams: eafRoute.stages.fabrication.wasteStreams,
        energyIntensity: 'Medium',
        gwpContribution: 15,
        wastageContribution: 15,
        isScrapEntry: true // +SCRAP from fabrication process
      },
      {
        id: 'recycle',
        name: 'Infinite Recyclability',
        emoji: '♻️',
        icon: <Recycle className="w-6 h-6" />,
        color: 'emerald',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-300',
        textColor: 'text-emerald-700',
        description: eafRoute.stages.recycle.description,
        keyProcesses: eafRoute.stages.recycle.processes,
        wasteStreams: eafRoute.stages.recycle.wasteStreams,
        energyIntensity: 'Low',
        gwpContribution: 30,
        wastageContribution: 30,
        isScrapEntry: true, // +SCRAP from end-of-life
        isCircularHighlight: true // Closes the loop!
      }
    ]
  }

  // Zinc stages (Roast-Leach-Electrowin)
  if (metalType === 'zinc') {
    return [
      {
        id: 'mining',
        name: 'Mining',
        emoji: '⛏️',
        icon: <Mountain className="w-6 h-6" />,
        color: 'amber',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-300',
        textColor: 'text-amber-700',
        description: 'Extraction of zinc sulfide ore (sphalerite) from open-pit or underground mines',
        keyProcesses: ['Drilling & blasting', 'Ore extraction', 'Crushing', 'Stockpiling'],
        wasteStreams: [
          { name: 'Overburden', quantity: '40,000 tonnes/year', composition: 'Soil, rock' },
          { name: 'Waste Rock', quantity: '30,000 tonnes/year', composition: 'Low-grade ore' }
        ],
        energyIntensity: 'Medium',
        gwpContribution: 8,
        wastageContribution: 12
      },
      {
        id: 'beneficiation',
        name: 'Beneficiation',
        emoji: '🔬',
        icon: <FlaskConical className="w-6 h-6" />,
        color: 'purple',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-300',
        textColor: 'text-purple-700',
        description: 'Flotation process to concentrate zinc sulfide ore to 50-60% Zn',
        keyProcesses: ['Grinding', 'Froth flotation', 'Thickening', 'Filtering'],
        wasteStreams: [
          { name: 'Tailings', quantity: '25,000 tonnes/year', composition: 'Silica, pyrite' },
          { name: 'Process Water', quantity: '50,000 kL/year', composition: 'Xanthates, frothers' }
        ],
        energyIntensity: 'Medium',
        gwpContribution: 7,
        wastageContribution: 15
      },
      {
        id: 'refining',
        name: 'Roasting',
        emoji: '🔥',
        icon: <Flame className="w-6 h-6" />,
        color: 'orange',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-300',
        textColor: 'text-orange-700',
        description: 'ZnS → ZnO conversion at 900°C. SO₂ captured for H₂SO₄ production (co-product credit)',
        keyProcesses: ['Fluid bed roasting', 'SO₂ capture', 'Calcine cooling', 'Acid plant'],
        wasteStreams: [
          { name: 'SO₂ Gas', quantity: '→ H₂SO₄', composition: 'Captured for acid' },
          { name: 'Roaster Dust', quantity: '3,000 tonnes/year', composition: 'ZnO, Pb, Cd' }
        ],
        energyIntensity: 'High',
        gwpContribution: 30,
        wastageContribution: 18,
        hasSO2Emission: true // Acidification indicator
      },
      {
        id: 'smelting',
        name: 'Leaching + Electrowinning',
        emoji: '⚡',
        icon: <Factory className="w-6 h-6" />,
        color: 'teal',
        bgColor: 'bg-teal-50',
        borderColor: 'border-teal-300',
        textColor: 'text-teal-700',
        description: 'Acid leaching of ZnO, purification, then electrowinning to produce 99.99% cathode zinc',
        keyProcesses: ['H₂SO₄ leaching', 'Fe/Cu/Cd removal', 'Electrowinning (3,300 kWh/t)', 'Cathode stripping'],
        wasteStreams: [
          { name: 'Jarosite/Goethite', quantity: '15,000 tonnes/year', composition: 'Iron residue' },
          { name: 'Cd Cake', quantity: '200 tonnes/year', composition: 'Cadmium (hazardous)' }
        ],
        energyIntensity: 'Very High',
        gwpContribution: 28,
        wastageContribution: 15,
        isScrapEntry: true // Scrap can enter here
      },
      {
        id: 'casting',
        name: 'Casting',
        emoji: '🏗️',
        icon: <Building2 className="w-6 h-6" />,
        color: 'indigo',
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-300',
        textColor: 'text-indigo-700',
        description: 'Melting cathode zinc and casting into ingots, slabs, or galvanizing baths',
        keyProcesses: ['Induction melting', 'Alloying (ZAMAK)', 'Continuous casting', 'Quality testing'],
        wasteStreams: [
          { name: 'Dross', quantity: '2,000 tonnes/year', composition: 'ZnO, Al oxides' },
          { name: 'Skimmings', quantity: '1,500 tonnes/year', composition: 'Metal-rich oxide' }
        ],
        energyIntensity: 'Medium',
        gwpContribution: 10,
        wastageContribution: 10,
        isScrapEntry: true // +SCRAP
      },
      {
        id: 'fabrication',
        name: 'Fabrication',
        emoji: '🔧',
        icon: <Wrench className="w-6 h-6" />,
        color: 'blue',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-300',
        textColor: 'text-blue-700',
        description: 'Die casting, galvanizing, or rolling into finished products',
        keyProcesses: ['Hot-dip galvanizing', 'Die casting (ZAMAK)', 'Rolling', 'Anodes/Coatings'],
        wasteStreams: [
          { name: 'Zinc ash', quantity: '1,000 tonnes/year', composition: 'ZnO, chlorides' },
          { name: 'Scrap', quantity: '800 tonnes/year', composition: 'Runners, rejects' }
        ],
        energyIntensity: 'Medium',
        gwpContribution: 10,
        wastageContribution: 10,
        isScrapEntry: true // +SCRAP
      },
      {
        id: 'recycle',
        name: 'Recycle',
        emoji: '♻️',
        icon: <Recycle className="w-6 h-6" />,
        color: 'green',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-300',
        textColor: 'text-green-700',
        description: 'Waelz kiln recovery from EAF dust + galvanized steel scrap recycling → returns to Leaching',
        keyProcesses: ['EAF dust collection', 'Waelz kiln (1200°C)', 'Galv steel shredding', 'Scrap melting'],
        wasteStreams: [
          { name: 'Waelz slag', quantity: '8,000 tonnes/year', composition: 'Fe, SiO₂' },
          { name: 'Flue dust', quantity: '500 tonnes/year', composition: 'Heavy metals' }
        ],
        energyIntensity: 'Medium',
        gwpContribution: 7,
        wastageContribution: 15,
        isCircularHighlight: true // Scrap returns to Leaching + EW
      }
    ]
  }

  // Return aluminum stages (default)
  return ALUMINUM_LIFECYCLE_STAGES
}

// Lifecycle stages data (Aluminum)
const ALUMINUM_LIFECYCLE_STAGES: LifecycleStage[] = [
  {
    id: 'mining',
    name: 'Mining',
    emoji: '⛏️',
    icon: <Mountain className="w-6 h-6" />,
    color: 'amber',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    textColor: 'text-amber-700',
    description: 'Extraction of raw ores from the earth through open-pit or underground mining',
    keyProcesses: [
      'Ore excavation & blasting',
      'Transportation to surface',
      'Initial crushing & screening',
      'Stockpiling'
    ],
    wasteStreams: [
      { name: 'Overburden', quantity: '50,000 tonnes/year', composition: 'Soil, rock, clay' },
      { name: 'Waste Rock', quantity: '35,000 tonnes/year', composition: 'Low-grade ore, gangue minerals' },
      { name: 'Tailings', quantity: '25,000 tonnes/year', composition: 'Fine particles, process water' },
      { name: 'Mine Water', quantity: '100,000 kL/year', composition: 'Dissolved minerals, suspended solids' }
    ],
    energyIntensity: 'Medium',
    gwpContribution: 8,
    wastageContribution: 35
  },
  {
    id: 'beneficiation',
    name: 'Beneficiation',
    emoji: '🔬',
    icon: <FlaskConical className="w-6 h-6" />,
    color: 'purple',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    textColor: 'text-purple-700',
    description: 'Processing to separate valuable minerals from gangue (unwanted material)',
    keyProcesses: [
      'Flotation separation',
      'Magnetic separation',
      'Gravity separation',
      'Dewatering & filtering'
    ],
    wasteStreams: [
      { name: 'Flotation Tailings', quantity: '18,000 tonnes/year', composition: 'Silica, alumina, trace metals' },
      { name: 'Filter Cake', quantity: '8,500 tonnes/year', composition: 'Dewatered mineral residue' },
      { name: 'Spent Reagents', quantity: '2,000 kL/year', composition: 'Collectors, frothers, modifiers' }
    ],
    energyIntensity: 'Medium',
    gwpContribution: 7,
    wastageContribution: 12
  },
  {
    id: 'refining',
    name: 'Refining',
    emoji: '⚗️',
    icon: <Factory className="w-6 h-6" />,
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    textColor: 'text-blue-700',
    description: 'Purification of metals through chemical or electrolytic processes',
    keyProcesses: [
      'Electrolytic refining',
      'Hydrometallurgical processing',
      'Acid leaching',
      'Solvent extraction'
    ],
    wasteStreams: [
      { name: 'Slag', quantity: '12,000 tonnes/year', composition: 'Metal oxides, silicates' },
      { name: 'Dross', quantity: '4,500 tonnes/year', composition: 'Oxidized metal, flux residue' },
      { name: 'Acid Waste', quantity: '5,000 kL/year', composition: 'Spent acids, dissolved metals' },
      { name: 'Anode Slime', quantity: '800 tonnes/year', composition: 'Precious metals, selenium' }
    ],
    energyIntensity: 'High',
    gwpContribution: 18,
    wastageContribution: 10
  },
  {
    id: 'smelting',
    name: 'Smelting',
    emoji: '🔥',
    icon: <Flame className="w-6 h-6" />,
    color: 'orange',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    textColor: 'text-orange-700',
    description: 'High-temperature extraction of metals from concentrated ores',
    keyProcesses: [
      'Blast furnace operations',
      'Electric arc furnace (EAF)',
      'Reduction of metal oxides',
      'Flux addition for impurity removal'
    ],
    wasteStreams: [
      { name: 'Furnace Slag', quantity: '22,000 tonnes/year', composition: 'Calcium silicate, alumina' },
      { name: 'Dust & Fumes', quantity: '3,500 tonnes/year', composition: 'Metal oxides, carbon particles' },
      { name: 'Spent Refractory', quantity: '1,200 tonnes/year', composition: 'Alumina, magnesia, chrome' },
      { name: 'Skimmings', quantity: '2,800 tonnes/year', composition: 'Metal-rich oxide layer' }
    ],
    energyIntensity: 'Very High',
    gwpContribution: 45,
    wastageContribution: 12
  },
  {
    id: 'casting',
    name: 'Casting',
    emoji: '🏗️',
    icon: <Building2 className="w-6 h-6" />,
    color: 'slate',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-300',
    textColor: 'text-slate-700',
    description: 'Shaping molten metal into desired forms (ingots, billets, shapes)',
    keyProcesses: [
      'Sand casting',
      'Die casting',
      'Continuous casting',
      'Investment casting'
    ],
    wasteStreams: [
      { name: 'Used Sand Molds', quantity: '15,000 tonnes/year', composition: 'Silica sand, binders, additives' },
      { name: 'Metal Scraps', quantity: '4,200 tonnes/year', composition: 'Runners, risers, defective castings' },
      { name: 'Core Butts', quantity: '2,100 tonnes/year', composition: 'Resin-bonded sand cores' },
      { name: 'Shot Blast Dust', quantity: '800 tonnes/year', composition: 'Metal fines, abrasive particles' }
    ],
    energyIntensity: 'Medium',
    gwpContribution: 8,
    wastageContribution: 9
  },
  {
    id: 'fabrication',
    name: 'Fabrication',
    emoji: '🔧',
    icon: <Wrench className="w-6 h-6" />,
    color: 'teal',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-300',
    textColor: 'text-teal-700',
    description: 'Machining and forming of metal components into final products',
    keyProcesses: [
      'Cutting, milling, drilling',
      'Rolling, forging, extrusion',
      'Welding and joining',
      'Surface treatment (anodizing)'
    ],
    wasteStreams: [
      { name: 'Metal Shavings', quantity: '3,200 tonnes/year', composition: 'Aluminium, copper, steel turnings' },
      { name: 'Cutting Fluid Waste', quantity: '1,800 kL/year', composition: 'Spent coolants, lubricants' },
      { name: 'Scrap Offcuts', quantity: '2,500 tonnes/year', composition: 'Sheet metal trimmings' },
      { name: 'Grinding Swarf', quantity: '650 tonnes/year', composition: 'Fine metal particles, abrasive' }
    ],
    energyIntensity: 'Low',
    gwpContribution: 7,
    wastageContribution: 8
  },
  {
    id: 'recycle',
    name: 'End-of-Life / Recycle',
    emoji: '♻️',
    icon: <Recycle className="w-6 h-6" />,
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    textColor: 'text-green-700',
    description: 'End-of-life processing and material recovery for circular economy',
    keyProcesses: [
      'Collection and sorting',
      'Shredding and separation',
      'Remelting and re-refining',
      'Quality testing for reuse'
    ],
    wasteStreams: [
      { name: 'Non-recyclable Fraction', quantity: '5,500 tonnes/year', composition: 'Mixed plastics, composites' },
      { name: 'Process Residue', quantity: '3,200 tonnes/year', composition: 'Shredder light fraction' },
      { name: 'Hazardous Waste', quantity: '800 tonnes/year', composition: 'Batteries, e-waste residue' },
      { name: 'Fluff', quantity: '2,400 tonnes/year', composition: 'Textiles, foam, rubber' }
    ],
    energyIntensity: 'Low',
    gwpContribution: 7,
    wastageContribution: 14
  }
]

// Energy intensity badge color
const getEnergyBadgeColor = (intensity: string) => {
  switch (intensity) {
    case 'Very High': return 'bg-red-100 text-red-700 border-red-200'
    case 'High': return 'bg-orange-100 text-orange-700 border-orange-200'
    case 'Medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    case 'Low': return 'bg-green-100 text-green-700 border-green-200'
    default: return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

export default function MetalLifecyclePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, token } = useAuthStore()

  const [expandedStage, setExpandedStage] = useState<string | null>('smelting')
  const [gwpContributions, setGwpContributions] = useState<Record<string, number>>(DEFAULT_GWP_CONTRIBUTIONS)
  const [isLoading, setIsLoading] = useState(true)
  const [recycledContent, setRecycledContent] = useState(0)
  const [metalType, setMetalType] = useState<MetalType>('aluminum')

  const hasVerificationAccess = user?.tier === 'enterprise' || user?.features?.verification
  const hasCBAMAccess = user?.tier === 'pro' || user?.tier === 'enterprise' || user?.features?.cbam_export

  // Fetch analytics data and map to 7-stage model
  useEffect(() => {
    const fetchData = async () => {
      if (!id || !token) {
        setIsLoading(false)
        return
      }

      try {
        // Fetch project data to detect metal type
        const project = await projectsApi.getById(id)
        const detectedType = detectMetalType(project.description)
        setMetalType(detectedType)

        // Fetch analytics data
        const response = await fetch(`${API_BASE}/projects/${id}/analytics`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const data = await response.json()

          // Set GWP contributions based on detected metal type
          if (detectedType === 'lead') {
            const leadGWP = {
              mining: LEAD_LIFECYCLE_DATA.stages.mining.gwpContribution,
              beneficiation: LEAD_LIFECYCLE_DATA.stages.beneficiation.gwpContribution,
              refining: LEAD_LIFECYCLE_DATA.stages.refining.gwpContribution,
              smelting: LEAD_LIFECYCLE_DATA.stages.smelting.gwpContribution,
              casting: LEAD_LIFECYCLE_DATA.stages.casting.gwpContribution,
              fabrication: LEAD_LIFECYCLE_DATA.stages.fabrication.gwpContribution,
              recycle: LEAD_LIFECYCLE_DATA.stages.recycle.gwpContribution
            }
            setGwpContributions(leadGWP)
          } else if (detectedType === 'copper') {
            const copperGWP = {
              mining: COPPER_LIFECYCLE_DATA.stages.mining.gwpContribution,
              beneficiation: COPPER_LIFECYCLE_DATA.stages.beneficiation.gwpContribution,
              refining: COPPER_LIFECYCLE_DATA.stages.refining.gwpContribution,
              smelting: COPPER_LIFECYCLE_DATA.stages.smelting.gwpContribution,
              casting: COPPER_LIFECYCLE_DATA.stages.casting.gwpContribution,
              fabrication: COPPER_LIFECYCLE_DATA.stages.fabrication.gwpContribution,
              recycle: COPPER_LIFECYCLE_DATA.stages.recycle.gwpContribution
            }
            setGwpContributions(copperGWP)
          } else if (detectedType === 'steel') {
            // Use EAF route for steel (circular economy route)
            const eafRoute = STEEL_LIFECYCLE_DATA.routes['eaf']
            const steelGWP = {
              mining: eafRoute.stages.mining.gwpContribution,
              beneficiation: eafRoute.stages.beneficiation.gwpContribution,
              refining: eafRoute.stages.refining.gwpContribution,
              smelting: eafRoute.stages.smelting.gwpContribution,
              casting: eafRoute.stages.casting.gwpContribution,
              fabrication: eafRoute.stages.fabrication.gwpContribution,
              recycle: eafRoute.stages.recycle.gwpContribution
            }
            setGwpContributions(steelGWP)
          } else if (detectedType === 'zinc') {
            const zincGWP = {
              mining: ZINC_LIFECYCLE_DATA.stages.mining.gwpContribution,
              beneficiation: ZINC_LIFECYCLE_DATA.stages.beneficiation.gwpContribution,
              refining: ZINC_LIFECYCLE_DATA.stages.refining.gwpContribution,
              smelting: ZINC_LIFECYCLE_DATA.stages.smelting.gwpContribution,
              casting: ZINC_LIFECYCLE_DATA.stages.casting.gwpContribution,
              fabrication: ZINC_LIFECYCLE_DATA.stages.fabrication.gwpContribution,
              recycle: ZINC_LIFECYCLE_DATA.stages.recycle.gwpContribution
            }
            setGwpContributions(zincGWP)
          } else {
            const mappedStages = mapBackendToFrontendStages(data)
            setGwpContributions(mappedStages)
          }

          setRecycledContent(data.summary?.avg_recycled_content || 0)
        }
      } catch (error) {
        console.error('Failed to fetch lifecycle data:', error)
        // Keep default values on error
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [id, token])

  // Create dynamic stages with fetched GWP values based on metal type AND dynamic wastage
  const baseStages = getLifecycleStages(metalType)
  const dynamicStages = baseStages.map(stage => {
    const virginRatio = (100 - recycledContent) / 100; // 0-1, where 0 = 100% recycled
    const recycledRatio = recycledContent / 100; // 0-1, where 1 = 100% recycled

    // Calculate dynamic wastage based on recycled content (for aluminum)
    let dynamicWastage = stage.wastageContribution;

    if (metalType === 'aluminum') {
      if (stage.id === 'mining') {
        dynamicWastage = Math.round(stage.wastageContribution * virginRatio);
      } else if (stage.id === 'beneficiation') {
        dynamicWastage = Math.round(stage.wastageContribution * virginRatio);
      } else if (stage.id === 'refining') {
        dynamicWastage = Math.round(stage.wastageContribution * virginRatio);
      } else if (stage.id === 'smelting') {
        dynamicWastage = Math.round(stage.wastageContribution * (0.3 + 0.7 * virginRatio) + 5 * recycledRatio);
      } else if (stage.id === 'recycle') {
        dynamicWastage = Math.round(stage.wastageContribution * (0.5 + 1.5 * recycledRatio));
      }
    }

    return {
      ...stage,
      gwpContribution: gwpContributions[stage.id] || stage.gwpContribution,
      wastageContribution: Math.max(dynamicWastage, 1)
    };
  });

  const toggleStage = (stageId: string) => {
    setExpandedStage(expandedStage === stageId ? null : stageId)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Secondary Navigation Bar */}
        <div className="bg-white rounded-lg shadow mb-5">
          <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-100">
            <button
              onClick={() => navigate('/projects')}
              className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-1.5"
            >
              <span className="text-base">←</span> Back
            </button>
            <div className="w-px h-6 bg-gray-200 mx-1"></div>
            <button
              onClick={() => navigate(`/projects/${id}`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate(`/projects/${id}/analytics`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors flex items-center gap-2"
            >
              <ChartIcon size={16} /> Analytics
            </button>
            <button
              onClick={() => navigate(`/projects/${id}/lcia`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-teal-50 hover:text-teal-700 rounded-md transition-colors flex items-center gap-2"
            >
              <AnalyticsIcon size={16} /> LCIA
            </button>

            <button
              className="px-4 py-2 text-sm font-medium bg-indigo-50 text-indigo-700 rounded-md transition-colors flex items-center gap-2"
            >
              <RotateCcw size={16} /> Lifecycle
            </button>
            <button
              onClick={() => navigate(`/projects/${id}/recommendations`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-md transition-colors flex items-center gap-2"
            >
              <AIIcon size={16} /> Design Advisor
            </button>
            <button
              onClick={() => navigate(`/projects/${id}/scenario`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors flex items-center gap-2"
            >
              <FlaskIcon size={16} /> Scenarios
            </button>
            {hasCBAMAccess ? (
              <button
                onClick={() => navigate(`/projects/${id}/cbam-export`)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-amber-50 hover:text-amber-700 rounded-md transition-colors flex items-center gap-2"
              >
                <FileSpreadsheet size={16} /> CBAM
              </button>
            ) : (
              <Link
                to="/pricing"
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:bg-gray-50 rounded-md transition-colors flex items-center gap-2"
                title="CBAM Export requires Pro plan"
              >
                <Lock size={16} /> CBAM
              </Link>
            )}
            {hasVerificationAccess ? (
              <button
                onClick={() => navigate(`/projects/${id}/verification`)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors flex items-center gap-2"
              >
                <Building2 size={16} /> Verification
              </button>
            ) : (
              <Link
                to="/pricing"
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:bg-gray-50 rounded-md transition-colors flex items-center gap-2"
                title="JNARDDC Verification requires Enterprise plan"
              >
                <Lock size={16} /> Verification
              </Link>
            )}
          </div>
        </div>

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-700"></div>
          <div className="absolute inset-0 bg-[url('/images/smelting.jpg')] bg-cover bg-center opacity-20"></div>

          <div className="relative px-8 py-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <RotateCcw className="w-10 h-10 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                    {metalType === 'lead' ? 'Lead' : 'Metal'} Lifecycle Flow
                  </h1>
                  {metalType === 'lead' && (
                    <span className="px-3 py-1 bg-blue-500 text-white text-sm font-bold rounded-full">
                      Cradle-to-Cradle
                    </span>
                  )}
                </div>
                <p className="text-indigo-100 mt-1">
                  {metalType === 'lead'
                    ? 'Near-perfect circular loop: 50%+ of global supply from recycled sources'
                    : 'From extraction to end-of-life: Understanding the complete metal journey'}
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-yellow-300" />
                  <span className="text-indigo-100 text-sm">Highest Impact</span>
                </div>
                <p className="text-2xl font-bold text-white">Smelting</p>
                <p className="text-xs text-indigo-200">45% of total GWP</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <Leaf className="w-5 h-5 text-green-300" />
                  <span className="text-indigo-100 text-sm">Recycling Saves</span>
                </div>
                <p className="text-2xl font-bold text-white">{metalType === 'lead' ? '35-40%' : '95%'}</p>
                <p className="text-xs text-indigo-200">Energy vs Primary</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <Droplets className="w-5 h-5 text-blue-300" />
                  <span className="text-indigo-100 text-sm">Lifecycle Stages</span>
                </div>
                <p className="text-2xl font-bold text-white">7</p>
                <p className="text-xs text-indigo-200">Complete chain</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <Wind className="w-5 h-5 text-cyan-300" />
                  <span className="text-indigo-100 text-sm">Circular Loop</span>
                </div>
                <p className="text-2xl font-bold text-white">Active</p>
                <p className="text-xs text-indigo-200">Material recovery</p>
              </div>
            </div>
          </div>
        </div>

        {/* Circular Economy Highlight Banner */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 mb-8 relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 flex items-center justify-center opacity-10">
            <Recycle className="w-48 h-48 text-white animate-spin-slow" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <TrendingDown className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {metalType === 'lead' ? 'Cradle-to-Cradle Loop' : 'Circular Economy Loop'}
                </h2>
                <p className="text-green-100">
                  {metalType === 'lead'
                    ? <><span className="font-bold">~99% battery recycling rate</span> – recycled indefinitely without quality loss. Secondary smelting uses <span className="font-bold">35-40% less energy</span> than primary.</>
                    : metalType === 'copper'
                      ? <>Copper is <span className="font-bold">100% recyclable</span> – recycled Cu bypasses Mining → Converting stages, saving <span className="font-bold">85% energy</span> and reducing CO₂ by <span className="font-bold">~2.8 kg/kg Cu</span></>
                      : metalType === 'zinc'
                        ? <>Recycled zinc from galvanized steel recovery, saving <span className="font-bold">75% energy</span> and reducing CO₂ by <span className="font-bold">~2.5 kg/kg Zn</span>. Waelz kiln process recovers Zn from EAF dust.</>
                        : metalType === 'steel'
                          ? <>EAF steel from <span className="font-bold">100% scrap</span> uses <span className="font-bold">75% less energy</span> than BF-BOF route – reducing CO₂ by <span className="font-bold">~1.5 kg/kg steel</span></>
                          : <>Recycled metals bypass Mining → Smelting stages, saving <span className="font-bold">95% energy</span> and reducing CO₂ by <span className="font-bold">~17 kg/kg Al</span></>
                  }
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/scrap-yard-connect?project=${id}`)}
              className="flex items-center gap-2 px-6 py-3 bg-white text-green-700 rounded-xl font-semibold hover:bg-green-50 transition shadow-lg"
            >
              <Recycle className="w-5 h-5" />
              Find Recycled Materials
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Visual Flow Diagram - Horseshoe Circular Layout */}
        <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 mb-8 overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Click any stage to view details</h2>
            </div>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading data...</span>
              </div>
            ) : recycledContent > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 text-sm font-medium rounded-full border border-green-200">
                <Recycle className="w-4 h-4" />
                <span>{Math.round(recycledContent)}% Recycled Content</span>
              </div>
            )}
          </div>

          {/* Horseshoe Flow Diagram with SVG Connection */}
          <div className="relative">

            {/* Top Row: All 7 stages in a single line */}
            <div className="flex flex-wrap md:flex-nowrap gap-1 md:gap-2 mb-2 relative z-10">
              {dynamicStages.map((stage, index) => (
                <div key={stage.id} className="relative flex-1 min-w-[80px]">
                  {/* Mini Stage Card */}
                  <div
                    onClick={() => toggleStage(stage.id)}
                    className={`relative cursor-pointer rounded-lg border-2 transition-all duration-300 hover:shadow-lg hover:scale-105 ${expandedStage === stage.id
                      ? `${stage.borderColor} ${stage.bgColor} shadow-md scale-105`
                      : 'border-gray-200 bg-white hover:border-gray-300'
                      } ${stage.id === 'smelting' ? 'ring-2 ring-orange-400 ring-offset-1' : ''} 
                      ${stage.id === 'recycle' ? 'ring-2 ring-green-400 ring-offset-1' : ''}`}
                  >
                    <div className="p-2 text-center">
                      <span className="text-xl md:text-2xl block">{stage.emoji}</span>
                      <h3 className={`font-bold text-[10px] md:text-xs truncate ${expandedStage === stage.id ? stage.textColor : 'text-gray-900'}`}>
                        {stage.id === 'beneficiation' ? 'Benefic.' : stage.id === 'fabrication' ? 'Fabric.' : stage.id === 'recycle' ? 'Recycle' : stage.name}
                      </h3>
                      <div className={`text-sm md:text-base font-bold ${stage.textColor}`}>{stage.wastageContribution}%</div>
                      {/* Mini Wastage Bar */}
                      <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full ${stage.wastageContribution >= 30 ? 'bg-red-500' :
                            stage.wastageContribution >= 15 ? 'bg-orange-500' :
                              'bg-green-500'
                            }`}
                          style={{ width: `${Math.min(stage.wastageContribution * 2.5, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* +SCRAP indicator for scrap entry stages */}
                    {stage.isScrapEntry && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20">
                        <div className="px-1 py-0.5 bg-green-500 text-white text-[8px] font-bold rounded whitespace-nowrap">
                          +SCRAP
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Arrow to next stage */}
                  {index < 6 && (
                    <div className="hidden md:flex absolute -right-2.5 top-1/2 -translate-y-1/2 z-20">
                      <div className="w-5 h-5 bg-white rounded-full shadow-sm border border-gray-200 flex items-center justify-center">
                        <ArrowRight className="w-3 h-3 text-gray-500" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Circular Loop - U-Shape Connection: Recycle → Down → Left → Up → Smelting/Leaching */}
            <div className="relative mt-2 mx-auto w-full h-24 sm:h-28">
              {/* SVG Gradient Path */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" preserveAspectRatio="none" viewBox="0 0 1000 100">
                <defs>
                  <linearGradient id="loopGradient" x1="100%" y1="0%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#22c55e" /> {/* green-500 */}
                    <stop offset="50%" stopColor="#34d399" /> {/* emerald-400 */}
                    <stop offset="100%" stopColor="#f97316" /> {/* orange-500 */}
                  </linearGradient>
                  <linearGradient id="castingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" /> {/* indigo-500 */}
                    <stop offset="100%" stopColor="#34d399" /> {/* emerald-400 */}
                  </linearGradient>
                  <linearGradient id="fabGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" /> {/* blue-500 */}
                    <stop offset="100%" stopColor="#34d399" /> {/* emerald-400 */}
                  </linearGradient>
                </defs>

                {/* Main loop from Recycle */}
                <path
                  d={metalType === 'zinc'
                    ? "M 928 0 V 60 Q 928 90 898 90 H 380 Q 350 90 350 60 V 15" // Goes to Leaching+EW for zinc
                    : "M 928 0 V 60 Q 928 90 898 90 H 530 Q 500 90 500 60 V 15" // Goes to Smelting for others
                  }
                  fill="none"
                  stroke="url(#loopGradient)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  className="drop-shadow-sm"
                />

                {/* Additional arrows for zinc: Casting and Fabrication scrap */}
                {metalType === 'zinc' && (
                  <>
                    {/* Arrow from Casting (64.3%) down to loop */}
                    <path
                      d="M 643 0 V 40 Q 643 60 620 60 H 400 Q 380 60 380 45"
                      fill="none"
                      stroke="url(#castingGradient)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray="6 3"
                      opacity="0.8"
                    />
                    {/* Arrow from Fabrication (78.6%) down to loop */}
                    <path
                      d="M 786 0 V 50 Q 786 70 760 70 H 420 Q 400 70 400 55"
                      fill="none"
                      stroke="url(#fabGradient)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray="6 3"
                      opacity="0.8"
                    />
                  </>
                )}

                {/* Lead: Clean U-Shape Closed Loop with 99% Badge */}
                {metalType === 'lead' && (
                  <>
                    {/* Main wide U-path from Recycle → Smelting covering all scrap stages */}
                    <path
                      d="M 928 5 V 70 Q 928 95 890 95 H 540 Q 500 95 500 65 V 15"
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="4"
                      strokeLinecap="round"
                      className="drop-shadow-sm"
                    />
                    {/* Secondary path from Refining joining the loop */}
                    <path
                      d="M 643 5 V 40 Q 643 60 620 60 H 580 Q 560 60 560 75"
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray="5 3"
                    />
                    {/* Tertiary path from Fabrication joining the loop */}
                    <path
                      d="M 786 5 V 50 Q 786 70 760 70 H 700 Q 680 70 680 85"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray="5 3"
                    />
                    {/* 99% Badge in center of the loop */}
                    <rect x="680" y="78" rx="10" ry="10" width="60" height="24" fill="#dcfce7" stroke="#22c55e" strokeWidth="1.5" />
                    <text x="710" y="94" textAnchor="middle" fill="#16a34a" fontSize="12" fontWeight="bold">99%</text>
                  </>
                )}

                {/* Steel: EAF Circular Economy Loop - Multiple scrap sources */}
                {metalType === 'steel' && (
                  <>
                    {/* Arrow 1: Recycle → EAF (main green loop) */}
                    <path
                      d="M 928 5 V 60 Q 928 85 895 85 H 390 Q 357 85 357 55 V 15"
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="4"
                      strokeLinecap="round"
                      className="drop-shadow-sm"
                    />
                    {/* Arrow 2: Fabrication → EAF (blue dashed) */}
                    <path
                      d="M 786 5 V 35 Q 786 50 760 50 H 400 Q 375 50 375 35 V 15"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray="5 3"
                    />
                    {/* Arrow 3: Casting → EAF (slate dashed) */}
                    <path
                      d="M 643 5 V 25 Q 643 40 615 40 H 410 Q 385 40 385 25 V 15"
                      fill="none"
                      stroke="#64748b"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray="4 3"
                      opacity="0.7"
                    />
                    {/* Arrow 4: Scrap Collection → EAF (direct path) */}
                    <path
                      d="M 72 5 V 30 Q 72 45 100 45 H 320 Q 350 45 350 30 V 15"
                      fill="none"
                      stroke="#eab308"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    {/* EAF ⚡ central badge */}
                    <rect x="320" y="60" rx="12" ry="12" width="70" height="22" fill="#fef9c3" stroke="#eab308" strokeWidth="1.5" />
                    <text x="355" y="75" textAnchor="middle" fill="#a16207" fontSize="10" fontWeight="bold">⚡ EAF</text>
                  </>
                )}
              </svg>

              {/* Labels & Icons positioned absolutely to avoid distortion */}

              {/* From Recycle Label */}
              <div className="absolute top-0 right-[7.14%] translate-x-1/2 flex flex-col items-center gap-0.5">
                <span className="text-[10px] font-bold text-green-600 bg-white/80 px-1 rounded">from Recycle</span>
                <ArrowDown className="w-4 h-4 text-green-500 animate-bounce" style={{ animationDuration: '2s' }} />
              </div>

              {/* To Smelting/Leaching Label */}
              <div className="absolute bottom-[25px] left-[50%] -translate-x-1/2 flex flex-col items-center gap-0.5" style={{ bottom: 'calc(100% - 25px)', left: metalType === 'zinc' ? '35%' : '50%' }}>
                {/* Positioned at the tip of the arrow */}
                <div className="absolute top-[8px] flex flex-col items-center">
                  <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-orange-500"></div>
                </div>
                <span className="absolute top-[20px] text-[10px] font-bold text-orange-600 bg-white/80 px-1 rounded whitespace-nowrap">↑ to {metalType === 'zinc' ? 'Leaching' : 'Smelting'}</span>
              </div>

              {/* Center Banner */}
              <div className="absolute bottom-1 sm:bottom-2 left-1/2 -translate-x-1/2 z-10">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-800 text-xs font-bold rounded-full border border-green-200 shadow-sm whitespace-nowrap">
                  <RotateCcw className="w-3 h-3" />
                  <span>CIRCULAR LOOP: Scrap returns to {metalType === 'zinc' ? 'Leaching + EW' : metalType === 'steel' ? 'Electric Arc Furnace' : 'Smelting'}</span>
                </div>
              </div>
            </div>


          </div>
        </div>

        {/* Expanded Stage Details */}
        {expandedStage && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8 animate-in slide-in-from-top duration-300">
            {dynamicStages.filter(s => s.id === expandedStage).map(stage => (
              <div key={stage.id}>
                {/* Header */}
                <div className={`${stage.bgColor} px-6 py-4 border-b ${stage.borderColor}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-4xl">{stage.emoji}</span>
                      <div>
                        <h2 className={`text-2xl font-bold ${stage.textColor}`}>{stage.name}</h2>
                        <p className="text-gray-600">{stage.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setExpandedStage(null)}
                      className="p-2 hover:bg-white/50 rounded-lg transition"
                    >
                      <ChevronUp className="w-6 h-6 text-gray-600" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Usage / Key Processes */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Zap className={`w-5 h-5 ${stage.textColor}`} />
                        Key Processes (Usage)
                      </h3>
                      <div className="space-y-3">
                        {stage.keyProcesses.map((process, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center gap-3 p-3 rounded-lg ${stage.bgColor} border ${stage.borderColor}`}
                          >
                            <div className={`w-8 h-8 rounded-full bg-white flex items-center justify-center font-bold ${stage.textColor}`}>
                              {idx + 1}
                            </div>
                            <span className="font-medium text-gray-800">{process}</span>
                          </div>
                        ))}
                      </div>

                      {/* Energy & GWP Summary */}
                      <div className="mt-6 grid grid-cols-2 gap-4">
                        <div className={`p-4 rounded-xl ${stage.bgColor} border ${stage.borderColor}`}>
                          <p className="text-sm text-gray-600 mb-1">Energy Intensity</p>
                          <p className={`text-xl font-bold ${stage.textColor}`}>{stage.energyIntensity}</p>
                        </div>
                        <div className={`p-4 rounded-xl ${stage.bgColor} border ${stage.borderColor}`}>
                          <p className="text-sm text-gray-600 mb-1">GWP Contribution</p>
                          <p className={`text-xl font-bold ${stage.textColor}`}>{stage.gwpContribution}%</p>
                        </div>
                      </div>
                    </div>

                    {/* Wastage / Waste Streams */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Droplets className="w-5 h-5 text-red-500" />
                        Waste Streams (Wastage)
                      </h3>
                      <div className="space-y-3">
                        {stage.wasteStreams.map((waste, idx) => (
                          <div
                            key={idx}
                            className="p-4 rounded-lg bg-gray-50 border border-gray-200 hover:border-gray-300 transition"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-gray-900">{waste.name}</h4>
                              <span className="text-sm font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                                {waste.quantity}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Composition:</span> {waste.composition}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Recovery Potential for Recycle Stage */}
                      {stage.id === 'recycle' && (
                        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                          <div className="flex items-center gap-3 mb-2">
                            <Leaf className="w-6 h-6 text-green-600" />
                            <h4 className="font-semibold text-green-800">Circular Economy Benefit</h4>
                          </div>
                          <p className="text-sm text-green-700">
                            Materials recovered here feed back into the Refining/Smelting stages,
                            creating a closed-loop system that saves <strong>95% energy</strong> compared to virgin material extraction.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Lifecycle Summary</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stage</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Energy</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Wastage %</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Waste Streams</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Key Insight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dynamicStages.map(stage => (
                  <tr
                    key={stage.id}
                    className={`hover:bg-gray-50 cursor-pointer transition ${expandedStage === stage.id ? stage.bgColor : ''}`}
                    onClick={() => toggleStage(stage.id)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{stage.emoji}</span>
                        <span className="font-medium text-gray-900">{stage.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full border ${getEnergyBadgeColor(stage.energyIntensity)}`}>
                        {stage.energyIntensity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${stage.wastageContribution >= 30 ? 'bg-red-500' :
                              stage.wastageContribution >= 15 ? 'bg-orange-500' :
                                'bg-green-500'
                              }`}
                            style={{ width: `${stage.wastageContribution * 2.5}%` }}
                          />
                        </div>
                        <span className="font-semibold text-gray-900">{stage.wastageContribution}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {stage.wasteStreams.length} types
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {stage.id === 'smelting' && <span className="text-red-600 font-medium">High energy, moderate waste</span>}
                      {stage.id === 'recycle' && <span className="text-green-600 font-medium">Recovers material, reduces overall waste</span>}
                      {stage.id === 'mining' && <span className="text-amber-600 font-medium">Highest waste generator (overburden)</span>}
                      {stage.id === 'refining' && <span className="text-blue-600 font-medium">Generates slag and chemical waste</span>}
                      {stage.id === 'beneficiation' && <span className="text-purple-600 font-medium">Tailings and flotation waste</span>}
                      {stage.id === 'casting' && <span className="text-slate-600 font-medium">Sand molds and scrap</span>}
                      {stage.id === 'fabrication' && <span className="text-teal-600 font-medium">Metal shavings, recoverable</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Custom Animation Styles */}
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
        @keyframes dash {
          to {
            stroke-dashoffset: -24;
          }
        }
        .animate-dash {
          animation: dash 1s linear infinite;
        }
      `}</style>
    </div>
  )
}

