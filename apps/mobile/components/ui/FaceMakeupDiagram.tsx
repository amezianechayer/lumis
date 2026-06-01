import { View, Text } from "react-native";
import Svg, {
  Path, Ellipse, Circle, Defs, RadialGradient, LinearGradient, Stop, G,
} from "react-native-svg";
import { MakeupGuide, FaceShape } from "../../utils/makeupTips";

// Face silhouette paths per shape (viewBox 100x132)
const FACE_PATHS: Record<FaceShape, string> = {
  oval:   "M50,12 C66,12 77,26 77,46 C77,58 75,70 71,82 C66,98 59,116 50,120 C41,116 34,98 29,82 C25,70 23,58 23,46 C23,26 34,12 50,12 Z",
  round:  "M50,12 C70,12 80,30 80,54 C80,80 68,114 50,116 C32,114 20,80 20,54 C20,30 30,12 50,12 Z",
  square: "M28,16 C30,13 70,13 72,16 C79,20 79,34 79,46 C79,66 76,78 70,92 C64,106 58,116 50,118 C42,116 36,106 30,92 C24,78 21,66 21,46 C21,34 21,20 28,16 Z",
  heart:  "M22,32 C22,18 34,14 50,14 C66,14 78,18 78,32 C78,46 74,60 68,76 C62,96 57,114 50,118 C43,114 38,96 32,76 C26,60 22,46 22,32 Z",
  oblong: "M50,8 C65,8 76,22 76,42 C76,58 75,72 71,88 C66,106 58,120 50,124 C42,120 34,106 29,88 C25,72 24,58 24,42 C24,22 35,8 50,8 Z",
  diamond:"M50,12 C57,12 63,22 68,40 C73,56 76,62 76,68 C76,90 64,114 50,118 C36,114 24,90 24,68 C24,62 27,56 32,40 C37,22 43,12 50,12 Z",
};

// Hair paths (feminine = longer, masculine = shorter)
const HAIR_FEMALE: Record<FaceShape, string> = {
  oval:   "M50,10 C30,10 20,24 19,44 C16,40 14,30 18,22 C24,8 38,4 50,4 C62,4 76,8 82,22 C86,30 84,40 81,44 C80,24 70,10 50,10 Z",
  round:  "M50,10 C28,10 18,28 18,50 C14,44 12,32 17,22 C24,7 38,3 50,3 C62,3 76,7 83,22 C88,32 86,44 82,50 C82,28 72,10 50,10 Z",
  square: "M50,11 C30,11 22,24 21,44 C17,40 15,28 19,20 C26,7 38,4 50,4 C62,4 74,7 81,20 C85,28 83,40 79,44 C78,24 70,11 50,11 Z",
  heart:  "M50,12 C32,12 23,24 22,36 C17,32 15,22 20,16 C27,6 39,4 50,4 C61,4 73,6 80,16 C85,22 83,32 78,36 C77,24 68,12 50,12 Z",
  oblong: "M50,6 C31,6 21,22 20,42 C16,36 14,26 18,18 C25,5 38,2 50,2 C62,2 75,5 82,18 C86,26 84,36 80,42 C79,22 69,6 50,6 Z",
  diamond:"M50,12 C33,12 25,24 24,40 C19,34 17,24 22,16 C29,6 40,4 50,4 C60,4 71,6 78,16 C83,24 81,34 76,40 C75,24 67,12 50,12 Z",
};
const HAIR_MALE: Record<FaceShape, string> = {
  oval:   "M27,38 C24,26 32,11 50,11 C68,11 76,26 73,38 C71,30 64,22 50,22 C36,22 29,30 27,38 Z",
  round:  "M26,42 C23,28 32,12 50,12 C68,12 77,28 74,42 C72,32 64,24 50,24 C36,24 28,32 26,42 Z",
  square: "M26,40 C24,26 33,12 50,12 C67,12 76,26 74,40 C72,30 64,22 50,22 C36,22 28,30 26,40 Z",
  heart:  "M27,34 C25,22 34,13 50,13 C66,13 75,22 73,34 C71,26 64,20 50,20 C36,20 29,26 27,34 Z",
  oblong: "M26,38 C24,24 33,9 50,9 C67,9 76,24 74,38 C72,28 64,20 50,20 C36,20 28,28 26,38 Z",
  diamond:"M27,36 C25,24 34,13 50,13 C66,13 75,24 73,36 C71,28 64,21 50,21 C36,21 29,28 27,36 Z",
};

// Fitzpatrick → skin gradient stops
function skinColors(skinTone?: string): { light: string; mid: string; shadow: string } {
  switch (skinTone) {
    case "fitzpatrick_1": return { light: "#FCEBD6", mid: "#F5DEB8", shadow: "#E8C9A0" };
    case "fitzpatrick_2": return { light: "#F8E0C0", mid: "#F0D0A8", shadow: "#DBB488" };
    case "fitzpatrick_3": return { light: "#EBC9A0", mid: "#E0B890", shadow: "#C49A70" };
    case "fitzpatrick_4": return { light: "#D6AA80", mid: "#C99A6E", shadow: "#A87C52" };
    case "fitzpatrick_5": return { light: "#B07F54", mid: "#A06B43", shadow: "#7E5232" };
    case "fitzpatrick_6": return { light: "#7E5236", mid: "#6B4226", shadow: "#4E2F1A" };
    default:              return { light: "#EBC9A0", mid: "#E0B890", shadow: "#C49A70" };
  }
}

interface Props {
  guide: MakeupGuide;
  faceShape: FaceShape;
  isMale?: boolean;
  skinTone?: string;
}

export function FaceMakeupDiagram({ guide, faceShape, isMale, skinTone }: Props) {
  const facePath = FACE_PATHS[faceShape] ?? FACE_PATHS.oval;
  const hairPath = (isMale ? HAIR_MALE : HAIR_FEMALE)[faceShape] ?? (isMale ? HAIR_MALE : HAIR_FEMALE).oval;
  const skin = skinColors(skinTone);
  const { contour, highlight, blush } = guide.diagram;

  // Eye/brow/lip positions (viewBox coords)
  const eyeY = 52, lEyeX = 38, rEyeX = 62, eyeRx = 5.5, eyeRy = 3;
  const browY = 44;
  const lipY = 88;

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={186} height={246} viewBox="0 0 100 132">
        <Defs>
          <LinearGradient id="skinGrad" x1="0" y1="0" x2="0.3" y2="1">
            <Stop offset="0%" stopColor={skin.light} />
            <Stop offset="55%" stopColor={skin.mid} />
            <Stop offset="100%" stopColor={skin.shadow} />
          </LinearGradient>
          <LinearGradient id="hairGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={isMale ? "#2B2118" : "#3A2A1E"} />
            <Stop offset="100%" stopColor={isMale ? "#1A130D" : "#241810"} />
          </LinearGradient>
          <RadialGradient id="cheekShade" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={skin.shadow} stopOpacity={0.5} />
            <Stop offset="100%" stopColor={skin.shadow} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="blushG" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#F08098" stopOpacity={0.7} />
            <Stop offset="100%" stopColor="#F08098" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="contourG" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#6B4A2E" stopOpacity={0.6} />
            <Stop offset="100%" stopColor="#6B4A2E" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="hlG" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FFFBEF" stopOpacity={0.9} />
            <Stop offset="100%" stopColor="#FFFBEF" stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id="lipGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#C16A6A" />
            <Stop offset="100%" stopColor="#A04F54" />
          </LinearGradient>
        </Defs>

        {/* Hair behind */}
        <Path d={hairPath} fill="url(#hairGrad)" />

        {/* Face */}
        <Path d={facePath} fill="url(#skinGrad)" />

        {/* Natural cheek shading for depth */}
        <Ellipse cx={30} cy={60} rx={9} ry={14} fill="url(#cheekShade)" />
        <Ellipse cx={70} cy={60} rx={9} ry={14} fill="url(#cheekShade)" />

        {/* Brows */}
        <Path d={`M${lEyeX - 7},${browY} Q${lEyeX},${browY - 3} ${lEyeX + 6},${browY - 1}`}
          stroke={isMale ? "#2B2118" : "#3A2A1E"} strokeWidth={isMale ? 2.4 : 1.8} fill="none" strokeLinecap="round" />
        <Path d={`M${rEyeX - 6},${browY - 1} Q${rEyeX},${browY - 3} ${rEyeX + 7},${browY}`}
          stroke={isMale ? "#2B2118" : "#3A2A1E"} strokeWidth={isMale ? 2.4 : 1.8} fill="none" strokeLinecap="round" />

        {/* Eyes */}
        <G>
          {/* whites */}
          <Ellipse cx={lEyeX} cy={eyeY} rx={eyeRx} ry={eyeRy} fill="#FBF7F2" />
          <Ellipse cx={rEyeX} cy={eyeY} rx={eyeRx} ry={eyeRy} fill="#FBF7F2" />
          {/* iris */}
          <Circle cx={lEyeX} cy={eyeY} r={2.6} fill="#5B4636" />
          <Circle cx={rEyeX} cy={eyeY} r={2.6} fill="#5B4636" />
          <Circle cx={lEyeX} cy={eyeY} r={1.1} fill="#1A1209" />
          <Circle cx={rEyeX} cy={eyeY} r={1.1} fill="#1A1209" />
          {/* upper lash line */}
          <Path d={`M${lEyeX - eyeRx},${eyeY - 0.5} Q${lEyeX},${eyeY - eyeRy - 1.5} ${lEyeX + eyeRx},${eyeY - 0.5}`}
            stroke="#2A1E14" strokeWidth={1.2} fill="none" strokeLinecap="round" />
          <Path d={`M${rEyeX - eyeRx},${eyeY - 0.5} Q${rEyeX},${eyeY - eyeRy - 1.5} ${rEyeX + eyeRx},${eyeY - 0.5}`}
            stroke="#2A1E14" strokeWidth={1.2} fill="none" strokeLinecap="round" />
        </G>

        {/* Nose */}
        <Path d="M50,56 C49,62 47,68 46,71 C47.5,73 52.5,73 54,71 C53,68 51,62 50,56 Z"
          fill={skin.shadow} fillOpacity={0.35} />

        {/* ── MAKEUP OVERLAYS (on top of realistic face) ── */}
        {/* Foundation glow */}
        {highlight.length === 0 && contour.length === 0 && (
          <Path d={facePath} fill={skin.light} fillOpacity={0.0} />
        )}
        {/* Contour */}
        {contour.map((z, i) => (
          <Ellipse key={`c${i}`} cx={z.x} cy={z.y} rx={z.rx} ry={z.ry} fill="url(#contourG)" />
        ))}
        {/* Highlight */}
        {highlight.map((z, i) => (
          <Ellipse key={`h${i}`} cx={z.x} cy={z.y} rx={z.rx} ry={z.ry} fill="url(#hlG)" />
        ))}
        {/* Blush */}
        {blush.map((z, i) => (
          <Circle key={`b${i}`} cx={z.x} cy={z.y} r={z.r} fill="url(#blushG)" />
        ))}

        {/* Lips (only for female, makeup focus) */}
        {!isMale && (
          <G>
            <Path d={`M${50 - 8},${lipY} Q${50 - 4},${lipY - 2.5} 50,${lipY - 1} Q${50 + 4},${lipY - 2.5} ${50 + 8},${lipY} Q${50 + 4},${lipY + 3.5} 50,${lipY + 4} Q${50 - 4},${lipY + 3.5} ${50 - 8},${lipY} Z`}
              fill="url(#lipGrad)" />
            <Path d={`M${50 - 8},${lipY} Q50,${lipY + 0.5} ${50 + 8},${lipY}`}
              stroke="#8A4248" strokeWidth={0.6} fill="none" />
          </G>
        )}
        {/* Male: subtle lips + light stubble hint */}
        {isMale && (
          <Ellipse cx={50} cy={lipY} rx={6} ry={2.2} fill={skin.shadow} fillOpacity={0.45} />
        )}
      </Svg>

      {/* Legend */}
      <View style={{ flexDirection: "row", gap: 14, marginTop: 10, flexWrap: "wrap", justifyContent: "center" }}>
        {contour.length > 0 && (
          <LegendDot color="#6B4A2E" label="Contour" />
        )}
        {highlight.length > 0 && (
          <LegendDot color="#FFFBEF" label={isMale ? "Volume barbe" : "Highlight"} />
        )}
        {blush.length > 0 && (
          <LegendDot color="#F08098" label="Blush" />
        )}
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color, borderWidth: color === "#FFFBEF" ? 1 : 0, borderColor: "rgba(255,255,255,0.3)" }} />
      <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>{label}</Text>
    </View>
  );
}
