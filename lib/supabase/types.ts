// Database types for Supabase
// These will be auto-generated once the schema is created
// For now, we define them manually

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      admin_users: {
        Row: {
          id: string;
          user_id: string;
          email: string;
          role: "editor" | "admin" | "super_admin";
          mfa_enabled: boolean;
          last_mfa_at: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          email: string;
          role?: "editor" | "admin" | "super_admin";
          mfa_enabled?: boolean;
          last_mfa_at?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          email?: string;
          role?: "editor" | "admin" | "super_admin";
          mfa_enabled?: boolean;
          last_mfa_at?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
      };
      rag_collections: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
      };
      rag_documents: {
        Row: {
          id: string;
          collection_id: string | null;
          title: string;
          source_type: "upload" | "url" | "manual";
          source_url: string | null;
          file_path: string | null;
          mime_type: string | null;
          content: string;
          content_hash: string;
          chunk_index: number;
          parent_document_id: string | null;
          embedding: number[] | null;
          status: "processing" | "published" | "archived" | "failed";
          version: number;
          created_at: string;
          updated_at: string;
          published_at: string | null;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          collection_id?: string | null;
          title: string;
          source_type: "upload" | "url" | "manual";
          source_url?: string | null;
          file_path?: string | null;
          mime_type?: string | null;
          content: string;
          content_hash: string;
          chunk_index?: number;
          parent_document_id?: string | null;
          embedding?: number[] | null;
          status?: "processing" | "published" | "archived" | "failed";
          version?: number;
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          collection_id?: string | null;
          title?: string;
          source_type?: "upload" | "url" | "manual";
          source_url?: string | null;
          file_path?: string | null;
          mime_type?: string | null;
          content?: string;
          content_hash?: string;
          chunk_index?: number;
          parent_document_id?: string | null;
          embedding?: number[] | null;
          status?: "processing" | "published" | "archived" | "failed";
          version?: number;
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
        };
      };
      rag_audit_log: {
        Row: {
          id: string;
          timestamp: string;
          event_type: string;
          user_id: string | null;
          user_type: string | null;
          resource_id: string | null;
          resource_type: string | null;
          query_hash: string | null;
          results_count: number | null;
          latency_ms: number | null;
          ip_address: string | null;
          user_agent: string | null;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          timestamp?: string;
          event_type: string;
          user_id?: string | null;
          user_type?: string | null;
          resource_id?: string | null;
          resource_type?: string | null;
          query_hash?: string | null;
          results_count?: number | null;
          latency_ms?: number | null;
          ip_address?: string | null;
          user_agent?: string | null;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          timestamp?: string;
          event_type?: string;
          user_id?: string | null;
          user_type?: string | null;
          resource_id?: string | null;
          resource_type?: string | null;
          query_hash?: string | null;
          results_count?: number | null;
          latency_ms?: number | null;
          ip_address?: string | null;
          user_agent?: string | null;
          metadata?: Json | null;
        };
      };
    };
    Functions: {
      match_documents: {
        Args: {
          query_embedding: number[];
          match_threshold: number;
          match_count: number;
          filter_collection_id?: string | null;
        };
        Returns: {
          id: string;
          title: string;
          content: string;
          similarity: number;
          collection_id: string | null;
        }[];
      };
    };
  };
}

// Helper types
export type AdminUser = Database["public"]["Tables"]["admin_users"]["Row"];
export type RAGCollection = Database["public"]["Tables"]["rag_collections"]["Row"];
export type RAGDocument = Database["public"]["Tables"]["rag_documents"]["Row"];
export type RAGAuditLog = Database["public"]["Tables"]["rag_audit_log"]["Row"];
