import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { sankey, sankeyLinkHorizontal, sankeyJustify } from 'd3-sankey'

interface ProcessFlowProps {
  nodes: { id: string; name: string }[]
  links: { source: string; target: string; value: number }[]
  title?: string
}

// Professional color palette
const STAGE_COLORS: Record<string, { primary: string; secondary: string }> = {
  'extraction': { primary: '#1e40af', secondary: '#3b82f6' },
  'raw_materials': { primary: '#1e40af', secondary: '#3b82f6' },
  'recycled_input': { primary: '#166534', secondary: '#22c55e' },
  'recycled': { primary: '#166534', secondary: '#22c55e' },
  'recycling': { primary: '#166534', secondary: '#22c55e' },
  'processing': { primary: '#7c3aed', secondary: '#a78bfa' },
  'manufacturing': { primary: '#7c3aed', secondary: '#a78bfa' },
  'use_phase': { primary: '#0891b2', secondary: '#22d3ee' },
  'use': { primary: '#0891b2', secondary: '#22d3ee' },
  'end_of_life': { primary: '#ea580c', secondary: '#fb923c' },
  'eol': { primary: '#ea580c', secondary: '#fb923c' },
  'waste': { primary: '#dc2626', secondary: '#f87171' },
  'landfill': { primary: '#dc2626', secondary: '#f87171' },
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

export default function ProcessFlowDiagram({ nodes, links, title = 'Material Lifecycle Flow' }: ProcessFlowProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !nodes.length || !links.length) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = svgRef.current.clientWidth || 700
    const height = 300
    const margin = { top: 30, right: 130, bottom: 30, left: 130 }

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
      .nodeWidth(14)
      .nodePadding(24)
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

    // Draw links - NO hover effects, static display
    svg.append('g')
      .attr('fill', 'none')
      .selectAll('path')
      .data(sankeyLinkData)
      .join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', (_d: any, i: number) => `url(#link-gradient-${i})`)
      .attr('stroke-width', (d: any) => Math.max(2, d.width))
      .attr('opacity', 0.65)

    // Draw nodes
    svg.append('g')
      .selectAll('rect')
      .data(sankeyNodes)
      .join('rect')
      .attr('x', (d: any) => d.x0)
      .attr('y', (d: any) => d.y0)
      .attr('height', (d: any) => Math.max(10, d.y1 - d.y0))
      .attr('width', (d: any) => d.x1 - d.x0)
      .attr('fill', (_d: any, i: number) => `url(#node-gradient-${i})`)
      .attr('filter', 'url(#node-shadow)')
      .attr('rx', 3)
      .attr('ry', 3)

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
      .attr('font-size', '14px')
      .attr('font-weight', '700')
      .attr('fill', (d: any) => getStageColor(d.id).primary)
      .text((d: any) => `${d.value?.toFixed(1) || 0} kg`)

  }, [nodes, links])

  if (!nodes.length || !links.length) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">{title}</h3>
        <div className="h-56 flex flex-col items-center justify-center text-gray-400">
          <svg className="w-10 h-10 mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          <p className="text-sm">Add materials to visualize lifecycle flow</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">{title}</h3>
      
      <svg ref={svgRef} width="100%" height="300" className="overflow-visible" />
      
      {/* Legend */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-b from-blue-800 to-blue-500" />
            <span className="text-xs text-gray-500">Raw Materials</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-b from-green-700 to-green-500" />
            <span className="text-xs text-gray-500">Recycled</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-b from-purple-600 to-purple-400" />
            <span className="text-xs text-gray-500">Manufacturing</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-b from-cyan-600 to-cyan-400" />
            <span className="text-xs text-gray-500">Use Phase</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-b from-orange-600 to-orange-400" />
            <span className="text-xs text-gray-500">End of Life</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-b from-red-600 to-red-400" />
            <span className="text-xs text-gray-500">Waste</span>
          </div>
        </div>
      </div>
    </div>
  )
}
