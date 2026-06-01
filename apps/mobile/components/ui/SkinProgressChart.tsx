import { View, Text, TouchableOpacity } from "react-native";
import { useState } from "react";
import Svg, { Path, Circle, Line, Text as SvgText, Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SkinScan } from "../../types/api";

type Metric = "overall" | "acne" | "hydration" | "texture" | "uniformity";

const METRICS: { key: Metric; label: string; color: string }[] = [
  { key: "overall", label: "Global", color: "#C9A84C" },
  { key: "acne", label: "Acné", color: "#f87171" },
  { key: "hydration", label: "Hydratation", color: "#60a5fa" },
  { key: "texture", label: "Texture", color: "#a78bfa" },
  { key: "uniformity", label: "Uniformité", color: "#4ade80" },
];

function getScore(scan: SkinScan, metric: Metric): number {
  switch (metric) {
    case "overall": return scan.overall_score;
    case "acne": return scan.acne_score;
    case "hydration": return scan.hydration_score;
    case "texture": return scan.texture_score;
    case "uniformity": return scan.uniformity_score;
  }
}

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C ${cpx} ${prev.y} ${cpx} ${curr.y} ${curr.x} ${curr.y}`;
  }
  return d;
}

interface Props {
  scans: SkinScan[];
}

export function SkinProgressChart({ scans }: Props) {
  const [activeMetric, setActiveMetric] = useState<Metric>("overall");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (scans.length < 2) {
    return (
      <Animated.View entering={FadeInDown.delay(100)}
        style={{ backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", borderRadius: 20, padding: 20, alignItems: "center", justifyContent: "center", minHeight: 140 }}>
        <Text style={{ fontSize: 32, marginBottom: 8 }}>📊</Text>
        <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: "600", textAlign: "center" }}>
          Fais au moins 2 scans
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, textAlign: "center", marginTop: 4 }}>
          Le graphique d'évolution apparaîtra ici
        </Text>
      </Animated.View>
    );
  }

  // Max 10 scans, most recent last
  const data = [...scans].reverse().slice(-10);
  const metric = METRICS.find(m => m.key === activeMetric)!;

  const W = 320;
  const H = 140;
  const PAD_L = 32;
  const PAD_R = 12;
  const PAD_T = 12;
  const PAD_B = 28;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const scores = data.map(s => getScore(s, activeMetric));
  const minScore = Math.max(0, Math.min(...scores) - 10);
  const maxScore = Math.min(100, Math.max(...scores) + 10);
  const range = maxScore - minScore || 1;

  const toX = (i: number) => PAD_L + (i / (data.length - 1)) * chartW;
  const toY = (score: number) => PAD_T + chartH - ((score - minScore) / range) * chartH;

  const points = scores.map((s, i) => ({ x: toX(i), y: toY(s) }));
  const pathD = buildSmoothPath(points);

  // Gradient area under curve
  const areaD = pathD + ` L ${points[points.length - 1].x} ${H - PAD_B} L ${PAD_L} ${H - PAD_B} Z`;

  const latestScore = scores[scores.length - 1];
  const prevScore = scores[scores.length - 2];
  const delta = latestScore - prevScore;
  const trend = delta > 2 ? "↑" : delta < -2 ? "↓" : "→";
  const trendColor = delta > 2 ? "#4ade80" : delta < -2 ? "#f87171" : "#C9A84C";

  return (
    <Animated.View entering={FadeInDown.delay(100)}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <View>
          <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>
            Évolution sur {data.length} scans
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 22 }}>{latestScore}</Text>
            <Text style={{ color: trendColor, fontSize: 16, fontWeight: "700" }}>{trend} {Math.abs(delta) > 0 ? Math.abs(delta) : ""}</Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>
            {new Date(data[data.length - 1].created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
          </Text>
          <Text style={{ color: metric.color, fontSize: 11, fontWeight: "600", marginTop: 2 }}>
            {metric.label}
          </Text>
        </View>
      </View>

      {/* SVG Chart */}
      <View style={{ alignItems: "center", marginBottom: 12 }}>
        <Svg width={W} height={H}>
          <Defs>
            <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={metric.color} stopOpacity={0.25} />
              <Stop offset="1" stopColor={metric.color} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(v => {
            if (v < minScore - 5 || v > maxScore + 5) return null;
            const y = toY(v);
            return (
              <View key={v}>
                <Line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
                  stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
                <SvgText x={PAD_L - 4} y={y + 4} fontSize={9}
                  fill="rgba(255,255,255,0.25)" textAnchor="end">{v}</SvgText>
              </View>
            );
          })}

          {/* Area fill */}
          <Path d={areaD} fill="url(#areaGrad)" />

          {/* Line */}
          <Path d={pathD} stroke={metric.color} strokeWidth={2.5}
            fill="none" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data points */}
          {points.map((p, i) => {
            const isLast = i === points.length - 1;
            const isHovered = hoveredIndex === i;
            const s = scores[i];
            return (
              <View key={i}>
                {(isLast || isHovered) && (
                  <Circle cx={p.x} cy={p.y} r={isLast ? 5 : 4}
                    fill={metric.color} stroke="#0A0A0A" strokeWidth={2} />
                )}
                {!isLast && !isHovered && (
                  <Circle cx={p.x} cy={p.y} r={3}
                    fill={metric.color} opacity={0.6} />
                )}
                {(isLast || isHovered) && (
                  <SvgText x={p.x} y={p.y - 10} fontSize={10}
                    fill={metric.color} textAnchor="middle" fontWeight="bold">{s}</SvgText>
                )}
              </View>
            );
          })}

          {/* X axis labels */}
          {data.map((scan, i) => {
            if (data.length > 6 && i % 2 !== 0) return null;
            const x = toX(i);
            const label = new Date(scan.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
            return (
              <SvgText key={i} x={x} y={H - 4} fontSize={8}
                fill="rgba(255,255,255,0.3)" textAnchor="middle">{label}</SvgText>
            );
          })}
        </Svg>
      </View>

      {/* Metric selector */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {METRICS.map(m => (
          <TouchableOpacity
            key={m.key}
            onPress={() => setActiveMetric(m.key)}
            activeOpacity={0.8}
            style={{
              paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
              borderWidth: 1,
              backgroundColor: activeMetric === m.key ? `${m.color}20` : "transparent",
              borderColor: activeMetric === m.key ? m.color : "rgba(255,255,255,0.12)",
            }}
          >
            <Text style={{
              fontSize: 11, fontWeight: activeMetric === m.key ? "700" : "400",
              color: activeMetric === m.key ? m.color : "rgba(255,255,255,0.4)",
            }}>
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
}
