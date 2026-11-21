import { jsonOk } from "@/lib/http";
import { firebaseWebConfig, hasFirebaseWebConfig } from "@/lib/firebase/config";
import { hasAdminCredentials, useLocalBackend } from "@/lib/firebase/admin";

export async function GET() {
  return jsonOk({
    ok: true,
    backend: useLocalBackend() ? "local" : "firebase",
    projectId: firebaseWebConfig.projectId || null,
    webConfig: hasFirebaseWebConfig(),
    adminSdk: hasAdminCredentials(),
  });
}
