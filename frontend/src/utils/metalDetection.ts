// Utility to detect metal type from project description
export type MetalType = 'aluminum' | 'copper' | 'lead' | 'steel' | 'zinc'

// Grade information for each metal
export interface MetalGrade {
  grade: string
  modifier: number // GWP modifier (1.0 = baseline)
  description: string
}

// Detection result with grade info
export interface MetalDetectionResult {
  metalType: MetalType
  grade?: MetalGrade
  route?: 'primary' | 'eaf' | 'pyrometallurgical' | 'hydrometallurgical' // For steel/copper routes
}

// Grade definitions
export const METAL_GRADES: Record<MetalType, MetalGrade[]> = {
  aluminum: [
    { grade: '6061', modifier: 1.0, description: 'General purpose, structural' },
    { grade: '6063', modifier: 0.95, description: 'Architectural, extrusions' },
    { grade: '7075', modifier: 1.15, description: 'Aerospace, high-strength' },
    { grade: '5052', modifier: 0.98, description: 'Marine grade' },
    { grade: '2024', modifier: 1.1, description: 'Aircraft structures' },
  ],
  copper: [
    { grade: 'C110', modifier: 1.0, description: 'ETP, high conductivity' },
    { grade: 'C122', modifier: 1.05, description: 'DHP, plumbing' },
    { grade: 'brass', modifier: 0.85, description: 'Cu-Zn alloy' },
    { grade: 'bronze', modifier: 0.9, description: 'Cu-Sn alloy' },
  ],
  steel: [
    { grade: 'mild', modifier: 1.0, description: 'Low carbon <0.3%' },
    { grade: 'carbon', modifier: 1.05, description: 'Medium carbon' },
    { grade: '304', modifier: 2.25, description: 'Stainless austenitic' },
    { grade: '316', modifier: 2.6, description: 'Stainless marine grade' },
    { grade: '4140', modifier: 1.2, description: 'Alloy steel' },
  ],
  lead: [
    { grade: 'pure', modifier: 1.0, description: '99.9% pure lead' },
    { grade: 'antimonial', modifier: 1.05, description: 'Lead-antimony alloy' },
  ],
  zinc: [
    { grade: 'SHG', modifier: 1.0, description: 'Special High Grade 99.995%' },
    { grade: 'galvanized', modifier: 0.9, description: 'Zinc coating' },
  ],
}

export function detectMetalType(description: string | undefined): MetalType {
  if (!description) return 'aluminum'
  const result = detectMetalWithGrade(description)
  return result.metalType
}

export function detectMetalWithGrade(description: string | undefined): MetalDetectionResult {
  if (!description) return { metalType: 'aluminum' }

  const lowerDesc = description.toLowerCase()

  // Steel keywords (check first as it's common)
  const steelKeywords = ['steel', 'iron', 'stainless', 'ss304', 'ss316', 'ss 304', 'ss 316', 'mild steel', 'carbon steel', 'alloy steel', 'galvanized steel']
  const hasSteel = steelKeywords.some(keyword => lowerDesc.includes(keyword))
  if (hasSteel) {
    const route = lowerDesc.includes('eaf') || lowerDesc.includes('electric arc') ? 'eaf' : 'primary'
    // Check for stainless grades
    if (lowerDesc.includes('316') || lowerDesc.includes('ss316')) {
      return { metalType: 'steel', grade: METAL_GRADES.steel.find(g => g.grade === '316'), route }
    }
    if (lowerDesc.includes('304') || lowerDesc.includes('ss304') || lowerDesc.includes('stainless')) {
      return { metalType: 'steel', grade: METAL_GRADES.steel.find(g => g.grade === '304'), route }
    }
    if (lowerDesc.includes('4140')) {
      return { metalType: 'steel', grade: METAL_GRADES.steel.find(g => g.grade === '4140'), route }
    }
    return { metalType: 'steel', grade: METAL_GRADES.steel.find(g => g.grade === 'mild'), route }
  }

  // Copper keywords (including alloys)
  const copperKeywords = ['copper', 'cu', 'c110', 'c122', 'brass', 'bronze', 'beryllium copper']
  const hasCopper = copperKeywords.some(keyword => lowerDesc.includes(keyword))
  if (hasCopper) {
    const route = lowerDesc.includes('sx/ew') || lowerDesc.includes('electrowinning') ? 'hydrometallurgical' : 'pyrometallurgical'
    if (lowerDesc.includes('brass')) {
      return { metalType: 'copper', grade: METAL_GRADES.copper.find(g => g.grade === 'brass'), route }
    }
    if (lowerDesc.includes('bronze')) {
      return { metalType: 'copper', grade: METAL_GRADES.copper.find(g => g.grade === 'bronze'), route }
    }
    if (lowerDesc.includes('c122')) {
      return { metalType: 'copper', grade: METAL_GRADES.copper.find(g => g.grade === 'C122'), route }
    }
    return { metalType: 'copper', grade: METAL_GRADES.copper.find(g => g.grade === 'C110'), route }
  }

  // Lead keywords
  const leadKeywords = ['lead', 'pb', 'lead-acid', 'lead acid', 'battery lead', 'lead oxide']
  const hasLead = leadKeywords.some(keyword => lowerDesc.includes(keyword))
  if (hasLead) return { metalType: 'lead' }

  // Zinc keywords
  const zincKeywords = ['zinc', 'zn', 'galvanized', 'galvanised', 'hot-dip', 'zinc coating', 'die cast zinc']
  const hasZinc = zincKeywords.some(keyword => lowerDesc.includes(keyword))
  if (hasZinc) {
    if (lowerDesc.includes('galvanized') || lowerDesc.includes('galvanised')) {
      return { metalType: 'zinc', grade: METAL_GRADES.zinc.find(g => g.grade === 'galvanized') }
    }
    return { metalType: 'zinc', grade: METAL_GRADES.zinc.find(g => g.grade === 'SHG') }
  }

  // Aluminum - default metal, check for specific grades
  // Check aluminum grades
  if (lowerDesc.includes('7075')) {
    return { metalType: 'aluminum', grade: METAL_GRADES.aluminum.find(g => g.grade === '7075') }
  }
  if (lowerDesc.includes('6063')) {
    return { metalType: 'aluminum', grade: METAL_GRADES.aluminum.find(g => g.grade === '6063') }
  }
  if (lowerDesc.includes('6061')) {
    return { metalType: 'aluminum', grade: METAL_GRADES.aluminum.find(g => g.grade === '6061') }
  }
  if (lowerDesc.includes('5052')) {
    return { metalType: 'aluminum', grade: METAL_GRADES.aluminum.find(g => g.grade === '5052') }
  }
  if (lowerDesc.includes('2024')) {
    return { metalType: 'aluminum', grade: METAL_GRADES.aluminum.find(g => g.grade === '2024') }
  }

  // Default to aluminum
  return { metalType: 'aluminum' }
}

// Lead-specific lifecycle data
export const LEAD_LIFECYCLE_DATA = {
  stages: {
    mining: {
      name: 'Mining & Extraction',
      emoji: '⛏️',
      description: 'Lead is primarily mined from Galena (PbS) ore containing lead, sulfur, zinc, and silver',
      gwpContribution: 10,
      processes: [
        'Ore extraction from Galena deposits',
        'Crushing and grinding into fine powder',
        'Froth flotation separation',
        'Lead concentrate production (50-70% lead)'
      ],
      wasteStreams: [
        { name: 'Mine Tailings', quantity: '~180 tonnes', composition: 'Fine particles, residual metals, gangue' },
        { name: 'Waste Rock', quantity: '~150 tonnes', composition: 'Low-grade ore, gangue material' }
      ]
    },
    beneficiation: {
      name: 'Beneficiation',
      emoji: '🔬',
      description: 'Concentration process to separate lead-bearing minerals from waste rock',
      gwpContribution: 8,
      processes: [
        'Froth flotation concentration',
        'Gravity separation',
        'Magnetic separation',
        'Produce lead concentrate (60-70% Pb)'
      ],
      wasteStreams: [
        { name: 'Flotation Tailings', quantity: '~120 tonnes', composition: 'Mineral fines, process chemicals, water' },
        { name: 'Filter Cake', quantity: '~70 tonnes', composition: 'Concentrated minerals, moisture' }
      ]
    },
    refining: {
      name: 'Sintering',
      emoji: '🔥',
      description: 'Heating lead concentrate to remove sulfur, producing lead oxide',
      gwpContribution: 15,
      processes: [
        'Sintering of lead concentrate',
        'Sulfur removal (converted to SO₂)',
        'SO₂ capture for sulfuric acid production',
        'Lead oxide production'
      ],
      wasteStreams: [
        { name: 'Sintering Dust', quantity: '~90 tonnes', composition: 'Fine particulates, metal oxides' },
        { name: 'Sulfur Dioxide', quantity: '~60 tonnes', composition: 'SO₂ gas (captured for H₂SO₄)' }
      ]
    },
    smelting: {
      name: 'Blast Furnace Smelting',
      emoji: '🏭',
      description: 'Reduction of lead oxide to molten lead bullion using blast furnace with coke',
      gwpContribution: 35,
      processes: [
        'Blast furnace operation with coke fuel',
        'Chemical reduction: PbO + C → Pb + CO',
        'Limestone flux addition',
        'Molten lead bullion production'
      ],
      wasteStreams: [
        { name: 'Blast Furnace Slag', quantity: '~200 tonnes', composition: 'Silicates, calcium compounds, impurities' },
        { name: 'Furnace Dust', quantity: '~45 tonnes', composition: 'Lead particulates, zinc, carbon' }
      ]
    },
    casting: {
      name: 'Refining',
      emoji: '⚗️',
      description: 'Purification of lead bullion to 99.97-99.99% purity, recovery of by-products',
      gwpContribution: 12,
      processes: [
        'Kettle refining for impurity removal',
        'Copper drossing',
        'Antimony and arsenic removal',
        'Parkes process for silver recovery'
      ],
      wasteStreams: [
        { name: 'Refining Dross', quantity: '~80 tonnes', composition: 'Copper, antimony, arsenic, other impurities' },
        { name: 'Silver-Gold Residue', quantity: '~5 tonnes', composition: 'Precious metals (recovered as by-product)' }
      ]
    },
    fabrication: {
      name: 'Manufacturing',
      emoji: '🔧',
      description: 'Refined lead alloyed and manufactured into final products',
      gwpContribution: 10,
      processes: [
        'Lead-acid battery grid production',
        'Lead oxide paste manufacturing',
        'Radiation shielding fabrication',
        'Ammunition and cable sheathing'
      ],
      wasteStreams: [
        { name: 'Manufacturing Scrap', quantity: '~60 tonnes', composition: 'Lead trimmings, defective parts' },
        { name: 'Lead Oxide Dust', quantity: '~25 tonnes', composition: 'Fine lead oxide particles' }
      ]
    },
    recycle: {
      name: 'Battery Recycling',
      emoji: '♻️',
      description: 'End-of-life collection and secondary smelting (~99% recovery rate for batteries)',
      gwpContribution: 10,
      processes: [
        'Battery collection (99% recovery rate)',
        'Battery breaking and component separation',
        'Desulfurization of lead paste',
        'Secondary smelting (35-40% less energy than primary)'
      ],
      wasteStreams: [
        { name: 'Plastic Cases', quantity: '~40 tonnes', composition: 'Polypropylene (recycled)' },
        { name: 'Battery Acid', quantity: '~35 tonnes', composition: 'Sulfuric acid (neutralized or reused)' }
      ]
    }
  },
  energyBreakdown: {
    mining: 0.5,
    beneficiation: 0.4,
    sintering: 1.2,
    smelting: 2.5,
    refining: 0.8,
    manufacturing: 0.6,
    recycling: 1.5
  },
  totalEnergy: 7.5,
  gridGWP: 6.15, // kWh * 0.82 kg CO₂/kWh
  recyclingBenefit: 'Recycling lead requires 35-40% less energy than primary production and achieves nearly 100% material recovery',
  circularityNote: 'Lead operates as a nearly perfect Cradle-to-Cradle loop with 50%+ of global supply from recycled sources'
}

// Aluminum-specific lifecycle data (existing default)
export const ALUMINUM_LIFECYCLE_DATA = {
  stages: {
    mining: {
      name: 'Mining',
      emoji: '⛏️',
      description: 'Extraction of raw ores from the earth through open-pit or underground mining',
      gwpContribution: 8,
      processes: [
        'Open-pit or underground mining',
        'Blasting and excavation',
        'Ore transportation',
        'Primary crushing'
      ],
      wasteStreams: [
        { name: 'Overburden', quantity: '~200 tonnes', composition: 'Topsoil, waste rock, vegetation' },
        { name: 'Mine Tailings', quantity: '~180 tonnes', composition: 'Fine particles, residual metals' }
      ]
    },
    beneficiation: {
      name: 'Beneficiation',
      emoji: '🔬',
      description: 'Processing to separate valuable minerals from gangue (unwanted material)',
      gwpContribution: 8,
      processes: [
        'Crushing and grinding',
        'Froth flotation',
        'Magnetic separation',
        'Concentration'
      ],
      wasteStreams: [
        { name: 'Flotation Tailings', quantity: '~150 tonnes', composition: 'Mineral fines, chemicals, water' },
        { name: 'Filter Cake', quantity: '~80 tonnes', composition: 'Concentrated minerals, moisture' }
      ]
    },
    refining: {
      name: 'Refining',
      emoji: '⚗️',
      description: 'Purification of metals through chemical or electrolytic processes',
      gwpContribution: 18,
      processes: [
        'Chemical leaching',
        'Electrolytic refining',
        'Impurity removal',
        'Quality control testing'
      ],
      wasteStreams: [
        { name: 'Slag & Dross', quantity: '~120 tonnes', composition: 'Metal oxides, impurities' },
        { name: 'Acid Waste', quantity: '~50 tonnes', composition: 'Spent acids, metal salts' }
      ]
    },
    smelting: {
      name: 'Smelting',
      emoji: '🔥',
      description: 'High-temperature extraction of metals from concentrated ores',
      gwpContribution: 45,
      processes: [
        'Blast furnace operations',
        'Electric arc furnace (EAF)',
        'Reduction of metal oxides',
        'Flux addition for impurity removal'
      ],
      wasteStreams: [
        { name: 'Furnace Slag', quantity: '~180 tonnes', composition: 'Silicates, metal oxides' },
        { name: 'Dust & Fumes', quantity: '~40 tonnes', composition: 'Fine metal particles, carbon' }
      ]
    },
    casting: {
      name: 'Casting',
      emoji: '🏗️',
      description: 'Shaping molten metal into desired forms (ingots, billets, shapes)',
      gwpContribution: 8,
      processes: [
        'Mold preparation',
        'Pouring molten metal',
        'Cooling and solidification',
        'Demolding and finishing'
      ],
      wasteStreams: [
        { name: 'Used Sand Molds', quantity: '~220 tonnes', composition: 'Silica sand, binders, metal traces' },
        { name: 'Metal Scraps', quantity: '~90 tonnes', composition: 'Runners, risers, defective castings' }
      ]
    },
    fabrication: {
      name: 'Fabrication',
      emoji: '🔧',
      description: 'Machining and forming of metal components into final products',
      gwpContribution: 7,
      processes: [
        'Cutting and machining',
        'Forming and bending',
        'Joining (welding, riveting)',
        'Surface treatment'
      ],
      wasteStreams: [
        { name: 'Metal Shavings & Chips', quantity: '~100 tonnes', composition: 'Various metal alloys' },
        { name: 'Cutting Fluid Waste', quantity: '~30 tonnes', composition: 'Used coolants, oils, metal particles' }
      ]
    },
    recycle: {
      name: 'Recycle',
      emoji: '♻️',
      description: 'End-of-life processing and material recovery for circular economy',
      gwpContribution: 7,
      processes: [
        'Collection and sorting',
        'Shredding and separation',
        'Melting and purification',
        'Return to production cycle'
      ],
      wasteStreams: [
        { name: 'Non-Recyclable Fraction', quantity: '~60 tonnes', composition: 'Mixed contaminants, composites' },
        { name: 'Process Residue', quantity: '~25 tonnes', composition: 'Cleaning agents, coatings' }
      ]
    }
  },
  energyBreakdown: {
    mining: 0,
    beneficiation: 0,
    refining: 0,
    smelting: 0.8,
    casting: 0,
    fabrication: 0,
    recycling: 0
  },
  totalEnergy: 0.8,
  gridGWP: 0.66,
  recyclingBenefit: 'Recycling aluminum saves 95% energy compared to primary production',
  circularityNote: 'Recycled aluminum bypasses Mining → Smelting stages, saving energy and reducing CO₂',
  scrapEntryPoint: 'smelting' // Scrap enters at smelting stage
}

// Copper-specific lifecycle data (Pyrometallurgical Route)
export const COPPER_LIFECYCLE_DATA = {
  stages: {
    mining: {
      name: 'Mining',
      emoji: '⛏️',
      description: 'Copper is mined from chalcopyrite and other sulfide ores via open-pit or underground mining',
      gwpContribution: 12,
      processes: [
        'Open-pit or underground mining',
        'Blasting and excavation',
        'Ore transportation to concentrator',
        'Primary crushing'
      ],
      wasteStreams: [
        { name: 'Overburden', quantity: '~250 tonnes', composition: 'Waste rock, topsoil' },
        { name: 'Mine Tailings', quantity: '~200 tonnes', composition: 'Fine particles, low-grade ore' }
      ]
    },
    beneficiation: {
      name: 'Beneficiation (Flotation)',
      emoji: '🔬',
      description: 'Froth flotation to concentrate copper minerals from 0.5-2% to 25-35% copper',
      gwpContribution: 15,
      processes: [
        'Crushing and grinding to liberate minerals',
        'Froth flotation separation',
        'Copper concentrate production (25-35% Cu)',
        'Thickening and filtering'
      ],
      wasteStreams: [
        { name: 'Flotation Tailings', quantity: '~180 tonnes', composition: 'Silicates, pyrite, gangue' },
        { name: 'Process Water', quantity: '~50m³', composition: 'Flotation chemicals, fine particles' }
      ]
    },
    refining: {
      name: 'Smelting (Matte)',
      emoji: '🔥',
      description: 'Flash or bath smelting to produce copper matte (45-75% Cu)',
      gwpContribution: 25,
      processes: [
        'Flash smelting or bath smelting',
        'Copper matte production (45-75% Cu)',
        'Slag separation and disposal',
        'SO₂ capture for sulfuric acid'
      ],
      wasteStreams: [
        { name: 'Smelter Slag', quantity: '~150 tonnes', composition: 'Iron silicates, copper traces' },
        { name: 'Sulfur Dioxide (SO₂)', quantity: '~80 tonnes', composition: 'Captured for H₂SO₄ production' }
      ],
      so2Emission: 0.8 // kg SO2 per kg copper (acidification)
    },
    smelting: {
      name: 'Converting',
      emoji: '🏭',
      description: 'Peirce-Smith converters to produce blister copper (98-99% Cu)',
      gwpContribution: 20,
      processes: [
        'Peirce-Smith converting',
        'Oxygen blowing to remove iron/sulfur',
        'Blister copper production (98-99% Cu)',
        'Converter slag recycling'
      ],
      wasteStreams: [
        { name: 'Converter Slag', quantity: '~100 tonnes', composition: 'Copper oxides, silicates (recycled)' },
        { name: 'SO₂ Gases', quantity: '~40 tonnes', composition: 'Sulfur dioxide (captured)' }
      ],
      scrapEntry: true // High-grade scrap can enter here
    },
    casting: {
      name: 'Electrolytic Refining',
      emoji: '⚡',
      description: 'Electrorefining to produce 99.99% pure copper cathodes',
      gwpContribution: 12,
      processes: [
        'Anode casting from blister copper',
        'Electrolytic refining cells',
        'Cathode production (99.99% Cu)',
        'Precious metals recovery (anode slimes)'
      ],
      wasteStreams: [
        { name: 'Anode Slimes', quantity: '~5 tonnes', composition: 'Gold, silver, selenium, tellurium' },
        { name: 'Spent Electrolyte', quantity: '~20m³', composition: 'Copper sulfate, impurities' }
      ]
    },
    fabrication: {
      name: 'Fabrication',
      emoji: '🔧',
      description: 'Processing cathodes into wire rod, tubes, sheets, and alloys',
      gwpContribution: 8,
      processes: [
        'Melting and continuous casting',
        'Wire drawing and rod production',
        'Tube and sheet manufacturing',
        'Alloying (brass, bronze)'
      ],
      wasteStreams: [
        { name: 'Metal Scrap', quantity: '~80 tonnes', composition: 'Copper turnings, off-cuts (recycled)' },
        { name: 'Scale and Oxide', quantity: '~15 tonnes', composition: 'Copper oxide (recycled)' }
      ]
    },
    recycle: {
      name: 'Recycling',
      emoji: '♻️',
      description: 'Copper is 100% recyclable without quality loss - high recycling rates globally',
      gwpContribution: 8,
      processes: [
        'Scrap collection and sorting by grade',
        'High-grade scrap → direct melt',
        'Low-grade scrap → secondary smelting',
        'Alloy separation and reprocessing'
      ],
      wasteStreams: [
        { name: 'Non-metallic Residue', quantity: '~20 tonnes', composition: 'Insulation, coatings' },
        { name: 'Slag', quantity: '~30 tonnes', composition: 'Oxides, impurities' }
      ]
    }
  },
  circularFlow: {
    scrapEntryPoints: ['smelting', 'casting'], // High-grade → refining, low-grade → converting
    recyclability: 100,
    globalRecycledContent: 35
  },
  totalGWP: 4.1,
  recyclingBenefit: 'Recycling copper saves 85% energy compared to primary production',
  circularityNote: 'Copper is 100% recyclable - high-grade scrap goes direct to refining, low-grade to converting'
}

// Steel-specific lifecycle data (BF-BOF vs EAF routes)
export const STEEL_LIFECYCLE_DATA = {
  routes: {
    'bf-bof': {
      name: 'Blast Furnace - Basic Oxygen Furnace',
      gwpTotal: 2.2,
      maxScrapInput: 25, // Can only use 15-25% scrap
      stages: {
        mining: {
          name: 'Iron Ore Mining',
          emoji: '⛏️',
          description: 'Mining iron ore (hematite, magnetite) and coking coal',
          gwpContribution: 5,
          processes: ['Iron ore mining', 'Coal mining for coke', 'Limestone quarrying', 'Ore beneficiation'],
          wasteStreams: [
            { name: 'Overburden', quantity: '~300 tonnes', composition: 'Waste rock' },
            { name: 'Tailings', quantity: '~200 tonnes', composition: 'Fine ore waste' }
          ]
        },
        beneficiation: {
          name: 'Coking & Sintering',
          emoji: '🔥',
          description: 'Converting coal to coke and preparing iron ore sinter',
          gwpContribution: 15,
          processes: ['Coke oven operation', 'Sintering of iron ore fines', 'Pelletizing', 'By-product recovery'],
          wasteStreams: [
            { name: 'Coke Oven Gas', quantity: '~50 tonnes', composition: 'CO, H₂, CH₄ (captured for energy)' },
            { name: 'Sinter Dust', quantity: '~30 tonnes', composition: 'Iron oxides, fluxes' }
          ]
        },
        refining: {
          name: 'Blast Furnace',
          emoji: '🏭',
          description: 'Reduction of iron ore to molten pig iron using coke',
          gwpContribution: 45,
          processes: ['Charging (ore, coke, limestone)', 'Hot blast injection', 'Pig iron tapping', 'Slag removal'],
          wasteStreams: [
            { name: 'Blast Furnace Slag', quantity: '~280 tonnes', composition: 'Silicates, calcium (used in cement)' },
            { name: 'BF Gas', quantity: '~100 tonnes', composition: 'CO₂, CO, N₂ (captured for energy)' }
          ],
          scrapEntry: true // Up to 25% scrap can be added
        },
        smelting: {
          name: 'Basic Oxygen Furnace',
          emoji: '⚗️',
          description: 'Refining pig iron to steel by blowing oxygen',
          gwpContribution: 20,
          processes: ['Oxygen blowing', 'Carbon removal', 'Alloying additions', 'Temperature control'],
          wasteStreams: [
            { name: 'BOF Slag', quantity: '~120 tonnes', composition: 'Cite, calcium oxides' },
            { name: 'BOF Dust', quantity: '~25 tonnes', composition: 'Iron oxides, zinc' }
          ]
        },
        casting: {
          name: 'Continuous Casting',
          emoji: '🏗️',
          description: 'Casting molten steel into slabs, blooms, or billets',
          gwpContribution: 8,
          processes: ['Tundish operation', 'Continuous casting', 'Cutting', 'Surface inspection'],
          wasteStreams: [
            { name: 'Scale', quantity: '~40 tonnes', composition: 'Iron oxide (recycled)' },
            { name: 'Crop Ends', quantity: '~30 tonnes', composition: 'Steel (recycled)' }
          ]
        },
        fabrication: {
          name: 'Rolling & Fabrication',
          emoji: '🔧',
          description: 'Hot/cold rolling, forming, and finishing',
          gwpContribution: 5,
          processes: ['Hot rolling', 'Cold rolling', 'Heat treatment', 'Surface coating'],
          wasteStreams: [
            { name: 'Mill Scale', quantity: '~50 tonnes', composition: 'Iron oxide (recycled)' },
            { name: 'Trim Scrap', quantity: '~60 tonnes', composition: 'Steel (recycled)' }
          ]
        },
        recycle: {
          name: 'End-of-Life Recycling',
          emoji: '♻️',
          description: 'Steel scrap collection - feeds back to BF (limited) or EAF',
          gwpContribution: 2,
          processes: ['Scrap collection', 'Shredding', 'Magnetic separation', 'Baling'],
          wasteStreams: [
            { name: 'Shredder Residue', quantity: '~40 tonnes', composition: 'Non-ferrous, plastics' }
          ]
        }
      }
    },
    'eaf': {
      name: 'Electric Arc Furnace',
      gwpTotal: 0.5,
      maxScrapInput: 100, // Can use 100% scrap - circular economy champion!
      stages: {
        mining: {
          name: 'Scrap Collection',
          emoji: '♻️',
          description: 'Collecting and sorting steel scrap - bypasses mining!',
          gwpContribution: 5,
          processes: ['Scrap collection', 'Sorting by grade', 'Shredding', 'Baling'],
          wasteStreams: [
            { name: 'Non-ferrous Metals', quantity: '~20 tonnes', composition: 'Copper, aluminum (separated)' },
            { name: 'Shredder Residue', quantity: '~30 tonnes', composition: 'Plastics, rubber' }
          ]
        },
        beneficiation: {
          name: 'Scrap Preparation',
          emoji: '🔬',
          description: 'Processing and preparing scrap for melting',
          gwpContribution: 5,
          processes: ['Magnetic separation', 'Size reduction', 'Quality sorting', 'Pre-heating (optional)'],
          wasteStreams: [
            { name: 'Contaminants', quantity: '~15 tonnes', composition: 'Paint, coatings' }
          ]
        },
        refining: {
          name: 'Electric Arc Furnace',
          emoji: '⚡',
          description: 'Melting scrap with electric arcs - 75% less CO₂ than BF!',
          gwpContribution: 60,
          processes: ['Scrap charging', 'Electric arc melting', 'Oxygen lancing', 'Slag formation'],
          wasteStreams: [
            { name: 'EAF Dust', quantity: '~15 tonnes', composition: 'Zinc, iron oxides' },
            { name: 'EAF Slag', quantity: '~100 tonnes', composition: 'Calcium silicates (used in roads)' }
          ]
        },
        smelting: {
          name: 'Ladle Refining',
          emoji: '🔥',
          description: 'Secondary refining for precise alloy composition',
          gwpContribution: 15,
          processes: ['Ladle heating', 'Alloying', 'Desulfurization', 'Temperature adjustment'],
          wasteStreams: [
            { name: 'Ladle Slag', quantity: '~30 tonnes', composition: 'Lime-based' }
          ]
        },
        casting: {
          name: 'Continuous Casting',
          emoji: '🏗️',
          description: 'Casting molten steel into semi-finished products',
          gwpContribution: 8,
          processes: ['Tundish operation', 'Continuous casting', 'Cutting', 'Marking'],
          wasteStreams: [
            { name: 'Scale', quantity: '~35 tonnes', composition: 'Iron oxide (recycled)' }
          ]
        },
        fabrication: {
          name: 'Rolling & Fabrication',
          emoji: '🔧',
          description: 'Processing into final steel products',
          gwpContribution: 5,
          processes: ['Hot rolling', 'Cold rolling', 'Heat treatment', 'Coating'],
          wasteStreams: [
            { name: 'Mill Scrap', quantity: '~50 tonnes', composition: 'Steel (recycled internally)' }
          ]
        },
        recycle: {
          name: 'Infinite Recyclability',
          emoji: '♻️',
          description: 'Steel is 100% recyclable - EAF creates a perfect circular loop!',
          gwpContribution: 2,
          processes: ['Collection', 'Processing', 'Return to EAF', 'Infinite cycles'],
          wasteStreams: []
        }
      }
    }
  },
  circularityNote: 'Steel EAF route achieves 75% less CO₂ than BF-BOF and can use 100% scrap - the circular economy champion!',
  recyclingBenefit: 'Recycling steel saves 74% energy and 90% raw materials'
}

// Zinc-specific lifecycle data (Roast-Leach-Electrowin)
export const ZINC_LIFECYCLE_DATA = {
  stages: {
    mining: {
      name: 'Mining',
      emoji: '⛏️',
      description: 'Zinc is mined primarily from zinc blende (sphalerite, ZnS)',
      gwpContribution: 8,
      processes: [
        'Underground or open-pit mining',
        'Ore extraction and transportation',
        'Primary crushing',
        'Stockpiling'
      ],
      wasteStreams: [
        { name: 'Overburden', quantity: '~180 tonnes', composition: 'Waste rock' },
        { name: 'Mine Water', quantity: '~40m³', composition: 'Heavy metals, sediments' }
      ]
    },
    beneficiation: {
      name: 'Beneficiation',
      emoji: '🔬',
      description: 'Concentration of zinc minerals through flotation',
      gwpContribution: 10,
      processes: [
        'Crushing and grinding',
        'Froth flotation',
        'Lead-zinc separation',
        'Concentrate dewatering'
      ],
      wasteStreams: [
        { name: 'Tailings', quantity: '~150 tonnes', composition: 'Silicates, pyrite' },
        { name: 'Process Water', quantity: '~30m³', composition: 'Flotation reagents' }
      ]
    },
    refining: {
      name: 'Roasting',
      emoji: '🔥',
      description: 'Converting zinc sulfide to zinc oxide, releasing SO₂',
      gwpContribution: 18,
      processes: [
        'Fluid bed roasting',
        'Zinc oxide formation (ZnS → ZnO)',
        'SO₂ capture for sulfuric acid',
        'Calcine production'
      ],
      wasteStreams: [
        { name: 'Roaster Dust', quantity: '~40 tonnes', composition: 'Zinc oxides, cadmium' },
        { name: 'Sulfur Dioxide', quantity: '~60 tonnes', composition: 'SO₂ (captured for H₂SO₄)' }
      ],
      so2Emission: 1.2 // kg SO2 per kg zinc - significant acidification!
    },
    smelting: {
      name: 'Leaching & Purification',
      emoji: '⚗️',
      description: 'Dissolving zinc oxide in sulfuric acid and purifying',
      gwpContribution: 20,
      processes: [
        'Neutral and acid leaching',
        'Iron removal (jarosite/goethite)',
        'Zinc dust purification',
        'Solution clarification'
      ],
      wasteStreams: [
        { name: 'Iron Residue', quantity: '~80 tonnes', composition: 'Jarosite, goethite' },
        { name: 'Purification Residue', quantity: '~20 tonnes', composition: 'Copper, cadmium (recovered)' }
      ]
    },
    casting: {
      name: 'Electrolysis',
      emoji: '⚡',
      description: 'Electrowinning to produce 99.995% pure zinc cathodes',
      gwpContribution: 30,
      processes: [
        'Electrolysis cells operation',
        'Zinc deposition on aluminum cathodes',
        'Cathode stripping',
        'Spent electrolyte recycling'
      ],
      wasteStreams: [
        { name: 'Lead Anodes', quantity: '~5 tonnes', composition: 'Worn anodes (recycled)' },
        { name: 'Cell Sludge', quantity: '~10 tonnes', composition: 'MnO₂, impurities' }
      ]
    },
    fabrication: {
      name: 'Melting & Casting',
      emoji: '🔧',
      description: 'Melting cathodes and casting into zinc products',
      gwpContribution: 8,
      processes: [
        'Cathode melting',
        'Alloying for die casting',
        'Continuous casting',
        'Slab/ingot production'
      ],
      wasteStreams: [
        { name: 'Zinc Dross', quantity: '~25 tonnes', composition: 'Zinc oxide, impurities (recycled)' },
        { name: 'Skimmings', quantity: '~15 tonnes', composition: 'Surface oxides' }
      ]
    },
    recycle: {
      name: 'Secondary Recycling',
      emoji: '♻️',
      description: 'Recycling galvanized steel, zinc die castings, and zinc oxide',
      gwpContribution: 6,
      processes: [
        'Galvanized steel recycling (EAF dust)',
        'Waelz kiln processing',
        'Die casting scrap remelting',
        'Zinc ash recovery'
      ],
      wasteStreams: [
        { name: 'Waelz Slag', quantity: '~40 tonnes', composition: 'Iron silicates' },
        { name: 'Non-recoverable Fraction', quantity: '~10 tonnes', composition: 'Mixed metals' }
      ]
    }
  },
  circularFlow: {
    scrapEntryPoints: ['smelting', 'fabrication'], // Waelz kiln or direct remelt
    recyclability: 90,
    globalRecycledContent: 35
  },
  totalGWP: 3.9,
  so2Total: 1.2, // Zinc production generates significant SO₂
  recyclingBenefit: 'Recycling zinc saves 60% energy - EAF dust becomes resource via Waelz kiln',
  circularityNote: 'Zinc from galvanized steel is recovered in EAF dust and processed through Waelz kilns'
}

// Helper to get lifecycle data by metal type
export function getLifecycleDataByMetal(metalType: MetalType) {
  switch (metalType) {
    case 'aluminum': return ALUMINUM_LIFECYCLE_DATA
    case 'copper': return COPPER_LIFECYCLE_DATA
    case 'lead': return LEAD_LIFECYCLE_DATA
    case 'steel': return STEEL_LIFECYCLE_DATA
    case 'zinc': return ZINC_LIFECYCLE_DATA
    default: return ALUMINUM_LIFECYCLE_DATA
  }
}
