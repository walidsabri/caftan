export function getZrAccountKeyForOwner(ownerName) {
  const normalized = String(ownerName || "")
    .trim()
    .toLowerCase();

  if (normalized === "warda") {
    return "warda";
  }

  if (normalized === "hanane" || normalized === "amina") {
    return "hanane";
  }

  throw new Error(`No ZR account mapping found for owner: ${ownerName}`);
}
