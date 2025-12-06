import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface PathwayComparisonVizProps {
    conventionalRecycled: number; // 0-100
    circularRecycled: number; // 0-100
    conventionalRecovery: number; // 0-100
    circularRecovery: number; // 0-100
    showControls?: boolean;
    onRecycledChange?: (value: number) => void;
}

export default function PathwayComparisonViz({
    conventionalRecycled = 0,
    circularRecycled = 80,
    conventionalRecovery = 30,
    circularRecovery = 95,
    showControls = false,
    onRecycledChange
}: PathwayComparisonVizProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 }); // Increased default height

    // Handle resize
    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.clientWidth,
                    height: 550 // Taller for better layout
                });
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove(); // Clear previous render

        const { width, height } = dimensions;
        const margin = { top: 40, right: 40, bottom: 40, left: 40 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const centerY = innerHeight * 0.45; // Shifted up slightly
        const topY = innerHeight * 0.2;
        const bottomY = innerHeight * 0.7;

        // Defs for gradients and markers
        const defs = svg.append("defs");

        // Fixed Size Markers
        const addMarker = (id: string, color: string) => {
            defs.append("marker")
                .attr("id", id)
                .attr("viewBox", "0 -5 10 10")
                .attr("refX", 8)
                .attr("refY", 0)
                .attr("markerWidth", 12) // Fixed size
                .attr("markerHeight", 12)
                .attr("orient", "auto")
                .attr("markerUnits", "userSpaceOnUse") // Critical for fixed size!
                .append("path")
                .attr("fill", color)
                .attr("d", "M0,-5L10,0L0,5");
        }

        addMarker("arrow-linear", "#EF4444");
        addMarker("arrow-circular", "#22C55E");
        addMarker("arrow-waste", "#F97316");

        // --- Draw Conventional (Linear) Pathway - Top Half ---

        const addLabel = (x: number, y: number, text: string, color: string, anchor = "middle", fontSize = "11px", bg = true) => {
            if (bg) {
                const bgWidth = text.length * 6 + 12;
                svg.append("rect")
                    .attr("x", x - bgWidth / 2)
                    .attr("y", y - 10)
                    .attr("width", bgWidth)
                    .attr("height", 18)
                    .attr("rx", 6)
                    .attr("fill", "white")
                    .attr("stroke", color)
                    .attr("stroke-width", 0.5)
                    .attr("opacity", 0.95);
            }
            svg.append("text")
                .attr("x", x)
                .attr("y", y + 3)
                .attr("text-anchor", anchor)
                .attr("font-size", fontSize)
                .attr("font-weight", "600")
                .attr("fill", color)
                .text(text);
        }

        // Nodes for Linear
        const linearNodes = [
            { id: 'extraction', label: 'Extraction', x: margin.left, y: topY, type: 'start' },
            { id: 'production', label: 'Production', x: margin.left + innerWidth * 0.33, y: topY, type: 'process' },
            { id: 'use', label: 'Use Phase', x: margin.left + innerWidth * 0.66, y: topY, type: 'process' },
            { id: 'waste', label: 'Landfill', x: margin.left + innerWidth, y: topY, type: 'end' }
        ];

        // Background
        svg.append("rect")
            .attr("x", margin.left - 20)
            .attr("y", margin.top - 30)
            .attr("width", innerWidth + 40)
            .attr("height", innerHeight * 0.45)
            .attr("rx", 20)
            .attr("fill", "#FEF2F2")
            .attr("stroke", "#FECACA")
            .attr("stroke-width", 2);

        svg.append("text")
            .attr("x", margin.left)
            .attr("y", margin.top - 8)
            .attr("font-size", 16)
            .attr("font-weight", "bold")
            .attr("fill", "#B91C1C")
            .text("Conventional Linear Pathway");

        // Helper for straight lines
        const drawStraight = (start: { x: number, y: number }, end: { x: number, y: number }) => {
            const lineGen = d3.line();
            return lineGen([[start.x + 35, start.y], [end.x - 35, end.y]]);
        }

        // Linear Links
        svg.append("path").attr("d", drawStraight(linearNodes[0], linearNodes[1]))
            .attr("stroke", "#EF4444").attr("stroke-width", 6).attr("fill", "none").attr("marker-end", "url(#arrow-linear)");
        addLabel((linearNodes[0].x + linearNodes[1].x) / 2, linearNodes[0].y - 15, "100% Virgin", "#B91C1C");

        svg.append("path").attr("d", drawStraight(linearNodes[1], linearNodes[2]))
            .attr("stroke", "#EF4444").attr("stroke-width", 6).attr("fill", "none").attr("marker-end", "url(#arrow-linear)");

        // Scrap (Visualized as separate branch downwards)
        const scrapPath = d3.line().curve(d3.curveBasis)([
            [linearNodes[1].x, linearNodes[1].y + 35],
            [linearNodes[1].x + 30, linearNodes[1].y + 60],
            [linearNodes[1].x + 60, linearNodes[1].y + 80]
        ]);
        svg.append("path").attr("d", scrapPath)
            .attr("stroke", "#F97316").attr("stroke-width", 3).attr("stroke-dasharray", "4 2").attr("fill", "none").attr("marker-end", "url(#arrow-waste)");
        addLabel(linearNodes[1].x + 60, linearNodes[1].y + 95, "Scrap Loss", "#C2410C", "middle", "10px");


        svg.append("path").attr("d", drawStraight(linearNodes[2], linearNodes[3]))
            .attr("stroke", "#EF4444").attr("stroke-width", 6).attr("fill", "none").attr("marker-end", "url(#arrow-linear)");
        addLabel((linearNodes[2].x + linearNodes[3].x) / 2, linearNodes[2].y - 15, "High Waste", "#B91C1C");


        // Draw Linear Nodes
        const linearNodeSelection = svg.selectAll(".node-linear")
            .data(linearNodes).enter().append("g")
            .attr("class", "node-linear").attr("transform", d => `translate(${d.x},${d.y})`);

        linearNodeSelection.append("circle").attr("r", 35).attr("fill", "white").attr("stroke", "#EF4444").attr("stroke-width", 3);
        linearNodeSelection.append("image")
            .attr("xlink:href", d => {
                if (d.id === 'extraction') return '/images/extraction.png';
                if (d.id === 'production') return '/images/production.png';
                if (d.id === 'use') return '/images/use phase.png';
                if (d.id === 'waste') return '/images/end of life.png';
                return '';
            })
            .attr("x", -20).attr("y", -20).attr("width", 40).attr("height", 40);

        linearNodeSelection.append("text").attr("y", 50).attr("text-anchor", "middle").attr("font-weight", "600").attr("fill", "#4B5563")
            .attr("font-size", 12).text(d => d.label);


        // --- Draw Circular Pathway - Bottom Half ---

        const circularNodes = [
            { id: 'extraction', label: 'Virgin Source', x: margin.left, y: bottomY, type: 'start' },
            { id: 'production', label: 'Production', x: margin.left + innerWidth * 0.33, y: bottomY, type: 'process' },
            { id: 'use', label: 'Use Phase', x: margin.left + innerWidth * 0.66, y: bottomY, type: 'process' },
            { id: 'recycling', label: 'Recycling', x: margin.left + innerWidth * 0.5, y: bottomY + 120, type: 'recycle' }
        ];

        // Background
        svg.append("rect")
            .attr("x", margin.left - 20)
            .attr("y", centerY + 10)
            .attr("width", innerWidth + 40)
            .attr("height", innerHeight * 0.55) // Increased height
            .attr("rx", 20)
            .attr("fill", "#F0FDF4")
            .attr("stroke", "#BBF7D0")
            .attr("stroke-width", 2);

        svg.append("text")
            .attr("x", margin.left)
            .attr("y", centerY + 40)
            .attr("font-size", 16)
            .attr("font-weight", "bold")
            .attr("fill", "#15803D")
            .text("Circular Sustainable Pathway");

        svg.append("text")
            .attr("x", margin.left + innerWidth)
            .attr("y", centerY + 40)
            .attr("text-anchor", "end")
            .attr("font-size", 14)
            .attr("font-weight", "bold")
            .attr("fill", "#15803D")
            .text(`Impact: ${Math.round(circularRecycled)}% Recycled Input`);

        // Circular Links

        // 1. Virgin Input (Extraction -> Production)
        const virginInputRatio = (100 - circularRecycled) / 100;
        const virginStrokeWidth = Math.max(2, 8 * virginInputRatio);

        const virginCurve = d3.line().curve(d3.curveBasis)([
            [circularNodes[0].x + 35, circularNodes[0].y],
            [(circularNodes[0].x + circularNodes[1].x) / 2, circularNodes[0].y - 20], // Slight curve up
            [circularNodes[1].x - 35, circularNodes[1].y]
        ]);

        svg.append("path")
            .attr("d", virginCurve)
            .attr("stroke", "#EF4444")
            .attr("stroke-width", virginStrokeWidth)
            .attr("fill", "none")
            .attr("marker-end", "url(#arrow-linear)");
        addLabel((circularNodes[0].x + circularNodes[1].x) / 2, circularNodes[0].y - 30, `${Math.round(100 - circularRecycled)}% Virgin`, "#B91C1C", "middle", "10px");

        // 2. Production -> Use
        svg.append("path")
            .attr("d", drawStraight(circularNodes[1], circularNodes[2]))
            .attr("stroke", "#22C55E")
            .attr("stroke-width", 8)
            .attr("fill", "none")
            .attr("marker-end", "url(#arrow-circular)");


        // 3. Use -> Recycling (Curved Down - Improved)
        const recoveryRatio = circularRecovery / 100;
        const recoveryStrokeWidth = Math.max(2, 8 * recoveryRatio);

        const useToRecycleCurve = d3.line().curve(d3.curveBasis)([
            [circularNodes[2].x, circularNodes[2].y + 35],
            [circularNodes[2].x + 20, circularNodes[3].y - 30], // Wider
            [circularNodes[3].x + 45, circularNodes[3].y] // Enter from right
        ]);

        svg.append("path")
            .attr("d", useToRecycleCurve)
            .attr("stroke", "#22C55E")
            .attr("stroke-width", recoveryStrokeWidth)
            .attr("fill", "none")
            .attr("marker-end", "url(#arrow-circular)");

        // Label moved further out
        addLabel(circularNodes[2].x + 60, circularNodes[2].y + 70, `${Math.round(circularRecovery)}% Recovery`, "#15803D", "middle");


        // 4. Recycling -> Production (Curved Up - Improved)
        const recycleToProdCurve = d3.line().curve(d3.curveBasis)([
            [circularNodes[3].x - 45, circularNodes[3].y], // Exit left
            [circularNodes[1].x - 20, circularNodes[3].y - 30], // Wider
            [circularNodes[1].x, circularNodes[1].y + 35] // Enter from bottom
        ]);

        svg.append("path")
            .attr("d", recycleToProdCurve)
            .attr("stroke", "#22C55E")
            .attr("stroke-width", Math.max(2, 8 * (circularRecycled / 100)))
            .attr("fill", "none")
            .attr("stroke-dasharray", "8 4")
            .attr("marker-end", "url(#arrow-circular)");

        // Label moved further out
        addLabel(circularNodes[3].x - 80, circularNodes[3].y - 10, `${Math.round(circularRecycled)}% Input`, "#15803D", "end");


        // 5. Use -> Waste (Leakage)
        if (circularRecovery < 100) {
            const wasteWidth = Math.max(2, 6 * (1 - recoveryRatio));
            const leakageCurve = d3.line().curve(d3.curveBasis)([
                [circularNodes[2].x + 35, circularNodes[2].y],
                [circularNodes[2].x + 90, circularNodes[2].y + 40],
                [circularNodes[2].x + 120, circularNodes[2].y + 60]
            ]);

            svg.append("path")
                .attr("d", leakageCurve)
                .attr("stroke", "#F97316")
                .attr("stroke-width", wasteWidth)
                .attr("fill", "none")
                .attr("marker-end", "url(#arrow-waste)");
            addLabel(circularNodes[2].x + 100, circularNodes[2].y + 50, `${Math.round(100 - circularRecovery)}%`, "#C2410C");
        }

        // Circular Nodes
        const circularNodeSelection = svg.selectAll(".node-circular")
            .data(circularNodes).enter().append("g")
            .attr("class", "node-circular").attr("transform", d => `translate(${d.x},${d.y})`);

        circularNodeSelection.append("circle")
            .attr("r", d => d.id === 'extraction' ? 25 : 35)
            .attr("fill", "white").attr("stroke", d => d.id === 'extraction' ? '#EF4444' : '#22C55E').attr("stroke-width", 3);

        circularNodeSelection.append("image")
            .attr("xlink:href", d => {
                if (d.id === 'extraction') return '/images/extraction.png';
                if (d.id === 'production') return '/images/production.png';
                if (d.id === 'use') return '/images/use phase.png';
                if (d.id === 'recycling') return '/images/recycling.png';
                return '';
            })
            .attr("x", d => d.id === 'extraction' ? -15 : -20)
            .attr("y", d => d.id === 'extraction' ? -15 : -20)
            .attr("width", d => d.id === 'extraction' ? 30 : 40)
            .attr("height", d => d.id === 'extraction' ? 30 : 40);

        circularNodeSelection.append("text")
            .attr("y", 50)
            .attr("text-anchor", "middle")
            .attr("font-weight", "600")
            .attr("fill", "#065F46")
            .attr("font-size", 12)
            .text(d => d.label);


        // --- Animations ---
        // Need to update paths for animations to match new curves

        function translateAlong(path: SVGPathElement) {
            const l = path.getTotalLength();
            return function (t: number) {
                const p = path.getPointAtLength(t * l);
                // simple rotation? nah just translate
                return `translate(${p.x},${p.y})`;
            }
        }

        // We can create invisible paths for animation if we used d3.line directly in draw.
        // But here we constructed them. Let's reconstruct or select them.
        // For simplicity in this edit, I will define function to generate path strings again.

        // Linear animation paths
        const lP1 = drawStraight(linearNodes[0], linearNodes[1]);
        const lP2 = drawStraight(linearNodes[1], linearNodes[2]);
        const lP3 = drawStraight(linearNodes[2], linearNodes[3]);

        // Circular animation paths
        // Note: The curve variables above (virginCurve, etc.) already hold the "d" string if I assigned the result of d3.line()(...)
        // Let's ensure we are using the strings correctly.

        const cP1 = virginCurve;
        const cP2 = drawStraight(circularNodes[1], circularNodes[2]);
        const cP3 = useToRecycleCurve;
        const cP4 = recycleToProdCurve;

        // Animation Helper
        const runAnimation = (element: d3.Selection<SVGCircleElement, unknown, null, undefined>, paths: (string | null)[], delay: number, color: string) => {
            let t = element.transition().delay(delay);
            paths.forEach(p => {
                if (p) {
                    // Create temp path node for calculation
                    const pathNode = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    pathNode.setAttribute("d", p);

                    t = t.duration(1200).ease(d3.easeLinear)
                        .attrTween("transform", () => translateAlong(pathNode));
                }
            });
            t.on("end", function () {
                d3.select(this as SVGCircleElement).attr("opacity", 0);
                // Loop
                runAnimation(d3.select(this as SVGCircleElement).transition().delay(100).attr("opacity", 1) as any, paths, 0, color);
            });
        }

        // Linear Particles
        for (let i = 0; i < 5; i++) {
            runAnimation(svg.append("circle").attr("r", 4).attr("fill", "#EF4444"),
                [lP1, lP2, lP3], i * 1000, "#EF4444");
        }

        // Circular Virgin Particles
        const vC = Math.max(2, Math.ceil(5 * virginInputRatio));
        for (let i = 0; i < vC; i++) {
            runAnimation(svg.append("circle").attr("r", 3).attr("fill", "#EF4444"),
                [cP1, cP2], i * 1500, "#EF4444");
        }

        // Circular Loop Particles
        const lC = Math.max(3, Math.ceil(6 * (circularRecycled / 100)));
        for (let i = 0; i < lC; i++) {
            runAnimation(svg.append("circle").attr("r", 4).attr("fill", "#22C55E"),
                [cP2, cP3, cP4], i * 1200, "#22C55E");
        }


    }, [dimensions, conventionalRecycled, circularRecycled, conventionalRecovery, circularRecovery]);

    return (
        <div ref={containerRef} className="w-full bg-white rounded-xl shadow-lg p-4 overflow-hidden relative">
            <h3 className="text-lg font-bold text-gray-800 mb-2 text-center">Material Flow Simulation</h3>
            <p className="text-sm text-gray-500 text-center mb-4">
                Real-time visualization of material circularity
            </p>

            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-sm border border-slate-100 text-xs z-10">
                <div className="font-bold mb-2 text-slate-700">Visualization Key</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> <span className="text-slate-600">Virgin Material</span></div>
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-green-500"></div> <span className="text-slate-600">Recycled Material</span></div>
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-orange-400"></div> <span className="text-slate-600">Waste/Scrap</span></div>
                </div>
            </div>

            <svg
                ref={svgRef}
                width={dimensions.width}
                height={dimensions.height}
                className="mx-auto"
            />

            {showControls && onRecycledChange && (
                <div className="mt-6 mx-8 px-8 py-5 bg-white rounded-2xl border border-slate-200 shadow-lg flex flex-col gap-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
                    <div className="flex justify-between items-end">
                        <div>
                            <h4 className="text-base font-bold text-slate-800">Circular Input Simulation</h4>
                            <p className="text-xs text-slate-500 mt-1">Adjust the percentage of recycled material in production</p>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-black text-indigo-600 tabular-nums">{Math.round(circularRecycled)}%</span>
                            <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Recycled</span>
                        </div>
                    </div>

                    <div className="relative h-8 flex items-center">
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={circularRecycled}
                            onChange={(e) => onRecycledChange(parseInt(e.target.value))}
                            className="w-full h-3 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                    </div>

                    <div className="flex justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                        <span>Linear (0%)</span>
                        <span>Balanced (50%)</span>
                        <span>Circular (100%)</span>
                    </div>
                </div>
            )}
        </div>
    );
}
