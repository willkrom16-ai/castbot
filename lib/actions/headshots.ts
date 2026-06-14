"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function uploadHeadshot(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const file = formData.get("file") as File | null
  const label = (formData.get("label") as string | null)?.trim() || "General"

  if (!file || file.size === 0) return { error: "No file selected" }
  if (file.size > 5 * 1024 * 1024) return { error: "File must be under 5MB" }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from("headshots")
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadError) return { error: uploadError.message }

  const { data: urlData } = supabase.storage.from("headshots").getPublicUrl(path)

  const { error: dbError } = await supabase
    .from("actor_headshots")
    .insert({ actor_id: user.id, storage_path: path, public_url: urlData.publicUrl, label })

  if (dbError) return { error: dbError.message }
  return {}
}

export async function deleteHeadshot(id: string, storagePath: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  await Promise.all([
    supabase.storage.from("headshots").remove([storagePath]),
    supabase.from("actor_headshots").delete().eq("id", id).eq("actor_id", user.id),
  ])
  return {}
}
