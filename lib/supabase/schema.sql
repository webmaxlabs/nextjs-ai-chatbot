-- RAG Knowledge Base Schema for Supabase
-- Run this in Supabase SQL Editor
-- ================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,  -- References your NextAuth user ID
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('editor', 'admin', 'super_admin')),
  mfa_enabled BOOLEAN DEFAULT false,
  last_mfa_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES admin_users(id)
);

-- 3. Knowledge base collections
CREATE TABLE IF NOT EXISTS rag_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES admin_users(id)
);

-- 4. Main documents table with embeddings
CREATE TABLE IF NOT EXISTS rag_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES rag_collections(id) ON DELETE SET NULL,

  -- Document metadata
  title TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('upload', 'url', 'manual')),
  source_url TEXT,
  file_path TEXT,
  mime_type TEXT,

  -- Content
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,

  -- Chunking info
  chunk_index INTEGER DEFAULT 0,
  parent_document_id UUID REFERENCES rag_documents(id) ON DELETE CASCADE,

  -- Vector embedding (OpenAI text-embedding-3-small = 1536 dimensions)
  embedding vector(1536),

  -- Status and versioning
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'published', 'archived', 'failed')),
  version INTEGER DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,

  -- Admin tracking
  created_by UUID REFERENCES admin_users(id),
  updated_by UUID REFERENCES admin_users(id)
);

-- 5. Create index for similarity search (IVFFlat for faster queries)
CREATE INDEX IF NOT EXISTS rag_documents_embedding_idx
ON rag_documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 6. Additional indexes for common queries
CREATE INDEX IF NOT EXISTS rag_documents_status_idx ON rag_documents(status);
CREATE INDEX IF NOT EXISTS rag_documents_collection_idx ON rag_documents(collection_id);
CREATE INDEX IF NOT EXISTS rag_documents_created_at_idx ON rag_documents(created_at DESC);

-- 7. Audit log table
CREATE TABLE IF NOT EXISTS rag_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  event_type TEXT NOT NULL,
  user_id TEXT,
  user_type TEXT,
  resource_id UUID,
  resource_type TEXT,
  query_hash TEXT,
  results_count INTEGER,
  latency_ms INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB
);

-- Index for audit queries
CREATE INDEX IF NOT EXISTS rag_audit_timestamp_idx ON rag_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS rag_audit_user_idx ON rag_audit_log(user_id, timestamp DESC);

-- 8. Similarity search function
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  filter_collection_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  similarity float,
  collection_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rag_documents.id,
    rag_documents.title,
    rag_documents.content,
    1 - (rag_documents.embedding <=> query_embedding) AS similarity,
    rag_documents.collection_id
  FROM rag_documents
  WHERE
    rag_documents.status = 'published'
    AND rag_documents.embedding IS NOT NULL
    AND (filter_collection_id IS NULL OR rag_documents.collection_id = filter_collection_id)
    AND 1 - (rag_documents.embedding <=> query_embedding) > match_threshold
  ORDER BY rag_documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ================================================
-- ROW LEVEL SECURITY POLICIES
-- ================================================

-- Enable RLS on all tables
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin users: Service role can do everything (we check admin status in app code)
CREATE POLICY "Service role full access to admin_users"
ON admin_users FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Collections: Service role full access, authenticated users can read active
CREATE POLICY "Service role full access to collections"
ON rag_collections FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can read active collections"
ON rag_collections FOR SELECT
TO authenticated
USING (is_active = true);

-- Documents: Service role full access, authenticated users can read published
CREATE POLICY "Service role full access to documents"
ON rag_documents FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can read published documents"
ON rag_documents FOR SELECT
TO authenticated
USING (status = 'published');

-- Audit log: Service role can write, admins can read (checked in app)
CREATE POLICY "Service role full access to audit log"
ON rag_audit_log FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ================================================
-- STORAGE BUCKET FOR DOCUMENTS
-- ================================================

-- Create private bucket for document storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rag-documents',
  'rag-documents',
  false,
  10485760,  -- 10MB limit
  ARRAY['application/pdf', 'text/plain', 'text/markdown', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies (service role handles uploads via app)
CREATE POLICY "Service role can manage storage"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'rag-documents')
WITH CHECK (bucket_id = 'rag-documents');

-- ================================================
-- CLEANUP FUNCTION FOR OLD AUDIT LOGS (90 days)
-- ================================================

CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM rag_audit_log
  WHERE timestamp < NOW() - INTERVAL '90 days';
END;
$$;

-- Optional: Create a cron job to run cleanup daily
-- (Requires pg_cron extension, available in Supabase Pro)
-- SELECT cron.schedule('cleanup-audit-logs', '0 3 * * *', 'SELECT cleanup_old_audit_logs()');

-- ================================================
-- GRANT PERMISSIONS
-- ================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON rag_collections TO authenticated;
GRANT SELECT ON rag_documents TO authenticated;

GRANT EXECUTE ON FUNCTION match_documents TO authenticated;
GRANT EXECUTE ON FUNCTION match_documents TO service_role;
