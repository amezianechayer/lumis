import Svg, { Path, Circle, Rect } from "react-native-svg";

// Custom Lumis icon set — soft, rounded, single-color line icons in the brand
// palette. Replaces raw emoji for a cohesive Flo/Clue-like feel. Pair with a
// pastel rounded background (see ToolTile / TabIcon).

export type IconName =
  | "home"
  | "coach"
  | "recs"
  | "profile"
  | "scan"
  | "routine"
  | "glowup"
  | "cycle"
  | "menstyles"
  | "tryon"
  | "analyse"
  | "product";

export function AppIcon({
  name,
  size = 24,
  color = "#C9826B",
  strokeWidth = 1.9,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const p = {
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };

  switch (name) {
    case "home":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M3 11.4 12 4l9 7.4" {...p} />
          <Path d="M5.5 10v8.5a1 1 0 0 0 1 1H17.5a1 1 0 0 0 1-1V10" {...p} />
        </Svg>
      );
    case "coach":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M5 5h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H10l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" {...p} />
          <Path d="M8.5 9.5h7M8.5 12h4" {...p} />
        </Svg>
      );
    case "recs":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.4 1 2.5h6c0-1.1.3-1.8 1-2.5A6 6 0 0 0 12 3z" {...p} />
          <Path d="M9.5 19h5M10.5 21.5h3" {...p} />
        </Svg>
      );
    case "profile":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="8" r="4" {...p} />
          <Path d="M4.5 20c0-4 3.5-6 7.5-6s7.5 2 7.5 6" {...p} />
        </Svg>
      );
    case "scan":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x="3" y="7" width="18" height="13" rx="3" {...p} />
          <Circle cx="12" cy="13.5" r="3.4" {...p} />
          <Path d="M8.5 7 10 4.5h4L15.5 7" {...p} />
        </Svg>
      );
    case "routine":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="3.6" {...p} />
          <Path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.5 1.5M16.5 16.5 18 18M18 6l-1.5 1.5M7.5 16.5 6 18" {...p} />
        </Svg>
      );
    case "glowup":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M11 3.5c.6 4.3 1.6 5.3 5.9 5.9-4.3.6-5.3 1.6-5.9 5.9-.6-4.3-1.6-5.3-5.9-5.9 4.3-.6 5.3-1.6 5.9-5.9z" {...p} />
          <Path d="M18 14.5c.25 1.4.6 1.75 2 2-1.4.25-1.75.6-2 2-.25-1.4-.6-1.75-2-2 1.4-.25 1.75-.6 2-2z" {...p} />
        </Svg>
      );
    case "cycle":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M20.5 14.2A8.2 8.2 0 1 1 9.8 3.5a6.6 6.6 0 0 0 10.7 10.7z" {...p} />
        </Svg>
      );
    case "menstyles":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="6" cy="6.5" r="2.4" {...p} />
          <Circle cx="6" cy="17.5" r="2.4" {...p} />
          <Path d="M8 7.8 20 17.5M8 16.2 20 6.5" {...p} />
        </Svg>
      );
    case "tryon":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M3 11c2-1.8 3.6-2.6 4.3-2.6 1 0 2.2.9 4.7 2 2.5-1.1 3.7-2 4.7-2 .7 0 2.3.8 4.3 2.6-2 .2-3 .8-4.5 1.7-1.4.9-3 1.3-4.5 1.3s-3.1-.4-4.5-1.3C6 11.8 5 11.2 3 11z" {...p} />
        </Svg>
      );
    case "analyse":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M4 8.5V6.5a2 2 0 0 1 2-2h2M16 4.5h2a2 2 0 0 1 2 2v2M20 15.5v2a2 2 0 0 1-2 2h-2M8 19.5H6a2 2 0 0 1-2-2v-2" {...p} />
          <Circle cx="12" cy="11" r="2.6" {...p} />
          <Path d="M9 16.2c.8-1 1.8-1.5 3-1.5s2.2.5 3 1.5" {...p} />
        </Svg>
      );
    case "product":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M10 3.5h4v3h-4z" {...p} />
          <Path d="M9 6.5h6l1 3v8.5a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V9.5z" {...p} />
          <Path d="M8.2 12.5h7.6" {...p} />
        </Svg>
      );
    default:
      return null;
  }
}
