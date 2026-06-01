// Science-based undertone + Fitzpatrick + color season questionnaire.
// Methods: vein test, jewelry test, sun reaction, natural skin/hair color.

export interface QuizOption {
  label: string;
  emoji: string;
  warm?: number;   // votes toward warm undertone
  cool?: number;   // votes toward cool undertone
  fitz?: number;   // suggested Fitzpatrick (1-6), averaged when present
}

export interface QuizQuestion {
  id: string;
  question: string;
  hint?: string;
  options: QuizOption[];
}

export const QUIZ: QuizQuestion[] = [
  {
    id: "veins",
    question: "De quelle couleur sont les veines de ton poignet ?",
    hint: "Regarde à la lumière naturelle, face interne du poignet.",
    options: [
      { label: "Bleues ou violettes", emoji: "💙", cool: 2 },
      { label: "Vertes", emoji: "💚", warm: 2 },
      { label: "Un mélange des deux", emoji: "💜", warm: 1, cool: 1 },
    ],
  },
  {
    id: "jewelry",
    question: "Quel métal met le plus ton teint en valeur ?",
    hint: "Pense aux bijoux qui t'illuminent le visage.",
    options: [
      { label: "L'or", emoji: "🟡", warm: 2 },
      { label: "L'argent", emoji: "⚪", cool: 2 },
      { label: "Les deux me vont", emoji: "🤍", warm: 1, cool: 1 },
    ],
  },
  {
    id: "sun",
    question: "Comment ta peau réagit-elle au soleil ?",
    hint: "Sans protection, lors d'une première exposition.",
    options: [
      { label: "Je brûle, je ne bronze jamais", emoji: "🔴", cool: 2, fitz: 1 },
      { label: "Je brûle facilement, je bronze peu", emoji: "🌸", cool: 1, fitz: 2 },
      { label: "Je rougis puis je bronze", emoji: "🌤️", fitz: 3 },
      { label: "Je bronze facilement, rarement de coups de soleil", emoji: "🌞", warm: 1, fitz: 4 },
      { label: "Je bronze beaucoup, je ne brûle presque jamais", emoji: "🟤", warm: 1, fitz: 5 },
      { label: "Ma peau est foncée, je ne brûle jamais", emoji: "🟫", fitz: 6 },
    ],
  },
  {
    id: "skin",
    question: "Quelle est ta couleur de peau naturelle ?",
    hint: "Sur une zone peu exposée (intérieur du bras).",
    options: [
      { label: "Très claire / porcelaine", emoji: "🤍", fitz: 1 },
      { label: "Claire", emoji: "🌷", fitz: 2 },
      { label: "Moyenne / beige", emoji: "🌾", fitz: 3 },
      { label: "Mate / olive", emoji: "🫒", fitz: 4 },
      { label: "Brune", emoji: "🤎", fitz: 5 },
      { label: "Foncée / ébène", emoji: "⬛", fitz: 6 },
    ],
  },
  {
    id: "hair",
    question: "Quelle est ta couleur de cheveux naturelle ?",
    options: [
      { label: "Blond clair / cendré", emoji: "👱", cool: 1, fitz: 2 },
      { label: "Blond doré / roux", emoji: "🦰", warm: 2, fitz: 2 },
      { label: "Châtain", emoji: "🌰", warm: 1, fitz: 3 },
      { label: "Brun foncé", emoji: "🟤", warm: 1, fitz: 4 },
      { label: "Noir", emoji: "⚫", cool: 1, fitz: 5 },
    ],
  },
  {
    id: "fabric",
    question: "Quelle couleur de t-shirt t'avantage le plus ?",
    hint: "Près du visage, sans maquillage.",
    options: [
      { label: "Blanc pur éclatant", emoji: "🤍", cool: 2 },
      { label: "Blanc cassé / crème / ivoire", emoji: "🟡", warm: 2 },
      { label: "Les deux me vont", emoji: "⚖️", warm: 1, cool: 1 },
    ],
  },
];

export interface QuizResult {
  undertone: "warm" | "cool" | "neutral";
  skinTone: string;       // fitzpatrick_1..6
  colorSeason: "spring" | "summer" | "autumn" | "winter";
  undertoneLabel: string;
  seasonLabel: string;
  confidence: number;     // 0-100
}

export function computeQuizResult(answers: Record<string, QuizOption>): QuizResult {
  let warm = 0, cool = 0;
  const fitzVotes: number[] = [];

  Object.values(answers).forEach((opt) => {
    warm += opt.warm ?? 0;
    cool += opt.cool ?? 0;
    if (opt.fitz) fitzVotes.push(opt.fitz);
  });

  // Undertone
  let undertone: QuizResult["undertone"];
  const diff = warm - cool;
  if (diff >= 2) undertone = "warm";
  else if (diff <= -2) undertone = "cool";
  else undertone = "neutral";

  // Fitzpatrick — average of votes, rounded, clamped 1-6
  const fitz = fitzVotes.length > 0
    ? Math.round(fitzVotes.reduce((a, b) => a + b, 0) / fitzVotes.length)
    : 3;
  const fitzClamped = Math.max(1, Math.min(6, fitz));
  const skinTone = `fitzpatrick_${fitzClamped}`;

  // Color season — undertone × depth
  const isLight = fitzClamped <= 3;
  let colorSeason: QuizResult["colorSeason"];
  if (undertone === "warm") colorSeason = isLight ? "spring" : "autumn";
  else if (undertone === "cool") colorSeason = isLight ? "summer" : "winter";
  else colorSeason = isLight ? "summer" : "autumn"; // neutral → softer seasons

  // Confidence: how decisive the undertone vote was
  const totalVotes = warm + cool;
  const confidence = totalVotes > 0
    ? Math.min(100, 55 + Math.round((Math.abs(diff) / totalVotes) * 45))
    : 60;

  const undertoneLabel = undertone === "warm" ? "Chaud" : undertone === "cool" ? "Froid" : "Neutre";
  const seasonLabel = { spring: "Printemps", summer: "Été", autumn: "Automne", winter: "Hiver" }[colorSeason];

  return { undertone, skinTone, colorSeason, undertoneLabel, seasonLabel, confidence };
}
