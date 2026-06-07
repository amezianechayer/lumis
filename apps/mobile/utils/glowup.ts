// Glow Up hub content: rotating daily challenges + curated tips by category.
// Gender-aware so the men's "Glow Up" (ex-"Jawline") feels just as rich.

export interface GlowChallenge {
  emoji: string;
  title: string;
  desc: string;
}

export interface GlowTipSection {
  id: string;
  label: string;
  emoji: string;
  tips: string[];
}

// Daily micro-challenges, picked deterministically by day-of-year so everyone
// gets a fresh but consistent "défi du jour".
const CHALLENGES: GlowChallenge[] = [
  { emoji: "💧", title: "Hydratation +", desc: "Bois 1,5 L d'eau aujourd'hui — la peau s'illumine de l'intérieur." },
  { emoji: "☀️", title: "SPF non négociable", desc: "Applique un SPF 30+ ce matin, même à l'intérieur. Le meilleur anti-âge." },
  { emoji: "😴", title: "Nuit réparatrice", desc: "Couche-toi 30 min plus tôt — c'est la nuit que la peau se régénère." },
  { emoji: "🧴", title: "Double nettoyage", desc: "Ce soir, nettoie en 2 temps (huile puis gel) pour une peau nette." },
  { emoji: "🥑", title: "Assiette glow", desc: "Ajoute une source d'oméga-3 (avocat, noix, poisson) à un repas." },
  { emoji: "💆", title: "Auto-massage 2 min", desc: "Masse ton visage du centre vers l'extérieur pour drainer et raffermir." },
  { emoji: "🍬", title: "Pause sucre", desc: "Évite les sucres rapides aujourd'hui — ils nourrissent l'inflammation et l'acné." },
  { emoji: "🌿", title: "Actif du soir", desc: "Applique ton actif ciblé (rétinol, niacinamide ou vitamine C)." },
  { emoji: "🛏️", title: "Taie en soie", desc: "Dors sur une taie soie/satin : moins de plis et de frottements." },
  { emoji: "🧘", title: "Décompresser", desc: "5 min de respiration profonde — le stress se voit sur la peau." },
  { emoji: "🍵", title: "Thé vert glow", desc: "Remplace un café par un thé vert, riche en antioxydants." },
  { emoji: "👅", title: "Posture & mewing", desc: "Langue au palais, mâchoire détendue : 5 min pour un ovale plus net." },
  { emoji: "🧖", title: "Masque cocooning", desc: "Offre-toi un masque hydratant ou purifiant selon ta peau." },
  { emoji: "🚶", title: "Bouge 20 min", desc: "Une marche active booste la circulation = teint plus lumineux." },
];

export function getDailyChallenge(date = new Date()): GlowChallenge {
  const start = new Date(date.getFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start.getTime()) / 86400000);
  return CHALLENGES[((day % CHALLENGES.length) + CHALLENGES.length) % CHALLENGES.length];
}

// Plan lengths offered for the multi-day Glow Up challenge.
export const PLAN_LENGTHS = [7, 14, 28];

// Curated tips, grouped and lightly adapted by gender.
export function getGlowTips(gender?: string): GlowTipSection[] {
  const isMale = gender === "male";
  return [
    {
      id: "skin",
      label: "Peau",
      emoji: "✨",
      tips: [
        "Nettoie matin et soir, jamais à l'eau brûlante.",
        "Hydrate sur peau encore humide pour retenir l'eau.",
        "Introduis un seul actif à la fois pour éviter les irritations.",
        "Exfolie 1 à 2 fois par semaine, pas plus.",
        isMale
          ? "Hydrate juste après le rasage pour apaiser le feu du rasoir."
          : "Démaquille toujours avant de dormir.",
      ],
    },
    {
      id: "hair",
      label: isMale ? "Cheveux & barbe" : "Cheveux",
      emoji: isMale ? "🧔" : "💇",
      tips: [
        "Lave le cuir chevelu, pas les longueurs.",
        "Termine la douche à l'eau fraîche pour la brillance.",
        "Protège du chaud (sèche-cheveux, fer) avec un soin thermo.",
        isMale
          ? "Brosse et huile ta barbe pour la garder douce et nette."
          : "Masque nourrissant 1x/semaine sur les pointes.",
      ],
    },
    {
      id: "life",
      label: "Lifestyle",
      emoji: "🌿",
      tips: [
        "Vise 7-8 h de sommeil : non négociable pour le glow.",
        "Bois de l'eau régulièrement tout au long de la journée.",
        "Réduis les sucres rapides et l'alcool.",
        "Ajoute oméga-3 et antioxydants (fruits rouges, légumes verts).",
        "Gère ton stress : il déclenche acné et teint terne.",
      ],
    },
    {
      id: "body",
      label: "Corps",
      emoji: "🧴",
      tips: [
        "Hydrate le corps juste après la douche.",
        "N'oublie pas le SPF sur le cou et les mains.",
        "Brossage à sec avant la douche pour activer la circulation.",
      ],
    },
  ];
}
