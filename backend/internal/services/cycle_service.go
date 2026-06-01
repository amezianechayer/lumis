package services

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/lumis/backend/internal/models"
	"github.com/lumis/backend/internal/repository"
)

type CycleService struct {
	repo *repository.CycleRepository
}

func NewCycleService(repo *repository.CycleRepository) *CycleService {
	return &CycleService{repo: repo}
}

// CyclePhase is the computed cycle state for a user.
type CyclePhase struct {
	Phase            string   `json:"phase"`
	PhaseFr          string   `json:"phase_fr"`
	DayOfCycle       int      `json:"day_of_cycle"`
	CycleLength      int      `json:"cycle_length"`
	SkinImpact       string   `json:"skin_impact"`
	Tips             []string `json:"tips"`
	NextPeriodInDays int      `json:"next_period_in_days"`
}

func (s *CycleService) Upsert(ctx context.Context, data *models.CycleData) error {
	return s.repo.Upsert(ctx, data)
}

func (s *CycleService) Get(ctx context.Context, userID uuid.UUID) (*models.CycleData, error) {
	return s.repo.FindByUser(ctx, userID)
}

// GetPhase returns the computed phase for a user, or nil if not configured.
func (s *CycleService) GetPhase(ctx context.Context, userID uuid.UUID) (*CyclePhase, error) {
	data, err := s.repo.FindByUser(ctx, userID)
	if err != nil || data == nil {
		return nil, err
	}
	p := ComputeCyclePhase(data)
	return &p, nil
}

// ComputeCyclePhase derives the current phase + skin advice from cycle data.
func ComputeCyclePhase(data *models.CycleData) CyclePhase {
	end := len(data.LastPeriodDate)
	if end > 10 {
		end = 10
	}
	lastDate, err := time.Parse("2006-01-02", data.LastPeriodDate[:end])
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
	ovulation := cycleLen - 14

	var p CyclePhase
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
		}
	case dayOfCycle < ovulation-1:
		p.Phase = "follicular"
		p.PhaseFr = "Folliculaire"
		p.SkinImpact = "Œstrogènes en hausse : meilleure période ! Peau lumineuse, ferme et résistante."
		p.Tips = []string{
			"Bon moment pour introduire des actifs (rétinol, AHA).",
			"Idéal pour les soins anti-âge ou éclaircissants.",
		}
	case dayOfCycle <= ovulation+1:
		p.Phase = "ovulation"
		p.PhaseFr = "Ovulation"
		p.SkinImpact = "Pic d'œstrogènes : éclat maximal, mais le sébum commence à augmenter."
		p.Tips = []string{
			"Ta peau rayonne — maquillage minimal suffit.",
			"Surveille la zone T (sébum en hausse).",
		}
	default:
		p.Phase = "luteal"
		p.PhaseFr = "Lutéale"
		p.SkinImpact = "Progestérone élevée : sébum +, pores dilatés, risque d'acné hormonale (menton/mâchoire)."
		p.Tips = []string{
			"Anticipe l'acné : niacinamide et acide salicylique (BHA) sur le menton.",
			"Évite les nouveaux produits irritants, la peau est plus réactive.",
		}
	}
	return p
}
