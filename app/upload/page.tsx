"use client";

import { useState, useCallback, useEffect } from "react";
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
import { readSessionUploads, writeSessionUploads, type SessionUpload } from "@/lib/session-uploads";
import { apiUrl, getApiErrorMessage } from "@/lib/api";
import { Upload, FileText, CheckCircle, AlertCircle, X, Download, Eye, TrendingUp, Info, KeyRound, ShieldCheck, Zap, Cpu } from "lucide-react";
import { toast } from "sonner";

const SAMPLE_DOCUMENT = {
  name: "Redevelopment Agreement.pdf",
  url: "/sample-documents/redevelopment-agreement.pdf",
};

const SAMPLE_REPORT = {
  name: "Redevelopment Agreement Risk Clauses Analysis Report.pdf",
  url: "/sample-reports/redevelopment-agreement-clauses-analysis-report.pdf",
};

interface UploadedFile {
  file?: File;
  name: string;
  size: number;
  id: string; // This will be the file_id from the backend
  status:
  | "uploading"
  | "segmenting"
  | "analyzing_ambiguity"
  | "deep_analysis"
  | "complete"
  | "error";
  progress: number;
  uploadDate: string;
  errorMessage?: string;
}

export default function UploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showApiKeyTooltip, setShowApiKeyTooltip] = useState(false);
  const [showApiKeyText, setShowApiKeyText] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash-lite");
  const [isPreparingSample, setIsPreparingSample] = useState(false);

  const syncUploadedFiles = useCallback(
    (updater: (prev: UploadedFile[]) => UploadedFile[]) => {
      setUploadedFiles((prev) => {
        const next = updater(prev);
        const sessionUploads: SessionUpload[] = next.map((file) => ({
          id: file.id,
          name: file.name,
          size: file.size,
          uploadDate: file.uploadDate,
          status: file.status,
          progress: file.progress,
          errorMessage: file.errorMessage,
        }));
        writeSessionUploads(sessionUploads);
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    const sessionUploads = readSessionUploads();
    setUploadedFiles(
      sessionUploads.map((upload) => ({
        id: upload.id,
        name: upload.name,
        size: upload.size,
        status: upload.status as UploadedFile["status"],
        progress: upload.progress,
        uploadDate: upload.uploadDate,
        errorMessage: upload.errorMessage,
      })),
    );
  }, []);

  // Function to run the analysis pipeline after a successful upload
  const startAnalysis = useCallback(async (fileId: string, key: string) => {
    try {
      // Step 2: Segment Clauses (25%)
      syncUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: "segmenting", progress: 25 } : f,
        ),
      );
      const segmentResponse = await fetch(
        apiUrl(`/segment/${fileId}`),
        { method: "POST", headers: { "X-Api-Key": key, "X-Model-Name": selectedModel } },
      );
      if (!segmentResponse.ok) throw new Error("Segmentation failed");

      // Step 3: Ambiguity Analysis (50%)
      syncUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, status: "analyzing_ambiguity", progress: 50 }
            : f,
        ),
      );
      const ambiguityResponse = await fetch(
        apiUrl(`/analyze/ambiguity/${fileId}`),
        { method: "POST", headers: { "X-Api-Key": key, "X-Model-Name": selectedModel } },
      );
      if (!ambiguityResponse.ok) throw new Error("Ambiguity analysis failed");

      // Step 4: Deep Analysis (75%)
      syncUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: "deep_analysis", progress: 75 } : f,
        ),
      );
      const deepAnalysisResponse = await fetch(
        apiUrl(`/analyze/deep/${fileId}`),
        { method: "POST", headers: { "X-Api-Key": key, "X-Model-Name": selectedModel } },
      );
      if (!deepAnalysisResponse.ok) throw new Error("Deep analysis failed");

      // Step 5: Complete (100%)
      syncUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: "complete", progress: 100 } : f,
        ),
      );

      toast.success(`File analysis completed successfully!`);
    } catch (error) {
      const errorMessage = getApiErrorMessage(
        error,
        "An unknown error occurred during analysis.",
      );
      syncUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: "error", errorMessage } : f,
        ),
      );
      toast.error(errorMessage);
    }
  }, [selectedModel, syncUploadedFiles]);

  // Function to handle the initial file upload to the FastAPI backend
  const processFile = useCallback(async (file: File) => {
    if (!apiKey.trim()) {
      toast.error("Please enter your Gemini API key before uploading.");
      return;
    }

    const tempId = Math.random().toString(36).substring(2, 15);
    const newFile: UploadedFile = {
      file,
      name: file.name,
      size: file.size,
      id: tempId,
      status: "uploading",
      progress: 0,
      uploadDate: new Date().toISOString(),
    };
    syncUploadedFiles((prev) => [...prev, newFile]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey.trim());
      formData.append("model_name", selectedModel);

      const uploadResponse = await fetch(apiUrl("/upload"), {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      const result = await uploadResponse.json();
      const fileId = result.file_id;

      // Update the file in the state with the actual file_id from the backend
      syncUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === tempId ? { ...f, id: fileId, progress: 100 } : f,
        ),
      );

      toast.success(`${file.name} uploaded successfully!`);
      // Start the analysis pipeline immediately after upload success
      startAnalysis(fileId, apiKey.trim());
    } catch (error) {
      const errorMessage = getApiErrorMessage(
        error,
        "An unknown error occurred during upload.",
      );
      syncUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === tempId ? { ...f, status: "error", errorMessage } : f,
        ),
      );
      toast.error(errorMessage);
    }
  }, [apiKey, selectedModel, startAnalysis, syncUploadedFiles]);

  const handleSampleUpload = useCallback(async () => {
    if (!apiKey.trim()) {
      toast.error("Please enter your Gemini API key before uploading.");
      return;
    }

    setIsPreparingSample(true);

    try {
      const response = await fetch(SAMPLE_DOCUMENT.url);
      if (!response.ok) {
        throw new Error("Sample document could not be loaded.");
      }

      const blob = await response.blob();
      const sampleFile = new File([blob], SAMPLE_DOCUMENT.name, {
        type: "application/pdf",
      });

      await processFile(sampleFile);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Could not prepare the sample document.";
      toast.error(errorMessage);
    } finally {
      setIsPreparingSample(false);
    }
  }, [apiKey, processFile]);

  // Dropzone handling
  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        processFile(file);
      } else {
        toast.error("Please upload PDF files only");
      }
    });
    setIsDragActive(false);
  }, [processFile]);

  const {
    getRootProps,
    getInputProps,
    isDragActive: dropzoneActive,
  } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    multiple: true,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
  });

  const removeFile = (id: string) => {
    syncUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleStaticPdfDownload = (url: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Function to view the RESULTANT REPORT PDF in a new tab
  const handleViewPdf = (fileId: string) => {
    toast.info("Opening Analysis Report in new tab...");
    // Hits the FastAPI endpoint that generates/serves the report PDF
    window.open(apiUrl(`/report/${fileId}`), "_blank");
  };

  // Function to download the REPORT PDF
  const handleDownloadReport = async (fileId: string, fileName: string) => {
    toast.info(`Preparing report download for ${fileName}...`);
    try {
      const response = await fetch(apiUrl(`/report/${fileId}`));
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
      const errorMessage = getApiErrorMessage(
        error,
        "Could not download report.",
      );
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
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"
          />
        );
      case "complete":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

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
              Upload Your <span className="text-primary">Contract</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Upload your redevelopment contract and let our AI analyze it for
              risks, opportunities, and key insights
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {/* API Key Input Card */}
            <Card className="mb-6 border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base">Gemini API Key</CardTitle>
                  {/* ℹ️ info icon with tooltip */}
                  <div className="relative ml-auto">
                    <button
                      id="api-key-info-btn"
                      type="button"
                      onMouseEnter={() => setShowApiKeyTooltip(true)}
                      onMouseLeave={() => setShowApiKeyTooltip(false)}
                      className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Info className="w-3 h-3" />
                    </button>
                    <AnimatePresence>
                      {showApiKeyTooltip && (
                        <motion.div
                          initial={{ opacity: 0, y: 4, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-7 z-50 w-72 rounded-xl border bg-popover p-3 shadow-xl text-sm text-popover-foreground"
                        >
                          <div className="flex items-start gap-2">
                            <ShieldCheck className="w-4 h-4 mt-0.5 text-green-500 shrink-0" />
                            <p>
                              <span className="font-semibold">Your privacy is protected.</span>{" "}
                              We <span className="font-semibold text-green-600 dark:text-green-400">do not store</span> your contracts or your API key. Everything is processed in memory and discarded after analysis.
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <CardDescription className="text-xs">
                  Required to run the AI analysis. Get yours at{" "}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2"
                  >
                    Google AI Studio
                  </a>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <input
                    id="gemini-api-key-input"
                    type={showApiKeyText ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full rounded-lg border bg-background px-4 py-2.5 pr-24 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKeyText((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showApiKeyText ? "Hide" : "Show"}
                  </button>
                </div>
                {/* Privacy badge */}
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                  <span>We never store your contracts or API key.</span>
                </div>
              </CardContent>
            </Card>

            {/* Model Selector Card */}
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base">AI Model</CardTitle>
                  <span className="ml-auto text-xs text-muted-foreground">Select analysis speed vs. quality</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {/* Option: gemini-2.5-flash-lite */}
                  <button
                    id="model-flash-lite-btn"
                    type="button"
                    onClick={() => setSelectedModel("gemini-2.5-flash-lite")}
                    className={`relative flex flex-col items-start gap-1 rounded-xl border-2 p-4 text-left transition-all duration-200 ${selectedModel === "gemini-2.5-flash-lite"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-muted hover:border-muted-foreground/40"
                      }`}
                  >
                    {selectedModel === "gemini-2.5-flash-lite" && (
                      <span className="absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                        <CheckCircle className="h-3 w-3 text-primary-foreground" />
                      </span>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-semibold">Flash Lite</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug">
                      Faster &amp; cheaper. Great for most contracts.
                    </p>
                    <span className="mt-1 inline-block rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                      gemini-2.5-flash-lite
                    </span>
                  </button>

                  {/* Option: gemini-2.5-flash */}
                  <button
                    id="model-flash-btn"
                    type="button"
                    onClick={() => setSelectedModel("gemini-2.5-flash")}
                    className={`relative flex flex-col items-start gap-1 rounded-xl border-2 p-4 text-left transition-all duration-200 ${selectedModel === "gemini-2.5-flash"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-muted hover:border-muted-foreground/40"
                      }`}
                  >
                    {selectedModel === "gemini-2.5-flash" && (
                      <span className="absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                        <CheckCircle className="h-3 w-3 text-primary-foreground" />
                      </span>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-violet-500" />
                      <span className="text-sm font-semibold">Flash</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug">
                      More powerful. Better for complex contracts.
                    </p>
                    <span className="mt-1 inline-block rounded-full bg-violet-100 dark:bg-violet-900/30 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-400">
                      gemini-2.5-flash
                    </span>
                  </button>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Document Upload</CardTitle>
                <CardDescription>
                  Drag and drop your PDF files or click to browse
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-2xl border border-primary/15 bg-primary/5 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-primary">
                        Sample document ready on this page
                      </p>
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <span className="font-medium">{SAMPLE_DOCUMENT.name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Use the redevelopment agreement below to upload it
                        directly for analysis without browsing your computer.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => window.open(SAMPLE_DOCUMENT.url, "_blank")}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Preview PDF
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSampleUpload}
                        disabled={isPreparingSample}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {isPreparingSample ? "Preparing..." : "Upload for Analysis"}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                        Sample analysed report available on the web
                      </p>
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        <span className="font-medium">{SAMPLE_REPORT.name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Open the finished PDF report for the sample agreement or
                        download it directly from this page.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => window.open(SAMPLE_REPORT.url, "_blank")}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Analysed Report
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          handleStaticPdfDownload(
                            SAMPLE_REPORT.url,
                            SAMPLE_REPORT.name,
                          )
                        }
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download Report
                      </Button>
                    </div>
                  </div>
                </div>

                <motion.div
                  {...getRootProps()}
                  className={`
                    relative p-12 border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer
                    ${isDragActive || dropzoneActive
                      ? "border-primary bg-primary/10"
                      : "border-muted-foreground/25 hover:border-primary/50"
                    }
                  `}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <input {...getInputProps()} />
                  <div className="text-center">
                    <motion.div
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
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Support for PDF files up to 50MB each
                    </p>
                    <Button variant="outline">Browse Files</Button>
                  </div>
                </motion.div>
              </CardContent>
            </Card>

            <AnimatePresence>
              {uploadedFiles.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Card>
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
                          className="border rounded-xl p-4"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <FileText className="w-5 h-5 text-primary" />
                              <div>
                                <p className="font-medium">
                                  {uploadedFile.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {(
                                    uploadedFile.size /
                                    1024 /
                                    1024
                                  ).toFixed(2)}{" "}
                                  MB
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(uploadedFile.status)}
                              <span className="text-sm font-medium">
                                {getStatusText(uploadedFile.status)}
                              </span>
                              {(uploadedFile.status === "complete" ||
                                uploadedFile.status === "error") && (
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
                            <div className="flex justify-end mt-4 space-x-3">
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
                                variant="outline"
                                onClick={() =>
                                  handleDownloadReport(uploadedFile.id, uploadedFile.name)
                                }
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download Report
                              </Button>
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() =>
                                  window.location.href = `/results?fileId=${uploadedFile.id}`
                                }
                              >
                                <TrendingUp className="w-4 h-4 mr-2" />
                                View Analysis Dashboard
                              </Button>
                            </div>
                          )}

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
