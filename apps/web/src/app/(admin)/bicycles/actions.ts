"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { validateBikeForm } from "@/lib/validation";

function sanitizeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9.-]/g, "-").replace(/-+/g, "-");
}

async function requireAdminSupabase() {
  await requireAdmin();

  return createClient();
}

async function uploadBikeImage({
  bikeId,
  file,
  supabase
}: {
  readonly bikeId: string;
  readonly file: File;
  readonly supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const filename = sanitizeFilename(file.name || "bike-image");
  const path = `${bikeId}/${Date.now()}-${filename}`;

  const { error } = await supabase.storage.from("bike-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from("bike-images").getPublicUrl(path);
  return data.publicUrl;
}

export async function createBikeAction(formData: FormData) {
  const supabase = await requireAdminSupabase();
  const values = validateBikeForm(formData);

  let imageUrl: string | null = null;
  const imageFile = formData.get("image");

  if (imageFile instanceof File && imageFile.size > 0) {
    imageUrl = await uploadBikeImage({
      bikeId: values.bikeId,
      file: imageFile,
      supabase
    });
  }

  const { error } = await supabase.from("bikes").insert({
    estimated_range_km: values.estimatedRangeKm,
    id: values.bikeId,
    image_url: imageUrl,
    latitude: values.latitude,
    location: values.location,
    longitude: values.longitude,
    model: values.model,
    pricing_label: values.pricingLabel,
    ride_class: values.rideClass,
    status: values.status,
    top_speed_kmh: values.topSpeedKmh
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/bicycles");
  redirect(`/bicycles/${values.bikeId}`);
}

export async function updateBikeAction(formData: FormData) {
  const supabase = await requireAdminSupabase();
  const values = validateBikeForm(formData);

  const updateValues: Database["public"]["Tables"]["bikes"]["Update"] = {
    estimated_range_km: values.estimatedRangeKm,
    latitude: values.latitude,
    location: values.location,
    longitude: values.longitude,
    model: values.model,
    pricing_label: values.pricingLabel,
    ride_class: values.rideClass,
    status: values.status,
    top_speed_kmh: values.topSpeedKmh
  };

  const imageFile = formData.get("image");

  if (imageFile instanceof File && imageFile.size > 0) {
    updateValues.image_url = await uploadBikeImage({
      bikeId: values.bikeId,
      file: imageFile,
      supabase
    });
  }

  const { error } = await supabase.from("bikes").update(updateValues).eq("id", values.bikeId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/bicycles");
  revalidatePath(`/bicycles/${values.bikeId}`);
}

export async function deleteBikeAction(formData: FormData) {
  const supabase = await requireAdminSupabase();
  const bikeId = String(formData.get("bikeId") ?? "").trim().toUpperCase();

  if (!bikeId) {
    throw new Error("Bike ID is required.");
  }

  const { error } = await supabase.from("bikes").delete().eq("id", bikeId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/bicycles");
  redirect("/bicycles");
}
