import { View, Text } from "react-native";
import { t } from "../../utils/i18n";

/** Returns a coarse strength score from 0 (empty) to 4 (strong). */
export function scorePassword(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

/** Mirrors the backend policy (services.ValidatePasswordStrength). */
export function isPasswordValid(pw: string): boolean {
  return pw.length >= 8 && /[a-zA-Z]/.test(pw) && /\d/.test(pw);
}

const LEVELS = [
  { key: "weak", color: "#F09595" },
  { key: "fair", color: "#E8A87C" },
  { key: "good", color: "#E8C87C" },
  { key: "strong", color: "#5DCAA5" },
] as const;

export function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;

  const score = scorePassword(password); // 0..4
  const level = Math.max(0, Math.min(score - 1, 3));
  const color = LEVELS[level].color;

  return (
    <View className="mt-1.5">
      <View className="flex-row gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            className="flex-1 h-1 rounded-full"
            style={{ backgroundColor: i < score ? color : "rgba(255,255,255,0.1)" }}
          />
        ))}
      </View>
      <Text className="font-body text-xs mt-1" style={{ color }}>
        {t(`auth.password_strength.${LEVELS[level].key}`)}
      </Text>
    </View>
  );
}
