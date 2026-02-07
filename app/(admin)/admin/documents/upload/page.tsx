"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Collection {
  id: string;
  name: string;
}

export default function UploadDocumentPage() {
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    sourceType: "manual" as "upload" | "url" | "manual",
    sourceUrl: "",
    collectionId: "",
  });

  useEffect(() => {
    fetchCollections();
  }, []);

  async function fetchCollections() {
    try {
      const res = await fetch("/api/admin/collections");
      const data = await res.json();
      if (res.ok) {
        setCollections(data.collections);
      }
    } catch (err) {
      console.error("Failed to fetch collections:", err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let res: Response;

      if (pdfFile) {
        // Send PDF as FormData for server-side text extraction
        const data = new FormData();
        data.append("file", pdfFile);
        data.append("title", formData.title);
        if (formData.collectionId) {
          data.append("collectionId", formData.collectionId);
        }

        res = await fetch("/api/admin/documents", {
          method: "POST",
          body: data,
        });
      } else {
        // Existing JSON flow for text content
        const payload = {
          title: formData.title,
          content: formData.content,
          sourceType: formData.sourceType,
          sourceUrl: formData.sourceUrl || null,
          collectionId: formData.collectionId || null,
        };

        res = await fetch("/api/admin/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to upload document");
      }

      router.push("/admin/documents");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    // Check file type
    const allowedTypes = ["text/plain", "text/markdown", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      setError("Only TXT, MD, and PDF files are supported.");
      return;
    }

    if (file.type === "application/pdf") {
      // Store PDF for FormData submission — text extracted server-side
      setPdfFile(file);
      setFormData((prev) => ({
        ...prev,
        title: prev.title || file.name.replace(/\.[^/.]+$/, ""),
        content: "",
        sourceType: "upload",
      }));
      setError(null);
    } else {
      // Read text files directly
      try {
        const content = await file.text();
        setPdfFile(null);
        setFormData((prev) => ({
          ...prev,
          title: prev.title || file.name.replace(/\.[^/.]+$/, ""),
          content,
          sourceType: "upload",
        }));
        setError(null);
      } catch (err) {
        setError("Failed to read file");
      }
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Upload Document</h1>
        <p className="text-zinc-400 mt-1">
          Add a new document to your knowledge base
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/50 border border-red-800 rounded-md px-4 py-3 text-red-200 mb-6">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Source Type Tabs */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setPdfFile(null);
              setFormData((prev) => ({ ...prev, sourceType: "manual" }));
            }}
            className={`px-4 py-2 rounded-md text-sm transition-colors ${
              formData.sourceType === "manual"
                ? "bg-blue-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            Manual Entry
          </button>
          <button
            type="button"
            onClick={() => setFormData((prev) => ({ ...prev, sourceType: "upload" }))}
            className={`px-4 py-2 rounded-md text-sm transition-colors ${
              formData.sourceType === "upload"
                ? "bg-blue-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            File Upload
          </button>
        </div>

        {/* File Upload (if upload mode) */}
        {formData.sourceType === "upload" && (
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Select File
            </label>
            <input
              type="file"
              accept=".txt,.md,.pdf"
              onChange={handleFileUpload}
              className="block w-full text-sm text-zinc-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-medium
                file:bg-zinc-800 file:text-zinc-300
                hover:file:bg-zinc-700
                cursor-pointer"
            />
            <p className="text-xs text-zinc-500 mt-2">
              Supported: TXT, MD, PDF (max 10MB)
            </p>
          </div>
        )}

        {/* PDF file indicator */}
        {pdfFile && (
          <div className="flex items-center gap-3 bg-zinc-800/50 border border-zinc-700 rounded-md px-4 py-3">
            <svg className="w-8 h-8 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <div className="min-w-0">
              <p className="text-sm text-zinc-200 truncate">{pdfFile.name}</p>
              <p className="text-xs text-zinc-500">
                {(pdfFile.size / 1024).toFixed(1)} KB &mdash; text will be extracted on upload
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPdfFile(null)}
              className="ml-auto text-zinc-500 hover:text-zinc-300 text-sm"
            >
              Remove
            </button>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, title: e.target.value }))
            }
            required
            maxLength={200}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Document title"
          />
        </div>

        {/* Collection */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Collection (optional)
          </label>
          <select
            value={formData.collectionId}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, collectionId: e.target.value }))
            }
            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">No collection</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Content (hidden when PDF is selected) */}
        {!pdfFile && (
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Content *
            </label>
            <textarea
              value={formData.content}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, content: e.target.value }))
              }
              required
              rows={15}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="Paste or type your document content here..."
            />
            <p className="text-xs text-zinc-500 mt-2">
              {formData.content.length.toLocaleString()} characters
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading || !formData.title || (!formData.content && !pdfFile)}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md text-sm transition-colors"
          >
            {loading ? "Processing..." : "Upload Document"}
          </button>
          <a
            href="/admin/documents"
            className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded-md text-sm transition-colors"
          >
            Cancel
          </a>
        </div>
      </form>

      {/* Info */}
      <div className="mt-8 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
        <h3 className="text-sm font-medium text-zinc-300 mb-2">
          What happens when you upload?
        </h3>
        <ol className="text-xs text-zinc-500 space-y-1 list-decimal list-inside">
          <li>Document text is extracted (PDF files are parsed automatically)</li>
          <li>Content is split into smaller chunks for better search</li>
          <li>Each chunk is converted to an embedding vector</li>
          <li>Document becomes searchable immediately</li>
        </ol>
      </div>
    </div>
  );
}
