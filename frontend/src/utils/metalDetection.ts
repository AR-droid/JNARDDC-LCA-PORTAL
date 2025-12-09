// Utility to detect metal type from project description
export type MetalType = 'aluminum' | 'lead'

export function detectMetalType(description: string | undefined): MetalType {
  if (!description) return 'aluminum'
  
  const lowerDesc = description.toLowerCase()
  
  // Check for lead keywords
  const leadKeywords = ['lead', 'pb', 'lead-acid', 'lead acid', 'battery lead', 'lead oxide']
  const hasLead = leadKeywords.some(keyword => lowerDesc.includes(keyword))
  
  if (hasLead) return 'lead'
  return 'aluminum'
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
  circularityNote: 'Recycled aluminum bypasses Mining → Smelting stages, saving energy and reducing CO₂'
}
