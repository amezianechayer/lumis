import { View, Text, TouchableOpacity, Modal, Pressable } from "react-native";
import { useState } from "react";
import { SUPPORTED_LOCALES, SupportedLocale } from "../../utils/i18n";
import { useLanguageStore } from "../../stores/language.store";

export function LanguagePicker() {
  const [open, setOpen] = useState(false);
  const { locale, setLanguage } = useLanguageStore();

  const current = SUPPORTED_LOCALES.find((l) => l.code === locale)!;

  const handleSelect = (code: SupportedLocale) => {
    setLanguage(code);
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        className="flex-row items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5"
        activeOpacity={0.8}
      >
        <Text className="text-base">{current.flag}</Text>
        <Text className="text-lumis-white/70 font-body text-xs">{current.code.toUpperCase()}</Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/60 items-center justify-end pb-8"
          onPress={() => setOpen(false)}
        >
          <Pressable
            className="w-full mx-4 bg-surface-2 rounded-3xl overflow-hidden"
            onPress={() => {}}
          >
            <View className="px-5 pt-5 pb-2">
              <Text className="text-lumis-black font-body-bold text-base text-center">
                Choisir la langue
              </Text>
            </View>
            {SUPPORTED_LOCALES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                onPress={() => handleSelect(lang.code)}
                className={`flex-row items-center gap-4 px-5 py-4 border-b border-black/5 ${
                  locale === lang.code ? "bg-lumis-gold/10" : ""
                }`}
                activeOpacity={0.7}
              >
                <Text className="text-2xl">{lang.flag}</Text>
                <Text
                  className={`font-body-medium text-base flex-1 ${
                    locale === lang.code ? "text-lumis-gold" : "text-lumis-black"
                  }`}
                >
                  {lang.label}
                </Text>
                {locale === lang.code && (
                  <Text className="text-lumis-gold">✓</Text>
                )}
              </TouchableOpacity>
            ))}
            <View className="h-4" />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
