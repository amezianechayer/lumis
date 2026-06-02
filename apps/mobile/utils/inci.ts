// Advanced INCI analysis — local ingredient knowledge base + parser.
// Provides per-ingredient breakdown (function, comedogenic rating, safety) and
// targeted alerts based on the user's skin profile. No network required.

export type InciTag =
  | "fragrance" | "irritant" | "allergen" | "drying" | "comedogenic"
  | "exfoliant" | "antioxidant" | "humectant" | "occlusive" | "spf"
  | "soothing" | "sulfate" | "preservative" | "active";

export type InciRating = "good" | "ok" | "caution";

export interface InciInfo {
  fn: string;            // function in French
  comedo?: number;       // 0-5 comedogenic rating
  rating: InciRating;
  tags?: InciTag[];
  note?: string;         // short FR explanation
}

export interface InciResult {
  raw: string;           // ingredient as written
  name: string;          // normalized key matched (or raw if unknown)
  info?: InciInfo;       // undefined = not in database
  alerts: string[];      // personalized warnings for this user
}

export interface InciAnalysis {
  items: InciResult[];
  total: number;
  matched: number;
  flagged: number;       // items with alerts
  topAlerts: string[];   // de-duplicated global alerts
}

export interface SkinContext {
  skinType?: string;     // normal | oily | dry | combination | sensitive
  acneProne?: boolean;   // from latest scan acne score
}

// ─── Knowledge base (common cosmetic INCI) ───────────────────────────────────
// Keys are lowercased INCI names. Matching also handles aliases below.
const DB: Record<string, InciInfo> = {
  "aqua": { fn: "Solvant (eau)", rating: "good", comedo: 0 },
  "water": { fn: "Solvant (eau)", rating: "good", comedo: 0 },
  "glycerin": { fn: "Humectant hydratant", rating: "good", comedo: 0, tags: ["humectant"], note: "Attire l'eau dans la peau, excellent pour tous types." },
  "niacinamide": { fn: "Actif (vitamine B3)", rating: "good", comedo: 0, tags: ["active", "soothing"], note: "Régule le sébum, unifie le teint, anti-rougeurs." },
  "hyaluronic acid": { fn: "Humectant", rating: "good", comedo: 0, tags: ["humectant"], note: "Hydratation intense, repulpe." },
  "sodium hyaluronate": { fn: "Humectant", rating: "good", comedo: 0, tags: ["humectant"], note: "Forme d'acide hyaluronique, hydratante." },
  "panthenol": { fn: "Apaisant (pro-vitamine B5)", rating: "good", comedo: 0, tags: ["soothing", "humectant"], note: "Répare et apaise." },
  "allantoin": { fn: "Apaisant réparateur", rating: "good", comedo: 0, tags: ["soothing"] },
  "centella asiatica": { fn: "Apaisant (cica)", rating: "good", comedo: 0, tags: ["soothing", "antioxidant"], note: "Calme les rougeurs, répare." },
  "tocopherol": { fn: "Antioxydant (vitamine E)", rating: "good", comedo: 2, tags: ["antioxidant"] },
  "tocopheryl acetate": { fn: "Antioxydant (vitamine E)", rating: "good", comedo: 0, tags: ["antioxidant"] },
  "ascorbic acid": { fn: "Antioxydant (vitamine C)", rating: "good", comedo: 0, tags: ["active", "antioxidant"], note: "Éclat, anti-taches. Peut piquer les peaux sensibles." },
  "ceramide np": { fn: "Lipide barrière", rating: "good", comedo: 0, tags: ["occlusive"], note: "Renforce la barrière cutanée." },
  "squalane": { fn: "Émollient léger", rating: "good", comedo: 1, note: "Hydratant non gras, bien toléré." },
  "dimethicone": { fn: "Silicone (lissant)", rating: "ok", comedo: 1, tags: ["occlusive"], note: "Lisse la peau, peut gêner certaines peaux acnéiques." },
  "panthenol ": { fn: "Apaisant", rating: "good", comedo: 0 },
  "aloe barbadensis": { fn: "Apaisant hydratant", rating: "good", comedo: 0, tags: ["soothing"] },
  "butylene glycol": { fn: "Humectant/solvant", rating: "good", comedo: 0, tags: ["humectant"] },
  "propylene glycol": { fn: "Humectant/solvant", rating: "ok", comedo: 0, tags: ["humectant"], note: "Rarement irritant sur peaux très sensibles." },
  "caprylic/capric triglyceride": { fn: "Émollient", rating: "good", comedo: 1 },

  // Actives / exfoliants
  "retinol": { fn: "Actif anti-âge (vitamine A)", rating: "ok", comedo: 0, tags: ["active"], note: "Puissant anti-âge/anti-acné. Le soir, SPF obligatoire. À éviter enceinte." },
  "retinyl palmitate": { fn: "Dérivé de vitamine A", rating: "ok", comedo: 1, tags: ["active"] },
  "salicylic acid": { fn: "Exfoliant BHA", rating: "ok", comedo: 0, tags: ["exfoliant", "active"], note: "Désincruste les pores, idéal peaux grasses/acnéiques." },
  "glycolic acid": { fn: "Exfoliant AHA", rating: "ok", comedo: 0, tags: ["exfoliant", "active"], note: "Lisse et éclaircit. SPF requis." },
  "lactic acid": { fn: "Exfoliant AHA doux", rating: "ok", comedo: 0, tags: ["exfoliant", "active"] },
  "azelaic acid": { fn: "Actif anti-rougeurs/acné", rating: "good", comedo: 0, tags: ["active", "soothing"] },
  "benzoyl peroxide": { fn: "Anti-acné", rating: "ok", comedo: 0, tags: ["active", "drying"], note: "Efficace contre l'acné mais asséchant et irritant." },

  // Soothing / oils
  "jojoba oil": { fn: "Huile équilibrante", rating: "good", comedo: 2 },
  "simmondsia chinensis": { fn: "Huile de jojoba", rating: "good", comedo: 2 },
  "argania spinosa": { fn: "Huile d'argan", rating: "good", comedo: 0 },
  "rosa canina": { fn: "Huile de rose musquée", rating: "good", comedo: 1 },
  "shea butter": { fn: "Beurre nourrissant", rating: "good", comedo: 0, tags: ["occlusive"] },
  "butyrospermum parkii": { fn: "Beurre de karité", rating: "good", comedo: 0, tags: ["occlusive"] },
  "coconut oil": { fn: "Huile riche", rating: "caution", comedo: 4, tags: ["comedogenic", "occlusive"], note: "Très comédogène — déconseillé sur le visage acnéique." },
  "cocos nucifera": { fn: "Huile de coco", rating: "caution", comedo: 4, tags: ["comedogenic"], note: "Comédogène 4/5, à éviter sur peaux à imperfections." },
  "cocoa butter": { fn: "Beurre de cacao", rating: "caution", comedo: 4, tags: ["comedogenic", "occlusive"] },
  "isopropyl myristate": { fn: "Émollient", rating: "caution", comedo: 5, tags: ["comedogenic"], note: "Comédogène 5/5 — bouche les pores." },
  "isopropyl palmitate": { fn: "Émollient", rating: "caution", comedo: 4, tags: ["comedogenic"] },
  "lanolin": { fn: "Émollient occlusif", rating: "caution", comedo: 4, tags: ["comedogenic", "allergen"], note: "Allergène fréquent + comédogène." },
  "petrolatum": { fn: "Occlusif (vaseline)", rating: "ok", comedo: 0, tags: ["occlusive"], note: "Protège la barrière, non comédogène mais gras." },
  "mineral oil": { fn: "Huile minérale", rating: "ok", comedo: 2, tags: ["occlusive"] },
  "paraffinum liquidum": { fn: "Huile minérale", rating: "ok", comedo: 2, tags: ["occlusive"] },

  // Cleansers / surfactants
  "sodium lauryl sulfate": { fn: "Tensioactif fort", rating: "caution", comedo: 0, tags: ["sulfate", "drying", "irritant"], note: "Nettoyant agressif, asséchant et irritant." },
  "sodium laureth sulfate": { fn: "Tensioactif", rating: "ok", comedo: 0, tags: ["sulfate"], note: "Moins agressif que le SLS mais peut assécher." },
  "cocamidopropyl betaine": { fn: "Tensioactif doux", rating: "ok", comedo: 0, tags: ["allergen"], note: "Doux mais allergène possible." },
  "coco-glucoside": { fn: "Tensioactif doux", rating: "good", comedo: 0 },

  // Preservatives
  "phenoxyethanol": { fn: "Conservateur", rating: "ok", comedo: 0, tags: ["preservative"] },
  "methylparaben": { fn: "Conservateur (parabène)", rating: "ok", comedo: 0, tags: ["preservative"] },
  "propylparaben": { fn: "Conservateur (parabène)", rating: "ok", comedo: 0, tags: ["preservative"] },
  "benzyl alcohol": { fn: "Conservateur/parfum", rating: "ok", comedo: 0, tags: ["preservative", "allergen"] },
  "chlorphenesin": { fn: "Conservateur", rating: "ok", comedo: 0, tags: ["preservative"] },

  // Fragrance & known allergens
  "parfum": { fn: "Parfum", rating: "caution", comedo: 0, tags: ["fragrance", "allergen", "irritant"], note: "Cause n°1 d'allergies cosmétiques. À éviter sur peau sensible." },
  "fragrance": { fn: "Parfum", rating: "caution", comedo: 0, tags: ["fragrance", "allergen", "irritant"], note: "Peut irriter les peaux sensibles/réactives." },
  "limonene": { fn: "Composant de parfum", rating: "caution", comedo: 0, tags: ["fragrance", "allergen"] },
  "linalool": { fn: "Composant de parfum", rating: "caution", comedo: 0, tags: ["fragrance", "allergen"] },
  "citronellol": { fn: "Composant de parfum", rating: "caution", comedo: 0, tags: ["fragrance", "allergen"] },
  "geraniol": { fn: "Composant de parfum", rating: "caution", comedo: 0, tags: ["fragrance", "allergen"] },
  "citral": { fn: "Composant de parfum", rating: "caution", comedo: 0, tags: ["fragrance", "allergen"] },
  "eugenol": { fn: "Composant de parfum", rating: "caution", comedo: 0, tags: ["fragrance", "allergen"] },
  "coumarin": { fn: "Composant de parfum", rating: "caution", comedo: 0, tags: ["fragrance", "allergen"] },

  // Alcohols
  "alcohol denat": { fn: "Alcool dénaturé", rating: "caution", comedo: 0, tags: ["drying", "irritant"], note: "Asséchant — déconseillé pour peaux sèches/sensibles." },
  "alcohol": { fn: "Alcool", rating: "caution", comedo: 0, tags: ["drying"], note: "Peut assécher en forte concentration." },
  "cetyl alcohol": { fn: "Alcool gras (émollient)", rating: "good", comedo: 2, note: "Alcool gras hydratant, rien à voir avec l'alcool asséchant." },
  "cetearyl alcohol": { fn: "Alcool gras (émulsifiant)", rating: "good", comedo: 2 },
  "stearyl alcohol": { fn: "Alcool gras", rating: "good", comedo: 2 },

  // SPF filters
  "zinc oxide": { fn: "Filtre UV minéral", rating: "good", comedo: 1, tags: ["spf", "soothing"], note: "Protection large spectre, bien toléré." },
  "titanium dioxide": { fn: "Filtre UV minéral", rating: "good", comedo: 1, tags: ["spf"] },
  "avobenzone": { fn: "Filtre UV chimique", rating: "ok", comedo: 0, tags: ["spf"] },
  "octocrylene": { fn: "Filtre UV chimique", rating: "ok", comedo: 0, tags: ["spf", "allergen"] },
  "homosalate": { fn: "Filtre UV chimique", rating: "ok", comedo: 0, tags: ["spf"] },
  "oxybenzone": { fn: "Filtre UV chimique", rating: "caution", comedo: 0, tags: ["spf", "allergen", "irritant"], note: "Allergène, controversé (perturbateur)." },

  // Others
  "kaolin": { fn: "Argile absorbante", rating: "good", comedo: 0, note: "Absorbe le sébum, peaux grasses." },
  "charcoal": { fn: "Charbon purifiant", rating: "good", comedo: 0 },
  "caffeine": { fn: "Décongestionnant", rating: "good", comedo: 0, tags: ["antioxidant"] },
  "urea": { fn: "Humectant/kératolytique", rating: "good", comedo: 0, tags: ["humectant"] },
  "menthol": { fn: "Agent rafraîchissant", rating: "caution", comedo: 0, tags: ["irritant"], note: "Sensation fraîche mais irritant possible." },
  "sodium chloride": { fn: "Agent de texture (sel)", rating: "good", comedo: 0 },
  "citric acid": { fn: "Régulateur de pH", rating: "good", comedo: 0 },
  "xanthan gum": { fn: "Gélifiant", rating: "good", comedo: 0 },
};

// Aliases → canonical key
const ALIASES: Record<string, string> = {
  "sd alcohol": "alcohol denat",
  "sd alcohol 40": "alcohol denat",
  "alcohol denatured": "alcohol denat",
  "vitamin c": "ascorbic acid",
  "l-ascorbic acid": "ascorbic acid",
  "vitamin e": "tocopherol",
  "vitamin b3": "niacinamide",
  "provitamin b5": "panthenol",
  "ha": "hyaluronic acid",
  "shea": "shea butter",
  "bha": "salicylic acid",
  "aha": "glycolic acid",
};

function normalize(raw: string): string {
  let s = raw.toLowerCase().trim();
  s = s.replace(/\([^)]*\)/g, " "); // drop parentheticals
  s = s.replace(/\b\d+([.,]\d+)?\s*%/g, " "); // drop percentages
  s = s.replace(/[*†•·]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  s = s.replace(/^and\s+/, "").replace(/\.$/, "");
  return s;
}

function lookup(norm: string): { key: string; info?: InciInfo } {
  if (DB[norm]) return { key: norm, info: DB[norm] };
  if (ALIASES[norm] && DB[ALIASES[norm]]) return { key: ALIASES[norm], info: DB[ALIASES[norm]] };
  // partial contains match for compound names (e.g. "centella asiatica extract")
  for (const key of Object.keys(DB)) {
    if (norm.includes(key)) return { key, info: DB[key] };
  }
  for (const alias of Object.keys(ALIASES)) {
    if (norm.includes(alias)) return { key: ALIASES[alias], info: DB[ALIASES[alias]] };
  }
  return { key: norm };
}

// Split a raw INCI list into individual ingredient tokens.
export function parseInci(text: string): string[] {
  if (!text) return [];
  // INCI lists are comma-separated; also handle newlines and bullets.
  return text
    .split(/[,\n;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 60);
}

function personalAlerts(info: InciInfo | undefined, ctx: SkinContext, displayName: string): string[] {
  if (!info) return [];
  const alerts: string[] = [];
  const tags = info.tags ?? [];
  const sensitive = ctx.skinType === "sensitive";
  const dry = ctx.skinType === "dry";
  const oily = ctx.skinType === "oily" || ctx.skinType === "combination";

  if ((tags.includes("fragrance") || tags.includes("allergen")) && sensitive) {
    alerts.push(`${displayName} : allergène/parfum — risqué pour ta peau sensible.`);
  }
  if (tags.includes("drying") && (dry || sensitive)) {
    alerts.push(`${displayName} : asséchant — déconseillé pour ta peau ${dry ? "sèche" : "sensible"}.`);
  }
  if ((info.comedo ?? 0) >= 3 && (oily || ctx.acneProne)) {
    alerts.push(`${displayName} : comédogène ${info.comedo}/5 — peut boucher tes pores (peau ${ctx.acneProne ? "à imperfections" : "grasse"}).`);
  }
  if (tags.includes("irritant") && sensitive && !tags.includes("fragrance")) {
    alerts.push(`${displayName} : irritant possible pour peau sensible.`);
  }
  return alerts;
}

export function analyzeInci(text: string, ctx: SkinContext = {}): InciAnalysis {
  const tokens = parseInci(text);
  const items: InciResult[] = tokens.map((raw) => {
    const norm = normalize(raw);
    const { key, info } = lookup(norm);
    const displayName = raw.replace(/\s+/g, " ").trim();
    const alerts = personalAlerts(info, ctx, displayName);
    return { raw: displayName, name: info ? key : norm, info, alerts };
  });

  const matched = items.filter((i) => i.info).length;
  const flagged = items.filter((i) => i.alerts.length > 0).length;
  const topAlerts = Array.from(new Set(items.flatMap((i) => i.alerts))).slice(0, 6);

  return { items, total: items.length, matched, flagged, topAlerts };
}

// Color + label for a rating (theme components map these).
export function ratingMeta(rating: InciRating): { color: string; label: string } {
  switch (rating) {
    case "good": return { color: "#5DCAA5", label: "OK" };
    case "ok": return { color: "#f59e0b", label: "Modéré" };
    case "caution": return { color: "#F09595", label: "Attention" };
  }
}

export const TAG_LABELS: Record<InciTag, string> = {
  fragrance: "Parfum", irritant: "Irritant", allergen: "Allergène", drying: "Asséchant",
  comedogenic: "Comédogène", exfoliant: "Exfoliant", antioxidant: "Antioxydant",
  humectant: "Hydratant", occlusive: "Occlusif", spf: "Filtre UV", soothing: "Apaisant",
  sulfate: "Sulfate", preservative: "Conservateur", active: "Actif",
};
