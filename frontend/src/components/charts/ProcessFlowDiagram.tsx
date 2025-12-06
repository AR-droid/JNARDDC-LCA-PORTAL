import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { sankey, sankeyLinkHorizontal, sankeyJustify } from 'd3-sankey'
import { Mountain, Factory, Truck, Package, Recycle, Trash2, Leaf, ArrowRight } from 'lucide-react'

interface ProcessFlowProps {
  nodes?: { id: string; name: string }[]
  links?: { source: string; target: string; value: number }[]
  title?: string
  // New props for sankey_generator.py style input
  data?: SankeyInputData
}

// Input data structure matching sankey_generator.py
interface SankeyInputData {
  virgin_input_kg?: number
  recycled_input_kg?: number
  input_mass_kg?: number
  process_yield_pct?: number
  scrap_rate_pct?: number
  collection_rate_pct?: number
  recycling_yield_pct?: number
}



// Build sankey nodes and links from input data (matching sankey_generator.py logic)
function buildSankeyFromInput(data: SankeyInputData): { nodes: { id: string; name: string }[]; links: { source: string; target: string; value: number }[] } {
  const safeFloat = (x?: number, def = 0) => (typeof x === 'number' ? x : def)

  const virgin = safeFloat(data.virgin_input_kg, 0)
  const recycled = safeFloat(data.recycled_input_kg, 0)
  const inputMass = safeFloat(data.input_mass_kg, 0)
  const processYieldPct = safeFloat(data.process_yield_pct, 100)
  const scrapRatePct = safeFloat(data.scrap_rate_pct, 0)
  const collectionRatePct = safeFloat(data.collection_rate_pct, 50)
  const recyclingYieldPct = safeFloat(data.recycling_yield_pct, 80)

  const nodes: { id: string; name: string }[] = []
  const nodeIndex: Record<string, number> = {}
  const links: { source: string; target: string; value: number }[] = []

  const addNode = (id: string, name: string) => {
    if (!(id in nodeIndex)) {
      nodeIndex[id] = nodes.length
      nodes.push({ id, name })
    }
    return id
  }

  // INPUTS -> Raw Material Extraction
  if (virgin > 0) {
    links.push({
      source: addNode('virgin_material', 'Virgin Material'),
      target: addNode('raw_material_extraction', 'Raw Material Extraction'),
      value: virgin
    })
  }
  if (recycled > 0) {
    links.push({
      source: addNode('recycled_scrap', 'Recycled Scrap'),
      target: addNode('raw_material_extraction', 'Raw Material Extraction'),
      value: recycled
    })
  }

  // Extraction output
  let extractionOutput = virgin + recycled
  if (extractionOutput === 0) {
    extractionOutput = inputMass * (processYieldPct / 100)
  }

  // Raw Material Extraction -> Manufacturing
  if (extractionOutput > 0) {
    addNode('raw_material_extraction', 'Raw Material Extraction')
    links.push({
      source: 'raw_material_extraction',
      target: addNode('manufacturing', 'Manufacturing'),
      value: extractionOutput
    })
  }

  // Manufacturing: generate scrap and product output
  const scrapGenerated = extractionOutput * (scrapRatePct / 100)
  const productAfterManufacturing = Math.max(0, extractionOutput - scrapGenerated)

  if (scrapGenerated > 0) {
    links.push({
      source: 'manufacturing',
      target: addNode('internal_scrap', 'Internal Scrap'),
      value: scrapGenerated
    })
  }

  // Manufacturing -> Transport
  if (productAfterManufacturing > 0) {
    links.push({
      source: 'manufacturing',
      target: addNode('transport', 'Transport'),
      value: productAfterManufacturing
    })
  }

  // Transport -> Use Phase
  if (productAfterManufacturing > 0) {
    links.push({
      source: 'transport',
      target: addNode('use_phase', 'Use Phase'),
      value: productAfterManufacturing
    })
  }

  // Use Phase -> End-of-Life (collection vs losses)
  const collected = productAfterManufacturing * (collectionRatePct / 100)
  const lost = Math.max(0, productAfterManufacturing - collected)

  if (collected > 0) {
    links.push({
      source: 'use_phase',
      target: addNode('collection_recycling', 'Collection for Recycling'),
      value: collected
    })
  }
  if (lost > 0) {
    links.push({
      source: 'use_phase',
      target: addNode('losses_landfill', 'Losses / Landfill'),
      value: lost
    })
  }

  // Collection -> Recycling (apply recycling yield)
  const recycledBack = collected * (recyclingYieldPct / 100)
  const downcycledOrLosses = Math.max(0, collected - recycledBack)

  if (recycledBack > 0) {
    links.push({
      source: 'collection_recycling',
      target: addNode('recycling', 'Recycling'),
      value: recycledBack
    })
  }
  if (downcycledOrLosses > 0) {
    links.push({
      source: 'collection_recycling',
      target: addNode('downcycling_losses', 'Downcycling / Losses'),
      value: downcycledOrLosses
    })
  }

  // Recycling loop back to Manufacturing
  if (recycledBack > 0) {
    links.push({
      source: 'recycling',
      target: 'manufacturing',
      value: recycledBack
    })
  }

  // Final product in use
  if (productAfterManufacturing > 0) {
    links.push({
      source: 'use_phase',
      target: addNode('final_product', 'Final Product (in use)'),
      value: productAfterManufacturing
    })
  }

  return { nodes, links }
}

// Professional color palette
const STAGE_COLORS: Record<string, { primary: string; secondary: string }> = {
  'extraction': { primary: '#1e40af', secondary: '#3b82f6' },
  'raw_material': { primary: '#1e40af', secondary: '#3b82f6' },
  'raw_materials': { primary: '#1e40af', secondary: '#3b82f6' },
  'virgin': { primary: '#f59e0b', secondary: '#fbbf24' },
  'recycled_input': { primary: '#166534', secondary: '#22c55e' },
  'recycled_scrap': { primary: '#166534', secondary: '#22c55e' },
  'recycled': { primary: '#166534', secondary: '#22c55e' },
  'recycling': { primary: '#166534', secondary: '#22c55e' },
  'collection': { primary: '#10b981', secondary: '#34d399' },
  'processing': { primary: '#7c3aed', secondary: '#a78bfa' },
  'manufacturing': { primary: '#7c3aed', secondary: '#a78bfa' },
  'transport': { primary: '#0ea5e9', secondary: '#38bdf8' },
  'use_phase': { primary: '#0891b2', secondary: '#22d3ee' },
  'use': { primary: '#0891b2', secondary: '#22d3ee' },
  'final_product': { primary: '#8b5cf6', secondary: '#a78bfa' },
  'end_of_life': { primary: '#ea580c', secondary: '#fb923c' },
  'eol': { primary: '#ea580c', secondary: '#fb923c' },
  'waste': { primary: '#dc2626', secondary: '#f87171' },
  'landfill': { primary: '#dc2626', secondary: '#f87171' },
  'losses': { primary: '#dc2626', secondary: '#f87171' },
  'scrap': { primary: '#94a3b8', secondary: '#cbd5e1' },
  'internal_scrap': { primary: '#94a3b8', secondary: '#cbd5e1' },
  'downcycling': { primary: '#f97316', secondary: '#fb923c' },
  'recovery': { primary: '#059669', secondary: '#34d399' },
  'default': { primary: '#475569', secondary: '#94a3b8' }
}

function getStageColor(nodeId: string): { primary: string; secondary: string } {
  const id = nodeId.toLowerCase()
  for (const [key, colors] of Object.entries(STAGE_COLORS)) {
    if (id.includes(key)) return colors
  }
  return STAGE_COLORS.default
}

// Get icon for node
const getNodeIcon = (nodeId: string): React.ReactNode => {
  const id = nodeId.toLowerCase()
  if (id.includes('virgin') || id.includes('extraction') || id.includes('raw_material')) return <Mountain className="w-4 h-4" />
  if (id.includes('recycl') || id.includes('collection')) return <Recycle className="w-4 h-4" />
  if (id.includes('manufacturing')) return <Factory className="w-4 h-4" />
  if (id.includes('transport')) return <Truck className="w-4 h-4" />
  if (id.includes('use') || id.includes('final_product')) return <Package className="w-4 h-4" />
  if (id.includes('landfill') || id.includes('waste') || id.includes('scrap')) return <Trash2 className="w-4 h-4" />
  if (id.includes('downcycl') || id.includes('loss')) return <ArrowRight className="w-4 h-4" />
  return <Leaf className="w-4 h-4" />
}

export default function ProcessFlowDiagram({ nodes: propNodes, links: propLinks, title = 'Material Lifecycle Flow', data }: ProcessFlowProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedNode, setSelectedNode] = useState<{ id: string; name: string; value: number } | null>(null)
  // const [hoveredLink, setHoveredLink] = useState<number | null>(null) // Unused

  // Use provided nodes/links or build from data
  const { nodes, links } = data
    ? buildSankeyFromInput(data)
    : { nodes: propNodes || [], links: propLinks || [] }

  useEffect(() => {
    if (!svgRef.current || !nodes.length || !links.length) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = svgRef.current.clientWidth || 800
    const height = 400
    const margin = { top: 40, right: 150, bottom: 40, left: 150 }

    // Create defs for gradients
    const defs = svg.append('defs')

    // Filter out links with zero/invalid values first
    const validLinks = links.filter(l => l.value > 0)

    // Get only nodes that have at least one connection
    const connectedNodeIds = new Set<string>()
    validLinks.forEach(l => {
      connectedNodeIds.add(l.source)
      connectedNodeIds.add(l.target)
    })

    // Filter nodes to only include connected ones
    const filteredNodes = nodes.filter(n => connectedNodeIds.has(n.id))

    // Create node index map from filtered nodes
    const nodeMap = new Map(filteredNodes.map((n, i) => [n.id, i]))

    // Transform links to use indices
    const sankeyLinks = validLinks
      .filter(l => nodeMap.has(l.source) && nodeMap.has(l.target))
      .map(l => ({
        source: nodeMap.get(l.source)!,
        target: nodeMap.get(l.target)!,
        value: Math.max(l.value, 0.1)
      }))

    if (sankeyLinks.length === 0) return

    // Create sankey generator
    const sankeyGenerator = sankey<any, any>()
      .nodeWidth(18)
      .nodePadding(28)
      .nodeAlign(sankeyJustify)
      .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])

    // Generate layout - use filteredNodes to avoid blank blocks
    const { nodes: sankeyNodes, links: sankeyLinkData } = sankeyGenerator({
      nodes: filteredNodes.map(n => ({ ...n })),
      links: sankeyLinks
    })

    // Create gradients for each link
    sankeyLinkData.forEach((link: any, i: number) => {
      const sourceColor = getStageColor(link.source.id)
      const targetColor = getStageColor(link.target.id)

      const gradient = defs.append('linearGradient')
        .attr('id', `link-gradient-${i}`)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', link.source.x1)
        .attr('x2', link.target.x0)

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', sourceColor.secondary)
        .attr('stop-opacity', 0.5)

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', targetColor.secondary)
        .attr('stop-opacity', 0.5)
    })

    // Create gradients for nodes
    sankeyNodes.forEach((node: any, i: number) => {
      const colors = getStageColor(node.id)

      const gradient = defs.append('linearGradient')
        .attr('id', `node-gradient-${i}`)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%')

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', colors.primary)

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', colors.secondary)
    })

    // Add subtle drop shadow filter
    const filter = defs.append('filter')
      .attr('id', 'node-shadow')
      .attr('x', '-20%')
      .attr('y', '-20%')
      .attr('width', '140%')
      .attr('height', '140%')

    filter.append('feDropShadow')
      .attr('dx', 0)
      .attr('dy', 1)
      .attr('stdDeviation', 2)
      .attr('flood-color', '#000')
      .attr('flood-opacity', 0.1)

    // Add hover shadow filter
    const filterHover = defs.append('filter')
      .attr('id', 'node-shadow-hover')
      .attr('x', '-20%')
      .attr('y', '-20%')
      .attr('width', '140%')
      .attr('height', '140%')

    filterHover.append('feDropShadow')
      .attr('dx', 0)
      .attr('dy', 2)
      .attr('stdDeviation', 4)
      .attr('flood-color', '#000')
      .attr('flood-opacity', 0.2)

    // Draw links - with hover effects
    svg.append('g')
      .attr('fill', 'none')
      .selectAll('path')
      .data(sankeyLinkData)
      .join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', (_d: any, i: number) => `url(#link-gradient-${i})`)
      .attr('stroke-width', (d: any) => Math.max(3, d.width))
      .attr('opacity', 0.7)
      .attr('class', 'sankey-link')
      .style('cursor', 'pointer')
      .style('transition', 'opacity 0.3s, stroke-width 0.3s')
      .on('mouseover', function (_event: any, d: any) {
        d3.select(this)
          .attr('opacity', 1)
          .attr('stroke-width', Math.max(4, d.width + 2))
      })
      .on('mouseout', function (_event: any, d: any) {
        d3.select(this)
          .attr('opacity', 0.7)
          .attr('stroke-width', Math.max(3, d.width))
      })

    // Draw nodes with click interaction
    svg.append('g')
      .selectAll('rect')
      .data(sankeyNodes)
      .join('rect')
      .attr('x', (d: any) => d.x0)
      .attr('y', (d: any) => d.y0)
      .attr('height', (d: any) => Math.max(12, d.y1 - d.y0))
      .attr('width', (d: any) => d.x1 - d.x0)
      .attr('fill', (_d: any, i: number) => `url(#node-gradient-${i})`)
      .attr('filter', 'url(#node-shadow)')
      .attr('rx', 4)
      .attr('ry', 4)
      .style('cursor', 'pointer')
      .style('transition', 'all 0.3s')
      .on('mouseover', function () {
        d3.select(this)
          .attr('filter', 'url(#node-shadow-hover)')
      })
      .on('mouseout', function () {
        d3.select(this)
          .attr('filter', 'url(#node-shadow)')
      })
      .on('click', (_event: any, d: any) => {
        setSelectedNode({ id: d.id, name: d.name, value: d.value || 0 })
      })

    // Add node name labels
    svg.append('g')
      .selectAll('.node-label')
      .data(sankeyNodes)
      .join('text')
      .attr('class', 'node-label')
      .attr('x', (d: any) => d.x0 < width / 2 ? d.x0 - 10 : d.x1 + 10)
      .attr('y', (d: any) => (d.y1 + d.y0) / 2 - 8)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d: any) => d.x0 < width / 2 ? 'end' : 'start')
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .attr('fill', '#374151')
      .text((d: any) => d.name)

    // Add PROMINENT kg value labels - these are the most important
    svg.append('g')
      .selectAll('.value-label')
      .data(sankeyNodes)
      .join('text')
      .attr('class', 'value-label')
      .attr('x', (d: any) => d.x0 < width / 2 ? d.x0 - 10 : d.x1 + 10)
      .attr('y', (d: any) => (d.y1 + d.y0) / 2 + 9)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d: any) => d.x0 < width / 2 ? 'end' : 'start')
      .attr('font-size', '13px')
      .attr('font-weight', '700')
      .attr('fill', (d: any) => getStageColor(d.id).primary)
      .text((d: any) => `${d.value?.toFixed(1) || 0} kg`)

    // Add flow arrows on links for direction indication
    svg.append('g')
      .selectAll('.flow-arrow')
      .data(sankeyLinkData)
      .join('text')
      .attr('class', 'flow-arrow')
      .attr('x', (d: any) => ((d.source.x1 || 0) + (d.target.x0 || 0)) / 2)
      .attr('y', (d: any) => ((d.y0 || 0) + (d.y1 || 0)) / 2)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#94a3b8')
      .text('→')

  }, [nodes, links])

  if (!nodes.length || !links.length) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
        <div className="h-64 flex flex-col items-center justify-center text-gray-400">
          <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          <p className="text-sm">Add materials to visualize lifecycle flow</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">Material flow through lifecycle stages</p>
        </div>
        <span className="text-xs text-gray-400">Click nodes for details</span>
      </div>

      <svg ref={svgRef} width="100%" height="400" className="overflow-visible" />

      {/* Selected Node Details */}
      {selectedNode && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                style={{ backgroundColor: getStageColor(selectedNode.id).primary }}
              >
                {getNodeIcon(selectedNode.id)}
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">{selectedNode.name}</h4>
                <p className="text-sm text-gray-500">Flow: {selectedNode.value.toFixed(2)} kg</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-gray-400 hover:text-gray-600 text-lg"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-gradient-to-b from-amber-500 to-amber-400" />
            <span className="text-xs text-gray-500">Virgin Material</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-gradient-to-b from-blue-800 to-blue-500" />
            <span className="text-xs text-gray-500">Raw Materials</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-gradient-to-b from-green-700 to-green-500" />
            <span className="text-xs text-gray-500">Recycled</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-gradient-to-b from-purple-600 to-purple-400" />
            <span className="text-xs text-gray-500">Manufacturing</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-gradient-to-b from-sky-500 to-sky-400" />
            <span className="text-xs text-gray-500">Transport</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-gradient-to-b from-cyan-600 to-cyan-400" />
            <span className="text-xs text-gray-500">Use Phase</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-gradient-to-b from-emerald-600 to-emerald-400" />
            <span className="text-xs text-gray-500">Collection</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-gradient-to-b from-orange-600 to-orange-400" />
            <span className="text-xs text-gray-500">Downcycling</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-gradient-to-b from-red-600 to-red-400" />
            <span className="text-xs text-gray-500">Waste/Landfill</span>
          </div>
        </div>
      </div>

      {/* Flow Summary Stats */}
      {data && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
            <p className="text-xs text-amber-600">Virgin Material</p>
            <p className="text-lg font-bold text-amber-700">{data.virgin_input_kg || 0} kg</p>
          </div>
          <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
            <p className="text-xs text-emerald-600">Recycled Input</p>
            <p className="text-lg font-bold text-emerald-700">{data.recycled_input_kg || 0} kg</p>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
            <p className="text-xs text-blue-600">Collection Rate</p>
            <p className="text-lg font-bold text-blue-700">{data.collection_rate_pct || 0}%</p>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
            <p className="text-xs text-purple-600">Recycling Yield</p>
            <p className="text-lg font-bold text-purple-700">{data.recycling_yield_pct || 0}%</p>
          </div>
        </div>
      )}
    </div>
  )
}
