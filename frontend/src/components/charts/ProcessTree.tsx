import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Mountain, Factory, Truck, Package, Recycle, Trash2, ArrowRight, Leaf } from 'lucide-react';

interface ProcessData {
  virgin_input_kg?: number;
  recycled_input_kg?: number;
  input_mass_kg?: number;
  scrap_rate_pct?: number;
  collection_rate_pct?: number;
  recycling_yield_pct?: number;
  cost_extraction?: number;
  cost_manufacturing?: number;
  cost_transport?: number;
  cost_use?: number;
  cost_eol?: number;
  co2_extraction?: number;
  co2_manufacturing?: number;
  co2_transport?: number;
  co2_use?: number;
  co2_eol?: number;
}

interface TreeNode {
  name: string;
  amount: number;
  cost?: number;
  co2?: number;
  children?: TreeNode[];
}

interface ProcessTreeProps {
  data?: ProcessData;
}

const defaultData: ProcessData = {
  virgin_input_kg: 800,
  recycled_input_kg: 200,
  input_mass_kg: 1000,
  scrap_rate_pct: 15,
  collection_rate_pct: 85,
  recycling_yield_pct: 90,
  cost_extraction: 500,
  cost_manufacturing: 1200,
  cost_transport: 150,
  cost_use: 50,
  cost_eol: 100,
  co2_extraction: 2.5,
  co2_manufacturing: 3.2,
  co2_transport: 0.8,
  co2_use: 0.5,
  co2_eol: 0.3,
};

function buildProcessTree(data: ProcessData): TreeNode {
  const num = (x?: number, def = 0) => (typeof x === 'number' ? x : def);

  // Basic material flows
  const virgin = num(data.virgin_input_kg);
  const recycled = num(data.recycled_input_kg);
  const inputMass = num(data.input_mass_kg);

  const scrapPct = num(data.scrap_rate_pct);
  const collPct = num(data.collection_rate_pct);
  const recYieldPct = num(data.recycling_yield_pct);

  // Cost / emissions
  const costExtraction = num(data.cost_extraction);
  const costManufacturing = num(data.cost_manufacturing);
  const costUse = num(data.cost_use);
  const costEol = num(data.cost_eol);

  const co2Extraction = num(data.co2_extraction);
  const co2Manufacturing = num(data.co2_manufacturing);
  const co2Use = num(data.co2_use);
  const co2Eol = num(data.co2_eol);

  // Flow calculations
  const extractionOutput = virgin + recycled;
  const scrapGenerated = extractionOutput * (scrapPct / 100);
  const manufOutput = extractionOutput - scrapGenerated;

  const collected = manufOutput * (collPct / 100);
  const lost = manufOutput - collected;

  const recycledBack = collected * (recYieldPct / 100);
  const downcycled = collected - recycledBack;

  return {
    name: 'Product System',
    amount: inputMass,
    children: [
      {
        name: 'Raw Material Extraction',
        amount: extractionOutput,
        cost: costExtraction,
        co2: co2Extraction,
        children: [
          { name: 'Virgin Material', amount: virgin },
          { name: 'Recycled Scrap Feed', amount: recycled },
        ],
      },
      {
        name: 'Manufacturing',
        amount: manufOutput,
        cost: costManufacturing,
        co2: co2Manufacturing,
        children: [
          { name: 'Internal Scrap', amount: scrapGenerated },
          { name: 'Product Output', amount: manufOutput },
        ],
      },
      {
        name: 'Use Phase',
        amount: manufOutput,
        cost: costUse,
        co2: co2Use,
        children: [
          { name: 'Collected for Recycling', amount: collected },
          { name: 'Lost / Landfilled', amount: lost },
        ],
      },
      {
        name: 'End-of-Life',
        amount: collected,
        cost: costEol,
        co2: co2Eol,
        children: [
          { name: 'Recycling', amount: recycledBack },
          { name: 'Downcycled / Losses', amount: downcycled },
        ],
      },
    ],
  };
}

// Node colors
const nodeColors: Record<string, string> = {
  'Product System': '#6366f1',
  'Raw Material Extraction': '#f59e0b',
  'Virgin Material': '#fbbf24',
  'Recycled Scrap Feed': '#34d399',
  'Manufacturing': '#3b82f6',
  'Internal Scrap': '#94a3b8',
  'Product Output': '#60a5fa',
  'Use Phase': '#8b5cf6',
  'Collected for Recycling': '#10b981',
  'Lost / Landfilled': '#ef4444',
  'End-of-Life': '#ec4899',
  'Recycling': '#22c55e',
  'Downcycled / Losses': '#f97316',
};

// Node icons
const getNodeIcon = (name: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    'Product System': <Package className="w-4 h-4" />,
    'Raw Material Extraction': <Mountain className="w-4 h-4" />,
    'Virgin Material': <Mountain className="w-4 h-4" />,
    'Recycled Scrap Feed': <Recycle className="w-4 h-4" />,
    'Manufacturing': <Factory className="w-4 h-4" />,
    'Internal Scrap': <Trash2 className="w-4 h-4" />,
    'Product Output': <Package className="w-4 h-4" />,
    'Use Phase': <Truck className="w-4 h-4" />,
    'Collected for Recycling': <Recycle className="w-4 h-4" />,
    'Lost / Landfilled': <Trash2 className="w-4 h-4" />,
    'End-of-Life': <Leaf className="w-4 h-4" />,
    'Recycling': <Recycle className="w-4 h-4" />,
    'Downcycled / Losses': <ArrowRight className="w-4 h-4" />,
  };
  return iconMap[name] || <Package className="w-4 h-4" />;
};

export const ProcessTree: React.FC<ProcessTreeProps> = ({ data = defaultData }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 359 });
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);

  const tree = buildProcessTree(data);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: Math.max(width, 600), height: 600 });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const margin = { top: 40, right: 120, bottom: 40, left: 120 };

    const root = d3.hierarchy(tree);
    const treeLayout = d3.tree<TreeNode>().size([
      height - margin.top - margin.bottom,
      width - margin.left - margin.right,
    ]);

    const treeData = treeLayout(root);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add gradient definitions
    const defs = svg.append('defs');
    
    // Create gradients for each link based on source/target colors
    treeData.links().forEach((link, i) => {
      const sourceColor = nodeColors[link.source.data.name] || '#6366f1';
      const targetColor = nodeColors[link.target.data.name] || '#6366f1';
      
      const gradient = defs.append('linearGradient')
        .attr('id', `link-gradient-${i}`)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', link.source.y || 0)
        .attr('y1', link.source.x || 0)
        .attr('x2', link.target.y || 0)
        .attr('y2', link.target.x || 0);
      
      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', sourceColor);
      
      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', targetColor);
    });

    // Links (edges)
    const linkGenerator = d3.linkHorizontal<d3.HierarchyPointLink<TreeNode>, d3.HierarchyPointNode<TreeNode>>()
      .x(d => d.y)
      .y(d => d.x);

    g.selectAll('.link')
      .data(treeData.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', linkGenerator as any)
      .attr('fill', 'none')
      .attr('stroke', (_, i) => `url(#link-gradient-${i})`)
      .attr('stroke-width', d => Math.max(2, Math.min(10, d.target.data.amount / 100)))
      .attr('stroke-opacity', 0.7)
      .style('transition', 'stroke-opacity 0.3s')
      .on('mouseover', function() {
        d3.select(this).attr('stroke-opacity', 1);
      })
      .on('mouseout', function() {
        d3.select(this).attr('stroke-opacity', 0.7);
      });

    // Nodes
    const nodes = g.selectAll('.node')
      .data(treeData.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.y},${d.x})`)
      .style('cursor', 'pointer')
      .on('click', (_, d) => {
        setSelectedNode(d.data);
      });

    // Node circles
    nodes.append('circle')
      .attr('r', d => Math.max(20, Math.min(40, d.data.amount / 25)))
      .attr('fill', d => nodeColors[d.data.name] || '#6366f1')
      .attr('stroke', '#fff')
      .attr('stroke-width', 3)
      .style('filter', 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))')
      .style('transition', 'all 0.3s')
      .on('mouseover', function() {
        d3.select(this)
          .attr('stroke-width', 4)
          .style('filter', 'drop-shadow(0 6px 10px rgba(0, 0, 0, 0.2))');
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('stroke-width', 3)
          .style('filter', 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))');
      });

    // Node labels
    nodes.append('text')
      .attr('dy', d => d.children ? -Math.max(25, Math.min(45, d.data.amount / 25)) - 5 : 5)
      .attr('dx', d => d.children ? 0 : Math.max(25, Math.min(45, d.data.amount / 25)) + 10)
      .attr('text-anchor', d => d.children ? 'middle' : 'start')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('fill', '#374151')
      .text(d => d.data.name);

    // Amount labels inside nodes
    nodes.append('text')
      .attr('dy', 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', '#fff')
      .text(d => `${d.data.amount.toFixed(0)}kg`);

  }, [tree, dimensions]);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Process Tree</h3>
          <p className="text-sm text-gray-500 mt-1">Material flow through lifecycle stages</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400">Click nodes for details</span>
        </div>
      </div>

      <div ref={containerRef} className="relative">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="overflow-visible"
        />
      </div>

      {/* Selected Node Details */}
      {selectedNode && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                style={{ backgroundColor: nodeColors[selectedNode.name] || '#6366f1' }}
              >
                {getNodeIcon(selectedNode.name)}
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">{selectedNode.name}</h4>
                <p className="text-sm text-gray-500">Amount: {selectedNode.amount.toFixed(2)} kg</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          {(selectedNode.cost !== undefined || selectedNode.co2 !== undefined) && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              {selectedNode.cost !== undefined && (
                <div className="bg-white p-3 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500">Cost</p>
                  <p className="text-lg font-bold text-gray-900">₹{selectedNode.cost.toLocaleString()}</p>
                </div>
              )}
              {selectedNode.co2 !== undefined && (
                <div className="bg-white p-3 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500">CO₂ Emissions</p>
                  <p className="text-lg font-bold text-gray-900">{selectedNode.co2.toFixed(2)} kg</p>
                </div>
              )}
            </div>
          )}
          {selectedNode.children && selectedNode.children.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2">Sub-processes</p>
              <div className="flex flex-wrap gap-2">
                {selectedNode.children.map((child, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 text-xs rounded-full text-white"
                    style={{ backgroundColor: nodeColors[child.name] || '#6366f1' }}
                  >
                    {child.name}: {child.amount.toFixed(0)}kg
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Lifecycle Stages</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['Raw Material Extraction', 'Manufacturing', 'Use Phase', 'End-of-Life'].map((stage) => (
            <div key={stage} className="flex items-center space-x-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: nodeColors[stage] }}
              />
              <span className="text-xs text-gray-600">{stage}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Flow Summary */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
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
    </div>
  );
};

export default ProcessTree;
