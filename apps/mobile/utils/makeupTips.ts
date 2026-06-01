// Makeup & grooming knowledge base by face shape.
// Source: professional makeup artistry principles (contouring/highlighting theory).

export type FaceShape = "oval" | "round" | "square" | "heart" | "oblong" | "diamond";

export interface ZoneHint {
  zone: string;      // human label
  action: string;    // what to do
}

export interface MakeupGuide {
  faceShapeLabel: string;
  goal: string;                  // overall objective for this shape
  contour: ZoneHint[];           // where to deepen
  highlight: ZoneHint[];         // where to brighten
  blush: string;                 // blush placement
  brows: string;                 // brow shape advice
  steps: { title: string; description: string; tip?: string }[];
  // diagram zones (normalized positions on a 100x130 face canvas)
  diagram: {
    contour: { x: number; y: number; rx: number; ry: number }[];
    highlight: { x: number; y: number; rx: number; ry: number }[];
    blush: { x: number; y: number; r: number }[];
  };
}

// ─── Female makeup guides ──────────────────────────────────────────────────────
const FEMALE_GUIDES: Record<FaceShape, MakeupGuide> = {
  oval: {
    faceShapeLabel: "Ovale",
    goal: "Ta forme est équilibrée — l'objectif est de préserver l'harmonie naturelle, pas de la modifier.",
    contour: [{ zone: "Sous les pommettes", action: "Léger creux pour structurer" }],
    highlight: [{ zone: "Pommettes hautes", action: "Illumine le haut des joues" }, { zone: "Arête du nez", action: "Trait fin lumineux" }],
    blush: "Applique le blush directement sur les pommettes en estompant vers les tempes.",
    brows: "Sourcils légèrement arqués — ta forme supporte la plupart des styles.",
    steps: [
      { title: "Base unifiée", description: "Applique ton fond de teint en couche fine du centre vers l'extérieur du visage.", tip: "Une éponge humide donne un fini naturel." },
      { title: "Contour léger", description: "Trace une ombre douce sous les pommettes, en suivant la ligne naturelle de l'os.", tip: "Estompe bien, pas de démarcation." },
      { title: "Highlight", description: "Illumine le haut des pommettes, l'arc de Cupidon et l'arête du nez." },
      { title: "Blush", description: "Sourire léger, applique le blush sur la partie bombée des joues." },
    ],
    diagram: {
      contour: [{ x: 22, y: 62, rx: 8, ry: 14 }, { x: 78, y: 62, rx: 8, ry: 14 }],
      highlight: [{ x: 35, y: 52, rx: 7, ry: 5 }, { x: 65, y: 52, rx: 7, ry: 5 }, { x: 50, y: 55, rx: 4, ry: 16 }],
      blush: [{ x: 32, y: 58, r: 8 }, { x: 68, y: 58, r: 8 }],
    },
  },
  round: {
    faceShapeLabel: "Rond",
    goal: "Créer l'illusion de longueur et définir les angles pour affiner le visage.",
    contour: [{ zone: "Côtés du visage", action: "Fonce les tempes et la mâchoire pour allonger" }, { zone: "Sous les pommettes", action: "Creux marqué en diagonale" }],
    highlight: [{ zone: "Centre du front", action: "Bande verticale lumineuse" }, { zone: "Menton", action: "Point lumineux pour étirer" }],
    blush: "Applique le blush en diagonale, des pommettes vers les tempes, pour étirer visuellement.",
    brows: "Sourcils bien arqués et hauts — ça allonge le visage.",
    steps: [
      { title: "Base", description: "Fond de teint uniforme sur tout le visage." },
      { title: "Contour latéral", description: "Fonce les deux côtés du visage (tempes → mâchoire) pour créer de la longueur.", tip: "C'est la clé pour affiner un visage rond." },
      { title: "Contour pommettes", description: "Creuse sous les pommettes en diagonale vers les oreilles." },
      { title: "Highlight vertical", description: "Illumine une bande verticale au centre (front, nez, menton) pour allonger." },
      { title: "Blush diagonal", description: "Blush des pommettes remontant vers les tempes, jamais rond." },
    ],
    diagram: {
      contour: [{ x: 16, y: 50, rx: 7, ry: 22 }, { x: 84, y: 50, rx: 7, ry: 22 }, { x: 26, y: 64, rx: 7, ry: 10 }, { x: 74, y: 64, rx: 7, ry: 10 }],
      highlight: [{ x: 50, y: 30, rx: 6, ry: 12 }, { x: 50, y: 88, rx: 6, ry: 8 }],
      blush: [{ x: 34, y: 56, r: 7 }, { x: 66, y: 56, r: 7 }],
    },
  },
  square: {
    faceShapeLabel: "Carré",
    goal: "Adoucir les angles de la mâchoire et du front pour un rendu plus doux.",
    contour: [{ zone: "Angles de la mâchoire", action: "Fonce et arrondit les coins" }, { zone: "Coins du front", action: "Adoucit la ligne carrée" }],
    highlight: [{ zone: "Centre du front", action: "Illumine pour adoucir" }, { zone: "Centre du menton", action: "Point lumineux central" }],
    blush: "Blush rond sur le bombé des joues pour apporter de la douceur.",
    brows: "Sourcils doucement arqués ou arrondis pour casser les angles.",
    steps: [
      { title: "Base", description: "Fond de teint sur tout le visage." },
      { title: "Adoucir la mâchoire", description: "Fonce les angles de la mâchoire en estompant vers le cou.", tip: "Arrondis les coins au lieu de les marquer." },
      { title: "Adoucir le front", description: "Fonce légèrement les coins supérieurs du front." },
      { title: "Highlight central", description: "Illumine le centre du front et du menton." },
      { title: "Blush rond", description: "Applique le blush en mouvement circulaire sur les pommettes." },
    ],
    diagram: {
      contour: [{ x: 20, y: 80, rx: 8, ry: 9 }, { x: 80, y: 80, rx: 8, ry: 9 }, { x: 22, y: 28, rx: 7, ry: 7 }, { x: 78, y: 28, rx: 7, ry: 7 }],
      highlight: [{ x: 50, y: 30, rx: 8, ry: 6 }, { x: 50, y: 92, rx: 6, ry: 6 }],
      blush: [{ x: 32, y: 58, r: 8 }, { x: 68, y: 58, r: 8 }],
    },
  },
  heart: {
    faceShapeLabel: "Cœur",
    goal: "Équilibrer un front large avec un menton fin — réduire le haut, étoffer le bas.",
    contour: [{ zone: "Côtés du front", action: "Fonce les tempes pour réduire la largeur" }, { zone: "Pointe du menton", action: "Léger contour si menton très pointu" }],
    highlight: [{ zone: "Bas des joues", action: "Élargit visuellement le bas du visage" }, { zone: "Centre du menton", action: "Adoucit la pointe" }],
    blush: "Blush bas sur les pommettes pour ramener le volume vers le bas du visage.",
    brows: "Sourcils arrondis pour adoucir le front.",
    steps: [
      { title: "Base", description: "Fond de teint uniforme." },
      { title: "Réduire le front", description: "Fonce les côtés du front et les tempes pour diminuer la largeur du haut.", tip: "C'est l'étape clé pour un visage en cœur." },
      { title: "Highlight bas", description: "Illumine le bas des joues et la mâchoire pour équilibrer." },
      { title: "Blush bas", description: "Applique le blush plus bas que les pommettes, vers le centre des joues." },
    ],
    diagram: {
      contour: [{ x: 20, y: 28, rx: 8, ry: 10 }, { x: 80, y: 28, rx: 8, ry: 10 }, { x: 50, y: 100, rx: 5, ry: 6 }],
      highlight: [{ x: 34, y: 70, rx: 7, ry: 6 }, { x: 66, y: 70, rx: 7, ry: 6 }],
      blush: [{ x: 34, y: 62, r: 8 }, { x: 66, y: 62, r: 8 }],
    },
  },
  oblong: {
    faceShapeLabel: "Allongé",
    goal: "Raccourcir visuellement le visage et ajouter de la largeur.",
    contour: [{ zone: "Haut du front", action: "Fonce la lisière des cheveux pour raccourcir" }, { zone: "Pointe du menton", action: "Fonce pour réduire la longueur" }],
    highlight: [{ zone: "Centre des joues", action: "Élargit horizontalement" }],
    blush: "Blush appliqué horizontalement sur les pommettes pour élargir le visage.",
    brows: "Sourcils plats et horizontaux — ça raccourcit le visage.",
    steps: [
      { title: "Base", description: "Fond de teint uniforme." },
      { title: "Raccourcir", description: "Fonce le haut du front (lisière) et le bas du menton pour réduire la longueur.", tip: "Le contour horizontal raccourcit." },
      { title: "Élargir", description: "Highlight horizontal au centre des joues pour donner de la largeur." },
      { title: "Blush horizontal", description: "Applique le blush en mouvement horizontal, pas en diagonale." },
    ],
    diagram: {
      contour: [{ x: 50, y: 20, rx: 18, ry: 6 }, { x: 50, y: 102, rx: 10, ry: 6 }],
      highlight: [{ x: 32, y: 58, rx: 8, ry: 5 }, { x: 68, y: 58, rx: 8, ry: 5 }],
      blush: [{ x: 32, y: 56, r: 9 }, { x: 68, y: 56, r: 9 }],
    },
  },
  diamond: {
    faceShapeLabel: "Diamant",
    goal: "Adoucir les pommettes larges et mettre en valeur le front et le menton plus étroits.",
    contour: [{ zone: "Pointes des pommettes", action: "Fonce les pommettes les plus saillantes" }],
    highlight: [{ zone: "Front", action: "Élargit le haut" }, { zone: "Menton", action: "Élargit le bas" }, { zone: "Sous les yeux", action: "Adoucit les pommettes" }],
    blush: "Blush sur le bombé des pommettes, estompé pour ne pas accentuer leur largeur.",
    brows: "Sourcils légèrement arqués et un peu plus longs pour équilibrer.",
    steps: [
      { title: "Base", description: "Fond de teint uniforme." },
      { title: "Adoucir les pommettes", description: "Fonce les points les plus larges des pommettes.", tip: "Estompe vers l'intérieur." },
      { title: "Élargir front et menton", description: "Highlight sur le front et le menton pour équilibrer la largeur." },
      { title: "Blush doux", description: "Blush léger sur le bombé, sans accentuer la largeur." },
    ],
    diagram: {
      contour: [{ x: 18, y: 55, rx: 7, ry: 10 }, { x: 82, y: 55, rx: 7, ry: 10 }],
      highlight: [{ x: 50, y: 28, rx: 10, ry: 6 }, { x: 50, y: 98, rx: 7, ry: 6 }],
      blush: [{ x: 33, y: 56, r: 7 }, { x: 67, y: 56, r: 7 }],
    },
  },
};

// ─── Male grooming guides (no makeup, focus on beard/brows/skin definition) ─────
const MALE_GUIDES: Record<FaceShape, MakeupGuide> = {
  oval: {
    faceShapeLabel: "Ovale",
    goal: "Forme équilibrée — la plupart des styles de barbe et coupes te vont.",
    contour: [],
    highlight: [],
    blush: "",
    brows: "Sourcils nets, épile uniquement entre les deux sourcils (monosourcil).",
    steps: [
      { title: "Barbe équilibrée", description: "Une barbe courte uniforme ou un collier de barbe met en valeur ta forme équilibrée." },
      { title: "Sourcils", description: "Garde une ligne nette, dégage l'espace entre les sourcils." },
      { title: "Soin de peau", description: "Hydrate quotidiennement, un teint sain est la base d'un look soigné." },
    ],
    diagram: { contour: [], highlight: [], blush: [] },
  },
  round: {
    faceShapeLabel: "Rond",
    goal: "Allonger le visage avec une barbe plus longue au menton.",
    contour: [{ zone: "Joues", action: "Garde la barbe courte sur les côtés" }],
    highlight: [{ zone: "Menton", action: "Laisse pousser plus long au menton" }],
    blush: "",
    brows: "Sourcils légèrement angulaires pour structurer.",
    steps: [
      { title: "Barbe allongeante", description: "Garde les côtés courts et laisse pousser le menton — ça allonge le visage rond.", tip: "Une barbe en bouc ou ducktail fonctionne très bien." },
      { title: "Dégradé des côtés", description: "Estompe la barbe courte sur les joues pour affiner." },
      { title: "Sourcils", description: "Une ligne légèrement angulaire casse la rondeur." },
    ],
    diagram: { contour: [{ x: 22, y: 64, rx: 7, ry: 12 }, { x: 78, y: 64, rx: 7, ry: 12 }], highlight: [{ x: 50, y: 92, rx: 8, ry: 8 }], blush: [] },
  },
  square: {
    faceShapeLabel: "Carré",
    goal: "Ta mâchoire forte est un atout — l'objectif est de la mettre en valeur.",
    contour: [],
    highlight: [{ zone: "Mâchoire", action: "Barbe nette qui suit la ligne de mâchoire" }],
    blush: "",
    brows: "Sourcils naturels, légèrement épais.",
    steps: [
      { title: "Barbe structurée", description: "Une barbe courte bien taillée qui suit ta ligne de mâchoire accentue ton angle masculin." },
      { title: "Ligne nette", description: "Définis une ligne de barbe nette sur les joues et le cou." },
      { title: "Soin", description: "Hydrate la barbe avec une huile pour un rendu soigné." },
    ],
    diagram: { contour: [], highlight: [{ x: 22, y: 78, rx: 8, ry: 8 }, { x: 78, y: 78, rx: 8, ry: 8 }], blush: [] },
  },
  heart: {
    faceShapeLabel: "Cœur",
    goal: "Équilibrer un front large avec du volume au niveau du menton.",
    contour: [],
    highlight: [{ zone: "Menton", action: "Barbe fournie pour étoffer le bas" }],
    blush: "",
    brows: "Sourcils pas trop épais pour ne pas alourdir le haut.",
    steps: [
      { title: "Barbe au menton", description: "Une barbe plus fournie au menton équilibre un front large." },
      { title: "Côtés modérés", description: "Garde les côtés modérés, le volume va vers le bas." },
      { title: "Sourcils légers", description: "Évite les sourcils trop épais qui accentuent le front." },
    ],
    diagram: { contour: [], highlight: [{ x: 50, y: 95, rx: 10, ry: 8 }], blush: [] },
  },
  oblong: {
    faceShapeLabel: "Allongé",
    goal: "Raccourcir visuellement avec du volume sur les côtés.",
    contour: [{ zone: "Menton", action: "Garde la barbe courte au menton" }],
    highlight: [{ zone: "Joues", action: "Volume de barbe sur les côtés" }],
    blush: "",
    brows: "Sourcils plats et horizontaux.",
    steps: [
      { title: "Barbe sur les côtés", description: "Laisse du volume de barbe sur les joues pour élargir, garde le menton court.", tip: "Évite la barbe longue qui allonge encore." },
      { title: "Coupe avec volume latéral", description: "Une coupe avec du volume sur les côtés équilibre la longueur." },
      { title: "Sourcils horizontaux", description: "Une ligne plate raccourcit visuellement." },
    ],
    diagram: { contour: [{ x: 50, y: 100, rx: 8, ry: 6 }], highlight: [{ x: 22, y: 62, rx: 7, ry: 10 }, { x: 78, y: 62, rx: 7, ry: 10 }], blush: [] },
  },
  diamond: {
    faceShapeLabel: "Diamant",
    goal: "Étoffer le menton et le front pour équilibrer des pommettes larges.",
    contour: [],
    highlight: [{ zone: "Menton", action: "Barbe pour élargir le bas" }],
    blush: "",
    brows: "Sourcils un peu plus longs pour équilibrer.",
    steps: [
      { title: "Barbe au menton", description: "Une barbe qui étoffe le menton équilibre des pommettes saillantes." },
      { title: "Volume contrôlé", description: "Évite trop de volume sur les joues qui accentue les pommettes." },
      { title: "Sourcils équilibrants", description: "Des sourcils légèrement plus longs harmonisent le visage." },
    ],
    diagram: { contour: [], highlight: [{ x: 50, y: 95, rx: 9, ry: 8 }], blush: [] },
  },
};

export function getMakeupGuide(faceShape: string, gender?: string): MakeupGuide {
  const shape = (["oval", "round", "square", "heart", "oblong", "diamond"].includes(faceShape)
    ? faceShape
    : "oval") as FaceShape;
  const isMale = gender === "male" || gender === "homme";
  return isMale ? MALE_GUIDES[shape] : FEMALE_GUIDES[shape];
}
