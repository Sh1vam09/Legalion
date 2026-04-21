"use client";

import React, { useMemo, useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { X, AlertTriangle, ShieldCheck, Info, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { forceCollide, forceCenter, forceRadial } from 'd3-force';

// Dynamically import to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { 
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center bg-slate-900/10 rounded-2xl animate-pulse">Initializing Visualization...</div>
});

interface Node {
  id: string;
  label: string;
  group: string;
  color: string;
  val: number;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
  targetRadius?: number;
  __bckgDimensions?: [number, number];
}

interface Link {
  source: string;
  target: string;
  label: string;
  type: string;
}

interface Clause {
  clause_number: any;
  content: string;
  overall_risk_level: string;
  final_analysis_summary: string;
  short_loopholes: any[];
}

interface KnowledgeGraphProps {
  data: {
    nodes: Node[];
    links: Link[];
  };
  clauseAnalysis: Clause[];
}

const LABEL_Y_OFFSET = 12;
const LABEL_CORNER_RADIUS = 6;

const paintNodeLabelBackground = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
) => {
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, width, height, LABEL_CORNER_RADIUS);
  } else {
    ctx.rect(x, y, width, height);
  }
  ctx.fill();
};

const getNodeRadius = (node: Pick<Node, 'val'> | { val?: number }) => {
  const val = Number(node?.val ?? 12);
  return Math.max(10, Math.sqrt(val) * 4);
};

const getEstimatedLabelHalfWidth = (
  node: Pick<Node, 'label'> | { label?: string }
) => {
  const label = String(node?.label ?? '').trim();
  return Math.max(28, label.length * 4.8);
};

const getCollisionRadius = (
  node: Pick<Node, 'val' | 'label'> | { val?: number; label?: string }
) => {
  return Math.max(
    getNodeRadius(node) + 35,
    getEstimatedLabelHalfWidth(node) + 20
  );
};

const getLinkDistance = (link: { source?: any; target?: any }) => {
  const source = (link?.source ?? {}) as Node;
  const target = (link?.target ?? {}) as Node;
  const sourceGroup = String(source.group ?? '').toLowerCase();
  const targetGroup = String(target.group ?? '').toLowerCase();
  const sourceRadius = Number(source.targetRadius ?? 0);
  const targetRadius = Number(target.targetRadius ?? 0);
  const ringGap = Math.abs(sourceRadius - targetRadius);

  // Distances for clause-entity connections
  if (sourceGroup === 'entity' || targetGroup === 'entity') {
    return Math.max(180, ringGap + 80);
  }

  return Math.max(150, ringGap + 60);
};

const positionNodesOnRing = (
  nodes: Node[],
  radius: number,
  angleOffset = 0
) => {
  if (nodes.length === 0) return [];

  return nodes.map((node, index) => {
    const angle = angleOffset + (index / nodes.length) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    return {
      ...node,
      targetRadius: radius,
      x,
      y,
      fx: x,
      fy: y,
    };
  });
};

const positionNodesAcrossRings = (
  nodes: Node[],
  startRadius: number,
  ringGap: number,
  maxNodesPerRing: number,
  angleOffset = 0
) => {
  const positionedNodes: Node[] = [];

  for (let index = 0; index < nodes.length; index += maxNodesPerRing) {
    const ringNodes = nodes.slice(index, index + maxNodesPerRing);
    const ringIndex = Math.floor(index / maxNodesPerRing);
    positionedNodes.push(
      ...positionNodesOnRing(
        ringNodes,
        startRadius + ringIndex * ringGap,
        angleOffset + ringIndex * 0.35
      )
    );
  }

  return positionedNodes;
};

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ data, clauseAnalysis }) => {
  const fgRef = useRef<any>();
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [hoverNode, setHoverNode] = useState<any>(null);
  const normalizeClauseKey = (value: unknown) =>
    String(value ?? '')
      .replace(/^clause\s*/i, '')
      .trim()
      .toLowerCase();

  // Memoize data to prevent unnecessary re-renders
  const graphData = useMemo(() => {
    const clauseRiskLookup = new Map(
      clauseAnalysis.map(clause => [
        normalizeClauseKey(clause.clause_number),
        clause.overall_risk_level,
      ])
    );

    const seen = new Set();
    const uniqueNodes = data.nodes.filter(n => {
      const nid = String(n.id).trim();
      if (seen.has(nid)) return false;
      seen.add(nid);
      return true;
    }).map(node => {
      const normalizedId = String(node.id).trim();
      const riskLevel = clauseRiskLookup.get(normalizeClauseKey(normalizedId)) ?? 'Not Assessed';

      return {
        ...node,
        id: normalizedId,
        riskLevel,
      };
    });

    const entityNodes = uniqueNodes.filter(node => String(node.group).toLowerCase() === 'entity');
    const clauseNodes = uniqueNodes.filter(
      node => String(node.group).toLowerCase() === 'clause'
    );
    const nonClauseNodes = uniqueNodes.filter(
      node => String(node.group).toLowerCase() !== 'clause' && String(node.group).toLowerCase() !== 'entity'
    );

    const sortedClauseNodes = [...clauseNodes].sort((a, b) => {
      const riskWeight = (riskLevel: string) => {
        if (riskLevel === 'High') return 0;
        if (riskLevel === 'Medium') return 1;
        if (riskLevel === 'Low') return 2;
        return 3;
      };

      const riskDiff = riskWeight(String((a as any).riskLevel)) - riskWeight(String((b as any).riskLevel));
      if (riskDiff !== 0) return riskDiff;

      return String(a.label).localeCompare(String(b.label), undefined, { numeric: true });
    });

    const positionedNodes = [
      ...positionNodesOnRing(entityNodes, 150, -Math.PI / 2),
      ...positionNodesAcrossRings(sortedClauseNodes, 400, 150, 6, -Math.PI / 2),
      ...positionNodesAcrossRings(nonClauseNodes, 750, 120, 8, -Math.PI / 3),
    ];

    // Filter links to only show clause-entity relationships, not clause-clause
    const entityIds = new Set(entityNodes.map(n => n.id));
    const clauseIds = new Set(clauseNodes.map(n => n.id));

    const filteredLinks = data.links.filter(link => {
      const sourceId = String(link.source).trim();
      const targetId = String(link.target).trim();
      const sourceIsEntity = entityIds.has(sourceId);
      const targetIsEntity = entityIds.has(targetId);
      const sourceIsClause = clauseIds.has(sourceId);
      const targetIsClause = clauseIds.has(targetId);

      // Keep only clause-entity or entity-clause edges
      return (sourceIsClause && targetIsEntity) || (sourceIsEntity && targetIsClause);
    }).map(link => ({
      ...link,
      source: String(link.source).trim(),
      target: String(link.target).trim()
    }));

    return {
      nodes: positionedNodes,
      links: filteredLinks
    };
  }, [data, clauseAnalysis]);

  useEffect(() => {
    if (fgRef.current) {
      const fg = fgRef.current;

      // Disable forces since nodes are positioned at fixed coordinates
      fg.d3Force('charge', null);
      fg.d3Force('link', null);
      fg.d3Force('center', forceCenter(0, 0));
      fg.d3Force('radial', null);
      fg.d3Force('collide', null);

      // Zoom to fit after initial render
      setTimeout(() => {
        fg.zoomToFit(400, 100);
      }, 400);
    }
  }, [graphData]);

  const selectedClause = useMemo(() => {
    if (!selectedNode) return null;

    const nodeId    = String(selectedNode.id    ?? '').trim();
    const nodeLabel = String(selectedNode.label  ?? '').toLowerCase().trim();
    const nodeGroup = String(selectedNode.group  ?? '').toLowerCase();

    // Entity nodes (Developer, Society, etc.) — never show clause detail
    if (nodeGroup === 'entity') return null;
    // Also skip if it clearly isn't a clause (no 'clause' in label and group != 'clause')
    const looksLikeClause = nodeGroup === 'clause' || nodeLabel.includes('clause');
    if (!looksLikeClause) return null;

    // Extract the trailing number from id or label robustly.
    // Handles: id="3", id="Clause 3", label="clause 3", label="clause unknown_5"
    const selectedKeys = new Set([
      normalizeClauseKey(nodeId),
      normalizeClauseKey(nodeLabel),
    ]);

    return clauseAnalysis.find(c => {
      const clauseKey = normalizeClauseKey(c.clause_number);
      return selectedKeys.has(clauseKey);
    }) ?? null;
  }, [selectedNode, clauseAnalysis]);

  return (
    <div className="relative w-full h-[760px] bg-slate-950/20 rounded-2xl overflow-hidden border border-white/10 shadow-2xl transition-all duration-500">
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        nodeLabel="label"
        nodeColor={node => (node as Node).color}
        nodeRelSize={10} // Larger nodes for better clickability
        nodeVal={node => (node as Node).val}
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={0.85}
        linkCurvature={0.4}
        linkLabel="label"
        linkColor={() => "rgba(147, 197, 253, 0.7)"}
        linkWidth={2.5}
        backgroundColor="rgba(0,0,0,0)"
        enableNodeDrag={false}
        warmupTicks={80}
        cooldownTicks={220}
        onNodeClick={(node: any) => {
          setSelectedNode(node);
          toast.info(`Inspecting: ${node.label}`);
          if (fgRef.current) {
            // Shift the camera center to the right so the node appears on the left,
            // avoiding the z-[100] right-side detail panel.
            fgRef.current.centerAt(node.x + 200, node.y, 800);
            fgRef.current.zoom(2, 800);
          }
        }}
        onNodeHover={(node: any) => {
          setHoverNode(node);
          if (fgRef.current && fgRef.current.getCanvasElement()) {
            fgRef.current.getCanvasElement().style.cursor = node ? 'pointer' : 'default';
          }
        }}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const label = node.label;
          const fontSize = 12 / globalScale;
          ctx.font = `${fontSize}px 'Outfit', sans-serif`;
          const textWidth = ctx.measureText(label).width;
          const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.4) as [number, number];
          const labelX = node.x - bckgDimensions[0] / 2;
          const labelY = node.y + LABEL_Y_OFFSET;
          const nodeRadius = getNodeRadius(node as Node);

          const isSelected = selectedNode && String(selectedNode.id) === String(node.id);
          const isHovered = hoverNode && String(hoverNode.id) === String(node.id);
          
          // Outer Glow
          if (isSelected || isHovered) {
             ctx.beginPath();
             ctx.arc(node.x, node.y, nodeRadius + (isHovered ? 6 : 4), 0, 2 * Math.PI, false);
             ctx.fillStyle = isSelected ? 'rgba(96, 165, 250, 0.3)' : 'rgba(255, 255, 255, 0.15)';
             ctx.fill();
             ctx.strokeStyle = isSelected ? '#60a5fa' : 'rgba(255, 255, 255, 0.5)';
             ctx.lineWidth = (isSelected ? 3 : 2) / globalScale;
             ctx.stroke();
          }

          // Central Node Circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI, false);
          ctx.fillStyle = node.color;
          ctx.shadowBlur = 10;
          ctx.shadowColor = node.color;
          ctx.fill();
          ctx.shadowBlur = 0; // Reset shadow

          // Label Background (More opaque for readability)
          ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
          paintNodeLabelBackground(ctx, labelX, labelY, bckgDimensions[0], bckgDimensions[1]);

          // Label Text
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = isSelected ? '#60a5fa' : '#ffffff';
          ctx.font = `bold ${fontSize}px 'Outfit', sans-serif`;
          ctx.fillText(label, node.x, labelY + (bckgDimensions[1] / 2));
          
          node.__bckgDimensions = bckgDimensions; 
        }}
        nodePointerAreaPaint={(node: any, color, ctx) => {
          const nodeRadius = getNodeRadius(node as Node);
          ctx.fillStyle = color;

          // 1. Draw a precise circle for the node hit area (just 4px padding instead of 30px)
          ctx.beginPath();
          ctx.arc(node.x, node.y, nodeRadius + 4, 0, 2 * Math.PI);
          ctx.fill();

          // 2. Draw a precise rectangle for the label hit area
          if (node.__bckgDimensions) {
            const [w, h] = node.__bckgDimensions;
            const labelX = node.x - w / 2;
            const labelY = node.y + LABEL_Y_OFFSET;

            ctx.beginPath();
            // Add a tiny 2px padding around the exact text box boundaries
            ctx.rect(labelX - 2, labelY - 2, w + 4, h + 4);
            ctx.fill();
          }
        }}
        linkCanvasObject={(link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const source = link.source;
          const target = link.target;

          if (!source || !target || !source.x || !target.x) return;

          const sourceGroup = String(source.group ?? '').toLowerCase();
          const targetGroup = String(target.group ?? '').toLowerCase();
          const sourceIsEntity = sourceGroup === 'entity';
          const targetIsEntity = targetGroup === 'entity';

          // Determine which node is entity (center) and which is clause (outer)
          const entityNode = sourceIsEntity ? source : target;
          const clauseNode = targetIsEntity ? source : target;

          // Calculate angle from entity to clause for offset direction
          const dx = clauseNode.x - entityNode.x;
          const dy = clauseNode.y - entityNode.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);

          // Perpendicular angle for curve offset
          const perpAngle = angle + Math.PI / 2;

          // Control point offset - curves outward to avoid other nodes
          const curvature = 0.3;
          const controlOffset = dist * curvature;

          const midX = (entityNode.x + clauseNode.x) / 2;
          const midY = (entityNode.y + clauseNode.y) / 2;

          // Control point curves outward from center
          const cx = midX + Math.cos(perpAngle) * controlOffset;
          const cy = midY + Math.sin(perpAngle) * controlOffset;

          // Draw bezier curve
          ctx.beginPath();
          ctx.moveTo(entityNode.x, entityNode.y);
          ctx.quadraticCurveTo(cx, cy, clauseNode.x, clauseNode.y);

          // Gradient color based on connection type
          ctx.strokeStyle = 'rgba(147, 197, 253, 0.6)';
          ctx.lineWidth = 2 / globalScale;
          ctx.stroke();
        }}
        linkCanvasObjectMode={() => 'replace'}
      />
      
      {/* Visual Overlay Legend */}
      <div className="absolute bottom-6 left-6 p-5 glass dark:glass-dark rounded-3xl border border-white/10 text-[10px] space-y-3 pointer-events-none z-10 backdrop-blur-xl shadow-2xl">
        <div className="font-bold mb-1 uppercase tracking-widest text-[#60a5fa] flex items-center">
          <Info className="w-3 h-3 mr-2" /> Risk Map Guide
        </div>
        {[
          { color: '#ff4d4d', label: 'High Priority Risk' },
          { color: '#fbbf24', label: 'Medium Priority' },
          { color: '#34d399', label: 'Low Frequency' },
          { color: '#3b82f6', label: 'Contract Entity' },
          { color: '#8b5cf6', label: 'Entity Reference' }
        ].map(item => (
          <div key={item.label} className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)] border border-white/20" style={{ backgroundColor: item.color }} />
            <span className="text-slate-300 font-medium">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Floating Detail Panel - Using Fixed to avoid clipping */}
      <AnimatePresence mode="wait">
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            className="absolute top-4 right-4 bottom-4 w-[420px] glass dark:glass-dark border border-white/20 p-8 overflow-y-auto z-[100] backdrop-blur-3xl shadow-2xl rounded-[2.5rem]"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-1">
                <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px] py-0 px-2 uppercase tracking-tight">Clause Intelligence</Badge>
                <h2 className="text-2xl font-bold tracking-tight text-white">{selectedNode.label}</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedNode(null)} className="rounded-full hover:bg-white/10 text-white/50 h-10 w-10">
                <X className="w-6 h-6" />
              </Button>
            </div>

            {selectedClause ? (
              <div className="space-y-8">
                <div className="flex items-center justify-between p-5 bg-white/5 rounded-3xl border border-white/5 shadow-inner">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3.5 h-3.5 rounded-full shadow-lg ${
                      selectedClause.overall_risk_level === 'High' ? 'bg-red-500 animate-pulse' : 'bg-green-500'
                    }`} />
                    <span className="font-bold text-sm tracking-tight">{selectedClause.overall_risk_level.toUpperCase()} RISK SCORE</span>
                  </div>
                  {selectedClause.overall_risk_level === 'High' ? <AlertTriangle className="w-6 h-6 text-red-400" /> : <ShieldCheck className="w-6 h-6 text-green-400" />}
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center ml-2">
                    <Search className="w-3 h-3 mr-2 text-blue-400" /> Legal Provision
                  </h3>
                  <div className="p-6 rounded-3xl bg-black/50 border border-white/5 italic text-slate-300 leading-relaxed text-sm shadow-xl">
                    "{selectedClause.content}"
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">Contextual Summary</h3>
                  <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/10 text-slate-200 leading-relaxed text-sm shadow-inner group">
                    <p className="group-hover:text-white transition-colors">{selectedClause.final_analysis_summary}</p>
                  </div>
                </div>

                {selectedClause.short_loopholes.length > 0 && (
                  <div className="space-y-5">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">Identified Vulnerabilities</h3>
                    <div className="grid gap-4">
                      {selectedClause.short_loopholes.map((lh, idx) => (
                        <div key={idx} className="p-5 rounded-3xl bg-red-500/5 border border-red-500/10 hover:border-red-500/40 transition-all group shadow-sm">
                           <p className="font-bold text-sm text-red-300 mb-2 group-hover:text-red-200 transition-colors tracking-tight">{lh.short_desc}</p>
                           <div className="flex items-center text-[10px] text-slate-400">
                             <div className="w-1 h-1 rounded-full bg-red-500/50 mr-2" />
                             <span className="font-medium">Potential Impact: {lh.impact_on}</span>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[70%] text-center space-y-8">
                <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center border border-white/10 shadow-2xl relative overflow-hidden group">
                   <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
                   {selectedNode.group === 'Clause' ? <AlertTriangle className="w-12 h-12 text-amber-500/40" /> : <Info className="w-12 h-12 text-blue-500/40" />}
                </div>
                <div className="space-y-3 px-8">
                  <p className="text-lg font-bold text-slate-200">
                    {selectedNode.group === 'Clause' ? "Analysis in Progress" : "Strategic Entity"}
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    {selectedNode.group === 'Clause' 
                      ? "The detailed risk mapping for this clause is being processed or was not found in the primary index. Please re-upload your document to refresh the data grid." 
                      : "This node represents an extracted contract party or entity. Its connections show where the contract references it or assigns obligations to it."}
                  </p>
                </div>
              </div>
            )}
            
            <div className="mt-10 pt-10 border-t border-white/5">
               <Button variant="outline" className="w-full rounded-[2rem] border-white/10 hover:bg-white/5 text-[10px] font-bold text-slate-400 tracking-widest uppercase py-6" onClick={() => setSelectedNode(null)}>
                 Close Detail View
               </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
