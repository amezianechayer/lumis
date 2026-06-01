import { View, Text } from "react-native";
import Svg, { Path, Ellipse, Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { MakeupGuide, FaceShape } from "../../utils/makeupTips";

// Face silhouette paths per shape (drawn on a 100x130 viewBox)
const FACE_PATHS: Record<FaceShape, string> = {
  oval:   "M50,8 C68,8 80,24 80,48 C80,80 68,118 50,122 C32,118 20,80 20,48 C20,24 32,8 50,8 Z",
  round:  "M50,10 C72,10 82,30 82,60 C82,92 70,116 50,118 C30,116 18,92 18,60 C18,30 28,10 50,10 Z",
  square: "M26,14 L74,14 C80,14 82,20 82,30 L82,82 C82,104 68,116 50,118 C32,116 18,104 18,82 L18,30 C18,20 20,14 26,14 Z",
  heart:  "M18,30 C18,18 30,12 50,12 C70,12 82,18 82,30 C82,58 70,82 50,120 C30,82 18,58 18,30 Z",
  oblong: "M50,6 C68,6 80,22 80,44 C80,86 70,122 50,126 C30,122 20,86 20,44 C20,22 32,6 50,6 Z",
  diamond:"M50,8 C58,8 66,20 72,40 C78,58 82,66 82,70 C82,96 68,118 50,122 C32,118 18,96 18,70 C18,66 22,58 28,40 C34,20 42,8 50,8 Z",
};

interface Props {
  guide: MakeupGuide;
  faceShape: FaceShape;
  isMale?: boolean;
}

export function FaceMakeupDiagram({ guide, faceShape, isMale }: Props) {
  const facePath = FACE_PATHS[faceShape] ?? FACE_PATHS.oval;
  const { contour, highlight, blush } = guide.diagram;

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={180} height={234} viewBox="0 0 100 130">
        <Defs>
          <RadialGradient id="blushDiag" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#F4A0B8" stopOpacity={0.6} />
            <Stop offset="100%" stopColor="#F4A0B8" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="contourDiag" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#7A5C3E" stopOpacity={0.65} />
            <Stop offset="100%" stopColor="#7A5C3E" stopOpacity={0.05} />
          </RadialGradient>
          <RadialGradient id="hlDiag" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FFF4D6" stopOpacity={0.85} />
            <Stop offset="100%" stopColor="#FFF4D6" stopOpacity={0} />
          </RadialGradient>
        </Defs>

        {/* Face silhouette */}
        <Path d={facePath} fill="rgba(255,255,255,0.06)" stroke="rgba(201,168,76,0.4)" strokeWidth={1} />

        {/* Eyes (simple) */}
        <Ellipse cx={37} cy={50} rx={5} ry={2.5} fill="rgba(255,255,255,0.3)" />
        <Ellipse cx={63} cy={50} rx={5} ry={2.5} fill="rgba(255,255,255,0.3)" />
        {/* Nose */}
        <Path d="M50,54 L48,66 L52,66 Z" fill="rgba(255,255,255,0.15)" />
        {/* Lips */}
        <Ellipse cx={50} cy={78} rx={7} ry={3} fill="rgba(201,168,76,0.4)" />

        {/* Contour zones */}
        {contour.map((z, i) => (
          <Ellipse key={`c${i}`} cx={z.x} cy={z.y} rx={z.rx} ry={z.ry} fill="url(#contourDiag)" />
        ))}
        {/* Highlight zones */}
        {highlight.map((z, i) => (
          <Ellipse key={`h${i}`} cx={z.x} cy={z.y} rx={z.rx} ry={z.ry} fill="url(#hlDiag)" />
        ))}
        {/* Blush zones */}
        {blush.map((z, i) => (
          <Circle key={`b${i}`} cx={z.x} cy={z.y} r={z.r} fill="url(#blushDiag)" />
        ))}
      </Svg>

      {/* Legend */}
      <View style={{ flexDirection: "row", gap: 16, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
        {contour.length > 0 && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#7A5C3E" }} />
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>Contour (foncer)</Text>
          </View>
        )}
        {highlight.length > 0 && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#FFF4D6" }} />
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>{isMale ? "Volume barbe" : "Highlight"}</Text>
          </View>
        )}
        {blush.length > 0 && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#F4A0B8" }} />
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>Blush</Text>
          </View>
        )}
      </View>
    </View>
  );
}
