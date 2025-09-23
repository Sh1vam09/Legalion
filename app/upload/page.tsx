"use client";

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Navigation } from '@/components/navigation';
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';

interface UploadedFile {
  file: File;
  id: string; // This will be the file_id from the backend
  status: 'uploading' | 'segmenting' | 'analyzing_ambiguity' | 'deep_analysis' | 'complete' | 'error';
  progress: number;
  errorMessage?: string;
}

export default function UploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);

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
      );
      toast.error(errorMessage);
    }
  };

  const processFile = async (file: File) => {
    const tempId = Math.random().toString(36).substring(2, 15);
    const newFile: UploadedFile = {
      file,
      id: tempId,
      status: 'uploading',
      progress: 0,
    };
    setUploadedFiles(prev => [...prev, newFile]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadResponse = await fetch('http://127.0.0.1:8000/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }
      
      const result = await uploadResponse.json();
      const fileId = result.file_id;

      // Update the file in the state with the actual file_id from the backend
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
      );
      toast.error(errorMessage);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        processFile(file);
      } else {
        toast.error('Please upload PDF files only');
      }
    });
    setIsDragActive(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive: dropzoneActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: true,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
  });

  const removeFile = (id: string) => {
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
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"
          />
        );
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

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
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-blue-900 dark:to-purple-900">
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
              Upload Your <span className="gradient-text">Contract</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Upload your redevelopment contract and let our AI analyze it for risks, opportunities, and key insights
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <Card className="glass dark:glass-dark border-white/20 mb-8">
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
                    ${isDragActive || dropzoneActive 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-muted-foreground/25 hover:border-blue-400'
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
                        scale: isDragActive || dropzoneActive ? 1.1 : 1
                      }}
                      className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6"
                    >
                      <Upload className="w-8 h-8 text-white" />
                    </motion.div>
                    <h3 className="text-xl font-semibold mb-2">
                      {isDragActive || dropzoneActive ? 'Drop files here' : 'Upload Contract Files'}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Support for PDF files up to 50MB each
                    </p>
                    <Button variant="outline" className="neomorphic dark:neomorphic-dark border-0">
                      Browse Files
                    </Button>
                  </div>
                </motion.div>
              </CardContent>
            </Card>

            <AnimatePresence>
              {uploadedFiles.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Card className="glass dark:glass-dark border-white/20">
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
                          className="neomorphic dark:neomorphic-dark rounded-xl p-4"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <FileText className="w-5 h-5 text-blue-500" />
                              <div>
                                <p className="font-medium">{uploadedFile.file.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(uploadedFile.status)}
                              <span className="text-sm font-medium">
                                {getStatusText(uploadedFile.status)}
                              </span>
                              {(uploadedFile.status === 'complete' || uploadedFile.status === 'error') && (
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