import { getSupabase } from "../config/supabase";

export async function updateGenerationStatus(
  generationId: string,
  status: string,
  currentStep?: string,
  extra?: Record<string, unknown>,
) {
  const supabase = getSupabase();
  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (currentStep !== undefined) update.current_step = currentStep;
  if (extra) Object.assign(update, extra);

  const { error } = await supabase
    .from("generations")
    .update(update)
    .eq("id", generationId);

  if (error) throw error;
}

export async function markGenerationFailed(
  generationId: string,
  errorMessage: string,
) {
  await updateGenerationStatus(generationId, "failed", null!, {
    error_message: errorMessage,
  });
}
