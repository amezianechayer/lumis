// Facial exercise programs (jawline, glow up). Science-informed face yoga / mewing basics.

export interface Exercise {
  name: string;
  emoji: string;
  instruction: string;
  durationSec: number;   // hold/perform duration
  reps?: number;         // if rep-based, durationSec is per rep
  tip?: string;
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
    { name: "Mewing", emoji: "👅", instruction: "Place toute ta langue contre le palais, dents légèrement jointes, respire par le nez. Maintiens.", durationSec: 60, tip: "Posture de langue à adopter au quotidien." },
    { name: "Chin tucks", emoji: "⬇️", instruction: "Rentre le menton vers l'arrière (double menton volontaire), maintiens 3s puis relâche.", durationSec: 5, reps: 12, tip: "Garde le dos droit." },
    { name: "Jaw jut", emoji: "➡️", instruction: "Avance la mâchoire inférieure vers l'avant, sens l'étirement, maintiens 3s.", durationSec: 5, reps: 10 },
    { name: "Neck lift", emoji: "🔝", instruction: "Tête en arrière, regarde le plafond, pousse la langue contre le palais. Maintiens.", durationSec: 20, reps: 3, tip: "Tu dois sentir le cou travailler." },
    { name: "Jaw clench", emoji: "😬", instruction: "Serre puis relâche la mâchoire de façon contrôlée.", durationSec: 3, reps: 15 },
  ],
};

const GLOWUP: ExerciseProgram = {
  id: "glowup",
  title: "Glow Up Visage",
  emoji: "✨",
  description: "Stimule la circulation, lisse et illumine le teint (face yoga).",
  durationLabel: "~7 min",
  exercises: [
    { name: "Massage lymphatique", emoji: "💆", instruction: "Du centre du visage vers les oreilles, glisse les doigts pour drainer. Mouvements doux.", durationSec: 90, tip: "Dégonfle et illumine instantanément." },
    { name: "Lissage du front", emoji: "🖐️", instruction: "Place les doigts au centre du front, glisse vers les tempes en lissant.", durationSec: 45, reps: 1 },
    { name: "Sourire résisté", emoji: "😊", instruction: "Souris largement en pressant les joues avec les doigts pour créer une résistance.", durationSec: 5, reps: 12, tip: "Tonifie les pommettes." },
    { name: "Lifting des joues", emoji: "⬆️", instruction: "Gonfle les joues d'air, déplace l'air d'une joue à l'autre lentement.", durationSec: 30, reps: 2 },
    { name: "Contour des yeux", emoji: "👁️", instruction: "Tapote délicatement le contour des yeux avec l'annulaire, de l'intérieur vers l'extérieur.", durationSec: 30, tip: "Réduit les poches." },
    { name: "Respiration & relâchement", emoji: "🧘", instruction: "Ferme les yeux, relâche tous les muscles du visage, respire profondément.", durationSec: 30 },
  ],
};

const PROGRAMS: ExerciseProgram[] = [JAWLINE, GLOWUP];

export function getPrograms(): ExerciseProgram[] {
  return PROGRAMS;
}

export function getProgram(id: string): ExerciseProgram | undefined {
  return PROGRAMS.find((p) => p.id === id);
}

// Order programs by gender emphasis (men → jawline first, women → glow up first)
export function getProgramsForGender(gender?: string): ExerciseProgram[] {
  if (gender === "male") return [JAWLINE, GLOWUP];
  return [GLOWUP, JAWLINE];
}
