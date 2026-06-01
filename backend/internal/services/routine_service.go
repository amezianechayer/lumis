package services

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/lumis/backend/internal/repository"
)

type RoutineService struct {
	repo *repository.RoutineRepository
}

func NewRoutineService(repo *repository.RoutineRepository) *RoutineService {
	return &RoutineService{repo: repo}
}

type RoutineSummary struct {
	Streak         int
	TotalCompleted int64
	MorningDone    bool
	EveningDone    bool
}

func (s *RoutineService) Complete(ctx context.Context, userID uuid.UUID, date, period string) error {
	return s.repo.Complete(ctx, userID, date, period)
}

func (s *RoutineService) Uncomplete(ctx context.Context, userID uuid.UUID, date, period string) error {
	return s.repo.Uncomplete(ctx, userID, date, period)
}

func (s *RoutineService) Summary(ctx context.Context, userID uuid.UUID, today string) RoutineSummary {
	periods, _ := s.repo.FindPeriodsForDate(ctx, userID, today)
	var sum RoutineSummary
	for _, p := range periods {
		if p == "morning" {
			sum.MorningDone = true
		} else if p == "evening" {
			sum.EveningDone = true
		}
	}
	dates, _ := s.repo.DistinctDates(ctx, userID)
	sum.Streak = ComputeStreak(dates)
	sum.TotalCompleted, _ = s.repo.TotalCount(ctx, userID)
	return sum
}

// ComputeStreak counts consecutive days (ending today or yesterday) with any routine.
func ComputeStreak(dates []string) int {
	set := map[string]bool{}
	for _, d := range dates {
		if len(d) >= 10 {
			set[d[:10]] = true
		}
	}
	if len(set) == 0 {
		return 0
	}
	now := time.Now()
	cur := now
	if !set[cur.Format("2006-01-02")] {
		cur = now.AddDate(0, 0, -1)
		if !set[cur.Format("2006-01-02")] {
			return 0
		}
	}
	streak := 0
	for set[cur.Format("2006-01-02")] {
		streak++
		cur = cur.AddDate(0, 0, -1)
	}
	return streak
}
