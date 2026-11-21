export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { bootstrapIfNeeded } = await import("@/services/bootstrap");
  bootstrapIfNeeded().catch((error) => {
    console.warn("[stufy] bootstrap error", error);
  });
}
