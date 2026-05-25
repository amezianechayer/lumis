package services

// rec_library.go — contenu statique des recommandations beauté.
// Chaque builder reçoit les attributs du profil et retourne un RecTemplate.

type RecTemplate struct {
	Type        string
	GenderTarget string
	Title       string
	Summary     string
	Steps       []RecStep
	Products    []RecProduct
	Occasions   []string
	Season      string
	IconEmoji   string
	DurationMin int
	Difficulty  string
	IsPremium   bool
}

type RecStep struct {
	Order       int
	Title       string
	Description string
	Tip         string
	DurationMin int
}

type RecProduct struct {
	Name     string
	Category string
	Why      string
	Premium  bool
}

// ─── MALE GROOMING ────────────────────────────────────────────────

var groomingByShape = map[string]RecTemplate{
	"oval": {
		Title:    "Barbe complète — Visage Ovale",
		Summary:  "Avec un visage ovale, toutes les barbes te vont. La barbe complète ou le stubble maîtrisé subliment tes proportions naturellement équilibrées.",
		Occasions: []string{"daily", "work", "date", "evening"},
		IconEmoji: "🧔", DurationMin: 10, Difficulty: "easy",
		Steps: []RecStep{
			{1, "Délimiter la barbe", "Utilise un trimmer pour tracer une ligne nette sur la mâchoire. Laisse une légère arrondie pour un effet naturel.", "Commence toujours par le côté droit pour la symétrie.", 2},
			{2, "Égaliser la longueur", "Passe au sabot 3mm pour les joues, 5mm pour le centre. Dégradé léger vers les tempes.", "Un bon éclairage évite les zones ratées.", 3},
			{3, "Hydrater la barbe", "Applique une huile de barbe en massant de la racine aux pointes. 2-3 gouttes suffisent.", "Le beurre de karité nourrit mieux en hiver.", 2},
			{4, "Fixer avec un baume", "Peigne la barbe dans le sens de la pousse avec un baume léger pour un maintien naturel toute la journée.", "", 1},
		},
		Products: []RecProduct{
			{"Trimmer avec sabots", "outil", "Précision et régularité de la coupe", false},
			{"Huile de barbe argan", "soin", "Nourrit et adoucit les poils dès la première utilisation", false},
			{"Baume léger tenue naturelle", "fixant", "Maintien sans effet plastique", false},
			{"Brosse barbe sanglier", "outil", "Démêle et lustre la barbe", false},
		},
	},
	"round": {
		Title:    "Bouc allongé — Visage Rond",
		Summary:  "Un bouc allongé verticalise le visage et crée une illusion d'allongement visuel. Évite les barbes larges sur les joues qui accentuent la rondeur.",
		Occasions: []string{"daily", "work", "date"},
		IconEmoji: "🧔", DurationMin: 8, Difficulty: "easy",
		Steps: []RecStep{
			{1, "Raser les joues proprement", "Garde les joues rasées de près pour éviter l'effet «boule». Utilise un rasoir 5 lames.", "Une lotion aftershave évite les irritations.", 3},
			{2, "Sculpter le bouc", "Forme un bouc allongé sous les lèvres et sur le menton. Élargis légèrement la pointe pour l'effet allongeant.", "Utilise du gel traceur pour des lignes parfaites.", 4},
			{3, "Définir les contours", "Tracer une moustache fine reliée au bouc. Évite les moustaches épaisses qui élargissent.", "", 2},
			{4, "Entretien quotidien", "Un gel léger garde la forme 24h. Peigne vers le bas pour l'effet vertical.", "", 1},
		},
		Products: []RecProduct{
			{"Rasoir 5 lames précision", "outil", "Rasage net sur les contours du bouc", false},
			{"Gel traceur transparent", "finition", "Délimite les contours au millimètre", false},
			{"Huile de jojoba barbe", "soin", "Légère, non grasse, idéale barbe courte", false},
		},
	},
	"square": {
		Title:    "Barbe arrondie — Visage Carré",
		Summary:  "Adoucis ta mâchoire forte avec une barbe dont les contours sont légèrement arrondis. Évite les angles droits qui accentuent le carré.",
		Occasions: []string{"daily", "work", "date", "evening"},
		IconEmoji: "🧔", DurationMin: 12, Difficulty: "medium",
		Steps: []RecStep{
			{1, "Arrondir les angles de la mâchoire", "Au trimmer, crée des courbes douces aux angles de la mâchoire. Efface les lignes droites en rasant légèrement.", "C'est l'étape clé — prends ton temps.", 4},
			{2, "Volume sur les côtés", "Garde 4-6mm sur les joues pour équilibrer visuellement. Ne raser pas à blanc sur les côtés.", "", 2},
			{3, "Dégradé au niveau du cou", "Tracé haut sur le cou pour éviter un double-menton visuel. Adoucis avec un sabot 2mm.", "", 3},
			{4, "Soin hydratant", "La barbe dense absorbe plus les hydratants. Applique une huile puis un baume nourrissant.", "Masse en mouvements circulaires.", 2},
		},
		Products: []RecProduct{
			{"Trimmer arrondi precision", "outil", "Idéal pour créer des courbes naturelles", false},
			{"Huile barbe multi-vitamines", "soin", "Pour barbe dense et peau sous-jacente", false},
			{"Baume sculptant léger", "fixant", "Maintient la forme arrondie", false},
			{"Exfoliant barbe hebdomadaire", "soin", "Évite les poils incarnés sous la barbe dense", false},
		},
	},
	"heart": {
		Title:    "Barbe pleine — Visage en Cœur",
		Summary:  "Un front large et un menton fin — la barbe pleine sur la partie basse équilibre parfaitement tes proportions. Ajoute du volume sur le menton.",
		Occasions: []string{"daily", "work", "date"},
		IconEmoji: "🧔", DurationMin: 10, Difficulty: "medium",
		Steps: []RecStep{
			{1, "Volume maximal sur le menton", "Laisse la barbe pousser plus longue sur le menton (4-6 semaines). Taille très peu le bas.", "Plus de volume en bas = plus d'équilibre visuel.", 2},
			{2, "Dégradé progressif sur les joues", "Effile progressivement des joues vers le menton. Joues : 2-3mm, menton : libre.", "", 3},
			{3, "Moustache fine à medium", "Une moustache bien tracée complète l'effet sans écraser le visage.", "", 2},
			{4, "Huile de barbe quotidienne", "La barbe longue sur le menton a besoin de soin pour rester souple et brillante.", "Argan + huile de ricin pour la densité.", 2},
		},
		Products: []RecProduct{
			{"Peigne barbe longue", "outil", "Démêle sans casser les poils longs", false},
			{"Huile barbe densifiante", "soin", "Ricin + argan pour plus de volume", false},
			{"Cire de moustache", "fixant", "Maintien précis de la moustache", false},
		},
	},
	"diamond": {
		Title:    "Barbe courte & structurée — Visage Diamant",
		Summary:  "Tes pommettes saillantes sont ton atout. Une barbe courte et structurée met en valeur la symétrie naturelle de ton visage diamant.",
		Occasions: []string{"daily", "work", "date", "evening"},
		IconEmoji: "🧔", DurationMin: 7, Difficulty: "easy",
		Steps: []RecStep{
			{1, "Stubble parfait 2-3mm", "Taille régulièrement à 2-3mm pour un stubble net. C'est la longueur idéale pour le diamant.", "Toutes les 2-3 jours pour garder l'effet parfait.", 3},
			{2, "Contours ultra-nets", "Des lignes précises sur les joues et le cou définissent encore plus ta structure faciale forte.", "", 2},
			{3, "Éventuellement une moustache fine", "Une moustache légère peut élargir visuellement le centre du visage pour plus d'équilibre.", "", 2},
			{4, "Soin peau nue + barbe", "Le stubble expose beaucoup la peau. Utilise une huile légère soin peau + poils.", "", 1},
		},
		Products: []RecProduct{
			{"Trimmer précision sabots 0.5mm", "outil", "Pour un stubble parfaitement uniforme", false},
			{"Huile sèche multi-usage", "soin", "Nourrit peau et poils simultanément", false},
		},
	},
	"oblong": {
		Title:    "Barbe large — Visage Long",
		Summary:  "Avec un visage oblong, du volume sur les côtés de la mâchoire équilibre visuellement la longueur. Évite les barbes qui allongent vers le bas.",
		Occasions: []string{"daily", "work"},
		IconEmoji: "🧔", DurationMin: 12, Difficulty: "medium",
		Steps: []RecStep{
			{1, "Volume maximal sur les côtés", "Laisse pousser plus long sur les joues et la mâchoire. Sabot 6-8mm sur les côtés.", "C'est l'inverse d'une coupe pour visage rond.", 3},
			{2, "Limiter la longueur sur le menton", "Taille court sur le menton (2-3mm) pour ne pas allonger davantage.", "", 2},
			{3, "Moustache épaisse", "Une moustache en guidon ou épaisse élargit le centre du visage.", "", 3},
			{4, "Lissage et tenue", "Un baume structurant maintient le volume latéral toute la journée.", "", 2},
		},
		Products: []RecProduct{
			{"Cire barbe tenue forte", "fixant", "Maintient le volume sur les côtés", false},
			{"Brosse barbe ronde", "outil", "Ajoute du volume lors du brossage", false},
			{"Baume nourrissant barbe épaisse", "soin", "Pour barbe de volume", false},
		},
	},
}

// ─── FEMALE MAKEUP BY COLOR SEASON ───────────────────────────────

var makeupBySeason = map[string]RecTemplate{
	"spring": {
		Title:    "Maquillage Printemps — Teintes Douces & Pêche",
		Summary:  "Ta saison printemps appelle des tons chauds et lumineux : pêche, corail, dors rosés. Un look frais qui amplifie ton éclat naturel.",
		Occasions: []string{"daily", "date", "work"},
		Season:    "spring", IconEmoji: "🌸", DurationMin: 15, Difficulty: "easy",
		Steps: []RecStep{
			{1, "Base teint lumineux", "Applique un fond de teint satiné beige doré ou pêche clair. Fixe avec une poudre libre translucide fine.", "Évite les fonds de teint mats qui éteignent les teints printaniers.", 3},
			{2, "Blush pêche ou abricot", "Sourires puis glisse le blush pêche sur les pommettes vers les tempes. Fondu délicat pour un effet naturel.", "Le blush en crème tient mieux et donne un effet frais.", 2},
			{3, "Fards à paupières chauds", "Palette avec des tons champagne, pêche clair, corail doux. Tons chauds seulement — évite les violets et bleus.", "Une touche de rose clair sur la paupière mobile pour agrandir.", 4},
			{4, "Mascara brun foncé", "Le noir peut durcir. Préfère le mascara brun qui ouvre l'œil sans forcer.", "", 2},
			{5, "Lèvres pêche, rose-saumon ou corail", "Choisis un gloss ou rouge à lèvres dans les tons pêche-coral. Hydratant si possible pour l'effet bonne mine.", "Le liner naturel ou beige agrandit les lèvres.", 2},
		},
		Products: []RecProduct{
			{"Fond de teint pêche doré SPF20", "teint", "Correspond parfaitement aux tons chauds printaniers", false},
			{"Blush crème abricot", "joues", "Tient 12h, fini naturel", false},
			{"Palette terre-de-sienne nude", "yeux", "4 tons chauds polyvalents journée/soirée", false},
			{"Rouge lèvres pêche satiné", "lèvres", "Iconic pour la saison printemps", false},
		},
	},
	"summer": {
		Title:    "Maquillage Été — Tons Froids & Rosés",
		Summary:  "Ton profil été brille avec des couleurs fraîches et poudreuses. Mauve, rose cendré, gris perle — ces tons révèlent ta beauté naturelle.",
		Occasions: []string{"daily", "work", "date", "evening"},
		Season:    "summer", IconEmoji: "🌊", DurationMin: 15, Difficulty: "easy",
		Steps: []RecStep{
			{1, "Base teint rosé porcelaine", "Un fond de teint à sous-ton rose ou neutre. Fini naturel à satiné léger pour les peaux claires été.", "Évite les tons jaunes ou dors qui cassent ton harmonie.", 3},
			{2, "Blush rose poudré ou vieux rose", "Applique en douceur sur les pommettes. La nuance «vieux rose» est signature des profils été.", "", 2},
			{3, "Fards à paupières smoky froid", "Gris clair, mauve délicat, rose lilacé. Fondu délicat pour agrandir le regard.", "Évite les bruns chauds et orangés.", 4},
			{4, "Eyeliner gris ardoise", "Moins brutal que le noir, le gris ardoise sublime les yeux clairs et les regards sensibles.", "", 2},
			{5, "Lèvres berry, rose froid ou nude-rose", "Choisir un rouge ou gloss dans les tons framboise froide, rose pivoine ou nude-rose.", "", 2},
		},
		Products: []RecProduct{
			{"Fond de teint porcelaine rosé", "teint", "Sous-ton rose parfait pour le profil été", false},
			{"Blush vieux rose poudré", "joues", "Référence absolue du makeup saison été", false},
			{"Palette smoky froid mauve-gris", "yeux", "5 tons makeup été polyvalents", false},
			{"Rouge lèvres berry mat", "lèvres", "Couleur signature saison été", false},
		},
	},
	"autumn": {
		Title:    "Maquillage Automne — Tons Terre & Dorés",
		Summary:  "Ton profil automne rayonne avec les tons chauds et profonds. Terracotta, rouille, bordeaux, or brun — un maquillage riche qui te ressemble.",
		Occasions: []string{"daily", "work", "date", "evening"},
		Season:    "autumn", IconEmoji: "🍂", DurationMin: 18, Difficulty: "medium",
		Steps: []RecStep{
			{1, "Fond de teint beige doré ou ocre", "Choisis un fond de teint avec un sous-ton chaud marqué. Fini satiné ou naturel pour un teint solaire.", "La cushion dorée est parfaite pour raviver l'éclat.", 3},
			{2, "Contouring terracotta", "Un fard terracotta légèrement mat pour sculpter les pommettes et le front. L'automne peut porter le contouring chaud.", "", 3},
			{3, "Blush rouille ou brique", "Couleur signature automne — un blush dans les tons cuivre ou cannelle pour des joues sculptées.", "Mélange blush + bronzer pour un résultat naturel.", 2},
			{4, "Fards smoky chaud : rouille, or brun, bordeaux", "La palette automne est la plus riche. Brun rouille sur la paupière, or sur la mobile, bordeaux pour smoky soirée.", "Le khôl brun est plus flatteur que le noir.", 5},
			{5, "Lèvres bordeaux, terracotta ou noisette", "Les lèvres foncées et chaudes sont TA spécialité. Bordeaux le soir, terracotta le jour, noisette au bureau.", "Un liner lèvres d'une nuance plus foncée allonge les lèvres.", 2},
		},
		Products: []RecProduct{
			{"Fond de teint ocre chaud", "teint", "Parfait pour les peaux medium à mates chaudes", false},
			{"Palette terracotta 8 tons", "yeux+joues", "Fards + blush + bronzer tout-en-un", false},
			{"Rouge lèvres bordeaux mat", "lèvres", "Indispensable du dressing automne", false},
			{"Mascara brun-noir", "yeux", "Plus chaud et naturel que le noir pur", false},
		},
	},
	"winter": {
		Title:    "Maquillage Hiver — Contraste & Intensité",
		Summary:  "Le profil hiver supporte les contrastes forts que les autres saisons ne peuvent pas porter. Noir intense, rouge primaire, nude parfait — ta beauté est dramatique.",
		Occasions: []string{"daily", "work", "evening", "date"},
		Season:    "winter", IconEmoji: "❄️", DurationMin: 20, Difficulty: "medium",
		Steps: []RecStep{
			{1, "Fond de teint porcelaine ou ébène — pas de milieu", "Les hivers ont soit la peau très claire (teinte porcelaine) soit très sombre (teinte ébène profonde). Fini naturel à légèrement mat.", "Évite les fonds de teint dors ou jaunes.", 3},
			{2, "Contouring froid — sobre et précis", "Un contouring avec un gris-brun froid pour sculpter précisément. Pas de bronzer chaud.", "", 3},
			{3, "Blush rose fuchsia ou framboise", "Les joues hiver supportent le blush vif. Rose vif sur les pommettes pour un contraste saisissant.", "En journée, reste sur un voile très léger.", 2},
			{4, "Yeux : black liner, smoky charbon ou nude parfait", "Deux chemins opposés : soit liner noir très précis pour des yeux intenses, soit paupière nude parfait pour un regard nu saisissant.", "L'eye-liner liquide noir est signature hiver.", 5},
			{5, "Lèvres rouge primaire, fuchsia ou nude absolu", "La lèvre hiver est spectaculaire : rouge cerise, fuchsia électrique ou nude parfait. Le demi-ton n'existe pas.", "Un lip liner précis est indispensable avec les rouges intenses.", 3},
		},
		Products: []RecProduct{
			{"Fond de teint porcelaine ou ébène profond", "teint", "Le contraste est ta marque de fabrique", false},
			{"Eyeliner liquide noir intense", "yeux", "Liner précis pour les yeux hiver", false},
			{"Rouge lèvres rouge cerise", "lèvres", "L'arme secrète du profil hiver", false},
			{"Palette monochrome froid", "yeux", "Greys, noirs, blancs nacrés pour l'intensité", false},
		},
	},
}

// ─── HAIRCUT BY FACE SHAPE ────────────────────────────────────────

var haircutByShape = map[string]RecTemplate{
	"oval": {
		Title:    "Coupes pour Visage Ovale",
		Summary:  "Avec un visage ovale, tu as la chance que pratiquement toutes les coupes te vont. Exploite ta liberté pour expérimenter.",
		Occasions: []string{"daily", "work"},
		IconEmoji: "✂️", DurationMin: 0, Difficulty: "easy",
		Steps: []RecStep{
			{1, "Choisir la longueur", "Toutes les longueurs sont possibles. Le rasé, le court structuré, le mi-long ou le long : tout fonctionne sur le visage ovale.", "Ose expérimenter — tu ne risques pas grand-chose.", 0},
			{2, "Jouer avec le volume", "Ajouter du volume sur le dessus (quiff, pompadour) allonge légèrement. Du volume sur les côtés élargit. Les deux t'iront bien.", "", 0},
			{3, "Entretien et fréquence", "Avec un fade ou un undercut, prévoir une coupe toutes les 3-4 semaines pour garder la forme.", "", 0},
			{4, "Styling adapté", "Pommade brillante pour un look sleek, cire mate pour un look naturel. Sérum lissant pour les longues.", "", 0},
		},
		Products: []RecProduct{
			{"Pommade tenue moyenne brillance", "styling", "Polyvalente pour toutes les textures ovale", false},
			{"Sérum thermo-protecteur", "soin", "Pour les cheveux longs", false},
		},
	},
	"round": {
		Title:    "Coupes pour Visage Rond",
		Summary:  "Allonge visuellement ton visage avec des coupes qui ajoutent de la hauteur et réduisent la largeur. Le high fade et les volumes verticaux sont tes meilleurs alliés.",
		Occasions: []string{"daily", "work"},
		IconEmoji: "✂️", DurationMin: 0, Difficulty: "easy",
		Steps: []RecStep{
			{1, "Volume vertical — pas horizontal", "Le pompadour, le quiff et le faux hawk ajoutent de la hauteur et allongent le visage visuellement.", "Évite les coupes au bol ou en champignon.", 0},
			{2, "High fade ou undercut", "Un dégradé haut rasé sur les côtés amincit le visage et accentue la hauteur.", "", 0},
			{3, "Éviter la frange droite", "Une frange droite coupe et raccourcit. Préfère une frange en rideau ou de côté.", "", 0},
			{4, "Produit volumisant", "Mousse ou spray volumisant à la racine avant séchage. Sécher la racine à contre-sens.", "Un diffuseur donne plus de volume sans abîmer.", 0},
		},
		Products: []RecProduct{
			{"Spray volumisant racines", "styling", "Volume vertical durable", false},
			{"Cire mate tenue forte", "styling", "Pour quiff et pompadour", false},
		},
	},
	"square": {
		Title:    "Coupes pour Visage Carré",
		Summary:  "Adoucis ta mâchoire forte avec des coupes qui créent des lignes douces. La texture et les dégradés progressifs sont tes alliés.",
		Occasions: []string{"daily", "work"},
		IconEmoji: "✂️", DurationMin: 0, Difficulty: "medium",
		Steps: []RecStep{
			{1, "Dégradé progressif — éviter le fade haut abrupt", "Un low ou mid fade progressif adoucit plus qu'un high fade tranché qui accentue les angles.", "", 0},
			{2, "Textured crop ou side part", "La texture désordonnée atténue les lignes droites. Une raie sur le côté adoucit aussi l'angle de la mâchoire.", "", 0},
			{3, "Garder du volume sur les côtés", "Un peu de volume latéral équilibre la largeur de la mâchoire. Ne pas raser trop court.", "", 0},
			{4, "Éviter le carré parfait", "Coupes rasées très courtes sur le dessus accentuent l'effet «boîte». Préfère les ondulations et la texture.", "", 0},
		},
		Products: []RecProduct{
			{"Cire texture sèche", "styling", "Effet décoiffé naturel qui adoucit", false},
			{"Huile capillaire légère", "soin", "Dompte sans écraser le volume", false},
		},
	},
	"heart": {
		Title:    "Coupes pour Visage en Cœur",
		Summary:  "Équilibre ton grand front et ton menton pointu avec des coupes qui ajoutent du volume en bas et réduisent la largeur en haut.",
		Occasions: []string{"daily", "work"},
		IconEmoji: "✂️", DurationMin: 0, Difficulty: "medium",
		Steps: []RecStep{
			{1, "Frange ou rideau pour réduire le front", "Une frange ou des «rideaux» coupent visuellement la hauteur du front. Mi-long avec raie centrale est iconique.", "", 0},
			{2, "Volume sur la nuque et les côtés bas", "Coupe plus longue sur la nuque et les côtés inférieurs pour équilibrer le menton fin.", "", 0},
			{3, "Éviter le volume sur le dessus", "Pompadour et quiff hauts accentuent le front. Reste sur des volumes modérés.", "", 0},
			{4, "Mi-long ou lob (cheveux longs)", "Le mi-long avec des layers sur la fin est particulièrement flatteur sur le cœur.", "", 0},
		},
		Products: []RecProduct{
			{"Spray eau de mer texturisant", "styling", "Volume naturel sur les longueurs", false},
			{"Crème coiffante définition", "styling", "Contrôle sans rigidité", false},
		},
	},
	"diamond": {
		Title:    "Coupes pour Visage Diamant",
		Summary:  "Tes pommettes sont ton atout majeur. Des coupes qui élargissent le front et adoucissent les angles créent un équilibre parfait.",
		Occasions: []string{"daily", "work"},
		IconEmoji: "✂️", DurationMin: 0, Difficulty: "easy",
		Steps: []RecStep{
			{1, "Du volume sur les tempes", "Des coupes avec du volume sur les tempes et le dessus de la tête élargissent le front et créent plus d'harmonie.", "", 0},
			{2, "Mi-long avec mouvement", "Le mi-long avec waves naturelles ou layers est très flatteur pour le diamant.", "", 0},
			{3, "Frange optionnelle", "Une frange douce ajoute de la largeur au niveau du front, ce qui équilibre.", "", 0},
			{4, "Éviter les coupes très serrées sur les tempes", "Un fade trop haut réduit encore plus le front. Garde du volume sur les côtés.", "", 0},
		},
		Products: []RecProduct{
			{"Mousse fixante volume", "styling", "Volume sur les tempes durable", false},
			{"Huile coiffante brillance", "soin", "Pour les mi-longs diamant", false},
		},
	},
	"oblong": {
		Title:    "Coupes pour Visage Oblong",
		Summary:  "Ton visage allongé bénéficie de coupes qui ajoutent de la largeur et cassent la verticalité. Les rideaux et les volumes latéraux sont faits pour toi.",
		Occasions: []string{"daily", "work"},
		IconEmoji: "✂️", DurationMin: 0, Difficulty: "easy",
		Steps: []RecStep{
			{1, "Volume latéral maximum", "Évite les coupes avec volume uniquement sur le dessus. Préfère les textures larges sur les côtés.", "", 0},
			{2, "Rideaux et frange — incontournables", "La coupe «rideaux» avec raie centrale est une des meilleures pour allonger l'oblong. Très tendance aussi.", "", 0},
			{3, "Low fade ou pas de fade du tout", "Les coupes longues intégrales sans dégradé donnent plus de largeur que les fades hauts.", "", 0},
			{4, "Éviter les coupes très hautes", "Le mohawk et le quiff extrême allongent encore. Reste sur des volumes modérés en hauteur.", "", 0},
		},
		Products: []RecProduct{
			{"Cire volume lateral", "styling", "Volume sur les côtés toute la journée", false},
			{"Sérum anti-frizz", "soin", "Pour maîtriser les longueurs oblong", false},
		},
	},
}

// ─── SKINCARE MORNING ROUTINE ─────────────────────────────────────

func buildSkincareRec(skinTone, gender string) RecTemplate {
	title := "Routine Matin Skincare"
	summary := "Une routine matin en 4 étapes pour protéger et préparer ta peau. Adaptée à ton profil, elle prend moins de 5 minutes."

	steps := []RecStep{
		{1, "Nettoyage doux", "Lave ton visage avec un nettoyant doux pH neutre. Eau tiède — jamais chaude.", "Si tu portes de la barbe, masse aussi sous les poils.", 1},
		{2, "Sérum vitamine C", "Applique 3-4 gouttes sur peau humide. Tape doucement pour favoriser l'absorption.", "La vitamine C protège des UV et illumine le teint.", 1},
		{3, "Hydratant léger SPF", "Un hydratant avec SPF30 minimum réduit le vieillissement cutané de 80%.", "Ne saute jamais cette étape même en hiver.", 1},
		{4, "Contour des yeux", "Tape délicatement une noisette de soin contour de l'intérieur vers l'extérieur.", "L'annulaire est le doigt le plus délicat pour cette zone.", 1},
	}

	products := []RecProduct{
		{"Nettoyant gel pH 5.5", "nettoyage", "Respecte le microbiome cutané", false},
		{"Sérum vitamine C 15%", "soin", "Antioxydant + éclat du teint", false},
		{"Hydratant léger SPF 30", "protection", "1ère protection anti-âge", false},
		{"Rétinol crème nuit [PREMIUM]", "soin", "Renouvellement cellulaire nocturne", true},
	}

	return RecTemplate{
		Type: "skincare", GenderTarget: "all",
		Title: title, Summary: summary, Steps: steps, Products: products,
		Occasions: []string{"daily"}, IconEmoji: "🧴", DurationMin: 5, Difficulty: "easy",
	}
}

// ─── COLOR SEASON GUIDE ───────────────────────────────────────────

var colorSeasonGuide = map[string]RecTemplate{
	"spring": {
		Title:    "Guide Couleurs — Saison Printemps",
		Summary:  "Tes couleurs sont chaudes, claires et vivaces : corail, turquoise, jaune citron, vert printemps. Évite le noir pur et les couleurs trop sombres qui t'éteignent.",
		Occasions: []string{"daily", "work", "date", "evening", "wedding"},
		Season:    "spring", IconEmoji: "🎨", DurationMin: 0, Difficulty: "easy",
		Steps: []RecStep{
			{1, "Couleurs à adopter", "Corail, pêche, turquoise clair, vert lime, jaune citron, beige crème, ivoire, or. Ces tons réchauffent ton teint.", "", 0},
			{2, "Couleurs à éviter", "Noir pur, gris froid, bordeaux sombre, violet profond. Ces tons peuvent paraître durs sur toi.", "Tu peux utiliser ces couleurs en accent, jamais près du visage.", 0},
			{3, "Neutres parfaits", "Camel, brun caramel, crème, beige chaud, blanc cassé. Tes neutres de base pour des looks élégants.", "", 0},
			{4, "Métaux", "L'or, l'or rose, le bronze — tes métaux de prédilection. L'argent peut fonctionner mais préfère les tons chauds.", "", 0},
			{5, "Matières", "Les matières légères et lumineuses te vont : coton, soie, lin. Évite les textures trop lourdes.", "", 0},
		},
		Products: []RecProduct{},
	},
	"summer": {
		Title:    "Guide Couleurs — Saison Été",
		Summary:  "Tes couleurs sont fraîches, douces et poudreuses : rose poudré, bleu ciel, lavande, gris perle. Le noir te durcit — préfère le charbon.",
		Occasions: []string{"daily", "work", "date", "evening", "wedding"},
		Season:    "summer", IconEmoji: "🎨", DurationMin: 0, Difficulty: "easy",
		Steps: []RecStep{
			{1, "Couleurs à adopter", "Rose poudré, bleu gris, lavande, vert d'eau, gris perle, blanc pur, cerise froide. Ces tons révèlent ta douceur.", "", 0},
			{2, "Couleurs à éviter", "Orange, jaune citron, rouille, brun chaud — ces tons chauds clash avec ton profil froid.", "", 0},
			{3, "Neutres parfaits", "Gris perle, gris clair, blanc pur, gris cendré, marine froid. Tes neutres incontournables.", "", 0},
			{4, "Métaux", "L'argent et le platine sont tes alliés. L'or blanc aussi. Évite l'or jaune trop chaud.", "", 0},
			{5, "Prints et motifs", "Les prints floraux pastel et les rayures marinière te vont parfaitement.", "", 0},
		},
		Products: []RecProduct{},
	},
	"autumn": {
		Title:    "Guide Couleurs — Saison Automne",
		Summary:  "Tes couleurs sont riches, terreuses et chaudes : terracotta, bordeaux, moutarde, vert chasseur, brun caramel. Les tons profonds te subliment.",
		Occasions: []string{"daily", "work", "date", "evening", "wedding"},
		Season:    "autumn", IconEmoji: "🎨", DurationMin: 0, Difficulty: "easy",
		Steps: []RecStep{
			{1, "Couleurs à adopter", "Terracotta, bordeaux, rouille, ocre, moutarde, vert olive, brun caramel, orange brûlé. Richesse et profondeur.", "", 0},
			{2, "Couleurs à éviter", "Rose baby, bleu électrique, blanc pur — trop froid pour ton profil chaud.", "Le blanc cassé ou ivoire fonctionne, pas le blanc pur.", 0},
			{3, "Neutres parfaits", "Camel, brun chocolat, beige sablé, kaki. Tes neutres sont parmi les plus polyvalents.", "", 0},
			{4, "Métaux", "Or, bronze, cuivre — tu portes tous les métaux chauds à la perfection.", "", 0},
			{5, "Matières", "Laine, tweed, velours côtelé, cuir naturel — les matières d'automne te subliment.", "", 0},
		},
		Products: []RecProduct{},
	},
	"winter": {
		Title:    "Guide Couleurs — Saison Hiver",
		Summary:  "Tes couleurs sont pures et contrastées : noir intense, blanc pur, rouge cerise, bleu royal, émeraude. Tu portes les couleurs les plus intenses qui existent.",
		Occasions: []string{"daily", "work", "date", "evening", "wedding"},
		Season:    "winter", IconEmoji: "🎨", DurationMin: 0, Difficulty: "easy",
		Steps: []RecStep{
			{1, "Couleurs à adopter", "Noir pur, blanc pur, rouge cerise, royal blue, fuchsia, émeraude, prune intense, argenté. Contraste et pureté.", "", 0},
			{2, "Couleurs à éviter", "Brun chaud, camel, beige jaune, orange — ces tons coupent ton naturel éclat.", "", 0},
			{3, "Neutres parfaits", "Noir, blanc, gris charbon, marine profond. Les plus élégants de tous les profils.", "", 0},
			{4, "Métaux", "Argent, platine, chrome — les métaux froids brillent sur toi. L'or blanc fonctionne aussi.", "", 0},
			{5, "Conseil look", "N'aie pas peur du contraste total : noir/blanc, rouge/noir. C'est là où tu es le plus impressionnant·e.", "", 0},
		},
		Products: []RecProduct{},
	},
}

// ─── MAKEUP BY FACE SHAPE (FEMALE) ───────────────────────────────

var makeupByShape = map[string]RecTemplate{
	"oval": {
		Title:    "Maquillage Adapté — Visage Ovale",
		Summary:  "Le visage ovale est le plus polyvalent. Tu peux expérimenter les looks plus intenses. Sculpte les pommettes pour mettre en valeur ta symétrie.",
		Occasions: []string{"daily", "work", "date", "evening"},
		IconEmoji: "💄", DurationMin: 12, Difficulty: "easy",
		Steps: []RecStep{
			{1, "Contouring léger", "Applique un bronzer légèrement sur les tempes et sous les pommettes. Le visage ovale n'a pas besoin de restructuration.", "", 2},
			{2, "Blush en sweeping", "Applique le blush de la pommette vers la tempe dans un mouvement fluide. N'importe quelle couleur te va.", "", 2},
			{3, "Œil : toutes techniques possibles", "Tu peux porter le smoky, le cut crease, l'eye-liner fin ou épais. L'ovale supporte tout.", "", 4},
			{4, "Lèvres : ton choix total", "Rouge, nude, berry, orange — toutes les lèvres te vont. Profite de cette liberté.", "", 2},
		},
		Products: []RecProduct{
			{"Bronzer poudre naturel", "teint", "Contouring léger et naturel", false},
			{"Palette universelle 12 tons", "yeux", "Pour expérimenter tous les looks", false},
		},
	},
	"round": {
		Title:    "Maquillage Sculptant — Visage Rond",
		Summary:  "Le contouring est ton meilleur ami. Il crée de la définition et allonge visuellement ton visage doux.",
		Occasions: []string{"daily", "work", "date", "evening"},
		IconEmoji: "💄", DurationMin: 18, Difficulty: "medium",
		Steps: []RecStep{
			{1, "Contouring fort sur les joues", "Applique le contour en diagonale sous les pommettes vers les oreilles. Une ligne droite allonge davantage.", "Le contour crème est plus facile à fondre.", 4},
			{2, "Highlight sur le centre du visage", "Une touche d'enlumineur sur le nez, le menton et le centre du front crée un effet allongeant.", "", 2},
			{3, "Blush haut sur les pommettes", "Le blush très haut, presque sur les tempes, remonte visuellement le visage.", "Évite le blush sur les joues entières.", 2},
			{4, "Œil : liner allongeant en amande", "Un liner qui s'étire vers l'extérieur allonge l'œil et par extension le visage.", "", 3},
			{5, "Lèvres : éviter trop plein", "Des lèvres charnues très volumineuses accentuent la rondeur. Préfère les lèvres naturelles ou mat fin.", "", 2},
		},
		Products: []RecProduct{
			{"Contour stick crème", "teint", "Fondre facilement avec les doigts", false},
			{"Highlighter poudre champagne", "teint", "Illumine le centre sans exagérer", false},
		},
	},
	"square": {
		Title:    "Maquillage Adoucissant — Visage Carré",
		Summary:  "Des techniques douces pour adoucir la mâchoire forte et les angles marqués de ton visage carré.",
		Occasions: []string{"daily", "work", "date", "evening"},
		IconEmoji: "💄", DurationMin: 15, Difficulty: "medium",
		Steps: []RecStep{
			{1, "Contour arrondi aux angles", "Applique le bronzer sur les angles de la mâchoire en fondu circulaire pour les adoucir.", "Fondu = mâchoire douce visuellement.", 3},
			{2, "Blush en soleil sur les pommettes", "Un blush appliqué en cercle sur les pommettes crée des courbes douces.", "", 2},
			{3, "Surbrillance front arrondi", "Un highlighter discret au centre du front et du nez crée une illusion arrondie.", "", 2},
			{4, "Fards arrondis — pas anguleux", "Évite le cut crease très géométrique. Un smoky fondu et arrondi est plus flatteur.", "", 4},
			{5, "Lèvres arrondies", "Une bouche naturellement pleine ou un tracé légèrement arrondi adoucit les traits.", "", 2},
		},
		Products: []RecProduct{
			{"Bronzer brun doux", "teint", "Contouring arrondi naturel", false},
			{"Blush crème rose pastel", "joues", "Application en cercle facile", false},
		},
	},
	"heart": {
		Title:    "Maquillage Équilibrant — Visage en Cœur",
		Summary:  "Réduire le front visuellement et ajouter de la présence au bas du visage — c'est la clé du maquillage pour ton visage en cœur.",
		Occasions: []string{"daily", "work", "date", "evening"},
		IconEmoji: "💄", DurationMin: 15, Difficulty: "medium",
		Steps: []RecStep{
			{1, "Contouring sur les tempes et le front", "Appliquer un bronzer mat sur les côtés du front et les tempes pour visuellement réduire la largeur.", "", 3},
			{2, "Highlight sur le bas du visage", "Illumineur sur le menton et le bas des joues ajoute de la présence à la partie inférieure.", "", 2},
			{3, "Blush discret et bas", "Appliquer le blush bas sur les pommettes, pas vers les tempes.", "", 2},
			{4, "Lèvres volumineuses", "Des lèvres plus marquées équilibrent le menton fin. Lip liner + rouge plein.", "C'est le moment de faire ressortir les lèvres !", 3},
			{5, "Yeux : modérés", "Des yeux très dramatiques accentuent le front. Garde les yeux naturels à modérés.", "", 3},
		},
		Products: []RecProduct{
			{"Bronzer mat pro", "teint", "Contourage précis des tempes", false},
			{"Lip liner + rouge volumineux", "lèvres", "Équilibre le bas du visage", false},
		},
	},
	"diamond": {
		Title:    "Maquillage Flatteur — Visage Diamant",
		Summary:  "Tes pommettes sont tes meilleurs atouts. Le maquillage diamant met en valeur leur structure unique.",
		Occasions: []string{"daily", "work", "date", "evening"},
		IconEmoji: "💄", DurationMin: 12, Difficulty: "easy",
		Steps: []RecStep{
			{1, "Highlight sur les pommettes", "Un illumineur précis sur le haut des pommettes crée un effet «cheekbones sculptés» très tendance.", "", 2},
			{2, "Blush doux sous les pommettes", "Pas besoin d'insister — tes pommettes sont naturellement définies. Un blush léger suffit.", "", 2},
			{3, "Contouring doux sur la mâchoire", "Ajouter un peu de chaleur sous la mâchoire pour équilibrer sans trop sculpter.", "", 2},
			{4, "Yeux dramatiques OK", "Tes pommettes peuvent porter des yeux intenses sans que ça paraisse excessif.", "", 4},
			{5, "Lèvres pleine", "Des lèvres marquées équilibrent le menton fin et donnent plus de présence à la partie basse.", "", 2},
		},
		Products: []RecProduct{
			{"Highlighter pommettes shimmer", "teint", "Signature du maquillage diamant", false},
			{"Palette yeux neutrals", "yeux", "Smoky facile pour mettre en valeur le visage", false},
		},
	},
	"oblong": {
		Title:    "Maquillage Élargi — Visage Oblong",
		Summary:  "Ajouter de la largeur visuellement et casser la verticalité — voilà l'objectif du maquillage pour le visage oblong.",
		Occasions: []string{"daily", "work", "date", "evening"},
		IconEmoji: "💄", DurationMin: 15, Difficulty: "medium",
		Steps: []RecStep{
			{1, "Contouring sur le front et le menton", "Appliquer du bronzer légèrement sur le dessus du front et la pointe du menton pour raccourcir visuellement.", "", 3},
			{2, "Blush horizontal large", "Appliquer le blush de façon horizontale et large sur les pommettes — vers les oreilles. Cela élargit.", "", 2},
			{3, "Pas de contouring vertical", "Évite de sculpter verticalement le nez ou les joues — ça allongerait encore.", "", 0},
			{4, "Fards appliqués horizontalement", "Un smoky ou un trait d'eye-liner qui s'étire horizontalement élargit le regard.", "", 4},
			{5, "Lèvres pleines et larges", "Un rouge lèvres plein tracé jusqu'aux coins maximise la largeur.", "", 2},
		},
		Products: []RecProduct{
			{"Blush large brush", "outil", "Application horizontale fluide", false},
			{"Bronzer brun moyen", "teint", "Contouring frontal et menton", false},
		},
	},
}
