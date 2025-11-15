"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Navigation } from "@/components/navigation";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  X,
  Download,
  Eye
} from "lucide-react";
import { toast } from "sonner";

interface UploadedFile {
  file: File;
  id: string; // This will be the file_id from the backend
<<<<<<< HEAD
  status:
    | "uploading"
    | "segmenting"
    | "analyzing_ambiguity"
    | "deep_analysis"
    | "complete"
    | "error";
=======
  status: 'uploading' | 'segmenting' | 'analyzing_ambiguity' | 'deep_analysis' | 'complete' | 'error';
>>>>>>> c72386350dbf4ce3a9868a67c8d8b251ddd306cf
  progress: number;
  errorMessage?: string;
}

export default function UploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);

<<<<<<< HEAD
  // Function to run the analysis pipeline after a successful upload
  const startAnalysis = async (fileId: string) => {
    try {
      // Step 2: Segment Clauses (25%)
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: "segmenting", progress: 25 } : f,
        ),
      );
      const segmentResponse = await fetch(
        `http://127.0.0.1:8000/segment/${fileId}`,
        { method: "POST" },
      );
      if (!segmentResponse.ok) throw new Error("Segmentation failed");

      // Step 3: Ambiguity Analysis (50%)
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, status: "analyzing_ambiguity", progress: 50 }
            : f,
        ),
      );
      const ambiguityResponse = await fetch(
        `http://127.0.0.1:8000/analyze/ambiguity/${fileId}`,
        { method: "POST" },
      );
      if (!ambiguityResponse.ok) throw new Error("Ambiguity analysis failed");

      // Step 4: Deep Analysis (75%)
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: "deep_analysis", progress: 75 } : f,
        ),
      );
      const deepAnalysisResponse = await fetch(
        `http://127.0.0.1:8000/analyze/deep/${fileId}`,
        { method: "POST" },
      );
      if (!deepAnalysisResponse.ok) throw new Error("Deep analysis failed");

      // Step 5: Complete (100%)
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: "complete", progress: 100 } : f,
        ),
      );

      toast.success(`File analysis completed successfully!`);
    } catch (error) {
      let errorMessage = "An unknown error occurred during analysis.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: "error", errorMessage } : f,
        ),
=======
  const startAnalysis = async (fileId: string) => {
    try {
      // Step 2: Segment Clauses
      setUploadedFiles(prev =>
        prev.map(f => (f.id === fileId ? { ...f, status: 'segmenting', progress: 25 } : f))
      );
      const segmentResponse = await fetch(`http://127.0.0.1:8000/segment/${fileId}`, { method: 'POST' });
      if (!segmentResponse.ok) throw new Error('Segmentation failed');

      // Step 3: Ambiguity Analysis
      setUploadedFiles(prev =>
        prev.map(f => (f.id === fileId ? { ...f, status: 'analyzing_ambiguity', progress: 50 } : f))
      );
      const ambiguityResponse = await fetch(`http://127.0.0.1:8000/analyze/ambiguity/${fileId}`, { method: 'POST' });
      if (!ambiguityResponse.ok) throw new Error('Ambiguity analysis failed');

      // Step 4: Deep Analysis
      setUploadedFiles(prev =>
        prev.map(f => (f.id === fileId ? { ...f, status: 'deep_analysis', progress: 75 } : f))
      );
      const deepAnalysisResponse = await fetch(`http://127.0.0.1:8000/analyze/deep/${fileId}`, { method: 'POST' });
      if (!deepAnalysisResponse.ok) throw new Error('Deep analysis failed');
      
      // Step 5: Complete
      setUploadedFiles(prev =>
        prev.map(f => (f.id === fileId ? { ...f, status: 'complete', progress: 100 } : f))
      );

      toast.success(`File analysis completed successfully!`);

    } catch (error) {
        let errorMessage = "An unknown error occurred during analysis.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
      setUploadedFiles(prev =>
        prev.map(f => (f.id === fileId ? { ...f, status: 'error', errorMessage } : f))
>>>>>>> c72386350dbf4ce3a9868a67c8d8b251ddd306cf
      );
      toast.error(errorMessage);
    }
  };

<<<<<<< HEAD
  // Function to handle the initial file upload to the FastAPI backend
=======
>>>>>>> c72386350dbf4ce3a9868a67c8d8b251ddd306cf
  const processFile = async (file: File) => {
    const tempId = Math.random().toString(36).substring(2, 15);
    const newFile: UploadedFile = {
      file,
      id: tempId,
<<<<<<< HEAD
      status: "uploading",
      progress: 0,
    };
    setUploadedFiles((prev) => [...prev, newFile]);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch("http://127.0.0.1:8000/upload", {
        method: "POST",
=======
      status: 'uploading',
      progress: 0,
    };
    setUploadedFiles(prev => [...prev, newFile]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadResponse = await fetch('http://127.0.0.1:8000/upload', {
        method: 'POST',
>>>>>>> c72386350dbf4ce3a9868a67c8d8b251ddd306cf
        body: formData,
      });

      if (!uploadResponse.ok) {
<<<<<<< HEAD
        throw new Error("Upload failed");
      }

=======
        throw new Error('Upload failed');
      }
      
>>>>>>> c72386350dbf4ce3a9868a67c8d8b251ddd306cf
      const result = await uploadResponse.json();
      const fileId = result.file_id;

      // Update the file in the state with the actual file_id from the backend
<<<<<<< HEAD
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === tempId ? { ...f, id: fileId, progress: 100 } : f,
        ),
      );

      toast.success(`${file.name} uploaded successfully!`);
      // Start the analysis pipeline immediately after upload success
      startAnalysis(fileId);
    } catch (error) {
      let errorMessage = "An unknown error occurred during upload.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === tempId ? { ...f, status: "error", errorMessage } : f,
        ),
=======
      setUploadedFiles(prev =>
        prev.map(f => (f.id === tempId ? { ...f, id: fileId, progress: 100 } : f))
      );
      
      toast.success(`${file.name} uploaded successfully!`);
      startAnalysis(fileId);

    } catch (error) {
        let errorMessage = "An unknown error occurred during upload.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
      setUploadedFiles(prev =>
        prev.map(f => (f.id === tempId ? { ...f, status: 'error', errorMessage } : f))
>>>>>>> c72386350dbf4ce3a9868a67c8d8b251ddd306cf
      );
      toast.error(errorMessage);
    }
  };

<<<<<<< HEAD
  // Dropzone handling
  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        processFile(file);
      } else {
        toast.error("Please upload PDF files only");
=======
  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        processFile(file);
      } else {
        toast.error('Please upload PDF files only');
>>>>>>> c72386350dbf4ce3a9868a67c8d8b251ddd306cf
      }
    });
    setIsDragActive(false);
  }, []);

<<<<<<< HEAD
  const {
    getRootProps,
    getInputProps,
    isDragActive: dropzoneActive,
  } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
=======
  const { getRootProps, getInputProps, isDragActive: dropzoneActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
>>>>>>> c72386350dbf4ce3a9868a67c8d8b251ddd306cf
    },
    multiple: true,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
  });

  const removeFile = (id: string) => {
<<<<<<< HEAD
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Function to view the RESULTANT REPORT PDF in a new tab
  const handleViewPdf = (fileId: string) => {
    toast.info("Opening Analysis Report in new tab...");
    // Hits the FastAPI endpoint that generates/serves the report PDF
    window.open(`http://127.0.0.1:8000/report/${fileId}`, "_blank");
  };

  // Function to download the REPORT PDF
  const handleDownloadReport = async (fileId: string, fileName: string) => {
    toast.info(`Preparing report download for ${fileName}...`);
    try {
      const response = await fetch(`http://127.0.0.1:8000/report/${fileId}`);
      if (!response.ok) {
        throw new Error("Could not fetch the report.");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Force download with a clear file name
      a.download = `${fileName.replace(".pdf", "")}_Analysis_Report.pdf`; 
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Report downloaded successfully!");
    } catch (error) {
      let errorMessage = "Could not download report.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    }
  };
  
  // Status icons and text
  const getStatusIcon = (status: UploadedFile["status"]) => {
    switch (status) {
      case "uploading":
      case "segmenting":
      case "analyzing_ambiguity":
      case "deep_analysis":
=======
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };
    
  const handleViewResults = async (fileId: string) => {
    try {
        const response = await fetch(`http://127.0.0.1:8000/report/${fileId}`);
        if (!response.ok) {
            throw new Error('Could not fetch the report.');
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        window.URL.revokeObjectURL(url);
    } catch (error) {
        let errorMessage = "Could not fetch report.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        toast.error(errorMessage);
    }
  };


  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
      case 'segmenting':
      case 'analyzing_ambiguity':
      case 'deep_analysis':
>>>>>>> c72386350dbf4ce3a9868a67c8d8b251ddd306cf
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"
          />
        );
<<<<<<< HEAD
      case "complete":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
=======
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
>>>>>>> c72386350dbf4ce3a9868a67c8d8b251ddd306cf
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

<<<<<<< HEAD
  const getStatusText = (status: UploadedFile["status"]) => {
    switch (status) {
      case "uploading":
        return "Uploading...";
      case "segmenting":
        return "Segmenting Clauses...";
      case "analyzing_ambiguity":
        return "Analyzing Ambiguity...";
      case "deep_analysis":
        return "Deep Analysis...";
      case "complete":
        return "Analysis Complete";
      case "error":
        return "Error occurred";
=======
  const getStatusText = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
        return 'Uploading...';
      case 'segmenting':
        return 'Segmenting Clauses...';
      case 'analyzing_ambiguity':
        return 'Analyzing Ambiguity...';
      case 'deep_analysis':
        return 'Deep Analysis...';
      case 'complete':
        return 'Analysis Complete';
      case 'error':
        return 'Error occurred';
>>>>>>> c72386350dbf4ce3a9868a67c8d8b251ddd306cf
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Navigation />

      <div className="pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
<<<<<<< HEAD
              Upload Your <span className="text-primary">Contract</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Upload your redevelopment contract and let our AI analyze it for
              risks, opportunities, and key insights
=======
              Upload Your <span className="gradient-text">Contract</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Upload your redevelopment contract and let our AI analyze it for risks, opportunities, and key insights
>>>>>>> c72386350dbf4ce3a9868a67c8d8b251ddd306cf
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
<<<<<<< HEAD
            <Card className="mb-8">
=======
            <Card className="glass dark:glass-dark border-white/20 mb-8">
>>>>>>> c72386350dbf4ce3a9868a67c8d8b251ddd306cf
              <CardHeader>
                <CardTitle>Document Upload</CardTitle>
                <CardDescription>
                  Drag and drop your PDF files or click to browse
                </CardDescription>
              </CardHeader>
              <CardContent>
                <motion.div
                  {...getRootProps()}
                  className={`
                    relative p-12 border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer
<<<<<<< HEAD
                    ${
                      isDragActive || dropzoneActive
                        ? "border-primary bg-primary/10"
                        : "border-muted-foreground/25 hover:border-primary/50"
=======
                    ${isDragActive || dropzoneActive 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-muted-foreground/25 hover:border-blue-400'
>>>>>>> c72386350dbf4ce3a9868a67c8d8b251ddd306cf
                    }
                  `}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <input {...getInputProps()} />
                  <div className="text-center">
                    <motion.div
<<<<<<< HEAD
                      animate={{
                        y: isDragActive || dropzoneActive ? -10 : 0,
                        scale: isDragActive || dropzoneActive ? 1.1 : 1,
                      }}
                      className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6"
                    >
                      <Upload className="w-8 h-8 text-primary-foreground" />
                    </motion.div>
                    <h3 className="text-xl font-semibold mb-2">
                      {isDragActive || dropzoneActive
                        ? "Drop files here"
                        : "Upload Contract Files"}
=======
                      animate={{ 
                        y: isDragActive || dropzoneActive ? -10 : 0,
                        scale: isDragActive || dropzoneActive ? 1.1 : 1
                      }}
                      className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6"
                    >
                      <Upload className="w-8 h-8 text-white" />
                    </motion.div>
                    <h3 className="text-xl font-semibold mb-2">
                      {isDragActive || dropzoneActive ? 'Drop files here' : 'Upload Contract Files'}
>>>>>>> c72386350dbf4ce3a9868a67c8d8b251ddd306cf
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Support for PDF files up to 50MB each
                    </p>
<<<<<<< HEAD
                    <Button variant="outline">Browse Files</Button>
=======
                    <Button variant="outline" className="neomorphic dark:neomorphic-dark border-0">
                      Browse Files
                    </Button>
>>>>>>> c72386350dbf4ce3a9868a67c8d8b251ddd306cf
                  </div>
                </motion.div>
              </CardContent>
            </Card>

            <AnimatePresence>
              {uploadedFiles.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
<<<<<<< HEAD
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Card>
=======
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Card className="glass dark:glass-dark border-white/20">
>>>>>>> c72386350dbf4ce3a9868a67c8d8b251ddd306cf
                    <CardHeader>
                      <CardTitle>Processing Files</CardTitle>
                      <CardDescription>
                        Track the progress of your document analysis
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {uploadedFiles.map((uploadedFile) => (
                        <motion.div
                          key={uploadedFile.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
<<<<<<< HEAD
                          className="border rounded-xl p-4"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <FileText className="w-5 h-5 text-primary" />
                              <div>
                                <p className="font-medium">
                                  {uploadedFile.file.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {(
                                    uploadedFile.file.size /
                                    1024 /
                                    1024
                                  ).toFixed(2)}{" "}
                                  MB
=======
                          className="neomorphic dark:neomorphic-dark rounded-xl p-4"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <FileText className="w-5 h-5 text-blue-500" />
                              <div>
                                <p className="font-medium">{uploadedFile.file.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
>>>>>>> c72386350dbf4ce3a9868a67c8d8b251ddd306cf
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(uploadedFile.status)}
                              <span className="text-sm font-medium">
                                {getStatusText(uploadedFile.status)}
                              </span>
<<<<<<< HEAD
                              {(uploadedFile.status === "complete" ||
                                uploadedFile.status === "error") && (
=======
                              {(uploadedFile.status === 'complete' || uploadedFile.status === 'error') && (
>>>>>>> c72386350dbf4ce3a9868a67c8d8b251ddd306cf
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFile(uploadedFile.id)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
<<<<<<< HEAD
                          <Progress
                            value={uploadedFile.progress}
                            className="h-2"
                          />
                          {uploadedFile.status === "error" && (
                            <p className="text-sm text-red-500 mt-2">
                              {uploadedFile.errorMessage}
                            </p>
                          )}
                          
                          {/* Final Action Buttons Block */}
                          {uploadedFile.status === "complete" && (
                            <div className="text-right mt-4 space-x-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleViewPdf(uploadedFile.id)
                                }
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Report
                              </Button>
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleDownloadReport(uploadedFile.id, uploadedFile.file.name)
                                }
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download Report
                              </Button>
                            </div>
                          )}
                          
=======
                           <Progress 
                            value={uploadedFile.progress} 
                            className="h-2 bg-muted"
                          />
                           {uploadedFile.status === 'error' && (
                            <p className="text-sm text-red-500 mt-2">{uploadedFile.errorMessage}</p>
                          )}
                          {uploadedFile.status === 'complete' && (
                              <div className="text-right mt-4">
                                <Button 
                                  size="sm" 
                                  onClick={() => handleViewResults(uploadedFile.id)}
                                >
                                  View Report
                                </Button>
                              </div>
                            )}
>>>>>>> c72386350dbf4ce3a9868a67c8d8b251ddd306cf
                        </motion.div>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}