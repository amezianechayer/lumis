package services

import "math"

// MediaPipe Face Mesh key landmark indices (normalized 0.0–1.0)
const (
	lmForeheadLeft  = 10
	lmForeheadRight = 338
	lmCheekLeft     = 234
	lmCheekRight    = 454
	lmChinBottom    = 152
	lmJawLeft       = 58
	lmJawRight      = 288

	// Eye landmarks (left eye from camera perspective = right eye anatomically)
	lmLeftEyeOuter  = 33
	lmLeftEyeInner  = 133
	lmLeftEyeTop    = 159
	lmLeftEyeBottom = 145

	// Nose
	lmNoseTip   = 4
	lmNoseBridge = 6
	lmNoseLeft  = 64
	lmNoseRight = 294

	// Mouth
	lmMouthLeft   = 61
	lmMouthRight  = 291
	lmMouthTop    = 0
	lmMouthBottom = 17
)

func dist(a, b []float64) float64 {
	dx := a[0] - b[0]
	dy := a[1] - b[1]
	return math.Sqrt(dx*dx + dy*dy)
}

// DetermineFaceShape classifies the face shape from 468 MediaPipe landmarks.
// Returns shape name and confidence score (0–1).
func DetermineFaceShape(landmarks [][]float64) (shape string, confidence float64) {
	if len(landmarks) < 468 {
		return "oval", 0.5
	}

	foreheadW := dist(landmarks[lmForeheadLeft], landmarks[lmForeheadRight])
	cheekW := dist(landmarks[lmCheekLeft], landmarks[lmCheekRight])
	jawW := dist(landmarks[lmJawLeft], landmarks[lmJawRight])
	faceH := dist(landmarks[lmForeheadLeft], landmarks[lmChinBottom])

	if cheekW == 0 {
		return "oval", 0.5
	}

	jawRatio := jawW / cheekW
	foreheadRatio := foreheadW / cheekW
	faceRatio := faceH / cheekW

	switch {
	case faceRatio > 1.5 && jawRatio < 0.75 && foreheadRatio < 0.85:
		return "oval", 0.87
	case faceRatio < 1.1 && jawRatio > 0.8:
		return "round", 0.83
	case jawRatio > 0.9 && foreheadRatio > 0.88 && faceRatio < 1.3:
		return "square", 0.81
	case foreheadRatio > jawRatio*1.25:
		return "heart", 0.79
	case cheekW > foreheadW*1.1 && cheekW > jawW*1.15:
		return "diamond", 0.76
	default:
		return "oblong", 0.70
	}
}

// DetermineEyeShape classifies eye shape from landmarks.
func DetermineEyeShape(landmarks [][]float64) (shape, distance string) {
	if len(landmarks) < 468 {
		return "almond", "normal"
	}

	eyeW := dist(landmarks[lmLeftEyeOuter], landmarks[lmLeftEyeInner])
	eyeH := dist(landmarks[lmLeftEyeTop], landmarks[lmLeftEyeBottom])

	if eyeW == 0 {
		return "almond", "normal"
	}

	// Tilt: compare y positions of outer vs inner corner (y increases downward)
	outerY := landmarks[lmLeftEyeOuter][1]
	innerY := landmarks[lmLeftEyeInner][1]
	tilt := outerY - innerY // positive = outer lower than inner → downturned

	ratio := eyeH / eyeW

	switch {
	case ratio > 0.38:
		shape = "round"
	case ratio < 0.22:
		shape = "hooded"
	case tilt > 0.015:
		shape = "downturned"
	case tilt < -0.015:
		shape = "upturned"
	default:
		shape = "almond"
	}

	// Eye distance relative to eye width
	faceW := dist(landmarks[lmCheekLeft], landmarks[lmCheekRight])
	interEyeDist := dist(landmarks[lmLeftEyeInner], landmarks[lmLeftEyeOuter])
	if faceW > 0 {
		ratio2 := interEyeDist / faceW
		switch {
		case ratio2 < 0.28:
			distance = "close-set"
		case ratio2 > 0.38:
			distance = "wide-set"
		default:
			distance = "normal"
		}
	} else {
		distance = "normal"
	}

	return shape, distance
}

// DetermineNoseShape classifies nose shape.
func DetermineNoseShape(landmarks [][]float64) string {
	if len(landmarks) < 468 {
		return "medium"
	}

	noseW := dist(landmarks[lmNoseLeft], landmarks[lmNoseRight])
	faceW := dist(landmarks[lmCheekLeft], landmarks[lmCheekRight])

	if faceW == 0 {
		return "medium"
	}

	ratio := noseW / faceW
	switch {
	case ratio < 0.25:
		return "narrow"
	case ratio > 0.38:
		return "wide"
	default:
		return "medium"
	}
}

// DetermineLipShape classifies lip shape.
func DetermineLipShape(landmarks [][]float64) string {
	if len(landmarks) < 468 {
		return "medium"
	}

	lipW := dist(landmarks[lmMouthLeft], landmarks[lmMouthRight])
	lipH := dist(landmarks[lmMouthTop], landmarks[lmMouthBottom])

	if lipW == 0 {
		return "medium"
	}

	ratio := lipH / lipW
	switch {
	case ratio < 0.18:
		return "thin"
	case ratio > 0.32:
		return "full"
	default:
		return "medium"
	}
}

// DetermineJawType classifies jaw type.
func DetermineJawType(landmarks [][]float64) string {
	if len(landmarks) < 468 {
		return "defined"
	}

	jawW := dist(landmarks[lmJawLeft], landmarks[lmJawRight])
	cheekW := dist(landmarks[lmCheekLeft], landmarks[lmCheekRight])

	if cheekW == 0 {
		return "defined"
	}

	ratio := jawW / cheekW
	switch {
	case ratio > 0.88:
		return "strong"
	case ratio < 0.72:
		return "soft"
	default:
		return "defined"
	}
}

// DetermineUndertone maps Fitzpatrick scale + vein color hint to undertone.
func DetermineUndertone(fitzpatrick int, veinHint string) string {
	switch veinHint {
	case "blue", "purple":
		return "cool"
	case "green":
		return "warm"
	case "both":
		return "neutral"
	}
	// Fallback from Fitzpatrick scale
	switch {
	case fitzpatrick <= 2:
		return "cool"
	case fitzpatrick == 3:
		return "neutral"
	default:
		return "warm"
	}
}

// DetermineColorSeason maps undertone + depth to a color season.
// depth: "light" (fitzpatrick 1-2), "medium" (3-4), "deep" (5-6)
func DetermineColorSeason(undertone, depth string) string {
	switch undertone {
	case "warm":
		if depth == "light" || depth == "medium" {
			return "spring"
		}
		return "autumn"
	case "cool":
		if depth == "light" || depth == "medium" {
			return "summer"
		}
		return "winter"
	default: // neutral
		if depth == "light" {
			return "summer"
		}
		return "autumn"
	}
}

func fitzpatrickDepth(scale int) string {
	switch {
	case scale <= 2:
		return "light"
	case scale <= 4:
		return "medium"
	default:
		return "deep"
	}
}

// BeardRecommendations returns the top beard styles for a face shape.
var beardRecs = map[string][]string{
	"oval":    {"full_beard", "short_beard", "stubble"},
	"round":   {"goatee", "chin_strap", "anchor_beard"},
	"square":  {"rounded_beard", "circle_beard", "short_boxed_beard"},
	"heart":   {"full_beard", "anchor_beard", "chin_curtain"},
	"diamond": {"short_beard", "mustache", "friendly_mutton_chops"},
	"oblong":  {"wide_beard", "mutton_chops", "garibaldi"},
}

// HaircutRecommendations returns the top haircut styles for a face shape.
var haircutRecs = map[string][]string{
	"oval":    {"undercut", "quiff", "textured_crop"},
	"round":   {"high_fade", "pompadour", "faux_hawk"},
	"square":  {"textured_crop", "side_part", "slick_back"},
	"heart":   {"medium_length", "fringe", "curtains"},
	"diamond": {"full_sides", "medium_length", "classic_taper"},
	"oblong":  {"curtains", "low_fade", "side_swept"},
}

func GetBeardRecs(shape string) []string {
	if recs, ok := beardRecs[shape]; ok {
		return recs
	}
	return beardRecs["oval"]
}

func GetHaircutRecs(shape string) []string {
	if recs, ok := haircutRecs[shape]; ok {
		return recs
	}
	return haircutRecs["oval"]
}
