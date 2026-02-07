import "server-only";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

/**
 * Generate embedding for a text string using OpenAI API
 * Uses the Vercel AI Gateway for consistent API access
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Sanitize and truncate input
  const sanitizedText = text
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000); // Model input limit

  if (!sanitizedText) {
    throw new Error("Cannot generate embedding for empty text");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: sanitizedText,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Embedding API error:", error);
    throw new Error(`Embedding API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Generate embedding for a user query with additional sanitization
 * Protects against prompt injection attempts
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  const sanitizedQuery = sanitizeUserInput(query);
  return generateEmbedding(sanitizedQuery);
}

/**
 * Sanitize user input to prevent prompt injection
 */
function sanitizeUserInput(input: string): string {
  return input
    // Remove common injection patterns
    .replace(/ignore previous instructions/gi, "")
    .replace(/ignore all instructions/gi, "")
    .replace(/disregard previous/gi, "")
    .replace(/system:/gi, "")
    .replace(/\[INST\]/gi, "")
    .replace(/\[\/INST\]/gi, "")
    .replace(/<\|.*?\|>/g, "") // Remove special tokens
    .replace(/```[\s\S]*?```/g, "") // Remove code blocks that might contain instructions
    .trim()
    .slice(0, 2000); // Limit query length
}

/**
 * Batch generate embeddings for multiple texts
 * More efficient than calling one at a time
 */
export async function generateEmbeddingsBatch(
  texts: string[]
): Promise<number[][]> {
  const sanitizedTexts = texts.map((text) =>
    text.replace(/\s+/g, " ").trim().slice(0, 8000)
  );

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: sanitizedTexts,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Embedding API error:", error);
    throw new Error(`Embedding API error: ${response.statusText}`);
  }

  const data = await response.json();

  // Sort by index to maintain order
  const sorted = data.data.sort(
    (a: { index: number }, b: { index: number }) => a.index - b.index
  );
  return sorted.map((item: { embedding: number[] }) => item.embedding);
}
