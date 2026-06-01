package services

import (
	"fmt"
	"strings"

	"github.com/lumis/backend/internal/models"
)

// ruleProduct is a concrete product recommendation tied to a skin concern.
type ruleProduct struct {
	Name     string
	Brand    string
	Category string
	Why      string
	Premium  bool
}

// skinRule maps a concern to recommended ingredients and products.
type skinRule struct {
	Concern     string // human label, injected into Groq prompt
	Ingredients string // key actives to look for
	Products    []ruleProduct
}

// ─── Evidence-based rules ─────────────────────────────────────────────────────
// Sources: AAD (American Academy of Dermatology), J Invest Dermatol, JAAD.

var acneMildRules = skinRule{
	Concern:     "acné légère à modérée",
	Ingredients: "niacinamide 10%, acide salicylique 0.5-2%, zinc PCA",
	Products: []ruleProduct{
		{"Effaclar Duo+", "La Roche-Posay", "soin anti-imperfections", "niacinamide + acide salicylique ciblent les comédons sans dessécher", false},
		{"Paula's Choice BHA 2%", "Paula's Choice", "exfoliant BHA", "acide salicylique 2% désobstrue les pores en profondeur", false},
		{"Niacinamide 10% + Zinc 1%", "The Ordinary", "sérum anti-pores", "réduit le sébum et les rougeurs liées à l'acné", false},
	},
}

var acneSevereRules = skinRule{
	Concern:     "acné sévère",
	Ingredients: "peroxyde de benzoyle 2.5-5%, acide salicylique 2%, rétinol 0.025%",
	Products: []ruleProduct{
		{"Effaclar K(+)", "La Roche-Posay", "soin kératolytique", "triple action: BHA + LHA + niacinamide pour acné persistante", false},
		{"Benzac AC 5%", "Galderma", "traitement acné", "peroxyde de benzoyle bactéricide pour acné inflammatoire", false},
		{"AHA 30% + BHA 2% Peeling", "The Ordinary", "exfoliant chimique", "combinaison AHA/BHA pour déboucher les pores obstrués", true},
	},
}

var hydrationLowRules = skinRule{
	Concern:     "déshydratation cutanée",
	Ingredients: "acide hyaluronique (poids moléculaire multiple), céramides, glycérine",
	Products: []ruleProduct{
		{"Hydrating Facial Cleanser", "CeraVe", "nettoyant hydratant", "céramides + acide hyaluronique préservent la barrière cutanée", false},
		{"Hyaluronic Acid 2% + B5", "The Ordinary", "sérum hydratant", "HA multi-poids moléculaire hydrate en surface et en profondeur", false},
		{"Toleriane Ultra Nuit", "La Roche-Posay", "crème nuit", "neurosensine + HA pour restaurer l'hydratation nocturne", false},
	},
}

var texturePoorRules = skinRule{
	Concern:     "texture irrégulière / pores dilatés",
	Ingredients: "rétinol 0.025-0.1%, acide glycolique 5-10%, niacinamide",
	Products: []ruleProduct{
		{"Retinol 0.5% in Squalane", "The Ordinary", "soin rétinol", "accélère le renouvellement cellulaire pour lisser la texture", false},
		{"Glycolic Acid 7% Toning Solution", "The Ordinary", "tonique AHA", "exfoliant doux pour uniformiser et affiner les pores", false},
		{"Niacinamide 10% + Zinc 1%", "The Ordinary", "sérum pores", "réduit visiblement les pores dilatés en 4 semaines", false},
	},
}

var uniformityPoorRules = skinRule{
	Concern:     "teint inégal / hyperpigmentation",
	Ingredients: "vitamine C 10-20%, niacinamide, acide kojique, alpha-arbutine",
	Products: []ruleProduct{
		{"Vitamin C Suspension 23%", "The Ordinary", "sérum vitamine C", "antioxydant puissant pour éclat et uniformité du teint", false},
		{"Alpha Arbutin 2% + HA", "The Ordinary", "sérum anti-taches", "inhibe la mélanogenèse pour réduire les taches sombres", false},
		{"Pigmentclar SPF 30", "La Roche-Posay", "soin correcteur", "acide kojique + LHA pour corriger les taches brunes", false},
	},
}

var rednessSevereRules = skinRule{
	Concern:     "rougeurs / peau réactive",
	Ingredients: "centella asiatica, azélaïque acid 10%, thé vert, aloe vera",
	Products: []ruleProduct{
		{"Cicaplast Baume B5", "La Roche-Posay", "baume apaisant", "panthenol + madecassoside calment les rougeurs et irritations", false},
		{"Azelaic Acid Suspension 10%", "The Ordinary", "soin anti-rougeurs", "réduit rougeurs diffuses et rosacée légère sans irritation", false},
		{"Centella Asiatica Recovery Cream", "COSRX", "crème réparatrice", "centella asitica accélère la réparation des peaux réactives", false},
	},
}

var oilyTypeRules = skinRule{
	Concern:     "peau grasse / surproduction de sébum",
	Ingredients: "niacinamide, zinc PCA, acide salicylique, argile kaolin",
	Products: []ruleProduct{
		{"Mattifying Moisturizer SPF 30", "Neutrogena", "hydratant matifiant", "formule oil-free non-comédogène contrôle le brillant toute la journée", false},
		{"Effaclar Gel Moussant", "La Roche-Posay", "nettoyant purifiant", "zinc PCA régule le sébum sans dessécher la peau", false},
		{"Niacinamide 10% + Zinc 1%", "The Ordinary", "sérum sébum", "niacinamide réduit la production de sébum de 30% en 4 semaines", false},
	},
}

var dryTypeRules = skinRule{
	Concern:     "peau sèche / barrière cutanée fragilisée",
	Ingredients: "céramides, beurre de karité, squalane, acides gras essentiels",
	Products: []ruleProduct{
		{"Moisturizing Cream", "CeraVe", "crème hydratante", "céramides 1, 3, 6-II restaurent la barrière cutanée durablement", false},
		{"Natural Moisturizing Factors + HA", "The Ordinary", "hydratant barrière", "NMF reproduit l'hydratation naturelle de la peau", false},
		{"Toleriane Sensitive Riche", "La Roche-Posay", "crème peaux sèches sensibles", "formule 9 ingrédients uniquement pour peaux très sèches", false},
	},
}

var sensitiveTypeRules = skinRule{
	Concern:     "peau sensible / réactivité",
	Ingredients: "centella asiatica, sans parfum, sans alcool, allantoïne",
	Products: []ruleProduct{
		{"Toleriane Hydratant Léger", "La Roche-Posay", "hydratant sans allergènes", "formule épurée 9 ingrédients, 0 conservateur, pour peaux réactives", false},
		{"Cicaplast Gel B5", "La Roche-Posay", "gel apaisant", "panthenol + madecassoside apaisent sans occlusion", false},
		{"100% Plant-Derived Squalane", "The Ordinary", "huile non-comédogène", "squalane pur, universel, convient aux peaux les plus sensibles", false},
	},
}

var fineLineRules = skinRule{
	Concern:     "premières rides / manque de fermeté",
	Ingredients: "rétinol 0.025%, peptides, vitamine C, CoQ10",
	Products: []ruleProduct{
		{"Retinol 0.2% in Squalane", "The Ordinary", "anti-âge rétinol", "rétinol basse concentration idéal pour débuter sans irritation", false},
		{"Buffet Multi-Technology Peptide", "The Ordinary", "sérum peptides", "11 complexes peptidiques pour fermeté et comblage des rides", false},
		{"Vitamin C 23% + HA Spheres", "The Ordinary", "vitamine C haute dose", "stimule le collagène et protège contre les radicaux libres", true},
	},
}

var sunProtectionRule = skinRule{
	Concern:     "protection solaire (essentielle pour tout profil)",
	Ingredients: "SPF 50+, filtres minéraux (zinc oxyde, dioxyde de titane)",
	Products: []ruleProduct{
		{"Anthelios UV-Mune 400 SPF 50+", "La Roche-Posay", "protection solaire", "protection UVA/UVB ultra-haute, légère, convient à tous les types de peau", false},
		{"Invisible Fluid SPF 50+", "Bioderma", "solaire visage invisible", "texture ultra-fluide non grasse, compatible peau acnéique", false},
	},
}

// ─── Main function ─────────────────────────────────────────────────────────────

// BuildProductRulesFromScan returns applicable rules based on skin scan + skin type.
// Returns both the matched rules (for Groq context) and concrete products (for fallback).
func BuildProductRulesFromScan(scan *models.SkinScan, skinType string) (rulesContext string, products []ruleProduct) {
	var matched []skinRule
	var sb strings.Builder

	if scan != nil {
		// Acne
		if scan.AcneScore < 50 {
			matched = append(matched, acneSevereRules)
		} else if scan.AcneScore < 72 {
			matched = append(matched, acneMildRules)
		}

		// Hydration
		if scan.HydrationScore < 65 {
			matched = append(matched, hydrationLowRules)
		}

		// Texture / pores
		if scan.TextureScore < 65 || scan.PoresCondition == "larges" {
			matched = append(matched, texturePoorRules)
		}

		// Uniformity / hyperpigmentation
		if scan.UniformityScore < 65 || scan.HyperpigmentationLevel == "élevé" || scan.HyperpigmentationLevel == "modéré" {
			matched = append(matched, uniformityPoorRules)
		}

		// Redness
		if scan.RednessLevel == "élevé" || scan.RednessLevel == "modéré" {
			matched = append(matched, rednessSevereRules)
		}

		// Fine lines
		if scan.FineLinesDetected {
			matched = append(matched, fineLineRules)
		}
	}

	// Skin type structural rules
	switch skinType {
	case "oily":
		matched = append(matched, oilyTypeRules)
	case "dry":
		matched = append(matched, dryTypeRules)
	case "sensitive":
		matched = append(matched, sensitiveTypeRules)
	case "combination":
		matched = append(matched, oilyTypeRules, hydrationLowRules)
	}

	// SPF always recommended
	matched = append(matched, sunProtectionRule)

	// Deduplicate products by name
	seen := map[string]bool{}
	for _, rule := range matched {
		sb.WriteString(fmt.Sprintf("• %s → ingrédients clés : %s\n", rule.Concern, rule.Ingredients))
		for _, p := range rule.Products {
			if !seen[p.Name] {
				seen[p.Name] = true
				products = append(products, p)
			}
		}
	}

	rulesContext = sb.String()
	return
}

// buildSkincareTitle returns a personalized title and summary based on scan data.
func buildSkincareTitle(scan *models.SkinScan, skinType string) (title, summary string) {
	if scan == nil {
		switch skinType {
		case "oily":
			return "Routine Peau Grasse — Sébum & Pores", "Routine adaptée à ta peau grasse pour contrôler le sébum et affiner les pores."
		case "dry":
			return "Routine Peau Sèche — Barrière & Hydratation", "Routine ciblée pour restaurer la barrière cutanée et apporter une hydratation durable."
		case "sensitive":
			return "Routine Peau Sensible — Apaisement & Protection", "Routine minimaliste pour calmer la réactivité et renforcer la tolérance cutanée."
		case "combination":
			return "Routine Peau Mixte — Zone T & Joues", "Routine équilibrée qui matifie la zone T tout en hydratant les joues sèches."
		default:
			return "Routine Skincare Personnalisée", "Routine adaptée à ton profil de peau pour un teint sain et équilibré."
		}
	}

	// Build title from biggest concern
	var concerns []string
	if scan.AcneScore < 70 {
		concerns = append(concerns, "Acné")
	}
	if scan.HydrationScore < 65 {
		concerns = append(concerns, "Hydratation")
	}
	if scan.TextureScore < 65 {
		concerns = append(concerns, "Texture")
	}
	if scan.UniformityScore < 65 {
		concerns = append(concerns, "Uniformité")
	}

	if len(concerns) == 0 {
		return "Routine Maintenance — Conserver Tes Acquis",
			fmt.Sprintf("Ton score peau est à %d/100 — continue cette routine pour maintenir les résultats.", scan.OverallScore)
	}

	mainConcern := concerns[0]
	var sum string
	switch mainConcern {
	case "Acné":
		sum = fmt.Sprintf("Ton score acné est à %d/100. Cette routine utilise BHA + niacinamide pour réduire les imperfections.", scan.AcneScore)
	case "Hydratation":
		sum = fmt.Sprintf("Ton hydratation est à %d/100. L'acide hyaluronique et les céramides vont restaurer ta barrière cutanée.", scan.HydrationScore)
	case "Texture":
		sum = fmt.Sprintf("Ta texture est à %d/100. Cette routine combine AHA et rétinol pour lisser la surface cutanée.", scan.TextureScore)
	default:
		sum = fmt.Sprintf("Ton uniformité est à %d/100. Vitamine C et niacinamide vont corriger les taches et uniformiser le teint.", scan.UniformityScore)
	}

	if len(concerns) > 1 {
		title = fmt.Sprintf("Routine Anti-%s & %s", concerns[0], concerns[1])
	} else {
		title = fmt.Sprintf("Routine Anti-%s — Ingrédients Actifs", concerns[0])
	}
	return title, sum
}

// buildDefaultSteps returns skin-type-appropriate routine steps for the fallback.
func buildDefaultSteps(skinType string) []map[string]interface{} {
	switch skinType {
	case "oily":
		return []map[string]interface{}{
			{"order": 1, "title": "Nettoyage doux", "description": "Utilise un gel nettoyant formulé pour peaux grasses (pH 5.5). Masse en cercles pendant 60 secondes, rince à l'eau tiède.", "tip": "Évite l'eau trop chaude qui stimule le sébum.", "duration_min": 2},
			{"order": 2, "title": "Tonique purifiant", "description": "Applique un tonique sans alcool avec niacinamide pour réguler le sébum. Tapote doucement avec un coton.", "tip": "", "duration_min": 1},
			{"order": 3, "title": "Sérum niacinamide", "description": "Applique 3-4 gouttes de sérum niacinamide 10% sur le visage. Attend 30 secondes d'absorption.", "tip": "Niacinamide réduit la production de sébum de 30% en 4 semaines.", "duration_min": 2},
			{"order": 4, "title": "Hydratant oil-free", "description": "Applique une fine couche de gel-crème non-comédogène. Évite les crèmes riches.", "tip": "", "duration_min": 1},
			{"order": 5, "title": "SPF 50+", "description": "Applique SPF 50+ fluide ou gel, réapplique toutes les 2h en extérieur.", "tip": "Le soleil aggrave acné et taches.", "duration_min": 1},
		}
	case "dry":
		return []map[string]interface{}{
			{"order": 1, "title": "Nettoyage crémeux", "description": "Utilise un nettoyant crémeux sans sulfates pour ne pas déshydrater davantage. Masse 30 secondes, rince à l'eau fraîche.", "tip": "Jamais d'eau chaude sur peau sèche.", "duration_min": 2},
			{"order": 2, "title": "Sérum hyaluronique", "description": "Sur peau légèrement humide, applique 4-5 gouttes d'acide hyaluronique multi-poids. L'humidité résiduelle booste l'efficacité.", "tip": "", "duration_min": 2},
			{"order": 3, "title": "Crème riche céramides", "description": "Applique une crème riche en céramides pour sceller l'hydratation et réparer la barrière cutanée.", "tip": "Céramides 1, 3, 6-II sont les plus efficaces.", "duration_min": 2},
			{"order": 4, "title": "SPF 50+ texture légère", "description": "Choisir un SPF fluide ou crème qui n'assèche pas.", "tip": "", "duration_min": 1},
		}
	case "sensitive":
		return []map[string]interface{}{
			{"order": 1, "title": "Nettoyage sans rinçage", "description": "Utilise une eau micellaire ou un nettoyant sans parfum ni alcool. Tamponner doucement sans frotter.", "tip": "Ne jamais frotter, toujours tapoter.", "duration_min": 2},
			{"order": 2, "title": "Sérum apaisant centella", "description": "Applique un sérum à la centella asiatica ou aloe vera pour calmer la réactivité.", "tip": "", "duration_min": 2},
			{"order": 3, "title": "Crème barrière épurée", "description": "Crème formule minimaliste (< 10 ingrédients), sans parfum, sans colorant.", "tip": "Moins d'ingrédients = moins de risque de réaction.", "duration_min": 2},
			{"order": 4, "title": "SPF minéral", "description": "SPF à base de zinc oxyde ou dioxyde de titane (filtres minéraux) — moins irritants que les filtres chimiques.", "tip": "", "duration_min": 1},
		}
	default: // normal / combination
		return []map[string]interface{}{
			{"order": 1, "title": "Nettoyage doux", "description": "Gel ou mousse nettoyant pH-neutre, massage 60 secondes en mouvements circulaires.", "tip": "", "duration_min": 2},
			{"order": 2, "title": "Sérum ciblé", "description": "Applique un sérum adapté à ta préoccupation principale (vitamine C le matin pour éclat, rétinol le soir pour texture).", "tip": "Vitamine C matin, rétinol soir — jamais ensemble.", "duration_min": 2},
			{"order": 3, "title": "Hydratant équilibrant", "description": "Crème légère texture gel-crème qui hydrate sans alourdir.", "tip": "", "duration_min": 1},
			{"order": 4, "title": "SPF 50+", "description": "Protection solaire quotidienne indispensable, même par temps nuageux.", "tip": "Le SPF est le meilleur anti-âge existant.", "duration_min": 1},
		}
	}
}

// BuildFallbackSkincareProducts returns a personalized product list without Groq.
func BuildFallbackSkincareProducts(scan *models.SkinScan, skinType string) []map[string]interface{} {
	_, products := BuildProductRulesFromScan(scan, skinType)

	// Cap at 5 products
	if len(products) > 5 {
		products = products[:5]
	}

	result := make([]map[string]interface{}, len(products))
	for i, p := range products {
		result[i] = map[string]interface{}{
			"name":     fmt.Sprintf("%s %s", p.Brand, p.Name),
			"category": p.Category,
			"why":      p.Why,
			"premium":  p.Premium,
		}
	}
	return result
}
