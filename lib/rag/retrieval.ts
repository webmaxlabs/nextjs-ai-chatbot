import "server-only";
import { createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/server";
import { generateQueryEmbedding } from "./embeddings";

export interface RetrievalOptions {
  query: string;
  userId: string;
  userType: string;
  topK?: number;
  threshold?: number;
  collectionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface RetrievedDocument {
  id: string;
  title: string;
  content: string;
  similarity: number;
  collectionId: string | null;
}

/**
 * Retrieve relevant documents from the knowledge base
 * based on semantic similarity to the query
 */
export async function retrieveRelevantDocuments(
  options: RetrievalOptions
): Promise<RetrievedDocument[]> {
  const {
    query,
    userId,
    userType,
    topK = 5,
    threshold = 0.7,
    collectionId,
    ipAddress,
    userAgent,
  } = options;

  const startTime = Date.now();

  try {
    // Generate embedding for the query
    const queryEmbedding = await generateQueryEmbedding(query);

    // Perform similarity search using the database function
    const { data, error } = await supabaseAdmin.rpc("match_documents", {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: topK,
      filter_collection_id: collectionId || null,
    });

    if (error) {
      console.error("Document retrieval error:", error);
      throw new Error("Failed to retrieve documents");
    }

    const latencyMs = Date.now() - startTime;

    // Log the search (non-blocking)
    logSearchQuery({
      userId,
      userType,
      queryHash: hashQuery(query),
      resultsCount: data?.length || 0,
      latencyMs,
      ipAddress,
      userAgent,
    }).catch(console.error);

    // Transform results
    interface MatchedDoc {
      id: string;
      title: string;
      content: string;
      similarity: number;
      collection_id: string | null;
    }
    return (data || []).map((doc: MatchedDoc) => ({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      similarity: doc.similarity,
      collectionId: doc.collection_id,
    }));
  } catch (error) {
    const latencyMs = Date.now() - startTime;

    // Log failed search
    logSearchQuery({
      userId,
      userType,
      queryHash: hashQuery(query),
      resultsCount: 0,
      latencyMs,
      ipAddress,
      userAgent,
      metadata: { error: error instanceof Error ? error.message : "Unknown error" },
    }).catch(console.error);

    throw error;
  }
}

/**
 * Hash query for privacy-preserving audit logging
 */
function hashQuery(query: string): string {
  return createHash("sha256").update(query).digest("hex").slice(0, 16);
}

/**
 * Log search query for audit purposes
 */
async function logSearchQuery(params: {
  userId: string;
  userType: string;
  queryHash: string;
  resultsCount: number;
  latencyMs: number;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await supabaseAdmin.from("rag_audit_log").insert({
    event_type: "search_query",
    user_id: params.userId,
    user_type: params.userType,
    query_hash: params.queryHash,
    results_count: params.resultsCount,
    latency_ms: params.latencyMs,
    ip_address: sanitizeIpAddress(params.ipAddress),
    user_agent: sanitizeUserAgent(params.userAgent),
    metadata: params.metadata || null,
  });
}

/**
 * Sanitize IP address for storage
 */
function sanitizeIpAddress(ip?: string): string | null {
  if (!ip) return null;
  // Remove any non-IP characters
  return ip.replace(/[^0-9.:a-fA-F]/g, "").slice(0, 45);
}

/**
 * Sanitize user agent for storage
 */
function sanitizeUserAgent(ua?: string): string | null {
  if (!ua) return null;
  // Truncate and remove potential injection characters
  return ua.replace(/[<>]/g, "").slice(0, 200);
}

/**
 * Build context string from retrieved documents
 * for injection into the AI prompt
 */
export function buildContextFromDocuments(
  documents: RetrievedDocument[]
): string {
  if (documents.length === 0) {
    return "";
  }

  return documents
    .map(
      (doc, index) =>
        `[Source ${index + 1}: ${doc.title}]\n${doc.content}`
    )
    .join("\n\n---\n\n");
}

/**
 * Format source attribution for the response
 */
export function formatSourceAttribution(
  documents: RetrievedDocument[]
): string {
  if (documents.length === 0) {
    return "";
  }

  const uniqueTitles = [...new Set(documents.map((d) => d.title))];
  return `\n\nSources: ${uniqueTitles.join(", ")}`;
}
