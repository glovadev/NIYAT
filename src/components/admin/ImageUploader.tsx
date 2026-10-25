"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  X,
  Link as LinkIcon,
  RefreshCw,
  Image as ImageIcon,
} from "lucide-react";
import { auth } from "@/lib/firebase/client";

const MAX_IMAGE_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB limit

interface ImageUploaderProps {
  value: string;
  onChange: (url: string, publicId?: string) => void;
  folder?: string;
  label?: string;
  aspectHint?: string;
}

export function ImageUploader({
  value,
  onChange,
  folder = "products",
  label = "Upload Image",
  aspectHint = "Recommended: Max 1 MB (Square or Portrait)",
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setError(null);

    // 1. Client-Side Size Validation (Maximum 1 MB)
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
      setError(
        `Selected file is ${sizeInMB} MB. Maximum allowed image size is 1 MB. Please compress or choose a smaller image.`
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // 2. Client-Side Format Validation
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (JPG, PNG, WEBP, AVIF, or GIF).");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      setUploading(true);
      setProgress(10);

      // Get Firebase ID token if user is signed in with Firebase, or fallback to dev session
      let token = "dev-admin-session";
      try {
        if (auth.currentUser) {
          token = await auth.currentUser.getIdToken();
        }
      } catch (_) {}

      // Prepare form data
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      // Upload via XMLHttpRequest for accurate real-time progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/admin/upload");
        xhr.withCredentials = true;
        xhr.setRequestHeader("x-dev-admin", "true");
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.min(
              95,
              Math.max(10, Math.round((event.loaded / event.total) * 100))
            );
            setProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const res = JSON.parse(xhr.responseText);
              if (res.success && res.data?.url) {
                setProgress(100);
                onChange(res.data.url, res.data.publicId || res.data.url);
                resolve();
                return;
              }
              reject(new Error(res.error?.message || "Server returned upload error"));
            } catch {
              reject(new Error("Failed to parse server upload response"));
            }
          } else {
            try {
              const res = JSON.parse(xhr.responseText);
              reject(new Error(res.error?.message || `Upload failed (Status: ${xhr.status})`));
            } catch {
              reject(new Error(`Upload failed with status code ${xhr.status}`));
            }
          }
        };

        xhr.onerror = () => {
          reject(new Error("Network connection error during image upload."));
        };

        xhr.ontimeout = () => {
          reject(new Error("Upload request timed out. Please try again."));
        };

        xhr.send(formData);
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload image";
      setError(msg);
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleClearImage = () => {
    onChange("", "");
    setError(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          {label}
        </label>
        <span className="text-[11px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
          Max: 1 MB
        </span>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <div className="flex-1">{error}</div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-400 hover:text-rose-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        onChange={handleInputChange}
        className="hidden"
        disabled={uploading}
      />

      {/* Active Uploading State */}
      {uploading && (
        <div className="p-6 rounded-xl border border-amber-500/30 bg-amber-500/5 flex flex-col items-center justify-center text-center space-y-3">
          <RefreshCw className="w-6 h-6 text-amber-400 animate-spin" />
          <div className="space-y-1.5 w-full max-w-xs">
            <p className="text-xs font-semibold text-slate-200">
              Uploading image... {progress}%
            </p>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
              <div
                className="bg-gradient-to-r from-amber-400 to-amber-500 h-full transition-all duration-150 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Enforcing max 1 MB size limit
            </p>
          </div>
        </div>
      )}

      {/* Preview Card If Value is Present */}
      {!uploading && value && (
        <div className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-900/80 p-2.5 flex items-center gap-3">
          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-slate-950 shrink-0 border border-slate-800 flex items-center justify-center">
            {/* Direct reliable img render */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Uploaded Asset"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to placeholder icon on broken link
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Image Uploaded Successfully</span>
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5" title={value}>
              {value}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">{aspectHint}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleClearImage}
              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
              title="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Empty Dropzone */}
      {!uploading && !value && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all flex flex-col items-center justify-center gap-2 ${
            isDragging
              ? "border-amber-400 bg-amber-400/10 scale-[1.01]"
              : "border-slate-700 hover:border-amber-400/50 bg-slate-900/50 hover:bg-slate-900"
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-200">
              Click to select image or drag and drop here
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Strict limit: <span className="text-amber-400 font-semibold">1 MB maximum</span> (JPG, PNG, WEBP, AVIF)
            </p>
            <p className="text-[10px] text-slate-500 mt-1">{aspectHint}</p>
          </div>
        </div>
      )}

      {/* Toggle to enter direct URL if preferred */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-[11px] text-slate-400 hover:text-amber-400 inline-flex items-center gap-1 transition"
        >
          <LinkIcon className="w-3 h-3" />
          {showUrlInput ? "Hide custom URL input" : "Or enter external URL directly"}
        </button>
      </div>

      {showUrlInput && (
        <div className="pt-1">
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://... image link"
            className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
          />
        </div>
      )}
    </div>
  );
}
