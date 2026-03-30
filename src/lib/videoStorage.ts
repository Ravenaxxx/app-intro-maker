import { supabase } from "@/integrations/supabase/client";

interface StoredVideo {
  id: string;
  name: string;
  storage_path: string;
}

const BUCKET = "videos";

function getPublicUrl(path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function saveVideo(file: File): Promise<StoredVideo> {
  const id = crypto.randomUUID();
  const ext = file.name.split(".").pop() || "mp4";
  const storagePath = `${id}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { error: dbError } = await supabase
    .from("library_videos")
    .insert({ id, name: file.name, storage_path: storagePath });

  if (dbError) throw new Error(`DB insert failed: ${dbError.message}`);

  return { id, name: file.name, storage_path: storagePath };
}

export async function getAllVideos(): Promise<StoredVideo[]> {
  const { data, error } = await supabase
    .from("library_videos")
    .select("id, name, storage_path")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load videos: ${error.message}`);
  return data || [];
}

export async function deleteVideo(id: string): Promise<void> {
  // Get storage path first
  const { data } = await supabase
    .from("library_videos")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (data?.storage_path) {
    await supabase.storage.from(BUCKET).remove([data.storage_path]);
  }

  const { error } = await supabase
    .from("library_videos")
    .delete()
    .eq("id", id);

  if (error) throw new Error(`Failed to delete: ${error.message}`);
}

export async function updateVideoName(id: string, newName: string): Promise<void> {
  const { error } = await supabase
    .from("library_videos")
    .update({ name: newName })
    .eq("id", id);

  if (error) throw new Error(`Failed to rename: ${error.message}`);
}

export async function clearAllVideos(): Promise<void> {
  // Get all storage paths
  const { data } = await supabase
    .from("library_videos")
    .select("storage_path");

  if (data && data.length > 0) {
    const paths = data.map((v) => v.storage_path);
    await supabase.storage.from(BUCKET).remove(paths);
  }

  const { error } = await supabase
    .from("library_videos")
    .delete()
    .gte("created_at", "1970-01-01");

  if (error) throw new Error(`Failed to clear: ${error.message}`);
}

export function storedVideoToAppVideo(stored: StoredVideo): {
  id: string;
  name: string;
  url: string;
} {
  return {
    id: stored.id,
    name: stored.name,
    url: getPublicUrl(stored.storage_path),
  };
}

// Keep this export for backward compat but it's now handled by saveVideo
export async function fileToStoredVideo(file: File): Promise<StoredVideo> {
  return saveVideo(file);
}
