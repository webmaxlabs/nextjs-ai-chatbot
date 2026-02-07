import "server-only";
import { createHash } from "crypto";
import { generateEmbedding } from "./embeddings";

// Configuration
const CHUNK_SIZE = 1000; // characters per chunk
const CHUNK_OVERLAP = 200; // overlap between chunks

export interface ProcessDocumentInput {
  title: string;
  content: string;
  sourceType: "upload" | "url" | "manual";
  sourceUrl?: string;
  filePath?: string;
  mimeType?: string;
  collectionId?: string;
  createdBy: string;
}

export interface DocumentChunk {
  id?: string;
  title: string;
  content: string;
  content_hash: string;
  embedding: number[];
  chunk_index: number;
  parent_document_id: string | null;
  source_type: "upload" | "url" | "manual";
  source_url: string | null;
  file_path: string | null;
  mime_type: string | null;
  collection_id: string | null;
  created_by: string;
  status: "processing" | "published";
}

/**
 * Process a document into chunks with embeddings
 * Returns array of chunks ready for database insertion
 */
export async function processDocument(
  input: ProcessDocumentInput
): Promise<DocumentChunk[]> {
  // Validate input
  if (!input.content || input.content.trim().length === 0) {
    throw new Error("Document content is empty");
  }

  if (!input.title || input.title.trim().length === 0) {
    throw new Error("Document title is required");
  }

  // Clean the content
  const cleanedContent = cleanContent(input.content);

  // Split into chunks
  const chunks = chunkText(cleanedContent, CHUNK_SIZE, CHUNK_OVERLAP);

  if (chunks.length === 0) {
    throw new Error("Document produced no valid chunks");
  }

  // Generate parent ID for multi-chunk documents
  const parentId = chunks.length > 1 ? crypto.randomUUID() : null;

  const processedChunks: DocumentChunk[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    // Generate embedding for this chunk
    const embedding = await generateEmbedding(chunk);

    // Generate content hash for integrity verification
    const contentHash = createHash("sha256").update(chunk).digest("hex");

    // Create chunk title
    const chunkTitle =
      chunks.length > 1
        ? `${input.title} (Part ${i + 1}/${chunks.length})`
        : input.title;

    processedChunks.push({
      title: chunkTitle,
      content: chunk,
      content_hash: contentHash,
      embedding,
      chunk_index: i,
      parent_document_id: i === 0 ? null : parentId,
      source_type: input.sourceType,
      source_url: input.sourceUrl || null,
      file_path: input.filePath || null,
      mime_type: input.mimeType || null,
      collection_id: input.collectionId || null,
      created_by: input.createdBy,
      status: "published", // Auto-publish
    });
  }

  return processedChunks;
}

/**
 * Split text into overlapping chunks, trying to break at natural boundaries
 */
function chunkText(
  text: string,
  chunkSize: number,
  overlap: number
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;

    // Try to break at natural boundaries if not at the end
    if (end < text.length) {
      // Look for paragraph break first
      const paragraphBreak = text.lastIndexOf("\n\n", end);
      if (paragraphBreak > start + chunkSize / 2) {
        end = paragraphBreak + 2;
      } else {
        // Look for sentence break
        const sentenceBreak = findLastSentenceBreak(text, start, end);
        if (sentenceBreak > start + chunkSize / 2) {
          end = sentenceBreak;
        } else {
          // Look for word break
          const wordBreak = text.lastIndexOf(" ", end);
          if (wordBreak > start + chunkSize / 2) {
            end = wordBreak + 1;
          }
        }
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    // Move start, accounting for overlap
    start = end - overlap;

    // Ensure we're making progress
    if (start <= chunks.length > 0 ? end - chunkSize : 0) {
      start = end;
    }
  }

  return chunks;
}

/**
 * Find the last sentence break (., !, ?) within a range
 */
function findLastSentenceBreak(
  text: string,
  start: number,
  end: number
): number {
  let lastBreak = -1;

  for (let i = end; i > start + (end - start) / 2; i--) {
    const char = text[i];
    const nextChar = text[i + 1];

    // Check for sentence ending punctuation followed by space or newline
    if (
      (char === "." || char === "!" || char === "?") &&
      (nextChar === " " || nextChar === "\n" || nextChar === undefined)
    ) {
      lastBreak = i + 1;
      break;
    }
  }

  return lastBreak;
}

/**
 * Clean document content for processing
 */
function cleanContent(content: string): string {
  return (
    content
      // Normalize whitespace
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      // Remove excessive newlines
      .replace(/\n{3,}/g, "\n\n")
      // Remove excessive spaces
      .replace(/[ \t]{2,}/g, " ")
      // Trim
      .trim()
  );
}

/**
 * Extract text content from different file types
 * Currently supports plain text - extend for PDF, DOCX, etc.
 */
export async function extractTextFromFile(
  file: File | Blob,
  mimeType: string
): Promise<string> {
  switch (mimeType) {
    case "text/plain":
    case "text/markdown":
      return await file.text();

    case "application/pdf":
      // PDF extraction would require a library like pdf-parse
      // For now, throw an error - implement when needed
      throw new Error(
        "PDF extraction not yet implemented. Please convert to text."
      );

    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      // DOCX extraction would require a library like mammoth
      throw new Error(
        "DOCX extraction not yet implemented. Please convert to text."
      );

    default:
      throw new Error(`Unsupported file type: ${mimeType}`);
  }
}

/**
 * Verify document integrity by checking hash
 */
export function verifyDocumentIntegrity(
  content: string,
  expectedHash: string
): boolean {
  const actualHash = createHash("sha256").update(content).digest("hex");
  return actualHash === expectedHash;
}
