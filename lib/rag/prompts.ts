import type { RetrievedDocument } from "./retrieval";

/**
 * Build system prompt with RAG context injected
 */
export function buildRAGSystemPrompt(
  context: RetrievedDocument[],
  basePrompt?: string
): string {
  const base = basePrompt || getDefaultSystemPrompt();

  if (context.length === 0) {
    return `${base}

## Important Note

You do not have access to any specific knowledge base documents for this query. If the user asks about specific topics that would require documentation:
- Let them know you don't have relevant information in the knowledge base
- Offer to help with general questions instead
- Do NOT make up information or pretend to have access to documents you don't have`;
  }

  const contextSection = context
    .map(
      (doc, i) => `[Source ${i + 1}: ${doc.title}]\n${doc.content}`
    )
    .join("\n\n---\n\n");

  return `${base}

## Knowledge Base Context

You have access to the following relevant information from the knowledge base. Use this information to provide accurate, grounded responses.

${contextSection}

## Response Guidelines

1. **Ground your answers in the provided context** - Base your responses primarily on the information above
2. **Cite your sources** - When using information from the context, reference which source it came from (e.g., "According to Source 1...")
3. **Acknowledge limitations** - If the provided context doesn't fully answer the question, clearly state what information is missing
4. **Never fabricate** - Do NOT make up information that isn't in the sources. If you don't know, say so
5. **Be helpful** - If the context is partially relevant, use what's available and note any gaps
6. **Stay focused** - Answer the user's specific question using the relevant parts of the context`;
}

/**
 * Default system prompt for the RAG chatbot
 */
function getDefaultSystemPrompt(): string {
  return `You are a helpful AI assistant with access to a curated knowledge base.

Your role is to:
- Provide accurate, helpful answers based on the available documentation
- Be clear about what you know and don't know
- Help users find the information they need

Always maintain a professional, friendly tone and prioritize accuracy over speculation.`;
}

/**
 * Build a prompt for when no relevant documents are found
 */
export function buildNoContextPrompt(basePrompt?: string): string {
  const base = basePrompt || getDefaultSystemPrompt();

  return `${base}

## Important

No relevant documents were found in the knowledge base for this query. Please:
1. Let the user know that you couldn't find specific information about their question in the knowledge base
2. Offer to help with general questions or suggest they rephrase their question
3. Do NOT make up information or pretend to have documentation you don't have`;
}

/**
 * Extract the user's question from message parts
 */
export function extractUserQuestion(
  parts: Array<{ type: string; text?: string }>
): string {
  return parts
    .filter((part) => part.type === "text" && part.text)
    .map((part) => part.text)
    .join(" ")
    .trim();
}
