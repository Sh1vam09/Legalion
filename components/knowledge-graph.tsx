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

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ data, clauseAnalysis }) => {
  const fgRef = useRef<any>();
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [hoverNode, setHoverNode] = useState<any>(null);

  // Memoize data to prevent unnecessary re-renders
  const graphData = useMemo(() => {
    const seen = new Set();
    const uniqueNodes = data.nodes.filter(n => {
      const nid = String(n.id).trim();
      if (seen.has(nid)) return false;
      seen.add(nid);
      return true;
    }).map(node => ({ ...node, id: String(node.id).trim() }));

    return {
      nodes: uniqueNodes,
      links: data.links.map(link => ({ 
        ...link, 
        source: String(link.source).trim(), 
        target: String(link.target).trim() 
      }))
    };
  }, [data]);

  useEffect(() => {
    if (fgRef.current) {
      const fg = fgRef.current;

      // Stronger repulsion so nodes spread out more
      fg.d3Force('charge').strength(-250);

      // Longer links so clause nodes sit further from their entity
      fg.d3Force('link').distance(140);

      // Centering
      fg.d3Force('center', forceCenter());
      fg.d3Force('center').strength(0.1);

      // Gentle radial pull toward the middle
      fg.d3Force('radial', forceRadial(0, 0).strength(0.04));

      // Collision radius is proportional to node val so larger nodes
      // never overlap — fixes the "can't click buried nodes" problem
      fg.d3Force('collide', forceCollide((node: any) => {
        const val = (node as any).val || 8;
        return Math.sqrt(val) * 12 + 10; // entity≈60  high-risk≈52  low≈44
      }));

      // Zoom to fit after simulation settles
      setTimeout(() => {
        fg.zoomToFit(800, 80);
      }, 1200);
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
    const numFromId    = nodeId.replace(/^clause\s*/i, '').trim();
    const numFromLabel = nodeLabel.replace(/^clause\s*/i, '').trim();

    return clauseAnalysis.find(c => {
      const cNum = String(c.clause_number ?? '').trim();
      return (
        cNum === numFromId    ||
        cNum === numFromLabel ||
        cNum === nodeId       ||
        // fallback: loose includes so "3" matches "Clause 3"
        nodeLabel.includes(cNum)
      );
    }) ?? null;
  }, [selectedNode, clauseAnalysis]);

  return (
    <div className="relative w-full h-[650px] bg-slate-950/20 rounded-2xl overflow-hidden border border-white/10 shadow-2xl transition-all duration-500">
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        nodeLabel="label"
        nodeColor={node => (node as Node).color}
        nodeRelSize={7} // Larger nodes for better visibility
        nodeVal={node => (node as Node).val}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        linkCurvature={0.2}
        linkLabel="label"
        linkColor={() => "rgba(255, 255, 255, 0.2)"}
        linkWidth={1.5}
        backgroundColor="rgba(0,0,0,0)"
        cooldownTicks={150}
        onNodeClick={(node: any) => {
          setSelectedNode(node);
          toast.info(`Inspecting: ${node.label}`);
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

          const isSelected = selectedNode && String(selectedNode.id) === String(node.id);
          const isHovered = hoverNode && String(hoverNode.id) === String(node.id);
          
          // Outer Glow
          if (isSelected || isHovered) {
             ctx.beginPath();
             ctx.arc(node.x, node.y, (isHovered ? 16 : 14), 0, 2 * Math.PI, false);
             ctx.fillStyle = isSelected ? 'rgba(96, 165, 250, 0.3)' : 'rgba(255, 255, 255, 0.15)';
             ctx.fill();
             ctx.strokeStyle = isSelected ? '#60a5fa' : 'rgba(255, 255, 255, 0.5)';
             ctx.lineWidth = (isSelected ? 3 : 2) / globalScale;
             ctx.stroke();
          }

          // Central Node Circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, 7, 0, 2 * Math.PI, false);
          ctx.fillStyle = node.color;
          ctx.shadowBlur = 10;
          ctx.shadowColor = node.color;
          ctx.fill();
          ctx.shadowBlur = 0; // Reset shadow

          // Label Background (More opaque for readability)
          ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
          if (ctx.roundRect) {
            ctx.roundRect(node.x - bckgDimensions[0] / 2, node.y + 12, bckgDimensions[0], bckgDimensions[1], 6);
          } else {
            ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y + 12, bckgDimensions[0], bckgDimensions[1]);
          }
          ctx.fill();

          // Label Text
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = isSelected ? '#60a5fa' : '#ffffff';
          ctx.font = `bold ${fontSize}px 'Outfit', sans-serif`;
          ctx.fillText(label, node.x, node.y + 12 + (bckgDimensions[1] / 2));
          
          node.__bckgDimensions = bckgDimensions; 
        }}
        nodePointerAreaPaint={(node: any, color, ctx) => {
          // Single generous fixed circle — never depends on __bckgDimensions.
          // This guarantees every node is clickable at any zoom level,
          // even before nodeCanvasObject has run for that node on the first frame.
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.x, node.y, 28, 0, 2 * Math.PI, false);
          ctx.fill();
        }}
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
          { color: '#3b82f6', label: 'Developer Party' },
          { color: '#8b5cf6', label: 'Society / RWA' }
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
                      : "This node represents a primary stakeholder. All outgoing connections represent their direct liabilities and duties as defined in the contract."}
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
