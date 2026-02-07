import { tasks } from "@trigger.dev/sdk/v3";

export async function triggerTask(taskId: string, payload: Record<string, unknown>) {
  const handle = await tasks.trigger(taskId, payload);
  return handle;
}
