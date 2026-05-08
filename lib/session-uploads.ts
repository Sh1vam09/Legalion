export const SESSION_UPLOADS_KEY = "legalion-session-uploads";

export interface SessionUpload {
  id: string;
  name: string;
  size: number;
  uploadDate: string;
  status: string;
  progress: number;
  errorMessage?: string;
}

export const readSessionUploads = (): SessionUpload[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.sessionStorage.getItem(SESSION_UPLOADS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (upload): upload is SessionUpload =>
        upload &&
        typeof upload.id === "string" &&
        typeof upload.name === "string" &&
        typeof upload.size === "number" &&
        typeof upload.uploadDate === "string" &&
        typeof upload.status === "string" &&
        typeof upload.progress === "number",
    );
  } catch {
    return [];
  }
};

export const writeSessionUploads = (uploads: SessionUpload[]) => {
  if (typeof window === "undefined") {
    return;
  }

  if (uploads.length === 0) {
    window.sessionStorage.removeItem(SESSION_UPLOADS_KEY);
    return;
  }

  window.sessionStorage.setItem(SESSION_UPLOADS_KEY, JSON.stringify(uploads));
};