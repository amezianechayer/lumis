import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";
import { api } from "../services/api";
import { getMakeupGuide, FaceShape } from "../utils/makeupTips";
import { useThemeColors } from "../stores/theme.store";

const TERRACOTTA = "#C9826B";

// Haircut & beard catalogue by face shape (men)
const HAIRCUTS: Record<FaceShape, { name: string; desc: string; ask: string }[]> = {
  oval: [
    { name: "Undercut texturé", desc: "Côtés courts dégradés, dessus texturé mi-long.", ask: "Demande un undercut avec 5-7cm sur le dessus, fondu sur les côtés." },
    { name: "Side part classique", desc: "Raie sur le côté, élégant et intemporel.", ask: "Coupe ciseaux dessus, raie nette, côtés courts." },
    { name: "Quiff moderne", desc: "Volume vers l'avant, structuré.", ask: "Garde de la longueur devant pour le volume." },
  ],
  round: [
    { name: "Pompadour haut", desc: "Hauteur sur le dessus pour allonger le visage.", ask: "Volume maximal sur le dessus, côtés très courts." },
    { name: "Faux hawk", desc: "Crée de la verticalité, affine le visage rond.", ask: "Côtés fondus, bande centrale plus longue." },
    { name: "Undercut disconnecté", desc: "Contraste fort qui structure.", ask: "Côtés rasés, dessus long ramené en arrière." },
  ],
  square: [
    { name: "Crop texturé", desc: "Frange courte, met en valeur la mâchoire forte.", ask: "Frange texturée courte, fondu léger." },
    { name: "Buzz cut net", desc: "Assume les angles masculins.", ask: "Tondeuse uniforme grade 2-3." },
    { name: "Side swept", desc: "Adoucit légèrement les angles.", ask: "Mèche balayée sur le côté." },
  ],
  heart: [
    { name: "Frange texturée", desc: "Équilibre un front large.", ask: "Frange qui couvre une partie du front." },
    { name: "Mi-long ondulé", desc: "Du volume vers le bas du visage.", ask: "Longueur aux oreilles, texture naturelle." },
    { name: "Fade moyen", desc: "Volume modéré, pas trop haut.", ask: "Fondu moyen, dessus moyen." },
  ],
  oblong: [
    { name: "Frange + côtés volume", desc: "Raccourcit visuellement, ajoute de la largeur.", ask: "Frange devant, garde du volume sur les côtés." },
    { name: "Crop français", desc: "Frange droite, équilibre la longueur.", ask: "Frange droite courte, côtés moyens." },
    { name: "Mi-long avec frange", desc: "Évite trop de hauteur.", ask: "Longueur moyenne, pas de volume vertical." },
  ],
  diamond: [
    { name: "Frange texturée", desc: "Élargit le front étroit.", ask: "Frange qui ajoute du volume au front." },
    { name: "Mi-long sur les côtés", desc: "Équilibre les pommettes saillantes.", ask: "Garde du volume aux tempes." },
    { name: "Fringe up", desc: "Hauteur devant, douceur sur les côtés.", ask: "Volume frontal, côtés non rasés." },
  ],
};

const BEARDS: Record<FaceShape, { name: string; desc: string }[]> = {
  oval: [
    { name: "Barbe courte uniforme", desc: "3-10mm, entretien facile, va à tout le monde." },
    { name: "Collier de barbe", desc: "Soigné et structuré." },
  ],
  round: [
    { name: "Bouc / Ducktail", desc: "Allonge le visage, volume au menton." },
    { name: "Barbe courte côtés rasés", desc: "Affine les joues rondes." },
  ],
  square: [
    { name: "Barbe courte nette", desc: "Suit la ligne de mâchoire, accentue le masculin." },
    { name: "Stubble (3 jours)", desc: "Adoucit légèrement les angles." },
  ],
  heart: [
    { name: "Barbe fournie au menton", desc: "Étoffe le bas du visage." },
    { name: "Full beard moyenne", desc: "Équilibre un front large." },
  ],
  oblong: [
    { name: "Barbe volume côtés", desc: "Élargit, garde le menton court." },
    { name: "Mutton chops modernes", desc: "Du volume sur les joues." },
  ],
  diamond: [
    { name: "Barbe pleine au menton", desc: "Élargit le bas du visage." },
    { name: "Full beard arrondie", desc: "Adoucit les pommettes." },
  ],
};

export default function MenStylesScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["face-profile", "latest"],
    queryFn: () => api.getLatestFaceProfile(),
    staleTime: 1000 * 60 * 10,
  });

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={TERRACOTTA} size="large" />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center", padding: 32 }}>
        <Text style={{ fontSize: 44, marginBottom: 12 }}>💈</Text>
        <Text style={{ color: c.text, fontSize: 16, fontWeight: "600", marginBottom: 6, textAlign: "center" }}>Analyse faciale requise</Text>
        <Text style={{ color: c.textMuted, fontSize: 13, textAlign: "center", marginBottom: 20 }}>
          Fais ton analyse faciale pour voir les coupes et barbes adaptées à ta forme de visage.
        </Text>
        <TouchableOpacity onPress={() => router.push("/(auth)/onboarding/selfie")} style={{ backgroundColor: TERRACOTTA, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 }}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>Analyser mon visage</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const shape = (["oval", "round", "square", "heart", "oblong", "diamond"].includes(profile.face_shape) ? profile.face_shape : "oval") as FaceShape;
  const guide = getMakeupGuide(profile.face_shape, "male");
  const haircuts = HAIRCUTS[shape];
  const beards = BEARDS[shape];
  const shapeLabel = { oval: "Ovale", round: "Rond", square: "Carré", heart: "Cœur", oblong: "Allongé", diamond: "Diamant" }[shape];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 6, marginRight: 6 }}>
          <Text style={{ color: TERRACOTTA, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: c.text, fontWeight: "700", fontSize: 18 }}>Coupes & Barbes</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        {/* Face shape hero */}
        <Animated.View entering={FadeInDown} style={{ backgroundColor: c.bgCard, borderWidth: 0.5, borderColor: c.border, borderRadius: 20, padding: 20, marginBottom: 16, alignItems: "center" }}>
          <Text style={{ color: c.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Ta forme de visage</Text>
          <Text style={{ color: TERRACOTTA, fontSize: 26, fontWeight: "700", marginBottom: 6 }}>{shapeLabel}</Text>
          <Text style={{ color: c.textMuted, fontSize: 13, lineHeight: 19, textAlign: "center" }}>{guide.goal}</Text>
        </Animated.View>

        {/* Haircuts */}
        <Animated.View entering={FadeInDown.delay(80)} style={{ marginBottom: 16 }}>
          <Text style={{ color: c.text, fontSize: 16, fontWeight: "700", marginBottom: 12 }}>✂️ Coupes recommandées</Text>
          {haircuts.map((h, i) => (
            <View key={i} style={{ backgroundColor: c.bgCard, borderWidth: 0.5, borderColor: c.borderLight, borderRadius: 16, padding: 16, marginBottom: 10 }}>
              <Text style={{ color: c.text, fontWeight: "600", fontSize: 15, marginBottom: 4 }}>{h.name}</Text>
              <Text style={{ color: c.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 8 }}>{h.desc}</Text>
              <View style={{ backgroundColor: c.primaryMuted, borderRadius: 10, padding: 10 }}>
                <Text style={{ color: TERRACOTTA, fontSize: 12, lineHeight: 17 }}>💬 Chez le coiffeur : {h.ask}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        {/* Beards */}
        <Animated.View entering={FadeInDown.delay(160)}>
          <Text style={{ color: c.text, fontSize: 16, fontWeight: "700", marginBottom: 12 }}>🧔 Barbes recommandées</Text>
          {beards.map((b, i) => (
            <View key={i} style={{ backgroundColor: c.bgCard, borderWidth: 0.5, borderColor: c.borderLight, borderRadius: 16, padding: 16, marginBottom: 10 }}>
              <Text style={{ color: c.text, fontWeight: "600", fontSize: 15, marginBottom: 4 }}>{b.name}</Text>
              <Text style={{ color: c.textMuted, fontSize: 13, lineHeight: 19 }}>{b.desc}</Text>
            </View>
          ))}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
