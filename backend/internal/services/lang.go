package services

import "context"

// langOf returns the normalized language code (fr|en|ar) from the request
// context. Used to make cached AI content (recs, makeup guide) language-aware so
// switching language doesn't keep serving stale content in the old language.
func langOf(ctx context.Context) string {
	lang, _ := ctx.Value("lang").(string)
	switch lang {
	case "en", "ar":
		return lang
	default:
		return "fr"
	}
}

// supportedLangs lists every language we cache content for. Used to invalidate
// all language variants of a cache entry at once.
var supportedLangs = []string{"fr", "en", "ar"}

// langDirective returns an instruction telling the model which language to write
// its output in, based on the client's X-Lang (stored on the request context by
// the Language middleware). Defaults to French.
//
// The directive is intentionally forceful and tells the model it OVERRIDES any
// other language mentioned in the prompt body, because some prompts are authored
// in French. It also asks the model to keep fixed enum tokens (skin_type,
// eye_color, severity, undertone, season...) untranslated so our code can still
// map them.
func langDirective(ctx context.Context) string {
	lang, _ := ctx.Value("lang").(string)
	switch lang {
	case "en":
		return "=== LANGUAGE (HIGHEST PRIORITY) ===\n" +
			"Write EVERY human-readable string value (summaries, explanations, labels, advice, tips) in natural English (en-US). " +
			"This OVERRIDES any other language mentioned anywhere above — even if the instructions above are written in French, your output MUST be in English. " +
			"Do NOT output any French. " +
			"Exception: keep fixed enumerated field values (e.g. skin_type, eye_color, severity, undertone, color_season) EXACTLY as listed in the schema — do not translate those tokens."
	case "ar":
		return "=== اللغة (الأولوية القصوى) ===\n" +
			"اكتب كل قيمة نصية مقروءة (الملخصات، الشروحات، التسميات، النصائح) باللغة العربية الفصحى. " +
			"هذا يلغي أي لغة أخرى مذكورة أعلاه — حتى لو كانت التعليمات بالفرنسية، يجب أن يكون ناتجك بالعربية. " +
			"استثناء: احتفظ بقيم الحقول الثابتة (مثل skin_type, eye_color, severity, undertone, color_season) كما هي في المخطط دون ترجمة."
	default:
		return "=== LANGUE (PRIORITÉ ABSOLUE) ===\n" +
			"Rédige TOUTE valeur de texte lisible (résumés, explications, libellés, conseils) en français naturel. " +
			"Exception : conserve les valeurs d'énumération fixes (skin_type, eye_color, severity, undertone, color_season) telles quelles, sans les traduire."
	}
}
