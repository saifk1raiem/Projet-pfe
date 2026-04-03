export const QUALIFICATION_UPLOAD_REVIEW_STORAGE_KEY = "qualification-upload-review";

export function saveQualificationUploadReview(payload) {
  try {
    window.localStorage.setItem(
      QUALIFICATION_UPLOAD_REVIEW_STORAGE_KEY,
      JSON.stringify({
        generatedAt: new Date().toISOString(),
        ...payload,
      }),
    );
  } catch {
    // Ignore storage failures in private mode or restricted contexts.
  }
}

export function loadQualificationUploadReview() {
  try {
    const raw = window.localStorage.getItem(QUALIFICATION_UPLOAD_REVIEW_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function clearQualificationUploadReview() {
  try {
    window.localStorage.removeItem(QUALIFICATION_UPLOAD_REVIEW_STORAGE_KEY);
  } catch {
    // Ignore storage failures in private mode or restricted contexts.
  }
}
