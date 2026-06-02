// Facial exercise programs (jawline, glow up). Science-informed face yoga / mewing basics.

// Motion type drives the animated demonstration (see components/ui/ExerciseAnimation).
export type Motion =
  | "up" | "outward" | "pulse" | "puff" | "tap" | "breathe"
  | "push-forward" | "push-back" | "hold" | "circular";

export interface Exercise {
  name: string;
  emoji: string;
  instruction: string;
  durationSec: number;   // hold/perform duration
  reps?: number;         // if rep-based, durationSec is per rep
  tip?: string;
  motion?: Motion;       // animated demo movement
}

export interface ExerciseProgram {
  id: string;
  title: string;
  emoji: string;
  description: string;
  durationLabel: string;
  exercises: Exercise[];
}

const JAWLINE: ExerciseProgram = {
  id: "jawline",
  title: "Jawline & Définition",
  emoji: "💪",
  description: "Tonifie la mâchoire et le cou pour une ligne plus définie.",
  durationLabel: "~6 min",
  exercises: [
    { name: "Mewing", emoji: "👅", instruction: "Place toute ta langue contre le palais, dents légèrement jointes, respire par le nez. Maintiens.", durationSec: 60, tip: "Posture de langue à adopter au quotidien.", motion: "hold" },
    { name: "Chin tucks", emoji: "⬇️", instruction: "Rentre le menton vers l'arrière (double menton volontaire), maintiens 3s puis relâche.", durationSec: 5, reps: 12, tip: "Garde le dos droit.", motion: "push-back" },
    { name: "Jaw jut", emoji: "➡️", instruction: "Avance la mâchoire inférieure vers l'avant, sens l'étirement, maintiens 3s.", durationSec: 5, reps: 10, motion: "push-forward" },
    { name: "Neck lift", emoji: "🔝", instruction: "Tête en arrière, regarde le plafond, pousse la langue contre le palais. Maintiens.", durationSec: 20, reps: 3, tip: "Tu dois sentir le cou travailler.", motion: "up" },
    { name: "Jaw clench", emoji: "😬", instruction: "Serre puis relâche la mâchoire de façon contrôlée.", durationSec: 3, reps: 15, motion: "pulse" },
  ],
};

const GLOWUP: ExerciseProgram = {
  id: "glowup",
  title: "Glow Up Visage",
  emoji: "✨",
  description: "Stimule la circulation, lisse et illumine le teint (face yoga).",
  durationLabel: "~7 min",
  exercises: [
    { name: "Massage lymphatique", emoji: "💆", instruction: "Du centre du visage vers les oreilles, glisse les doigts pour drainer. Mouvements doux.", durationSec: 90, tip: "Dégonfle et illumine instantanément.", motion: "outward" },
    { name: "Lissage du front", emoji: "🖐️", instruction: "Place les doigts au centre du front, glisse vers les tempes en lissant.", durationSec: 45, reps: 1, motion: "outward" },
    { name: "Sourire résisté", emoji: "😊", instruction: "Souris largement en pressant les joues avec les doigts pour créer une résistance.", durationSec: 5, reps: 12, tip: "Tonifie les pommettes.", motion: "pulse" },
    { name: "Lifting des joues", emoji: "😗", instruction: "Gonfle les joues d'air, déplace l'air d'une joue à l'autre lentement.", durationSec: 30, reps: 2, motion: "puff" },
    { name: "Contour des yeux", emoji: "👁️", instruction: "Tapote délicatement le contour des yeux avec l'annulaire, de l'intérieur vers l'extérieur.", durationSec: 30, tip: "Réduit les poches.", motion: "tap" },
    { name: "Respiration & relâchement", emoji: "🧘", instruction: "Ferme les yeux, relâche tous les muscles du visage, respire profondément.", durationSec: 30, motion: "breathe" },
  ],
};

const FACELIFT: ExerciseProgram = {
  id: "facelift",
  title: "Lifting & Ovale",
  emoji: "🌸",
  description: "Raffermit l'ovale du visage, tonifie les pommettes et le cou en douceur.",
  durationLabel: "~6 min",
  exercises: [
    { name: "Massage liftant", emoji: "💆", instruction: "Du menton vers les oreilles, remonte avec les doigts en mouvements fermes pour lifter l'ovale.", durationSec: 60, tip: "Toujours de bas en haut.", motion: "up" },
    { name: "Tonus des pommettes", emoji: "😊", instruction: "Souris en gardant les lèvres fermées, pousse les pommettes vers le haut, maintiens.", durationSec: 5, reps: 12, motion: "pulse" },
    { name: "Cou de cygne", emoji: "🦢", instruction: "Tête légèrement en arrière, étire le cou, presse la langue au palais. Tonifie le cou et l'ovale.", durationSec: 15, reps: 3, tip: "Anti-relâchement du cou.", motion: "up" },
    { name: "Lissage mâchoire", emoji: "✋", instruction: "Glisse les doigts le long de la mâchoire du menton vers les oreilles pour affiner.", durationSec: 45, reps: 1, motion: "outward" },
    { name: "Relâchement", emoji: "🧘", instruction: "Ferme les yeux, relâche tout le visage, respire profondément.", durationSec: 30, motion: "breathe" },
  ],
};

const PROGRAMS: ExerciseProgram[] = [JAWLINE, GLOWUP, FACELIFT];

export function getPrograms(): ExerciseProgram[] {
  return PROGRAMS;
}

export function getProgram(id: string): ExerciseProgram | undefined {
  return PROGRAMS.find((p) => p.id === id);
}

// Gender-appropriate programs: men → jawline + glow up, women → glow up + face lift
export function getProgramsForGender(gender?: string): ExerciseProgram[] {
  if (gender === "male") return [JAWLINE, GLOWUP];
  return [GLOWUP, FACELIFT];
}
