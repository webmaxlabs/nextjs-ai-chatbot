import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { requireAdmin, logAdminAction } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { processDocument } from "@/lib/rag/processor";
import {
  DocumentUploadSchema,
  DocumentUpdateSchema,
} from "@/lib/rag/schemas";

/**
 * GET /api/admin/documents
 * List all documents (with optional filtering)
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    const admin = await requireAdmin(session);

    const { searchParams } = new URL(request.url);
    const collectionId = searchParams.get("collectionId");
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabaseAdmin
      .from("rag_documents")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (collectionId) {
      query = query.eq("collection_id", collectionId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    // Only get parent documents (chunk_index = 0 or no parent)
    query = query.or("chunk_index.eq.0,parent_document_id.is.null");

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching documents:", error);
      return NextResponse.json(
        { error: "Failed to fetch documents" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      documents: data,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Documents GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/documents
 * Create a new document
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    const admin = await requireAdmin(session);

    const body = await request.json();
    const validated = DocumentUploadSchema.parse(body);

    // Process document (chunk + embed)
    const chunks = await processDocument({
      title: validated.title,
      content: validated.content,
      sourceType: validated.sourceType,
      sourceUrl: validated.sourceUrl || undefined,
      collectionId: validated.collectionId || undefined,
      createdBy: admin.id,
    });

    // Insert all chunks
    const { data, error } = await supabaseAdmin
      .from("rag_documents")
      .insert(chunks)
      .select();

    if (error) {
      console.error("Error inserting documents:", error);
      return NextResponse.json(
        { error: "Failed to save document" },
        { status: 500 }
      );
    }

    // Log the action
    await logAdminAction(
      admin.id,
      "document_create",
      data[0].id,
      "document",
      {
        title: validated.title,
        chunks_created: chunks.length,
      }
    );

    return NextResponse.json({
      success: true,
      document: data[0],
      chunksCreated: chunks.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message.startsWith("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Documents POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/documents
 * Update a document
 */
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    const admin = await requireAdmin(session);

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    const validated = DocumentUpdateSchema.parse(updates);

    const { data, error } = await supabaseAdmin
      .from("rag_documents")
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
        updated_by: admin.id,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating document:", error);
      return NextResponse.json(
        { error: "Failed to update document" },
        { status: 500 }
      );
    }

    // Log the action
    await logAdminAction(admin.id, "document_update", id, "document", {
      updates: Object.keys(validated),
    });

    return NextResponse.json({ success: true, document: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message.startsWith("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Documents PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/documents
 * Delete a document (hard delete per PRD)
 */
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    const admin = await requireAdmin(session);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    // Get document info for logging before deletion
    const { data: docInfo } = await supabaseAdmin
      .from("rag_documents")
      .select("title, file_path")
      .eq("id", id)
      .single();

    // Delete all chunks (cascade will handle children)
    // First delete children, then parent
    await supabaseAdmin
      .from("rag_documents")
      .delete()
      .eq("parent_document_id", id);

    const { error } = await supabaseAdmin
      .from("rag_documents")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting document:", error);
      return NextResponse.json(
        { error: "Failed to delete document" },
        { status: 500 }
      );
    }

    // Delete file from storage if exists
    if (docInfo?.file_path) {
      await supabaseAdmin.storage
        .from("rag-documents")
        .remove([docInfo.file_path]);
    }

    // Log the action
    await logAdminAction(admin.id, "document_delete", id, "document", {
      title: docInfo?.title,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Documents DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
