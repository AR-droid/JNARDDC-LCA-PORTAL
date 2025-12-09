// Aluminium Alloy Database for Recycling Advisor
// Contains alloy compositions, compatible scrap types, and end-of-life pathways

export interface AlloyComposition {
  Al: number
  Cu?: number
  Mg?: number
  Si?: number
  Zn?: number
  Mn?: number
  Fe?: number
  Cr?: number
  Ti?: number
}

export interface ElementLimits {
  Cu_max?: number
  Fe_max?: number
  Mg_min?: number
  Mg_max?: number
  Si_min?: number
  Si_max?: number
  Zn_max?: number
  Mn_max?: number
  Mn_min?: number
}

export interface ElementLoss {
  Mg: number  // % loss per remelt
  Zn: number
  Cu: number
  Si: number
  Mn: number
}

export interface ScrapGrade {
  id: string
  name: string
  description: string
  typical_cu: number  // typical Cu content %
  price_factor: number  // relative to LME
}

export interface AlloyData {
  code: string
  name: string
  series: string
  type: 'wrought' | 'cast'
  description: string
  composition: AlloyComposition
  limits: ElementLimits
  compatible_scrap: string[]
  incompatible_scrap: string[]
  eol_pathways: string[]
  element_loss: ElementLoss
  applications: string[]
  recyclability_score: number  // 0-100
}

// Scrap Grade Database
export const SCRAP_GRADES: ScrapGrade[] = [
  { id: 'taint_tabor', name: 'Taint/Tabor', description: 'Clean 6xxx extrusions, painted OK', typical_cu: 0.1, price_factor: 0.85 },
  { id: 'tense', name: 'Tense', description: 'High-copper alloys (2xxx)', typical_cu: 3.5, price_factor: 0.75 },
  { id: 'twitch', name: 'Twitch', description: 'Mixed low-copper wrought', typical_cu: 0.3, price_factor: 0.80 },
  { id: 'ubc', name: 'UBC', description: 'Used Beverage Cans', typical_cu: 0.15, price_factor: 0.78 },
  { id: 'wheels', name: 'Wheels', description: 'Automotive wheels (A356)', typical_cu: 0.1, price_factor: 0.82 },
  { id: 'zorba', name: 'Zorba', description: 'Shredded mixed Al', typical_cu: 1.5, price_factor: 0.65 },
  { id: 'clean_sheet', name: 'Clean Sheet', description: 'Uncoated sheet scrap', typical_cu: 0.15, price_factor: 0.88 },
  { id: '6xxx_extrusion', name: '6xxx Extrusion', description: 'Clean 6xxx profiles', typical_cu: 0.1, price_factor: 0.90 },
  { id: '7xxx_aerospace', name: '7xxx Aerospace', description: 'Aerospace alloy scrap', typical_cu: 1.5, price_factor: 0.72 },
  { id: '2xxx_aerospace', name: '2xxx Aerospace', description: 'High-copper aerospace', typical_cu: 4.0, price_factor: 0.70 },
  { id: 'cast_clean', name: 'Cast Clean', description: 'Clean casting scrap', typical_cu: 2.0, price_factor: 0.75 },
  { id: 'litho_sheet', name: 'Litho Sheet', description: 'Lithographic sheet', typical_cu: 0.05, price_factor: 0.92 },
]

// Alloy Database - Wrought Alloys
export const ALLOY_DATABASE: AlloyData[] = [
  // 1xxx Series - Pure Aluminium
  {
    code: '1050',
    name: '1050 Pure Al',
    series: '1xxx',
    type: 'wrought',
    description: '99.5% pure aluminium, excellent corrosion resistance',
    composition: { Al: 99.5, Cu: 0.05, Fe: 0.4, Si: 0.25 },
    limits: { Cu_max: 0.05, Fe_max: 0.4 },
    compatible_scrap: ['litho_sheet', 'clean_sheet', '6xxx_extrusion'],
    incompatible_scrap: ['2xxx_aerospace', 'tense', 'zorba', '7xxx_aerospace'],
    eol_pathways: ['1xxx', '3xxx', '6xxx', 'cast_general'],
    element_loss: { Mg: 0.10, Zn: 0.05, Cu: 0.01, Si: 0.02, Mn: 0.02 },
    applications: ['Electrical conductors', 'Chemical equipment', 'Foil'],
    recyclability_score: 95
  },
  {
    code: '1100',
    name: '1100 Pure Al',
    series: '1xxx',
    type: 'wrought',
    description: '99% pure aluminium, good formability',
    composition: { Al: 99.0, Cu: 0.12, Fe: 0.5, Si: 0.4 },
    limits: { Cu_max: 0.2, Fe_max: 0.5 },
    compatible_scrap: ['litho_sheet', 'clean_sheet', 'ubc'],
    incompatible_scrap: ['2xxx_aerospace', 'tense', 'zorba'],
    eol_pathways: ['1xxx', '3xxx', 'cast_general'],
    element_loss: { Mg: 0.10, Zn: 0.05, Cu: 0.01, Si: 0.02, Mn: 0.02 },
    applications: ['Heat exchangers', 'Nameplates', 'Reflectors'],
    recyclability_score: 95
  },

  // 2xxx Series - Copper Alloys (Aerospace)
  {
    code: '2024',
    name: '2024-T3 (Al-Cu)',
    series: '2xxx',
    type: 'wrought',
    description: 'High strength aerospace alloy, poor corrosion resistance',
    composition: { Al: 93.5, Cu: 4.4, Mg: 1.5, Mn: 0.6 },
    limits: { Cu_max: 4.9, Mg_min: 1.2, Mg_max: 1.8 },
    compatible_scrap: ['2xxx_aerospace', 'tense'],
    incompatible_scrap: ['6xxx_extrusion', 'taint_tabor', 'ubc', 'clean_sheet'],
    eol_pathways: ['2xxx_closed_loop', 'cast_high_cu', 'downcycle_cast'],
    element_loss: { Mg: 0.12, Zn: 0.05, Cu: 0.01, Si: 0.02, Mn: 0.03 },
    applications: ['Aircraft fuselage', 'Wing skins', 'Truck wheels'],
    recyclability_score: 65
  },
  {
    code: '2014',
    name: '2014-T6 (Al-Cu)',
    series: '2xxx',
    type: 'wrought',
    description: 'High strength, heat treatable',
    composition: { Al: 93.0, Cu: 4.4, Mg: 0.5, Si: 0.8, Mn: 0.8 },
    limits: { Cu_max: 5.0, Mg_max: 0.8 },
    compatible_scrap: ['2xxx_aerospace', 'tense'],
    incompatible_scrap: ['6xxx_extrusion', 'taint_tabor', 'ubc'],
    eol_pathways: ['2xxx_closed_loop', 'cast_high_cu'],
    element_loss: { Mg: 0.12, Zn: 0.05, Cu: 0.01, Si: 0.02, Mn: 0.03 },
    applications: ['Heavy-duty structures', 'Aircraft fittings'],
    recyclability_score: 60
  },

  // 3xxx Series - Manganese Alloys
  {
    code: '3003',
    name: '3003-H14 (Al-Mn)',
    series: '3xxx',
    type: 'wrought',
    description: 'Good formability, moderate strength',
    composition: { Al: 98.6, Mn: 1.2, Cu: 0.12 },
    limits: { Cu_max: 0.2, Mn_max: 1.5 },
    compatible_scrap: ['clean_sheet', 'ubc', 'taint_tabor', '6xxx_extrusion'],
    incompatible_scrap: ['2xxx_aerospace', 'tense', '7xxx_aerospace'],
    eol_pathways: ['3xxx', 'can_sheet', 'cast_general'],
    element_loss: { Mg: 0.10, Zn: 0.05, Cu: 0.01, Si: 0.02, Mn: 0.03 },
    applications: ['Beverage cans', 'Cookware', 'Roofing sheets'],
    recyclability_score: 90
  },
  {
    code: '3004',
    name: '3004-H19 (Al-Mn-Mg)',
    series: '3xxx',
    type: 'wrought',
    description: 'Can body alloy, excellent formability',
    composition: { Al: 97.8, Mn: 1.2, Mg: 1.0 },
    limits: { Cu_max: 0.25, Mn_max: 1.5, Mg_max: 1.3 },
    compatible_scrap: ['ubc', 'clean_sheet', 'taint_tabor'],
    incompatible_scrap: ['2xxx_aerospace', 'tense', 'zorba'],
    eol_pathways: ['can_sheet', '3xxx', 'cast_general'],
    element_loss: { Mg: 0.12, Zn: 0.05, Cu: 0.01, Si: 0.02, Mn: 0.03 },
    applications: ['Can bodies', 'Chemical equipment'],
    recyclability_score: 92
  },

  // 5xxx Series - Magnesium Alloys
  {
    code: '5052',
    name: '5052-H32 (Al-Mg)',
    series: '5xxx',
    type: 'wrought',
    description: 'Good weldability, marine corrosion resistance',
    composition: { Al: 97.2, Mg: 2.5, Cr: 0.25 },
    limits: { Cu_max: 0.1, Mg_min: 2.2, Mg_max: 2.8 },
    compatible_scrap: ['clean_sheet', 'taint_tabor', '6xxx_extrusion'],
    incompatible_scrap: ['2xxx_aerospace', 'tense', 'zorba', '7xxx_aerospace'],
    eol_pathways: ['5xxx', '6xxx', 'cast_general'],
    element_loss: { Mg: 0.15, Zn: 0.05, Cu: 0.01, Si: 0.02, Mn: 0.02 },
    applications: ['Marine components', 'Pressure vessels', 'Appliances'],
    recyclability_score: 88
  },
  {
    code: '5182',
    name: '5182-H19 (Al-Mg)',
    series: '5xxx',
    type: 'wrought',
    description: 'Can end alloy, high strength',
    composition: { Al: 95.2, Mg: 4.5, Mn: 0.35 },
    limits: { Cu_max: 0.15, Mg_min: 4.0, Mg_max: 5.0 },
    compatible_scrap: ['ubc', 'clean_sheet'],
    incompatible_scrap: ['2xxx_aerospace', 'tense', 'zorba'],
    eol_pathways: ['can_end', '5xxx', 'cast_general'],
    element_loss: { Mg: 0.15, Zn: 0.05, Cu: 0.01, Si: 0.02, Mn: 0.03 },
    applications: ['Can ends/lids', 'Automotive body panels'],
    recyclability_score: 90
  },
  {
    code: '5083',
    name: '5083-H116 (Al-Mg)',
    series: '5xxx',
    type: 'wrought',
    description: 'Highest strength non-heat-treatable, marine grade',
    composition: { Al: 94.8, Mg: 4.4, Mn: 0.7, Cr: 0.15 },
    limits: { Cu_max: 0.1, Mg_min: 4.0, Mg_max: 4.9 },
    compatible_scrap: ['clean_sheet', 'taint_tabor'],
    incompatible_scrap: ['2xxx_aerospace', 'tense', 'zorba', '7xxx_aerospace'],
    eol_pathways: ['5xxx', 'cast_general'],
    element_loss: { Mg: 0.15, Zn: 0.05, Cu: 0.01, Si: 0.02, Mn: 0.03 },
    applications: ['Ship hulls', 'LNG tanks', 'Rail cars'],
    recyclability_score: 85
  },

  // 6xxx Series - Magnesium-Silicon Alloys (Most Common)
  {
    code: '6061',
    name: '6061-T6 (Al-Mg-Si)',
    series: '6xxx',
    type: 'wrought',
    description: 'Most versatile alloy, good strength and weldability',
    composition: { Al: 97.5, Mg: 1.0, Si: 0.6, Cu: 0.25, Cr: 0.2 },
    limits: { Cu_max: 0.4, Mg_min: 0.8, Mg_max: 1.2, Si_min: 0.4, Si_max: 0.8 },
    compatible_scrap: ['6xxx_extrusion', 'taint_tabor', 'clean_sheet', 'twitch'],
    incompatible_scrap: ['2xxx_aerospace', 'tense', 'zorba', '7xxx_aerospace'],
    eol_pathways: ['6xxx', '3xx_cast', 'cast_general'],
    element_loss: { Mg: 0.12, Zn: 0.05, Cu: 0.01, Si: 0.02, Mn: 0.02 },
    applications: ['Structural components', 'Automotive', 'Bicycle frames', 'Marine'],
    recyclability_score: 92
  },
  {
    code: '6063',
    name: '6063-T5 (Al-Mg-Si)',
    series: '6xxx',
    type: 'wrought',
    description: 'Architectural alloy, excellent extrudability and finish',
    composition: { Al: 98.5, Mg: 0.7, Si: 0.4 },
    limits: { Cu_max: 0.1, Mg_min: 0.45, Mg_max: 0.9, Si_min: 0.2, Si_max: 0.6 },
    compatible_scrap: ['6xxx_extrusion', 'taint_tabor', 'clean_sheet'],
    incompatible_scrap: ['2xxx_aerospace', 'tense', 'zorba', '7xxx_aerospace'],
    eol_pathways: ['6xxx', '3xx_cast', 'cast_general'],
    element_loss: { Mg: 0.12, Zn: 0.05, Cu: 0.01, Si: 0.02, Mn: 0.02 },
    applications: ['Window frames', 'Door frames', 'Furniture', 'Railings'],
    recyclability_score: 95
  },
  {
    code: '6082',
    name: '6082-T6 (Al-Mg-Si)',
    series: '6xxx',
    type: 'wrought',
    description: 'Higher strength 6xxx, structural applications',
    composition: { Al: 97.0, Mg: 0.9, Si: 1.0, Mn: 0.5 },
    limits: { Cu_max: 0.1, Mg_min: 0.6, Mg_max: 1.2, Si_min: 0.7, Si_max: 1.3 },
    compatible_scrap: ['6xxx_extrusion', 'taint_tabor', 'clean_sheet'],
    incompatible_scrap: ['2xxx_aerospace', 'tense', 'zorba'],
    eol_pathways: ['6xxx', '3xx_cast'],
    element_loss: { Mg: 0.12, Zn: 0.05, Cu: 0.01, Si: 0.02, Mn: 0.03 },
    applications: ['Bridges', 'Cranes', 'Structural applications'],
    recyclability_score: 90
  },

  // 7xxx Series - Zinc Alloys (Aerospace)
  {
    code: '7075',
    name: '7075-T6 (Al-Zn)',
    series: '7xxx',
    type: 'wrought',
    description: 'Highest strength wrought alloy, aerospace grade',
    composition: { Al: 90.0, Zn: 5.6, Mg: 2.5, Cu: 1.6, Cr: 0.23 },
    limits: { Zn_max: 6.1, Cu_max: 2.0, Mg_min: 2.1, Mg_max: 2.9 },
    compatible_scrap: ['7xxx_aerospace'],
    incompatible_scrap: ['6xxx_extrusion', 'taint_tabor', 'ubc', 'clean_sheet', 'zorba'],
    eol_pathways: ['7xxx_closed_loop', 'cast_high_zn', 'downcycle_cast'],
    element_loss: { Mg: 0.12, Zn: 0.08, Cu: 0.01, Si: 0.02, Mn: 0.02 },
    applications: ['Aircraft structures', 'Rock climbing gear', 'High-stress parts'],
    recyclability_score: 60
  },
  {
    code: '7050',
    name: '7050-T7451 (Al-Zn)',
    series: '7xxx',
    type: 'wrought',
    description: 'Improved stress corrosion resistance',
    composition: { Al: 89.5, Zn: 6.2, Mg: 2.3, Cu: 2.0 },
    limits: { Zn_max: 6.7, Cu_max: 2.6, Mg_min: 1.9, Mg_max: 2.6 },
    compatible_scrap: ['7xxx_aerospace'],
    incompatible_scrap: ['6xxx_extrusion', 'taint_tabor', 'ubc', 'clean_sheet'],
    eol_pathways: ['7xxx_closed_loop', 'cast_high_zn'],
    element_loss: { Mg: 0.12, Zn: 0.08, Cu: 0.01, Si: 0.02, Mn: 0.02 },
    applications: ['Wing spars', 'Bulkheads', 'Thick aerospace sections'],
    recyclability_score: 58
  },

  // Cast Alloys
  {
    code: 'A356',
    name: 'A356.0 (Al-Si-Mg)',
    series: '3xx',
    type: 'cast',
    description: 'Premium casting alloy, excellent properties',
    composition: { Al: 92.0, Si: 7.0, Mg: 0.35, Fe: 0.2 },
    limits: { Cu_max: 0.2, Fe_max: 0.2, Mg_min: 0.25, Mg_max: 0.45 },
    compatible_scrap: ['wheels', 'cast_clean', '6xxx_extrusion', 'taint_tabor', 'clean_sheet'],
    incompatible_scrap: ['2xxx_aerospace', 'tense'],
    eol_pathways: ['wheel_closed_loop', '3xx_cast', 'cast_general'],
    element_loss: { Mg: 0.15, Zn: 0.05, Cu: 0.01, Si: 0.02, Mn: 0.02 },
    applications: ['Automotive wheels', 'Aerospace castings', 'Structural castings'],
    recyclability_score: 88
  },
  {
    code: 'A380',
    name: 'A380.0 (Al-Si-Cu)',
    series: '3xx',
    type: 'cast',
    description: 'Most common die casting alloy',
    composition: { Al: 85.0, Si: 8.5, Cu: 3.5, Fe: 1.0, Zn: 1.0 },
    limits: { Cu_max: 4.0, Fe_max: 1.3, Si_max: 9.5 },
    compatible_scrap: ['cast_clean', 'zorba', 'twitch', 'wheels', '6xxx_extrusion', 'taint_tabor'],
    incompatible_scrap: [],  // Very tolerant alloy
    eol_pathways: ['die_cast', 'cast_general'],
    element_loss: { Mg: 0.15, Zn: 0.06, Cu: 0.01, Si: 0.02, Mn: 0.02 },
    applications: ['Engine blocks', 'Transmission cases', 'Electronic housings'],
    recyclability_score: 95
  },
  {
    code: 'A319',
    name: 'A319.0 (Al-Si-Cu)',
    series: '3xx',
    type: 'cast',
    description: 'General purpose casting alloy',
    composition: { Al: 87.0, Si: 6.0, Cu: 3.5, Fe: 0.8 },
    limits: { Cu_max: 4.0, Fe_max: 1.0, Si_max: 7.0 },
    compatible_scrap: ['cast_clean', 'zorba', 'twitch', 'wheels'],
    incompatible_scrap: [],
    eol_pathways: ['engine_castings', 'cast_general'],
    element_loss: { Mg: 0.15, Zn: 0.06, Cu: 0.01, Si: 0.02, Mn: 0.02 },
    applications: ['Engine blocks', 'Cylinder heads', 'Intake manifolds'],
    recyclability_score: 92
  },
]

// Helper functions
export function getAlloyBySeries(series: string): AlloyData[] {
  return ALLOY_DATABASE.filter(alloy => alloy.series === series)
}

export function getAlloyByCode(code: string): AlloyData | undefined {
  return ALLOY_DATABASE.find(alloy =>
    alloy.code.toLowerCase() === code.toLowerCase() ||
    alloy.name.toLowerCase().includes(code.toLowerCase())
  )
}

export function detectAlloyFromName(materialName: string): AlloyData | undefined {
  const name = materialName.toLowerCase()

  // Check for specific alloy codes
  for (const alloy of ALLOY_DATABASE) {
    if (name.includes(alloy.code.toLowerCase())) {
      return alloy
    }
  }

  // Check for series patterns
  const seriesPatterns = [
    { pattern: /\b1\d{3}\b/, series: '1xxx' },
    { pattern: /\b2\d{3}\b/, series: '2xxx' },
    { pattern: /\b3\d{3}\b/, series: '3xxx' },
    { pattern: /\b5\d{3}\b/, series: '5xxx' },
    { pattern: /\b6\d{3}\b/, series: '6xxx' },
    { pattern: /\b7\d{3}\b/, series: '7xxx' },
    { pattern: /a3\d{2}/i, series: '3xx' },  // Cast alloys like A356
  ]

  for (const { pattern, series } of seriesPatterns) {
    if (pattern.test(name)) {
      const seriesAlloys = getAlloyBySeries(series)
      return seriesAlloys[0]  // Return first alloy of that series as default
    }
  }

  // Check for generic aluminium
  if (name.includes('alumin') || name.includes('aluminum')) {
    return getAlloyByCode('6061')  // Default to 6061 for generic aluminium
  }

  return undefined
}

export function getScrapGradeById(id: string): ScrapGrade | undefined {
  return SCRAP_GRADES.find(scrap => scrap.id === id)
}

export function calculateElementBalance(
  alloy: AlloyData,
  recycledPercent: number
): { element: string; current: number; required: number; status: 'ok' | 'low' | 'high' | 'watch' }[] {
  const results: { element: string; current: number; required: number; status: 'ok' | 'low' | 'high' | 'watch' }[] = []

  // Calculate expected element levels after recycling
  const mgLoss = alloy.element_loss.Mg * (recycledPercent / 100)
  const currentMg = (alloy.composition.Mg || 0) * (1 - mgLoss)
  const requiredMg = alloy.limits.Mg_min || 0

  results.push({
    element: 'Mg',
    current: currentMg,
    required: requiredMg,
    status: currentMg < requiredMg ? 'low' : 'ok'
  })

  // Iron typically accumulates
  const currentFe = (alloy.composition.Fe || 0) * (1 + 0.05 * (recycledPercent / 100))
  const maxFe = alloy.limits.Fe_max || 0.7

  results.push({
    element: 'Fe',
    current: currentFe,
    required: maxFe,
    status: currentFe > maxFe * 0.9 ? 'watch' : 'ok'
  })

  // Copper check
  const currentCu = alloy.composition.Cu || 0
  const maxCu = alloy.limits.Cu_max || 0.4

  results.push({
    element: 'Cu',
    current: currentCu,
    required: maxCu,
    status: currentCu > maxCu * 0.8 ? 'watch' : 'ok'
  })

  return results
}

// Series descriptions for UI
export const SERIES_INFO: Record<string, { name: string; description: string; color: string }> = {
  '1xxx': { name: 'Pure Aluminium', description: '99%+ Al, excellent conductivity', color: 'gray' },
  '2xxx': { name: 'Al-Copper', description: 'High strength, aerospace', color: 'orange' },
  '3xxx': { name: 'Al-Manganese', description: 'Good formability, cans', color: 'blue' },
  '5xxx': { name: 'Al-Magnesium', description: 'Marine grade, weldable', color: 'cyan' },
  '6xxx': { name: 'Al-Mg-Si', description: 'Most versatile, extrusions', color: 'green' },
  '7xxx': { name: 'Al-Zinc', description: 'Highest strength, aerospace', color: 'purple' },
  '3xx': { name: 'Cast Al-Si', description: 'Casting alloys', color: 'amber' },
}

