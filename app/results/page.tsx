"use client";

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Navigation } from '@/components/navigation';
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
  low: { color: 'bg-green-500', textColor: 'text-green-500', bgColor: 'bg-green-50 dark:bg-green-900/20' }
};

const analysisResults = [
  {
    id: 1,
    title: "Payment Terms Risk",
    description: "Unclear payment milestones and penalty clauses detected",
    risk: "high" as const,
    category: "Financial",
    confidence: 94,
    details: "The contract lacks specific payment milestone definitions and contains ambiguous penalty clauses that could lead to disputes."
  },
  {
    id: 2,
    title: "Timeline Compliance",
    description: "Reasonable completion timeline with standard buffer periods",
    risk: "low" as const,
    category: "Scheduling",
    confidence: 87,
    details: "Timeline provisions appear standard for this type of project with appropriate contingencies built in."
  },
  {
    id: 3,
    title: "Material Specification",
    description: "Some material specifications lack quality standards",
    risk: "medium" as const,
    category: "Quality",
    confidence: 91,
    details: "While most materials are specified, some lack detailed quality standards which could impact project outcomes."
  },
  {
    id: 4,
    title: "Change Order Process",
    description: "Well-defined change order procedures with cost controls",
    risk: "low" as const,
    category: "Process",
    confidence: 89,
    details: "Change order procedures are clearly defined with appropriate approval processes and cost control mechanisms."
  }
];

const keyMetrics = [
  { label: "Overall Risk Score", value: 68, color: "text-yellow-500" },
  { label: "Contract Completeness", value: 82, color: "text-green-500" },
  { label: "Legal Compliance", value: 95, color: "text-green-500" },
  { label: "Financial Clarity", value: 45, color: "text-red-500" }
];

export default function ResultsPage() {
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
                <Button variant="outline" size="sm">
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
              {keyMetrics.map((metric, index) => (
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
                          {metric.value}%
                        </span>
                      </div>
                      <Progress value={metric.value} className="h-2" />
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
                      {analysisResults.map((result, index) => (
                        <motion.div
                          key={result.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                          className={`neomorphic dark:neomorphic-dark rounded-xl p-4 ${riskLevels[result.risk].bgColor}`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className={`w-3 h-3 rounded-full ${riskLevels[result.risk].color}`} />
                              <div>
                                <h3 className="font-semibold">{result.title}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {result.description}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary" className="text-xs">
                                {result.category}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {result.confidence}% confidence
                              </span>
                            </div>
                          </div>
                          <p className="text-sm">{result.details}</p>
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
                        <span className="font-semibold">47</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">High Risk Items</span>
                        <span className="font-semibold text-red-500">3</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Medium Risk Items</span>
                        <span className="font-semibold text-yellow-500">8</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Low Risk Items</span>
                        <span className="font-semibold text-green-500">36</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass dark:glass-dark border-white/20">
                    <CardHeader>
                      <CardTitle>Document Info</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-blue-500" />
                        <div>
                          <p className="font-medium">redevelopment-contract.pdf</p>
                          <p className="text-sm text-muted-foreground">2.4 MB • 24 pages</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Analyzed</span>
                        <span>2 minutes ago</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Processing Time</span>
                        <span>1.3 seconds</span>
                      </div>
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
                    {analysisResults.map((result, index) => (
                      <motion.div
                        key={result.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="neomorphic dark:neomorphic-dark rounded-xl p-6"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className={`w-4 h-4 rounded-full ${riskLevels[result.risk].color}`} />
                            <div>
                              <h3 className="text-lg font-semibold">{result.title}</h3>
                              <Badge variant="outline" className="mt-1">
                                {result.risk.toUpperCase()} RISK
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Confidence</p>
                            <p className="text-lg font-semibold">{result.confidence}%</p>
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-4">{result.description}</p>
                        <p className="text-sm">{result.details}</p>
                        <div className="mt-4 flex items-center space-x-4">
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-2" />
                            View in Contract
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Info className="w-4 h-4 mr-2" />
                            Learn More
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="clauses">
              <Card className="glass dark:glass-dark border-white/20">
                <CardHeader>
                  <CardTitle>Key Clause Analysis</CardTitle>
                  <CardDescription>
                    Important clauses that require attention
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Detailed clause analysis will be displayed here with highlights and annotations.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recommendations">
              <Card className="glass dark:glass-dark border-white/20">
                <CardHeader>
                  <CardTitle>AI Recommendations</CardTitle>
                  <CardDescription>
                    Actionable insights to improve your contract
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Personalized recommendations based on the analysis will be shown here.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}