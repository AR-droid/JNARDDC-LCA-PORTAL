import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { sankey, sankeyLinkHorizontal } from 'd3-sankey'

interface ProcessFlowProps {
  nodes: { id: string; name: string }[]
  links: { source: string; target: string; value: number }[]
  title?: string
}

export default function ProcessFlowDiagram({ nodes, links, title = 'Material Flow' }: ProcessFlowProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !nodes.length || !links.length) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = svgRef.current.clientWidth
    const height = 280
    const margin = { top: 15, right: 100, bottom: 15, left: 100 }

    // Create node index map
    const nodeMap = new Map(nodes.map((n, i) => [n.id, i]))

    // Transform links to use indices
    const sankeyLinks = links
      .filter(l => nodeMap.has(l.source) && nodeMap.has(l.target))
      .map(l => ({
        source: nodeMap.get(l.source)!,
        target: nodeMap.get(l.target)!,
        value: l.value || 1
      }))

    if (sankeyLinks.length === 0) return

    // Create sankey generator
    const sankeyGenerator = sankey<any, any>()
      .nodeWidth(20)
      .nodePadding(15)
      .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])

    // Generate layout
    const { nodes: sankeyNodes, links: sankeyLinkData } = sankeyGenerator({
      nodes: nodes.map(n => ({ ...n })),
      links: sankeyLinks
    })

    // Color scale
    const colorScale = d3.scaleOrdinal<string>()
      .domain(nodes.map(n => n.id))
      .range(['#3b82f6', '#22c55e', '#8b5cf6', '#f97316', '#06b6d4', '#ec4899', '#eab308', '#6b7280'])

    // Draw links
    svg.append('g')
      .attr('fill', 'none')
      .attr('stroke-opacity', 0.4)
      .selectAll('path')
      .data(sankeyLinkData)
      .join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', (d: any) => colorScale(d.source.id))
      .attr('stroke-width', (d: any) => Math.max(1, d.width))
      .on('mouseover', function() {
        d3.select(this).attr('stroke-opacity', 0.7)
      })
      .on('mouseout', function() {
        d3.select(this).attr('stroke-opacity', 0.4)
      })
      .append('title')
      .text((d: any) => `${d.source.name} → ${d.target.name}\n${d.value.toFixed(1)} kg`)

    // Draw nodes
    svg.append('g')
      .selectAll('rect')
      .data(sankeyNodes)
      .join('rect')
      .attr('x', (d: any) => d.x0)
      .attr('y', (d: any) => d.y0)
      .attr('height', (d: any) => Math.max(1, d.y1 - d.y0))
      .attr('width', (d: any) => d.x1 - d.x0)
      .attr('fill', (d: any) => colorScale(d.id))
      .attr('rx', 3)
      .append('title')
      .text((d: any) => `${d.name}\n${d.value?.toFixed(1) || 0} kg`)

    // Add labels
    svg.append('g')
      .style('font-size', '10px')
      .style('font-weight', '500')
      .selectAll('text')
      .data(sankeyNodes)
      .join('text')
      .attr('x', (d: any) => d.x0 < width / 2 ? d.x0 - 6 : d.x1 + 6)
      .attr('y', (d: any) => (d.y1 + d.y0) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d: any) => d.x0 < width / 2 ? 'end' : 'start')
      .attr('fill', '#374151')
      .text((d: any) => d.name)

  }, [nodes, links])

  if (!nodes.length || !links.length) {
    return (
      <div className="bg-white rounded-md shadow-sm p-4">
        <h3 className="text-sm font-medium mb-3">{title}</h3>
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
          Add materials to see the process flow
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-md shadow-sm p-4">
      <h3 className="text-sm font-medium mb-3">{title}</h3>
      <svg ref={svgRef} width="100%" height="280" />
      <div className="mt-3 flex flex-wrap justify-center gap-3 text-2xs">
        <div className="flex items-center gap-0.5">
          <div className="w-2 h-2 rounded bg-blue-500" />
          <span className="text-gray-500">Raw Materials</span>
        </div>
        <div className="flex items-center gap-0.5">
          <div className="w-2 h-2 rounded bg-green-500" />
          <span className="text-gray-500">Recycled Input</span>
        </div>
        <div className="flex items-center gap-0.5">
          <div className="w-2 h-2 rounded bg-purple-500" />
          <span className="text-gray-500">Manufacturing</span>
        </div>
        <div className="flex items-center gap-0.5">
          <div className="w-2 h-2 rounded bg-cyan-500" />
          <span className="text-gray-500">Use Phase</span>
        </div>
        <div className="flex items-center gap-0.5">
          <div className="w-2 h-2 rounded bg-yellow-500" />
          <span className="text-gray-500">End of Life</span>
        </div>
      </div>
    </div>
  )
}
