const DEVICE_TOKEN_KEY = "rttaExtensionDeviceToken";

export async function getDeviceToken(): Promise<string | null> {
  const stored = await chrome.storage.local.get(DEVICE_TOKEN_KEY);
  const value = stored[DEVICE_TOKEN_KEY];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export async function saveDeviceToken(token: string): Promise<void> {
  const normalized = token.trim();
  if (normalized.length === 0) throw new Error("Mã thiết bị không được để trống.");
  await chrome.storage.local.set({ [DEVICE_TOKEN_KEY]: normalized });
}

export async function clearDeviceToken(): Promise<void> {
  await chrome.storage.local.remove(DEVICE_TOKEN_KEY);
}
