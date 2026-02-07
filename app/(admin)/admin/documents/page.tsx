"use client";

import { useState, useEffect } from "react";

interface Document {
  id: string;
  title: string;
  status: string;
  source_type: string;
  collection_id: string | null;
  created_at: string;
  chunk_index: number;
}

interface Collection {
  id: string;
  name: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    collectionId: "",
    status: "",
  });

  useEffect(() => {
    fetchDocuments();
    fetchCollections();
  }, [filter]);

  async function fetchDocuments() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.collectionId) params.set("collectionId", filter.collectionId);
      if (filter.status) params.set("status", filter.status);

      const res = await fetch(`/api/admin/documents?${params}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setDocuments(data.documents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch documents");
    } finally {
      setLoading(false);
    }
  }

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

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/documents?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete document");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Documents</h1>
          <p className="text-zinc-400 mt-1">
            Manage your knowledge base documents
          </p>
        </div>
        <a
          href="/admin/documents/upload"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
        >
          Upload Document
        </a>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <select
          value={filter.collectionId}
          onChange={(e) =>
            setFilter((prev) => ({ ...prev, collectionId: e.target.value }))
          }
          className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white"
        >
          <option value="">All Collections</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={filter.status}
          onChange={(e) =>
            setFilter((prev) => ({ ...prev, status: e.target.value }))
          }
          className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white"
        >
          <option value="">All Statuses</option>
          <option value="published">Published</option>
          <option value="processing">Processing</option>
          <option value="archived">Archived</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/50 border border-red-800 rounded-md px-4 py-3 text-red-200">
          {error}
        </div>
      )}

      {/* Documents Table */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Source
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                  Loading...
                </td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                  No documents found
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-zinc-800/50">
                  <td className="px-6 py-4">
                    <div className="text-sm text-white">{doc.title}</div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-zinc-400 capitalize">
                      {doc.source_type}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-zinc-400">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(doc.id, doc.title)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    published: "bg-green-900/50 text-green-400 border-green-800",
    processing: "bg-yellow-900/50 text-yellow-400 border-yellow-800",
    archived: "bg-zinc-800 text-zinc-400 border-zinc-700",
    failed: "bg-red-900/50 text-red-400 border-red-800",
  };

  return (
    <span
      className={`inline-flex px-2 py-1 text-xs rounded-md border ${
        colors[status] || colors.archived
      }`}
    >
      {status}
    </span>
  );
}
