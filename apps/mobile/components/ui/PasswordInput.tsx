import { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import type { TextInputProps } from "react-native";
import Svg, { Path, Circle, Line } from "react-native-svg";
import { useThemeColors } from "../../stores/theme.store";

interface Props {
  label: string;
  placeholder?: string;
  value: string;
  onChangeText: (v: string) => void;
  autoComplete?: "password" | "new-password" | "off";
  onSubmitEditing?: () => void;
  returnKeyType?: TextInputProps["returnKeyType"];
}

function EyeIcon({ open, color }: { open: boolean; color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.6} />
      {!open && (
        <Line x1={3} y1={3} x2={21} y2={21} stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      )}
    </Svg>
  );
}

/**
 * Password field with a show/hide toggle. Keeps the OS autofill / "suggest
 * strong password" overlay disabled (an Android bug renders it as an extra
 * empty field under the input), matching the rest of the auth forms.
 */
export function PasswordInput({
  label,
  placeholder,
  value,
  onChangeText,
  autoComplete = "off",
  onSubmitEditing,
  returnKeyType,
}: Props) {
  const c = useThemeColors();
  const [visible, setVisible] = useState(false);

  return (
    <View>
      <Text className="text-lumis-white/70 font-body-medium text-sm mb-1.5">{label}</Text>
      <View className="flex-row items-center bg-card border border-line rounded-xl pr-2 pl-4">
        <TextInput
          className="flex-1 py-3.5 text-lumis-white font-body text-base"
          placeholder={placeholder}
          placeholderTextColor={c.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={!visible}
          autoComplete="off"
          importantForAutofill="no"
          textContentType="none"
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
        />
        <Pressable onPress={() => setVisible((v) => !v)} hitSlop={12} className="p-2">
          <EyeIcon open={visible} color={c.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}
