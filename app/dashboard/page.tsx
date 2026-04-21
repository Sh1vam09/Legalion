"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navigation } from "@/components/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import {
  readSessionUploads,
  writeSessionUploads,
  type SessionUpload,
} from "@/lib/session-uploads";
import { apiUrl, getApiErrorMessage } from "@/lib/api";
import { toast } from "sonner";
import {
  Search,
  FileText,
  Calendar,
  CheckCircle,
  Clock,
  Plus,
  MoreHorizontal,
  Download,
  Eye,
  Trash2,
  AlertCircle,
} from "lucide-react";

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("overview");
  const [uploads, setUploads] = useState<SessionUpload[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setUploads(readSessionUploads());
    setIsLoading(false);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "complete":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "uploading":
      case "segmenting":
      case "analyzing":
      case "analyzing_ambiguity":
      case "deep_analysis":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "uploading":
        return "Uploading";
      case "segmenting":
        return "Segmenting Clauses";
      case "analyzing":
        return "Analyzing";
      case "analyzing_ambiguity":
        return "Analyzing Ambiguity";
      case "deep_analysis":
        return "Deep Analysis";
      case "complete":
        return "Analysis Complete";
      case "error":
        return "Error";
      default:
        return status;
    }
  };

  const handleDownloadReport = (fileId: string, fileName: string) => {
    toast.info(`Starting download for ${fileName}...`);
    fetch(apiUrl(`/report/${fileId}`))
      .then((response) => {
        if (!response.ok) throw new Error("Could not fetch the report.");
        return response.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${fileName.replace(".pdf", "")}_report.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast.success("Report downloaded!");
      })
      .catch((error) => {
        toast.error(getApiErrorMessage(error, "Error downloading report."));
      });
  };

  const handleViewPdf = (fileId: string) => {
    toast.info("Opening PDF in new tab...");
    window.open(apiUrl(`/data/${fileId}/uploaded.pdf`), "_blank");
  };

  const handleDelete = (id: string) => {
    setUploads((prevUploads) => {
      const nextUploads = prevUploads.filter((upload) => upload.id !== id);
      writeSessionUploads(nextUploads);
      return nextUploads;
    });
    toast.success("File removed from this session.");
  };

  const filteredUploads = uploads.filter((upload) =>
    upload.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const completedUploads = uploads.filter((upload) => upload.status === "complete");

  const formatUploadDate = (uploadDate: string) => {
    const date = new Date(uploadDate);
    if (Number.isNaN(date.getTime())) {
      return uploadDate;
    }

    return date.toLocaleString();
  };

  const formatFileSize = (size: number) => `${(size / 1024 / 1024).toFixed(2)} MB`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
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
                  <span className="text-primary">Dashboard</span>
                </h1>
                <p className="text-xl text-muted-foreground">
                  Manage and track your contract analyses
                </p>
              </div>
              <Button onClick={() => (window.location.href = "/upload")}>
                <Plus className="w-4 h-4 mr-2" />
                New Analysis
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Total Contracts
                        </p>
                        <p className="text-3xl font-bold">{uploads.length}</p>
                      </div>
                      <FileText className="w-8 h-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Completed This Session
                        </p>
                        <p className="text-3xl font-bold text-green-500">
                          {completedUploads.length}
                        </p>
                      </div>
                      <Calendar className="w-8 h-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:col-span-1"
            >
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Search
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Search contracts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Scope
                    </label>
                    <div className="rounded-xl border p-3 text-sm text-muted-foreground">
                      Showing uploads saved in this browser session only.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="lg:col-span-3"
            >
              <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                <TabsList className="mb-6">
                  <TabsTrigger value="overview">Recent Uploads</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  <TabsTrigger value="reports">Reports</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Contract Analyses</CardTitle>
                      <CardDescription>
                        Files from your current browser session
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {isLoading ? (
                          Array.from({ length: 3 }).map((_, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between border rounded-xl p-4"
                            >
                              <div className="flex items-center space-x-4">
                                <Skeleton className="h-8 w-8 rounded-lg" />
                                <div className="space-y-1">
                                  <Skeleton className="h-4 w-48" />
                                  <Skeleton className="h-3 w-32" />
                                </div>
                              </div>
                              <div className="flex items-center space-x-4">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-6 w-6 rounded" />
                              </div>
                            </div>
                          ))
                        ) : filteredUploads.length === 0 ? (
                          <div className="text-center p-8 border rounded-xl">
                            <p className="text-muted-foreground">
                              No contracts found in this session.
                            </p>
                          </div>
                        ) : (
                          filteredUploads.map((upload, index) => (
                            <motion.div
                              key={upload.id}
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.5, delay: index * 0.1 }}
                              className="border rounded-xl p-4 hover:shadow-md transition-all duration-300"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <FileText className="w-8 h-8 text-primary" />
                                  <div>
                                    <p className="font-medium">{upload.name}</p>
                                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                      <Calendar className="w-3 h-3" />
                                      <span>{formatUploadDate(upload.uploadDate)}</span>
                                      <span>&bull;</span>
                                      <span>{formatFileSize(upload.size)}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                  <div className="flex items-center space-x-2">
                                    {getStatusIcon(upload.status)}
                                    <span className="text-sm">
                                      {getStatusText(upload.status)}
                                    </span>
                                  </div>

                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <MoreHorizontal className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => {
                                          window.location.href = `/results?fileId=${upload.id}`;
                                        }}
                                        disabled={upload.status !== "complete"}
                                        className="font-medium text-blue-500 focus:text-blue-600 cursor-pointer"
                                      >
                                        <FileText className="mr-2 w-4 h-4" />
                                        View Analysis Results
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleViewPdf(upload.id)}
                                        disabled={upload.status !== "complete"}
                                        className="cursor-pointer"
                                      >
                                        <Eye className="mr-2 w-4 h-4" />
                                        View Source PDF
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleDownloadReport(upload.id, upload.name)
                                        }
                                        disabled={upload.status !== "complete"}
                                      >
                                        <Download className="mr-2 w-4 h-4" />
                                        Download Report
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => handleDelete(upload.id)}
                                        className="text-red-500"
                                      >
                                        <Trash2 className="mr-2 w-4 h-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </motion.div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="analytics">
                  <Card>
                    <CardHeader>
                      <CardTitle>Analytics Dashboard</CardTitle>
                      <CardDescription>
                        Insights and trends from this session&apos;s uploads
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
                  <Card>
                    <CardHeader>
                      <CardTitle>Generated Reports</CardTitle>
                      <CardDescription>
                        Download reports created in this session
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        Report generation and management interface will be shown
                        here.
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
