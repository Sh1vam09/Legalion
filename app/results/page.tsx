"use client";
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Navigation } from '@/components/navigation';
import { KnowledgeGraph } from '@/components/knowledge-graph';
import { apiUrl } from '@/lib/api';
import {
  AlertTriangle,
  CheckCircle,
  Info,
  TrendingUp,
  FileText,
  Download,
  Share,
  Eye
} from 'lucide-react';

const riskLevels = {
  high: { color: 'bg-red-500', textColor: 'text-red-500', bgColor: 'bg-red-50 dark:bg-red-900/20' },
  medium: { color: 'bg-yellow-500', textColor: 'text-yellow-500', bgColor: 'bg-yellow-50 dark:bg-yellow-900/20' },
  low: { color: 'bg-green-500', textColor: 'text-green-500', bgColor: 'bg-green-50 dark:bg-green-900/20' },
  'not assessed': { color: 'bg-gray-500', textColor: 'text-gray-500', bgColor: 'bg-gray-50 dark:bg-gray-900/20' }
};

function ResultsContent() {
  const searchParams = useSearchParams();
  const fileId = searchParams.get('fileId');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (fileId) {
      fetch(apiUrl(`/data/${fileId}/final_comprehensive_analysis.json`))
        .then(res => res.json())
        .then(json => {
          setData(json);
          setLoading(false);
        })
        .catch(err => {
          console.error("Error fetching analysis:", err);
          setLoading(false);
        });
    }
  }, [fileId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col space-y-4">
        <h2 className="text-2xl font-bold">No analysis found</h2>
        <p className="text-muted-foreground">Please upload a document first.</p>
        <Button onClick={() => window.location.href = '/upload'}>Go to Upload</Button>
      </div>
    );
  }

  const riskCounts = {
    high: data.clause_analysis.filter((c: any) => c.overall_risk_level === 'High').length,
    medium: data.clause_analysis.filter((c: any) => c.overall_risk_level === 'Medium').length,
    low: data.clause_analysis.filter((c: any) => c.overall_risk_level === 'Low').length,
  };

  const dynamicKeyMetrics = [
    { label: "High Risk Clauses", value: riskCounts.high, color: "text-red-500", suffix: "" },
    { label: "Medium Risk Clauses", value: riskCounts.medium, color: "text-yellow-500", suffix: "" },
    { label: "Low Risk Clauses", value: riskCounts.low, color: "text-green-500", suffix: "" },
    { label: "Total Clauses", value: data.clause_analysis.length, color: "text-blue-500", suffix: "" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-blue-900 dark:to-purple-900">
      <Navigation />

      <div className="pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-2">
                  Analysis <span className="gradient-text">Results</span>
                </h1>
                <p className="text-xl text-muted-foreground">
                  Comprehensive AI analysis of your redevelopment contract
                </p>
              </div>
              <div className="flex items-center space-x-2 mt-4 md:mt-0">
                <Button variant="outline" size="sm" onClick={() => window.open(apiUrl(`/report/${fileId}`), '_blank')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
                <Button variant="outline" size="sm">
                  <Share className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {dynamicKeyMetrics.map((metric, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="glass dark:glass-dark border-white/20">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          {metric.label}
                        </span>
                        <span className={`text-2xl font-bold ${metric.color}`}>
                          {metric.value}{metric.suffix}
                        </span>
                      </div>
                      <Progress value={(metric.value / data.clause_analysis.length) * 100} className="h-2" />
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="glass dark:glass-dark border-white/20">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="risks">Risk Analysis</TabsTrigger>
              <TabsTrigger value="graph">Knowledge Graph</TabsTrigger>
              <TabsTrigger value="clauses">Key Clauses</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card className="glass dark:glass-dark border-white/20">
                    <CardHeader>
                      <CardTitle>Risk Assessment Summary</CardTitle>
                      <CardDescription>
                        Identified risks and their potential impact on your project
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {data.clause_analysis.filter((c: any) => c.overall_risk_level !== 'Low').map((clause: any, index: number) => (
                        <motion.div
                          key={clause.clause_number}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                          className={`neomorphic dark:neomorphic-dark rounded-xl p-4 ${(riskLevels[clause.overall_risk_level.toLowerCase() as keyof typeof riskLevels] || riskLevels['not assessed']).bgColor}`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className={`w-3 h-3 rounded-full ${(riskLevels[clause.overall_risk_level.toLowerCase() as keyof typeof riskLevels] || riskLevels['not assessed']).color}`} />
                              <div>
                                <h3 className="font-semibold">Clause {clause.clause_number}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {clause.content.substring(0, 100)}...
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary" className="text-xs">
                                {clause.overall_risk_level}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm">{clause.final_analysis_summary}</p>
                        </motion.div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card className="glass dark:glass-dark border-white/20">
                    <CardHeader>
                      <CardTitle>Quick Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Total Clauses</span>
                        <span className="font-semibold">{data.clause_analysis.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">High Risk Items</span>
                        <span className="font-semibold text-red-500">{riskCounts.high}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Medium Risk Items</span>
                        <span className="font-semibold text-yellow-500">{riskCounts.medium}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Low Risk Items</span>
                        <span className="font-semibold text-green-500">{riskCounts.low}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass dark:glass-dark border-white/20">
                    <CardHeader>
                      <CardTitle>Systemic Risks</CardTitle>
                      <CardDescription>Cross-clause conflicts detected</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {data.systemic_risks.map((risk: any, index: number) => (
                        <div key={index} className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30">
                          <p className="text-xs font-bold text-orange-600 dark:text-orange-400 mb-1 uppercase">{risk.risk_type}</p>
                          <p className="text-sm mb-2">{risk.description}</p>
                          <div className="flex gap-1">
                            {risk.involved_clauses.map((c: string) => (
                              <Badge key={c} variant="outline" className="text-[10px]">Clause {c}</Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="risks">
              <Card className="glass dark:glass-dark border-white/20">
                <CardHeader>
                  <CardTitle>Detailed Risk Analysis</CardTitle>
                  <CardDescription>
                    In-depth analysis of potential risks and their implications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6">
                    {data.clause_analysis.filter((c: any) => c.overall_risk_level !== 'Low').map((clause: any, index: number) => (
                      <motion.div
                        key={clause.clause_number}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="neomorphic dark:neomorphic-dark rounded-xl p-6"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className={`w-4 h-4 rounded-full ${(riskLevels[clause.overall_risk_level.toLowerCase() as keyof typeof riskLevels] || riskLevels['not assessed']).color}`} />
                            <div>
                              <h3 className="text-lg font-semibold">Clause {clause.clause_number}</h3>
                              <Badge variant="outline" className="mt-1">
                                {clause.overall_risk_level.toUpperCase()} RISK
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-4 italic">"{clause.content.substring(0, 300)}..."</p>
                        <div className="mb-4">
                          <h4 className="font-bold text-sm mb-2">Loopholes & Risks:</h4>
                          <div className="space-y-2">
                            {clause.short_loopholes.map((lh: any, lIndex: number) => (
                              <div key={lIndex} className="p-3 rounded bg-white/50 dark:bg-black/20 border border-white/20">
                                <p className="text-sm font-medium mb-1">{lh.short_desc}</p>
                                <div className="flex gap-2">
                                  <Badge variant="secondary" className="text-[10px]">{lh.loophole_type}</Badge>
                                  <Badge variant="outline" className="text-[10px]">Impact on: {lh.impact_on}</Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <p className="text-sm bg-primary/5 p-4 rounded-lg border border-primary/10">
                          <span className="font-bold">Synthesis: </span>
                          {clause.final_analysis_summary}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="graph">
              <Card className="glass dark:glass-dark border-white/20">
                <CardHeader>
                  <CardTitle>Knowledge Graph visualization</CardTitle>
                  <CardDescription>
                    Visual relationships between clauses, entities, and systemic risks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <KnowledgeGraph
                    data={data.knowledge_graph}
                    clauseAnalysis={data.clause_analysis}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="clauses">
              <Card className="glass dark:glass-dark border-white/20">
                <CardHeader>
                  <CardTitle>Full Clause List</CardTitle>
                  <CardDescription>
                    Overview of all extracted clauses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.clause_analysis.map((clause: any) => (
                      <div key={clause.clause_number} className="p-4 rounded-lg border border-white/10 glass dark:glass-dark">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-bold">Clause {clause.clause_number}</h4>
                          <Badge variant={clause.overall_risk_level === 'High' ? 'destructive' : 'secondary'}>
                            {clause.overall_risk_level} Risk
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{clause.content}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recommendations">
              <Card className="glass dark:glass-dark border-white/20">
                <CardHeader>
                  <CardTitle>AI Strategic Recommendations</CardTitle>
                  <CardDescription>
                    Actionable insights to protect the Society's interests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30">
                      <h4 className="font-bold text-green-700 dark:text-green-400 mb-2">1. Define "Approved Plans" & Quality Standards</h4>
                      <p className="text-sm">Explicitly define what constitutes an 'Approved Plan' (specify the authority and date) and include a detailed specification annexure for materials and finishes to prevent cost-cutting.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30">
                      <h4 className="font-bold text-blue-700 dark:text-blue-400 mb-2">2. Link Timeline to specific Milestones</h4>
                      <p className="text-sm">Replace vague phrases like "all approvals" with a hard deadline or a list of specific mandatory approvals (e.g., IOD, CC). Include liquidated damages for delays.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/30">
                      <h4 className="font-bold text-purple-700 dark:text-purple-400 mb-2">3. Restrict Mortgage Rights</h4>
                      <p className="text-sm">Limit the Developer's right to mortgage the property only to the free-sale component. Require a No Objection Certificate (NOC) from the RWA before any mortgage is registered.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div>Loading component...</div>}>
      <ResultsContent />
    </Suspense>
  );
}
