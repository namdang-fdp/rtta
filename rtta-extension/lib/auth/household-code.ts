const HOUSEHOLD_CODE_KEY = "rttaHouseholdCode";

export async function getHouseholdCode(): Promise<string | null> {
  const stored = await chrome.storage.local.get(HOUSEHOLD_CODE_KEY);
  const value = stored[HOUSEHOLD_CODE_KEY];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export async function saveHouseholdCode(code: string): Promise<void> {
  const normalized = code.trim();
  if (normalized.length === 0) {
    throw new Error("Mã gia đình không được để trống.");
  }
  await chrome.storage.local.set({ [HOUSEHOLD_CODE_KEY]: normalized });
}

export async function clearHouseholdCode(): Promise<void> {
  await chrome.storage.local.remove(HOUSEHOLD_CODE_KEY);
}
