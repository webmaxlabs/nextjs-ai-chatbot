import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { requireAdmin, logAdminAction } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  CollectionCreateSchema,
  CollectionUpdateSchema,
} from "@/lib/rag/schemas";

/**
 * GET /api/admin/collections
 * List all collections
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    await requireAdmin(session);

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    let query = supabaseAdmin
      .from("rag_collections")
      .select("*")
      .order("name", { ascending: true });

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching collections:", error);
      return NextResponse.json(
        { error: "Failed to fetch collections" },
        { status: 500 }
      );
    }

    // Get document counts for each collection
    const collectionsWithCounts = await Promise.all(
      (data || []).map(async (collection) => {
        const { count } = await supabaseAdmin
          .from("rag_documents")
          .select("*", { count: "exact", head: true })
          .eq("collection_id", collection.id)
          .eq("chunk_index", 0); // Only count parent documents

        return {
          ...collection,
          documentCount: count || 0,
        };
      })
    );

    return NextResponse.json({ collections: collectionsWithCounts });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Collections GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/collections
 * Create a new collection
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    const admin = await requireAdmin(session);

    const body = await request.json();
    const validated = CollectionCreateSchema.parse(body);

    const { data, error } = await supabaseAdmin
      .from("rag_collections")
      .insert({
        name: validated.name,
        description: validated.description,
        is_active: validated.isActive,
        created_by: admin.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating collection:", error);
      return NextResponse.json(
        { error: "Failed to create collection" },
        { status: 500 }
      );
    }

    // Log the action
    await logAdminAction(
      admin.id,
      "collection_create",
      data.id,
      "collection",
      { name: validated.name }
    );

    return NextResponse.json({ success: true, collection: data });
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
    console.error("Collections POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/collections
 * Update a collection
 */
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    const admin = await requireAdmin(session);

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Collection ID is required" },
        { status: 400 }
      );
    }

    const validated = CollectionUpdateSchema.parse(updates);

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.description !== undefined)
      updateData.description = validated.description;
    if (validated.isActive !== undefined)
      updateData.is_active = validated.isActive;

    const { data, error } = await supabaseAdmin
      .from("rag_collections")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating collection:", error);
      return NextResponse.json(
        { error: "Failed to update collection" },
        { status: 500 }
      );
    }

    // Log the action
    await logAdminAction(admin.id, "collection_update", id, "collection", {
      updates: Object.keys(validated),
    });

    return NextResponse.json({ success: true, collection: data });
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
    console.error("Collections PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/collections
 * Delete a collection (documents are set to null collection)
 */
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    const admin = await requireAdmin(session);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Collection ID is required" },
        { status: 400 }
      );
    }

    // Get collection info for logging
    const { data: collectionInfo } = await supabaseAdmin
      .from("rag_collections")
      .select("name")
      .eq("id", id)
      .single();

    // Set documents in this collection to null collection
    // (ON DELETE SET NULL handles this, but being explicit)
    await supabaseAdmin
      .from("rag_documents")
      .update({ collection_id: null })
      .eq("collection_id", id);

    // Delete the collection
    const { error } = await supabaseAdmin
      .from("rag_collections")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting collection:", error);
      return NextResponse.json(
        { error: "Failed to delete collection" },
        { status: 500 }
      );
    }

    // Log the action
    await logAdminAction(admin.id, "collection_delete", id, "collection", {
      name: collectionInfo?.name,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Collections DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
