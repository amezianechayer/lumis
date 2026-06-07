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
	// PCOS / SOPK
	HasPCOS    bool     `json:"has_pcos"`
	IsEstimate bool     `json:"is_estimate"` // predictions are rough when the cycle is irregular
	PcosNote   string   `json:"pcos_note,omitempty"`
	PcosTips   []string `json:"pcos_tips,omitempty"`
}

func (s *CycleService) Upsert(ctx context.Context, data *models.CycleData) error {
	return s.repo.Upsert(ctx, data)
}

func (s *CycleService) Get(ctx context.Context, userID uuid.UUID) (*models.CycleData, error) {
	return s.repo.FindByUser(ctx, userID)
}

// SaveLog upserts a single day's tracking entry.
func (s *CycleService) SaveLog(ctx context.Context, log *models.CycleLog) error {
	return s.repo.UpsertLog(ctx, log)
}

// GetLogs returns the user's recent daily logs.
func (s *CycleService) GetLogs(ctx context.Context, userID uuid.UUID, limit int) ([]models.CycleLog, error) {
	return s.repo.FindLogs(ctx, userID, limit)
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

	// SOPK / cycles irréguliers : les prédictions deviennent des estimations et
	// l'accent passe sur la gestion de l'acné hormonale (conseils cosmétiques).
	if data.HasPCOS {
		p.HasPCOS = true
		p.IsEstimate = true
		p.PcosNote = "Cycle irrégulier (SOPK) : les dates ci-dessus sont des estimations. Note tes règles au fil des jours pour affiner."
		p.PcosTips = []string{
			"L'acné hormonale (menton, mâchoire, cou) peut survenir hors phase lutéale : garde une routine anti-imperfections constante.",
			"Mise sur des actifs réguliers : niacinamide, acide salicylique (BHA) et SPF quotidien.",
			"Privilégie un mode de vie à index glycémique bas — ça aide souvent la peau SOPK.",
			"Suis tes symptômes au quotidien ci-dessous pour repérer tes propres schémas.",
		}
	}
	return p
}
