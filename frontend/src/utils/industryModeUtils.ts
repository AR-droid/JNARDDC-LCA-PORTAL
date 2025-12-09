// Industry Mode utilities for Mining vs Manufacturing parameter toggle

export type IndustryMode = 'mining' | 'manufacturing';

export interface ParameterVisibility {
    show: string[];
    hide: string[];
}

// Mining keywords - materials from extraction/raw phase
export const MINING_KEYWORDS = [
    // General mining terms
    'ore', 'concentrate', 'raw', 'extraction', 'mineral', 'mining', 'mine',
    'quarry', 'pit', 'underground', 'open cast', 'open pit',
    // Ore types  
    'iron ore', 'copper ore', 'manganese ore', 'chromite', 'laterite',
    // Aluminium extraction specific
    'bauxite', 'alumina', 'red mud', 'bayer process',
    // Mining byproducts
    'tailings', 'overburden', 'slag', 'gangue', 'waste rock',
    // Mining operations
    'beneficiation', 'crushing', 'grinding', 'flotation', 'leaching',
    'drill', 'excavat', 'dredg', 'blast'
];

// Manufacturing keywords - processed/finished products
export const MANUFACTURING_KEYWORDS = [
    'rod', 'wire', 'sheet', 'coil', 'tube', 'bar', 'plate', 'ingot', 'alloy',
    'component', 'product', 'assembly', 'manufactured', 'processed', 'finished',
    'extrusion', 'casting', 'forging', 'machined', 'fabricated'
];

// Parameter visibility configuration
export const PARAMETER_VISIBILITY: Record<IndustryMode, ParameterVisibility> = {
    mining: {
        show: ['gwp', 'water_usage', 'land_use', 'scarcity_score', 'energy_mining', 'waste_factors', 'transport_distance'],
        hide: ['mci_score', 'recyclability', 'recycled_content', 'end_of_life', 'design_for_disassembly', 'circular_design_score']
    },
    manufacturing: {
        show: ['gwp', 'mci_score', 'recyclability', 'recycled_content', 'end_of_life', 'design_for_disassembly', 'circular_design_score', 'transport_distance'],
        hide: ['energy_mining', 'land_use']
    }
};

// Mode labels and descriptions
export const MODE_INFO = {
    mining: {
        label: 'Mining',
        description: 'Raw material extraction and processing',
        color: 'amber',
        icon: '⛏️'
    },
    manufacturing: {
        label: 'Manufacturing',
        description: 'Product manufacturing and circularity',
        color: 'blue',
        icon: '🏭'
    }
};

/**
 * Detect industry mode based on material names
 */
export function detectIndustryMode(materials: Array<{ material_name?: string } | string>): IndustryMode {
    const materialNames = materials
        .map(m => typeof m === 'string' ? m.toLowerCase() : (m.material_name || '').toLowerCase())
        .join(' ');

    const miningScore = MINING_KEYWORDS.filter(k => materialNames.includes(k)).length;
    const manufacturingScore = MANUFACTURING_KEYWORDS.filter(k => materialNames.includes(k)).length;

    return miningScore > manufacturingScore ? 'mining' : 'manufacturing';
}

/**
 * Check if a parameter should be shown for given industry mode
 */
export function shouldShowParameter(parameterName: string, industryMode: IndustryMode): boolean {
    const visibility = PARAMETER_VISIBILITY[industryMode];
    return visibility.show.includes(parameterName) || !visibility.hide.includes(parameterName);
}

/**
 * Check if a parameter should be hidden for given industry mode
 */
export function shouldHideParameter(parameterName: string, industryMode: IndustryMode): boolean {
    const visibility = PARAMETER_VISIBILITY[industryMode];
    return visibility.hide.includes(parameterName);
}

/**
 * Get parameter visibility config for given mode
 */
export function getParameterVisibility(industryMode: IndustryMode): ParameterVisibility {
    return PARAMETER_VISIBILITY[industryMode] || PARAMETER_VISIBILITY.manufacturing;
}
