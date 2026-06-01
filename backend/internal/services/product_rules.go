package services

import (
	"fmt"
	"strings"

	"github.com/lumis/backend/internal/models"
)

// skinConcern represents a detected skin issue with its ingredient requirements.
// No brand names here — Groq selects the products dynamically.
type skinConcern struct {
	Label       string // displayed in prompt
	Ingredients string // active ingredients required (science-based)
	Priority    int    // higher = more important concern
}

// ─── Evidence-based concern definitions ───────────────────────────────────────
// Sources: AAD, Journal of Investigative Dermatology, JAAD, Dermatology Life Quality Index

var (
	concernAcneMild = skinConcern{
		Label:       "acné légère à modérée",
		Ingredients: "niacinamide 10%, acide salicylique (BHA) 1-2%, zinc PCA",
		Priority:    10,
	}
	concernAcneSevere = skinConcern{
		Label:       "acné sévère / inflammatoire",
		Ingredients: "acide salicylique 2%, niacinamide, peroxyde de benzoyle 2.5-5%, retinol 0.025%",
		Priority:    15,
	}
	concernDehydration = skinConcern{
		Label:       "déshydratation cutanée",
		Ingredients: "acide hyaluronique (multi-poids moléculaire), céramides (1, 3, 6-II), glycérine, panthénol",
		Priority:    9,
	}
	concernPoorTexture = skinConcern{
		Label:       "texture irrégulière / pores dilatés",
		Ingredients: "rétinol 0.025-0.1%, acide glycolique 5-10% (AHA), niacinamide",
		Priority:    7,
	}
	concernHyperpigmentation = skinConcern{
		Label:       "taches / hyperpigmentation / teint inégal",
		Ingredients: "vitamine C 10-20% (L-ascorbique), alpha-arbutine 2%, niacinamide, acide kojique",
		Priority:    8,
	}
	concernRedness = skinConcern{
		Label:       "rougeurs / peau réactive / inflammation",
		Ingredients: "centella asiatica, acide azélaïque 10%, panthénol, allantoïne, thé vert",
		Priority:    8,
	}
	concernFineLines = skinConcern{
		Label:       "rides / manque de fermeté",
		Ingredients: "rétinol 0.025-0.1%, peptides (matrixyl, argireline), vitamine C, CoQ10",
		Priority:    6,
	}
	concernOilySkin = skinConcern{
		Label:       "excès de sébum / brillance",
		Ingredients: "niacinamide 10%, zinc PCA, acide salicylique, argile kaolin — ÉVITER huiles lourdes",
		Priority:    7,
	}
	concernDrySkin = skinConcern{
		Label:       "peau sèche / barrière fragilisée",
		Ingredients: "céramides, squalane, acides gras essentiels (linoléique, oléique), beurre de karité",
		Priority:    9,
	}
	concernSensitiveSkin = skinConcern{
		Label:       "peau sensible / réactivité",
		Ingredients: "centella asiatica, aloe vera, sans parfum, sans alcool, allantoin — ÉVITER rétinol fort et AHA >5%",
		Priority:    8,
	}
	concernSPF = skinConcern{
		Label:       "protection solaire (indispensable, dermatologiquement validé)",
		Ingredients: "SPF 50+ — filtres minéraux (zinc oxyde, dioxyde de titane) ou chimiques haute protection UVA/UVB",
		Priority:    10,
	}
)

// ─── Concern detection from scan scores ───────────────────────────────────────

// DetectConcerns analyses skin scan scores and returns matched concerns sorted by priority.
func DetectConcerns(scan *models.SkinScan, skinType string) []skinConcern {
	var matched []skinConcern

	if scan != nil {
		if scan.AcneScore < 50 {
			matched = append(matched, concernAcneSevere)
		} else if scan.AcneScore < 72 {
			matched = append(matched, concernAcneMild)
		}

		if scan.HydrationScore < 65 {
			matched = append(matched, concernDehydration)
		}

		if scan.TextureScore < 65 || scan.PoresCondition == "larges" {
			matched = append(matched, concernPoorTexture)
		}

		if scan.UniformityScore < 65 || scan.HyperpigmentationLevel == "élevé" || scan.HyperpigmentationLevel == "modéré" {
			matched = append(matched, concernHyperpigmentation)
		}

		if scan.RednessLevel == "élevé" || scan.RednessLevel == "modéré" {
			matched = append(matched, concernRedness)
		}

		if scan.FineLinesDetected {
			matched = append(matched, concernFineLines)
		}
	}

	// Skin type structural concerns
	switch skinType {
	case "oily":
		matched = append(matched, concernOilySkin)
	case "dry":
		matched = append(matched, concernDrySkin)
	case "combination":
		matched = append(matched, concernOilySkin, concernDehydration)
	case "sensitive":
		matched = append(matched, concernSensitiveSkin)
	}

	// SPF always included
	matched = append(matched, concernSPF)

	// Deduplicate by label
	seen := map[string]bool{}
	unique := matched[:0]
	for _, c := range matched {
		if !seen[c.Label] {
			seen[c.Label] = true
			unique = append(unique, c)
		}
	}

	return unique
}

// BuildIngredientConstraints returns the ingredient context block for the Groq prompt.
// This tells Groq WHICH actives to use — not WHICH brands. Groq selects brands dynamically.
func BuildIngredientConstraints(scan *models.SkinScan, skinType string) string {
	concerns := DetectConcerns(scan, skinType)
	if len(concerns) == 0 {
		return ""
	}

	var sb strings.Builder
	sb.WriteString("## Ingrédients actifs OBLIGATOIRES selon les problèmes détectés\n")
	sb.WriteString("Pour chaque recommandation skincare/makeup, les produits DOIVENT contenir ces actifs :\n\n")

	for _, c := range concerns {
		fmt.Fprintf(&sb, "▸ **%s** → %s\n", c.Label, c.Ingredients)
	}

	sb.WriteString("\nRègle : propose des produits réels disponibles en pharmacie/parapharmacie ou e-commerce,")
	sb.WriteString(" avec ingrédients validés. Pour chaque produit, justifie QUEL ingrédient actif le rend pertinent pour CE profil.\n")
	return sb.String()
}

// BuildFallbackSkincareSteps returns skin-type-appropriate routine steps when Groq is unavailable.
func BuildFallbackSkincareSteps(skinType string) []map[string]interface{} {
	switch skinType {
	case "oily":
		return []map[string]interface{}{
			{"order": 1, "title": "Nettoyage gel purifiant", "description": "Utilise un gel nettoyant formulé pour peaux grasses (pH 5.5). Masse 60 secondes, rince à l'eau tiède.", "tip": "Évite l'eau trop chaude qui stimule le sébum.", "duration_min": 2},
			{"order": 2, "title": "Sérum niacinamide 10%", "description": "Applique 3-4 gouttes de sérum niacinamide. Cet actif réduit la production de sébum et resserre les pores.", "tip": "Niacinamide réduit le sébum de 30% en 4 semaines selon les études.", "duration_min": 2},
			{"order": 3, "title": "Hydratant gel oil-free", "description": "Applique une fine couche de gel-crème non-comédogène (sans huile). Évite les crèmes riches.", "tip": "", "duration_min": 1},
			{"order": 4, "title": "SPF 50+ fluide", "description": "Protection solaire fluide ou gel, réapplique toutes les 2h en extérieur.", "tip": "Le soleil aggrave l'acné et les taches post-acnéiques.", "duration_min": 1},
		}
	case "dry":
		return []map[string]interface{}{
			{"order": 1, "title": "Nettoyage crémeux sans sulfates", "description": "Nettoyant crémeux sans SLS/SLES pour ne pas déshydrater. Masse 30 secondes, rince à l'eau fraîche.", "tip": "Jamais d'eau chaude sur peau sèche.", "duration_min": 2},
			{"order": 2, "title": "Acide hyaluronique sur peau humide", "description": "Sur peau légèrement humide, applique sérum acide hyaluronique multi-poids. L'humidité résiduelle booste l'efficacité.", "tip": "", "duration_min": 2},
			{"order": 3, "title": "Crème riche céramides", "description": "Applique crème riche en céramides pour sceller l'hydratation et réparer la barrière. Les céramides 1, 3, 6-II sont les plus efficaces.", "tip": "", "duration_min": 2},
			{"order": 4, "title": "SPF 50+ texture crème", "description": "Choisir un SPF avec texture crème qui n'assèche pas.", "tip": "", "duration_min": 1},
		}
	case "sensitive":
		return []map[string]interface{}{
			{"order": 1, "title": "Nettoyage eau micellaire", "description": "Eau micellaire ou nettoyant sans parfum ni alcool. Tamponner doucement sans frotter.", "tip": "Ne jamais frotter, toujours tapoter.", "duration_min": 2},
			{"order": 2, "title": "Sérum centella asiatica", "description": "Sérum à la centella asiatica ou aloe vera pour calmer la réactivité et réparer la barrière.", "tip": "", "duration_min": 2},
			{"order": 3, "title": "Crème minimaliste", "description": "Crème formule épurée (< 10 ingrédients), sans parfum, sans colorant, testée dermatologiquement.", "tip": "Moins d'ingrédients = moins de risque de réaction.", "duration_min": 2},
			{"order": 4, "title": "SPF minéral (zinc, titane)", "description": "SPF à base de zinc oxyde ou dioxyde de titane — moins irritants que les filtres chimiques.", "tip": "", "duration_min": 1},
		}
	default: // normal / combination
		return []map[string]interface{}{
			{"order": 1, "title": "Nettoyage doux pH-neutre", "description": "Gel ou mousse nettoyant pH 5.5, massage 60 secondes en mouvements circulaires.", "tip": "", "duration_min": 2},
			{"order": 2, "title": "Sérum actif ciblé", "description": "Vitamine C le matin (antioxydant + éclat), rétinol le soir 2-3x/semaine (renouvellement cellulaire).", "tip": "Vitamine C matin, rétinol soir — jamais ensemble.", "duration_min": 2},
			{"order": 3, "title": "Hydratant équilibrant", "description": "Crème légère texture gel-crème qui hydrate sans alourdir.", "tip": "", "duration_min": 1},
			{"order": 4, "title": "SPF 50+ quotidien", "description": "Protection solaire indispensable même par temps nuageux. C'est le meilleur anti-âge existant.", "tip": "Le SPF prévient 80% du vieillissement cutané UV-induit.", "duration_min": 1},
		}
	}
}

// buildIngredientBasedProducts generates fallback products as ingredient categories
// (no hardcoded brands — Groq selects specific products when available).
func buildIngredientBasedProducts(concerns []skinConcern) []map[string]interface{} {
	products := []map[string]interface{}{}
	seen := map[string]bool{}

	for _, c := range concerns {
		if c.Label == concernSPF.Label {
			if !seen["spf"] {
				seen["spf"] = true
				products = append(products, map[string]interface{}{
					"name":     "Protection Solaire SPF 50+",
					"category": "protection solaire",
					"why":      "Indispensable quotidiennement — protège contre le photovieillissement et l'hyperpigmentation UV.",
					"premium":  false,
				})
			}
			continue
		}

		// Map each concern to a product category with the key ingredient
		var prod map[string]interface{}
		switch c {
		case concernAcneMild, concernAcneSevere:
			if !seen["acne"] {
				seen["acne"] = true
				prod = map[string]interface{}{
					"name":     "Soin Anti-Imperfections (Niacinamide + BHA)",
					"category": "traitement anti-acné",
					"why":      fmt.Sprintf("Tes problèmes d'acné (score %s) nécessitent niacinamide pour réduire le sébum et BHA pour désobstruer les pores.", c.Label),
					"premium":  false,
				}
			}
		case concernDehydration:
			if !seen["hydra"] {
				seen["hydra"] = true
				prod = map[string]interface{}{
					"name":     "Sérum Acide Hyaluronique Multi-Poids",
					"category": "soin hydratant",
					"why":      "L'acide hyaluronique multi-poids moléculaire cible la déshydratation en surface ET en profondeur.",
					"premium":  false,
				}
			}
		case concernPoorTexture:
			if !seen["texture"] {
				seen["texture"] = true
				prod = map[string]interface{}{
					"name":     "Exfoliant AHA 5-10% (Acide Glycolique)",
					"category": "exfoliant chimique",
					"why":      "L'AHA accélère le renouvellement cellulaire pour lisser la texture et affiner les pores.",
					"premium":  false,
				}
			}
		case concernHyperpigmentation:
			if !seen["hyperpig"] {
				seen["hyperpig"] = true
				prod = map[string]interface{}{
					"name":     "Sérum Vitamine C 10-20%",
					"category": "soin anti-taches",
					"why":      "La vitamine C inhibe la mélanogenèse et corrige les taches pour un teint unifié.",
					"premium":  false,
				}
			}
		case concernRedness:
			if !seen["redness"] {
				seen["redness"] = true
				prod = map[string]interface{}{
					"name":     "Soin Apaisant Centella Asiatica",
					"category": "soin anti-rougeurs",
					"why":      "La centella asiatica calme l'inflammation et renforce la barrière des peaux réactives.",
					"premium":  false,
				}
			}
		case concernFineLines:
			if !seen["antiage"] {
				seen["antiage"] = true
				prod = map[string]interface{}{
					"name":     "Rétinol 0.025-0.1% (Soin Nuit)",
					"category": "anti-âge",
					"why":      "Le rétinol stimule le collagène et accélère le renouvellement cellulaire pour réduire les rides.",
					"premium":  true,
				}
			}
		case concernOilySkin:
			if !seen["oil"] {
				seen["oil"] = true
				prod = map[string]interface{}{
					"name":     "Hydratant Gel Oil-Free (Niacinamide)",
					"category": "soin matifiant",
					"why":      "Formule sans huile + niacinamide pour hydrater sans alourdir et contrôler le sébum.",
					"premium":  false,
				}
			}
		case concernDrySkin:
			if !seen["dry"] {
				seen["dry"] = true
				prod = map[string]interface{}{
					"name":     "Crème Céramides (Barrière Cutanée)",
					"category": "soin réparateur",
					"why":      "Les céramides 1, 3, 6-II restaurent la barrière lipidique et maintiennent l'hydratation 24h.",
					"premium":  false,
				}
			}
		case concernSensitiveSkin:
			if !seen["sensitive"] {
				seen["sensitive"] = true
				prod = map[string]interface{}{
					"name":     "Soin Apaisant Sans Parfum (Centella / Allantoïne)",
					"category": "soin peaux sensibles",
					"why":      "Formule minimaliste sans allergènes pour calmer la réactivité et renforcer la tolérance.",
					"premium":  false,
				}
			}
		}

		if prod != nil {
			products = append(products, prod)
		}
		if len(products) >= 5 {
			break
		}
	}

	return products
}

// buildSkincareTitle returns a personalized title and summary based on scan data.
func buildSkincareTitle(scan *models.SkinScan, skinType string) (title, summary string) {
	if scan == nil {
		switch skinType {
		case "oily":
			return "Routine Peau Grasse — Sébum & Pores", "Routine adaptée à ta peau grasse pour contrôler le sébum et affiner les pores avec les bons actifs."
		case "dry":
			return "Routine Peau Sèche — Barrière & Hydratation", "Routine ciblée pour restaurer la barrière cutanée et apporter une hydratation durable avec céramides et HA."
		case "sensitive":
			return "Routine Peau Sensible — Apaisement & Protection", "Routine minimaliste pour calmer la réactivité et renforcer la tolérance cutanée."
		case "combination":
			return "Routine Peau Mixte — Zone T & Joues", "Routine équilibrée qui matifie la zone T tout en hydratant les joues avec des actifs ciblés."
		default:
			return "Routine Skincare Personnalisée", "Routine adaptée à ton profil pour un teint sain et équilibré."
		}
	}

	concerns := DetectConcerns(scan, skinType)
	mainConcerns := []string{}
	for _, c := range concerns {
		if c.Label != concernSPF.Label && len(mainConcerns) < 2 {
			mainConcerns = append(mainConcerns, c.Label)
		}
	}

	if len(mainConcerns) == 0 {
		return "Routine Maintenance — Score " + fmt.Sprintf("%d", scan.OverallScore) + "/100",
			fmt.Sprintf("Ton score peau est excellent à %d/100. Continue cette routine pour maintenir les résultats.", scan.OverallScore)
	}

	title = fmt.Sprintf("Routine Anti-%s", strings.Title(strings.Split(mainConcerns[0], " ")[0]))
	if len(mainConcerns) > 1 {
		title += fmt.Sprintf(" & %s", strings.Title(strings.Split(mainConcerns[1], " ")[0]))
	}

	return title, fmt.Sprintf(
		"Score peau : %d/100. Routine basée sur tes problèmes détectés (%s) avec les ingrédients actifs validés cliniquement.",
		scan.OverallScore, strings.Join(mainConcerns, ", "),
	)
}
