import { useState, useCallback } from "react";
import * as ImageManipulator from "expo-image-manipulator";
import { MMKV } from "react-native-mmkv";
import { api } from "../services/api";
import { FaceProfile, SkinTone } from "../types/api";

const profileStorage = new MMKV({ id: "lumis-profile" });

export type AnalysisPhase = "idle" | "compressing" | "analyzing" | "done" | "error";

interface UseFaceAnalysisReturn {
  phase: AnalysisPhase;
  result: FaceProfile | null;
  error: string | null;
  analyze: (imageUri: string) => Promise<void>;
  reset: () => void;
}

export function useFaceAnalysis(): UseFaceAnalysisReturn {
  const [phase, setPhase] = useState<AnalysisPhase>("idle");
  const [result, setResult] = useState<FaceProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (imageUri: string) => {
    setPhase("compressing");
    setError(null);

    try {
      const compressed = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 720 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      const base64DataUri = `data:image/jpeg;base64,${compressed.base64}`;

      setPhase("analyzing");

      const skinToneHint = (profileStorage.getString("skin_tone") as SkinTone | undefined) ?? "fitzpatrick_3";

      const profile = await api.analyzeFace({
        photo_base64: base64DataUri,
        skin_tone_hint: skinToneHint,
        vein_hint: profileStorage.getString("vein_hint") ?? "",
        gender: profileStorage.getString("gender") ?? undefined,
      });

      profileStorage.set("latest_face_profile", JSON.stringify(profile));
      setResult(profile);
      setPhase("done");
    } catch (e: unknown) {
      const msg = typeof e === "string" ? e : "analysis_failed";
      setError(msg);
      setPhase("error");
    }
  }, []);

  const reset = useCallback(() => {
    setPhase("idle");
    setResult(null);
    setError(null);
  }, []);

  return { phase, result, error, analyze, reset };
}
