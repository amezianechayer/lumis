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

type DayStatus struct {
	Date    string `json:"date"`
	Morning bool   `json:"morning"`
	Evening bool   `json:"evening"`
}

// Week returns the last 7 days (oldest first) with morning/evening completion.
func (s *RoutineService) Week(ctx context.Context, userID uuid.UUID) []DayStatus {
	now := time.Now()
	since := now.AddDate(0, 0, -6).Format("2006-01-02")
	logs, _ := s.repo.FindLogsSince(ctx, userID, since)
	byDate := map[string]map[string]bool{}
	for _, l := range logs {
		d := l.LogDate
		if len(d) >= 10 {
			d = d[:10]
		}
		if byDate[d] == nil {
			byDate[d] = map[string]bool{}
		}
		byDate[d][l.Period] = true
	}
	out := make([]DayStatus, 0, 7)
	for i := 6; i >= 0; i-- {
		d := now.AddDate(0, 0, -i).Format("2006-01-02")
		m := byDate[d]
		out = append(out, DayStatus{Date: d, Morning: m["morning"], Evening: m["evening"]})
	}
	return out
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
