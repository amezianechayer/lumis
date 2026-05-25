package models

import "github.com/lib/pq"

// pq re-export so user.go can use pq.StringArray without a separate import
var _ = pq.StringArray{}
