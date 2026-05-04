import type { ApiProblem } from "@/types/api";

export const memberStatusOptions = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "suspended", label: "Suspended" },
  { value: "rejected", label: "Rejected" },
  { value: "closed", label: "Closed" },
  { value: "blacklisted", label: "Blacklisted" },
] as const;

export const membershipTypeOptions = [
  { value: "individual", label: "Individual" },
  { value: "group", label: "Group" },
  { value: "organization", label: "Organization" },
] as const;

export const genderOptions = [
  { value: "", label: "Not specified" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

export const kycStatusOptions = [
  { value: "all", label: "All KYC statuses" },
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
] as const;

export const kycLevelOptions = [
  { value: "", label: "Select KYC level" },
  { value: "level_1", label: "Level 1" },
  { value: "level_2", label: "Level 2" },
  { value: "level_3", label: "Level 3" },
] as const;

export const riskRatingOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
] as const;

export const clientTextareaClassName =
  "min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#127D61] focus:ring-4 focus:ring-emerald-100";

function flattenErrorList(value: unknown): string | null {
  if (Array.isArray(value)) {
    return value.map(String).join(" ");
  }
  if (typeof value === "string") {
    return value;
  }
  return null;
}

export function getProblemMessage(
  error: unknown,
  fallback = "Unable to save client changes.",
) {
  const problem = error as ApiProblem;
  if (problem?.message) {
    return problem.message;
  }

  if (problem?.errors && typeof problem.errors === "object") {
    const first = Object.values(problem.errors)
      .map(flattenErrorList)
      .find(Boolean);
    if (first) {
      return first;
    }
  }

  return fallback;
}
