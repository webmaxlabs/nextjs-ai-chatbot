import { z } from "zod";

/**
 * Schema for document upload
 */
export const DocumentUploadSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters")
    .regex(/^[^<>]*$/, "Title contains invalid characters"),

  content: z
    .string()
    .min(1, "Content is required")
    .max(500000, "Content exceeds maximum size (500KB)"),

  collectionId: z.string().uuid("Invalid collection ID").optional().nullable(),

  sourceType: z.enum(["upload", "url", "manual"], {
    errorMap: () => ({ message: "Invalid source type" }),
  }),

  sourceUrl: z
    .string()
    .url("Invalid URL format")
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          // Block local/internal URLs
          const blocked = [
            "localhost",
            "127.0.0.1",
            "0.0.0.0",
            "::1",
            "169.254.",
            "10.",
            "172.16.",
            "172.17.",
            "172.18.",
            "172.19.",
            "172.20.",
            "172.21.",
            "172.22.",
            "172.23.",
            "172.24.",
            "172.25.",
            "172.26.",
            "172.27.",
            "172.28.",
            "172.29.",
            "172.30.",
            "172.31.",
            "192.168.",
          ];
          return !blocked.some(
            (b) => parsed.hostname === b || parsed.hostname.startsWith(b)
          );
        } catch {
          return false;
        }
      },
      { message: "Internal or local URLs are not allowed" }
    )
    .optional()
    .nullable(),
});

/**
 * Schema for document update
 */
export const DocumentUpdateSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters")
    .regex(/^[^<>]*$/, "Title contains invalid characters")
    .optional(),

  collectionId: z.string().uuid("Invalid collection ID").optional().nullable(),

  status: z
    .enum(["processing", "published", "archived", "failed"])
    .optional(),
});

/**
 * Schema for search query
 */
export const SearchQuerySchema = z.object({
  query: z
    .string()
    .min(1, "Query is required")
    .max(2000, "Query must be less than 2000 characters")
    .transform((q) => q.trim()),

  collectionId: z.string().uuid("Invalid collection ID").optional().nullable(),

  topK: z
    .number()
    .int("topK must be an integer")
    .min(1, "topK must be at least 1")
    .max(20, "topK cannot exceed 20")
    .default(5),

  threshold: z
    .number()
    .min(0, "Threshold must be between 0 and 1")
    .max(1, "Threshold must be between 0 and 1")
    .default(0.7),
});

/**
 * Schema for collection creation
 */
export const CollectionCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[^<>]*$/, "Name contains invalid characters"),

  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional()
    .nullable(),

  isActive: z.boolean().default(true),
});

/**
 * Schema for collection update
 */
export const CollectionUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[^<>]*$/, "Name contains invalid characters")
    .optional(),

  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional()
    .nullable(),

  isActive: z.boolean().optional(),
});

/**
 * Schema for file upload validation
 */
export const FileUploadSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 10 * 1024 * 1024, {
      message: "File size must be less than 10MB",
    })
    .refine(
      (file) =>
        [
          "application/pdf",
          "text/plain",
          "text/markdown",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ].includes(file.type),
      {
        message: "File type must be PDF, TXT, MD, or DOCX",
      }
    ),
});

// Type exports
export type DocumentUploadInput = z.infer<typeof DocumentUploadSchema>;
export type DocumentUpdateInput = z.infer<typeof DocumentUpdateSchema>;
export type SearchQueryInput = z.infer<typeof SearchQuerySchema>;
export type CollectionCreateInput = z.infer<typeof CollectionCreateSchema>;
export type CollectionUpdateInput = z.infer<typeof CollectionUpdateSchema>;
