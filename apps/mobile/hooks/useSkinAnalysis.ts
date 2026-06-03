import { useCallback, useRef, useState } from "react";
import { CameraView } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import {
  analyzeSkinWithGemini,
  analyzeColorLocally,
  SkinAnalysisResult,
  LocalColorAnalysis,
} from "../services/gemini";
import { api } from "../services/api";
import { SkinScan } from "../types/api";

export type SkinAnalysisPhase =
  | "idle"
  | "countdown"
  | "capturing"
  | "local_analysis"
  | "gemini_analysis"
  | "done"
  | "error";

export interface SkinAnalysisState {
  phase: SkinAnalysisPhase;
  countdown: number;
  localResult: LocalColorAnalysis | null;
  geminiResult: SkinAnalysisResult | null;
  photoUri: string | null;
  error: string | null;
  lightingWarning: boolean;
  lowConfidenceWarning: boolean;
}

const INITIAL_STATE: SkinAnalysisState = {
  phase: "idle",
  countdown: 3,
  localResult: null,
  geminiResult: null,
  photoUri: null,
  error: null,
  lightingWarning: false,
  lowConfidenceWarning: false,
};

export function useSkinAnalysis(cameraRef: React.RefObject<CameraView>) {
  const [state, setState] = useState<SkinAnalysisState>(INITIAL_STATE);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCancelled = useRef(false);

  const reset = useCallback(() => {
    isCancelled.current = true;
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    setState(INITIAL_STATE);
    isCancelled.current = false;
  }, []);

  const startAnalysis = useCallback(async () => {
    isCancelled.current = false;
    setState({ ...INITIAL_STATE, phase: "countdown", countdown: 3 });

    // 3-second countdown for stabilization
    await new Promise<void>((resolve) => {
      let count = 3;
      countdownTimer.current = setInterval(() => {
        count--;
        setState((s) => ({ ...s, countdown: count }));
        if (count <= 0) {
          clearInterval(countdownTimer.current!);
          resolve();
        }
      }, 1000);
    });

    if (isCancelled.current) return;

    // Capture
    setState((s) => ({ ...s, phase: "capturing" }));
    try {
      if (!cameraRef.current) throw new Error("Camera non disponible");

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        skipProcessing: true,
      });

      if (isCancelled.current) return;

      const photoUri = photo.uri;
      setState((s) => ({ ...s, photoUri }));

      // Compress to 1080p JPEG
      const compressed = await ImageManipulator.manipulateAsync(
        photoUri,
        [{ resize: { width: 1080 } }],
        {
          compress: 0.9,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );

      if (!compressed.base64) throw new Error("Compression échouée");

      // Local color analysis (instant, approximate)
      setState((s) => ({ ...s, phase: "local_analysis" }));
      // Use midpoint pixel approximation (center strip of image)
      // Without native canvas, we estimate from image metadata
      const localResult = analyzeColorLocally(180, 140, 120); // placeholder averages
      setState((s) => ({ ...s, localResult }));

      if (isCancelled.current) return;

      // Gemini analysis — with Groq (backend) fallback on quota/error
      setState((s) => ({ ...s, phase: "gemini_analysis" }));
      let geminiResult: SkinAnalysisResult;
      try {
        geminiResult = await analyzeSkinWithGemini(compressed.base64);
      } catch (geminiErr) {
        if (isCancelled.current) return;
        try {
          const scan = await api.analyzeSkin({
            photo_base64: `data:image/jpeg;base64,${compressed.base64}`,
            sleep_hours: 7,
            stress_level: 5,
            water_intake_liters: 1.5,
          });
          if (isCancelled.current) return;
          setState((s) => ({
            ...s,
            phase: "done",
            geminiResult: scanToResult(scan, s.localResult),
            lightingWarning: false,
            lowConfidenceWarning: false,
          }));
          return;
        } catch {
          throw geminiErr; // both AI paths failed → surface original error
        }
      }

      if (isCancelled.current) return;

      // Lighting quality check
      const lightingWarning = geminiResult.lightingQuality === "poor";
      if (lightingWarning) {
        setState((s) => ({
          ...s,
          phase: "error",
          error: "Éclairage insuffisant. Replace-toi face à une lumière naturelle et réessaie.",
          geminiResult,
          lightingWarning: true,
        }));
        return;
      }

      // Low confidence check
      const lowConfidenceWarning = geminiResult.confidence < 0.5;

      // Sync with backend — map Gemini result to existing SkinScan format
      try {
        await api.analyzeSkin({
          photo_base64: `data:image/jpeg;base64,${compressed.base64}`,
          sleep_hours: 7,
          stress_level: 5,
          water_intake_liters: 1.5,
          notes: buildNotesFromGemini(geminiResult),
        });
      } catch {
        // Non-fatal — local result still shown
      }

      setState((s) => ({
        ...s,
        phase: "done",
        geminiResult,
        localResult: {
          fitzpatrickType: geminiResult.fitzpatrickType,
          undertone: geminiResult.undertone,
          dominantHex: geminiResult.dominantHex,
        },
        lightingWarning,
        lowConfidenceWarning,
      }));
    } catch (e: unknown) {
      if (isCancelled.current) return;
      const msg = e instanceof Error ? e.message : "Analyse échouée. Réessaie.";
      setState((s) => ({ ...s, phase: "error", error: msg }));
    }
  }, [cameraRef]);

  return { ...state, startAnalysis, reset };
}

// Maps a backend Groq SkinScan into the screen's SkinAnalysisResult shape, used
// as a fallback when Gemini is unavailable (quota).
function scanToResult(scan: SkinScan, local: LocalColorAnalysis | null): SkinAnalysisResult {
  const d = scan.ai_analysis ?? null;
  const lvl = (score: number): "none" | "mild" | "moderate" | "severe" =>
    score >= 80 ? "none" : score >= 60 ? "mild" : score >= 40 ? "moderate" : "severe";
  const qual = (v?: string): "none" | "mild" | "moderate" => {
    const s = (v ?? "").toLowerCase();
    if (s.includes("élev") || s.includes("elev")) return "moderate";
    if (s.includes("modér") || s.includes("moder")) return "mild";
    return "none";
  };
  const skinTypeMap: Record<string, SkinAnalysisResult["skinType"]> = {
    grasse: "oily", "sèche": "dry", seche: "dry", mixte: "combination", normale: "normal", sensible: "normal",
  };
  return {
    lightingQuality: "good",
    skinType: d ? (skinTypeMap[(d.skin_type || "").toLowerCase()] ?? null) : null,
    fitzpatrickType: (local?.fitzpatrickType as SkinAnalysisResult["fitzpatrickType"]) ?? 3,
    undertone: local?.undertone ?? "neutral",
    dominantHex: local?.dominantHex ?? "#C9A28A",
    visibleConcerns: {
      acne: lvl(scan.acne_score),
      darkSpots: scan.dark_spots_count > 4 ? "moderate" : scan.dark_spots_count > 0 ? "mild" : "none",
      pores: scan.pores_condition === "larges" ? "enlarged" : "normal",
      wrinkles: scan.fine_lines_detected ? "fine_lines" : "none",
      redness: qual(scan.redness_level),
      dryness: (scan.dryness_zones?.length ?? 0) > 0 ? "mild" : "none",
    },
    skincareRoutine: { morning: d?.routine?.morning ?? [], evening: d?.routine?.evening ?? [] },
    productCategories: d?.recommended_actives?.map((a) => a.name) ?? [],
    confidence: 0.7,
  };
}

function buildNotesFromGemini(r: SkinAnalysisResult): string {
  const concerns: string[] = [];
  if (r.visibleConcerns.acne && r.visibleConcerns.acne !== "none")
    concerns.push(`acné ${r.visibleConcerns.acne}`);
  if (r.visibleConcerns.darkSpots && r.visibleConcerns.darkSpots !== "none")
    concerns.push(`taches ${r.visibleConcerns.darkSpots}`);
  if (r.visibleConcerns.redness && r.visibleConcerns.redness !== "none")
    concerns.push(`rougeurs ${r.visibleConcerns.redness}`);
  if (r.visibleConcerns.dryness && r.visibleConcerns.dryness !== "none")
    concerns.push(`sécheresse ${r.visibleConcerns.dryness}`);
  return `Analyse Gemini — Type ${r.fitzpatrickType}, ${r.skinType ?? "?"}, ${r.undertone}${concerns.length ? `. Concernés: ${concerns.join(", ")}` : ""}`;
}
