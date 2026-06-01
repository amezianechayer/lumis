package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/lumis/backend/internal/models"
	"github.com/lumis/backend/internal/repository"
)

type CycleHandler struct {
	repo *repository.CycleRepository
}

func NewCycleHandler(repo *repository.CycleRepository) *CycleHandler {
	return &CycleHandler{repo: repo}
}

type cyclePhase struct {
	Phase     string   `json:"phase"`
	PhaseFr   string   `json:"phase_fr"`
	DayOfCycle int     `json:"day_of_cycle"`
	CycleLength int    `json:"cycle_length"`
	SkinImpact string  `json:"skin_impact"`
	Tips      []string `json:"tips"`
	NextPeriodInDays int `json:"next_period_in_days"`
}

// GET /api/v1/cycle
func (h *CycleHandler) Get(c *fiber.Ctx) error {
	userID, err := parseUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	data, err := h.repo.FindByUser(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "db error"})
	}
	if data == nil {
		return c.JSON(fiber.Map{"configured": false})
	}
	phase := computePhase(data)
	return c.JSON(fiber.Map{
		"configured": true,
		"last_period_date": data.LastPeriodDate,
		"cycle_length": data.CycleLength,
		"phase": phase,
	})
}

// POST /api/v1/cycle  { last_period_date, cycle_length, period_length }
func (h *CycleHandler) Save(c *fiber.Ctx) error {
	userID, err := parseUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	var body struct {
		LastPeriodDate string `json:"last_period_date"`
		CycleLength    int    `json:"cycle_length"`
		PeriodLength   int    `json:"period_length"`
	}
	if err := c.BodyParser(&body); err != nil || body.LastPeriodDate == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	if body.CycleLength < 21 || body.CycleLength > 40 {
		body.CycleLength = 28
	}
	if body.PeriodLength < 2 || body.PeriodLength > 10 {
		body.PeriodLength = 5
	}

	data := &models.CycleData{
		UserID:         userID,
		LastPeriodDate: body.LastPeriodDate,
		CycleLength:    body.CycleLength,
		PeriodLength:   body.PeriodLength,
	}
	if err := h.repo.Upsert(c.Context(), data); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "save failed"})
	}
	return c.JSON(fiber.Map{"configured": true, "phase": computePhase(data)})
}

func computePhase(data *models.CycleData) cyclePhase {
	lastDate, err := time.Parse("2006-01-02", data.LastPeriodDate[:min(10, len(data.LastPeriodDate))])
	if err != nil {
		lastDate = time.Now()
	}
	cycleLen := data.CycleLength
	if cycleLen < 21 || cycleLen > 40 {
		cycleLen = 28
	}
	periodLen := data.PeriodLength
	if periodLen < 2 {
		periodLen = 5
	}

	daysSince := int(time.Since(lastDate).Hours() / 24)
	dayOfCycle := (daysSince % cycleLen) + 1
	if dayOfCycle < 1 {
		dayOfCycle = 1
	}
	nextPeriod := cycleLen - dayOfCycle + 1

	ovulation := cycleLen - 14 // ovulation ~14 days before next period

	var p cyclePhase
	p.DayOfCycle = dayOfCycle
	p.CycleLength = cycleLen
	p.NextPeriodInDays = nextPeriod

	switch {
	case dayOfCycle <= periodLen:
		p.Phase = "menstrual"
		p.PhaseFr = "Menstruelle"
		p.SkinImpact = "Œstrogènes au plus bas : peau plus terne, sensible et sujette à la sécheresse."
		p.Tips = []string{
			"Privilégie des soins doux et hydratants, évite les exfoliants agressifs.",
			"Hydrate intensément : acide hyaluronique + crème nourrissante.",
			"Repos et hydratation interne aident le teint.",
		}
	case dayOfCycle < ovulation-1:
		p.Phase = "follicular"
		p.PhaseFr = "Folliculaire"
		p.SkinImpact = "Œstrogènes en hausse : c'est ta meilleure période ! Peau lumineuse, ferme et résistante."
		p.Tips = []string{
			"Bon moment pour introduire des actifs (rétinol, AHA) — la peau les tolère mieux.",
			"Profites-en pour les soins anti-âge ou éclaircissants.",
			"Ta peau cicatrise vite : idéal pour les traitements.",
		}
	case dayOfCycle <= ovulation+1:
		p.Phase = "ovulation"
		p.PhaseFr = "Ovulation"
		p.SkinImpact = "Pic d'œstrogènes : éclat maximal, mais la production de sébum commence à augmenter."
		p.Tips = []string{
			"Ta peau rayonne — maquillage minimal suffit.",
			"Commence à surveiller la zone T (sébum en hausse).",
			"Continue le SPF, la peau est plus réactive au soleil.",
		}
	default:
		p.Phase = "luteal"
		p.PhaseFr = "Lutéale"
		p.SkinImpact = "Progestérone élevée : sébum +, pores dilatés, risque d'acné hormonale (menton/mâchoire)."
		p.Tips = []string{
			"Anticipe l'acné : niacinamide et acide salicylique (BHA) sur la zone menton.",
			"Évite les nouveaux produits irritants, la peau est plus réactive.",
			"Nettoie bien le soir, privilégie des textures non comédogènes.",
		}
	}
	return p
}
