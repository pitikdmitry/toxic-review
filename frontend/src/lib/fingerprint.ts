const STORAGE_KEY = "tr_fingerprint";

async function generateFingerprint(): Promise<string> {
  const components = [
    screen.width.toString(),
    screen.height.toString(),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.platform,
    navigator.language,
    navigator.hardwareConcurrency?.toString() || "0",
  ];

  // Canvas fingerprint
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px Arial";
      ctx.fillStyle = "#f60";
      ctx.fillRect(10, 1, 62, 20);
      ctx.fillStyle = "#069";
      ctx.fillText("toxic-review", 2, 15);
      components.push(canvas.toDataURL());
    }
  } catch {
    // canvas not available
  }

  const data = new TextEncoder().encode(components.join("|"));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getFingerprint(): Promise<string> {
  if (typeof window === "undefined") return "";

  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached && cached.length === 64) return cached;

  const fp = await generateFingerprint();
  localStorage.setItem(STORAGE_KEY, fp);
  return fp;
}
