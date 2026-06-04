package services

import "context"

// langDirective returns an instruction telling the model which language to write
// its output in, based on the client's X-Lang (stored on the request context by
// the Language middleware). Defaults to French.
func langDirective(ctx context.Context) string {
	lang, _ := ctx.Value("lang").(string)
	switch lang {
	case "en":
		return "IMPORTANT: write ALL of your output in English."
	case "ar":
		return "هام: اكتب كل المحتوى باللغة العربية."
	default:
		return "IMPORTANT : rédige TOUT le contenu en français."
	}
}
