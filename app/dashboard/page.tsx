"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Navigation } from '@/components/navigation';
import { 
  Search, 
  Filter, 
  FileText, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Plus,
  MoreHorizontal
} from 'lucide-react';

const recentUploads = [
  {
    id: 1,
    name: "Commercial_Redevelopment_Contract_A.pdf",
    uploadDate: "2024-01-15",
    status: "completed",
    riskScore: 68,
    size: "2.4 MB"
  },
  {
    id: 2,
    name: "Residential_Complex_Agreement.pdf",
    uploadDate: "2024-01-14",
    status: "analyzing",
    riskScore: null,
    size: "1.8 MB"
  },
  {
    id: 3,
    name: "Infrastructure_Development_Contract.pdf",
    uploadDate: "2024-01-12",
    status: "completed",
    riskScore: 34,
    size: "3.1 MB"
  },
  {
    id: 4,
    name: "Mixed_Use_Development_Terms.pdf",
    uploadDate: "2024-01-10",
    status: "completed",
    riskScore: 89,
    size: "2.7 MB"
  }
];

const riskCategories = [
  { name: "Financial", count: 12, high: 3, medium: 5, low: 4 },
  { name: "Timeline", count: 8, high: 1, medium: 2, low: 5 },
  { name: "Legal", count: 15, high: 2, medium: 8, low: 5 },
  { name: "Quality", count: 6, high: 0, medium: 3, low: 3 }
];

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("overview");

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'analyzing':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return "text-red-500";
    if (score >= 40) return "text-yellow-500";
    return "text-green-500";
  };

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
                  <span className="gradient-text">Dashboard</span>
                </h1>
                <p className="text-xl text-muted-foreground">
                  Manage and track your contract analyses
                </p>
              </div>
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 mt-4 md:mt-0">
                <Plus className="w-4 h-4 mr-2" />
                New Analysis
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Card className="glass dark:glass-dark border-white/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Total Contracts
                        </p>
                        <p className="text-3xl font-bold">47</p>
                      </div>
                      <FileText className="w-8 h-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="glass dark:glass-dark border-white/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          High Risk
                        </p>
                        <p className="text-3xl font-bold text-red-500">6</p>
                      </div>
                      <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Card className="glass dark:glass-dark border-white/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Avg Risk Score
                        </p>
                        <p className="text-3xl font-bold text-yellow-500">52</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-yellow-500" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Card className="glass dark:glass-dark border-white/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          This Month
                        </p>
                        <p className="text-3xl font-bold text-green-500">12</p>
                      </div>
                      <Calendar className="w-8 h-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:col-span-1"
            >
              <Card className="neomorphic dark:neomorphic-dark border-0 mb-6">
                <CardHeader>
                  <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Search contracts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 neomorphic-inset dark:neomorphic-inset-dark border-0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Status</label>
                    <div className="space-y-2">
                      {['All', 'Completed', 'Analyzing', 'Failed'].map((status) => (
                        <label key={status} className="flex items-center space-x-2">
                          <input type="checkbox" className="rounded" />
                          <span className="text-sm">{status}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Risk Level</label>
                    <div className="space-y-2">
                      {['High (70+)', 'Medium (40-69)', 'Low (0-39)'].map((level) => (
                        <label key={level} className="flex items-center space-x-2">
                          <input type="checkbox" className="rounded" />
                          <span className="text-sm">{level}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="neomorphic dark:neomorphic-dark border-0">
                <CardHeader>
                  <CardTitle>Risk Categories</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {riskCategories.map((category, index) => (
                    <div key={category.name} className="p-3 neomorphic-inset dark:neomorphic-inset-dark rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{category.name}</span>
                        <span className="text-sm text-muted-foreground">{category.count}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="text-red-500">{category.high}H</span>
                        <span className="text-yellow-500">{category.medium}M</span>
                        <span className="text-green-500">{category.low}L</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Main Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="lg:col-span-3"
            >
              <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                <TabsList className="glass dark:glass-dark border-white/20 mb-6">
                  <TabsTrigger value="overview">Recent Uploads</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  <TabsTrigger value="reports">Reports</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                  <Card className="glass dark:glass-dark border-white/20">
                    <CardHeader>
                      <CardTitle>Recent Contract Analyses</CardTitle>
                      <CardDescription>
                        Your latest uploaded and analyzed contracts
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {recentUploads.map((upload, index) => (
                          <motion.div
                            key={upload.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="neomorphic dark:neomorphic-dark rounded-xl p-4 hover:shadow-lg transition-all duration-300"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <FileText className="w-8 h-8 text-blue-500" />
                                <div>
                                  <p className="font-medium">{upload.name}</p>
                                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                    <Calendar className="w-3 h-3" />
                                    <span>{upload.uploadDate}</span>
                                    <span>•</span>
                                    <span>{upload.size}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                  {getStatusIcon(upload.status)}
                                  <span className="text-sm capitalize">{upload.status}</span>
                                </div>
                                {upload.riskScore !== null && (
                                  <div className="text-right">
                                    <p className="text-sm text-muted-foreground">Risk Score</p>
                                    <p className={`text-lg font-bold ${getRiskColor(upload.riskScore)}`}>
                                      {upload.riskScore}
                                    </p>
                                  </div>
                                )}
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="analytics">
                  <Card className="glass dark:glass-dark border-white/20">
                    <CardHeader>
                      <CardTitle>Analytics Dashboard</CardTitle>
                      <CardDescription>
                        Insights and trends from your contract data
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        Analytics charts and insights will be displayed here.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="reports">
                  <Card className="glass dark:glass-dark border-white/20">
                    <CardHeader>
                      <CardTitle>Generated Reports</CardTitle>
                      <CardDescription>
                        Download and share detailed analysis reports
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        Report generation and management interface will be shown here.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}