import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? "";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const SKIN_ANALYSIS_PROMPT = `Tu es un expert en skincare et analyse de peau.
Analyse cette photo de visage et réponds UNIQUEMENT en JSON valide.
Aucun texte autour, aucun markdown, juste le JSON brut.
Évalue uniquement ce qui est clairement visible sur la photo.
Si quelque chose n'est pas visible ou incertain, mets null.
Ne fais aucun diagnostic médical.`;

export interface SkinAnalysisResult {
  lightingQuality: "poor" | "acceptable" | "good";
  skinType: "oily" | "dry" | "combination" | "normal" | null;
  fitzpatrickType: 1 | 2 | 3 | 4 | 5 | 6;
  undertone: "warm" | "cool" | "neutral";
  dominantHex: string;
  visibleConcerns: {
    acne: "none" | "mild" | "moderate" | "severe" | null;
    darkSpots: "none" | "mild" | "moderate" | "severe" | null;
    pores: "normal" | "enlarged" | null;
    wrinkles: "none" | "fine_lines" | "deep" | null;
    redness: "none" | "mild" | "moderate" | null;
    dryness: "none" | "mild" | "moderate" | null;
  };
  skincareRoutine: {
    morning: string[];
    evening: string[];
  };
  productCategories: string[];
  confidence: number;
}

export interface LocalColorAnalysis {
  fitzpatrickType: number;
  undertone: "warm" | "cool" | "neutral";
  dominantHex: string;
}

// ─── Local color science (on-device, zero API) ────────────────────────────────
// Estimates Fitzpatrick type and undertone from average pixel luminance.
// imageBase64 must be a JPEG base64 string (no data URI prefix).
export function analyzeColorLocally(avgR: number, avgG: number, avgB: number): LocalColorAnalysis {
  // CIE luminance approximation
  const L = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB;

  // Fitzpatrick classification by luminance
  let fitzpatrickType: number;
  if (L > 220) fitzpatrickType = 1;
  else if (L > 190) fitzpatrickType = 2;
  else if (L > 160) fitzpatrickType = 3;
  else if (L > 120) fitzpatrickType = 4;
  else if (L > 80) fitzpatrickType = 5;
  else fitzpatrickType = 6;

  // Undertone via R/B ratio
  const rbRatio = avgB > 0 ? avgR / avgB : 1;
  let undertone: "warm" | "cool" | "neutral";
  if (rbRatio > 1.12) undertone = "warm";
  else if (rbRatio < 0.92) undertone = "cool";
  else undertone = "neutral";

  // Dominant hex
  const toHex = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  const dominantHex = `#${toHex(avgR)}${toHex(avgG)}${toHex(avgB)}`;

  return { fitzpatrickType, undertone, dominantHex };
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ─── Gemini Flash 2.0 analysis ────────────────────────────────────────────────
export async function analyzeSkinWithGemini(
  imageBase64: string
): Promise<SkinAnalysisResult> {
  const jsonSchema = `{
  "lightingQuality": "poor | acceptable | good",
  "skinType": "oily | dry | combination | normal | null",
  "fitzpatrickType": 1-6,
  "undertone": "warm | cool | neutral",
  "dominantHex": "#XXXXXX",
  "visibleConcerns": {
    "acne": "none | mild | moderate | severe | null",
    "darkSpots": "none | mild | moderate | severe | null",
    "pores": "normal | enlarged | null",
    "wrinkles": "none | fine_lines | deep | null",
    "redness": "none | mild | moderate | null",
    "dryness": "none | mild | moderate | null"
  },
  "skincareRoutine": {
    "morning": ["étape 1", "étape 2"],
    "evening": ["étape 1", "étape 2"]
  },
  "productCategories": ["cleanser", "moisturizer"],
  "confidence": 0.0-1.0
}`;

  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 3000; // 3s, 6s, 12s

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent([
        { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
        { text: `${SKIN_ANALYSIS_PROMPT}\n\nFormat JSON attendu :\n${jsonSchema}` },
      ]);

      const text = result.response.text().trim();
      const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

      try {
        const parsed: SkinAnalysisResult = JSON.parse(cleaned);
        return parsed;
      } catch {
        throw new Error("Réponse IA invalide. Réessaie avec un meilleur éclairage.");
      }
    } catch (err: unknown) {
      lastError = err;
      const isQuotaError =
        err instanceof Error &&
        (err.message.includes("429") || err.message.toLowerCase().includes("quota"));

      if (isQuotaError && attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[Gemini] quota 429, retry ${attempt + 1}/${MAX_RETRIES} dans ${delay}ms`);
        await sleep(delay);
        continue;
      }
      break;
    }
  }

  const errMsg = lastError instanceof Error ? lastError.message : String(lastError);
  if (errMsg.includes("429") || errMsg.toLowerCase().includes("quota")) {
    throw new Error("Quota Gemini dépassé. Réessaie dans quelques minutes.");
  }
  throw lastError;
}
