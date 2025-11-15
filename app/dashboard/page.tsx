"use client";

import { useState, useEffect } from "react"; // Added useEffect
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
import { Skeleton } from "@/components/ui/skeleton"; // Added Skeleton
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
  AlertCircle, // Added for error
} from "lucide-react";

// Define the shape of our upload data
interface Upload {
  id: number; // Or string, if from a DB
  fileId: string;
  name: string;
  uploadDate: string;
  status: string;
  size: string;
}

// Hard-coded "initialUploads" array has been REMOVED

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("overview");

  // State for uploads, loading, and errors
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from backend when component mounts
  useEffect(() => {
    const fetchUploads = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // ASSUMPTION: You created this endpoint in your backend
        const response = await fetch("http://127.0.0.1:8000/uploads/list");

        if (!response.ok) {
          throw new Error("Failed to fetch data from backend");
        }

        const data = await response.json();

        // Assuming backend returns { "uploads": [...] }
        setUploads(data.uploads || []);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unknown error occurred";
        setError(errorMessage);
        toast.error("Failed to fetch uploads", { description: errorMessage });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUploads();
  }, []); // Empty array means this runs once on mount

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "analyzing":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const handleDownloadReport = (fileId: string, fileName: string) => {
    toast.info(`Starting download for ${fileName}...`);
    fetch(`http://127.0.0.1:8000/report/${fileId}`)
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
        toast.error(`Error downloading report: ${error.message}`);
      });
  };

  const handleViewPdf = (fileId: string) => {
    toast.info("Opening PDF in new tab...");
    window.open(`http://127.0.0.1:8000/data/${fileId}/uploaded.pdf`, "_blank");
  };

  const handleDelete = (id: number) => {
    // Here you would also call your backend API to delete the file
    // e.g., fetch(`http://127.0.0.1:8000/delete/${id}`, { method: 'DELETE' })

    // For now, we'll just remove it from the UI
    setUploads((prevUploads) =>
      prevUploads.filter((upload) => upload.id !== id),
    );
    toast.success("File removed from list.");
  };

  // Filtered list based on search term
  const filteredUploads = uploads.filter((u) =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Analysis
              </Button>
            </div>

            {/* Stats Cards */}
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
                        {/* This is now DYNAMIC */}
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
                          This Month
                        </p>
                        <p className="text-3xl font-bold text-green-500">12</p>
                        {/* Note: This is still hard-coded, would also need backend logic */}
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
                      Status
                    </label>
                    <div className="space-y-2">
                      {["All", "Completed", "Analyzing", "Failed"].map(
                        (status) => (
                          <label
                            key={status}
                            className="flex items-center space-x-2"
                          >
                            <input type="checkbox" className="rounded" />
                            <span className="text-sm">{status}</span>
                          </label>
                        ),
                      )}
                    </div>
                  </div>
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
                        Your latest uploaded and analyzed contracts
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* --- DYNAMIC CONTENT --- */}
                        {isLoading ? (
                          // Loading State
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
                        ) : error ? (
                          // Error State
                          <div className="flex flex-col items-center justify-center text-center p-8 border rounded-xl">
                            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                            <p className="text-lg font-semibold text-red-500">
                              Failed to load uploads
                            </p>
                            <p className="text-muted-foreground">{error}</p>
                          </div>
                        ) : filteredUploads.length === 0 ? (
                          // Empty State
                          <div className="text-center p-8 border rounded-xl">
                            <p className="text-muted-foreground">
                              No contracts found.
                            </p>
                          </div>
                        ) : (
                          // Success State
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
                                      <span>{upload.uploadDate}</span>
                                      <span>•</span>
                                      <span>{upload.size}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                  <div className="flex items-center space-x-2">
                                    {getStatusIcon(upload.status)}
                                    <span className="text-sm capitalize">
                                      {upload.status}
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
                                        onClick={() =>
                                          handleViewPdf(upload.fileId)
                                        }
                                      >
                                        <Eye className="mr-2 w-4 h-4" />
                                        View PDF
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleDownloadReport(
                                            upload.fileId,
                                            upload.name,
                                          )
                                        }
                                        disabled={upload.status !== "completed"}
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
                        {/* --- END DYNAMIC CONTENT --- */}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="analytics">
                  <Card>
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
                  <Card>
                    <CardHeader>
                      <CardTitle>Generated Reports</CardTitle>
                      <CardDescription>
                        Download and share detailed analysis reports
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
