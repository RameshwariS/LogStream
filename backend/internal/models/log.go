package models

import (
	"time"

	"github.com/google/uuid"
)

// Level represents a log severity level.
type Level string

const (
	DEBUG Level = "DEBUG"
	INFO  Level = "INFO"
	WARN  Level = "WARN"
	ERROR Level = "ERROR"
)

// LogEntry is the canonical log struct flowing through the system.
type LogEntry struct {
	ID        string            `json:"id"`
	Service   string            `json:"service"`
	Level     Level             `json:"level"`
	Message   string            `json:"message"`
	Timestamp time.Time         `json:"timestamp"`
	Metadata  map[string]string `json:"metadata,omitempty"`
	TraceID   string            `json:"trace_id,omitempty"`
}

// IngestRequest is the shape accepted by POST /api/logs.
// Timestamp is optional; server fills it if absent.
type IngestRequest struct {
	Service   string            `json:"service"`
	Level     Level             `json:"level"`
	Message   string            `json:"message"`
	Timestamp *time.Time        `json:"timestamp,omitempty"`
	Metadata  map[string]string `json:"metadata,omitempty"`
	TraceID   string            `json:"trace_id,omitempty"`
}

// ToEntry converts an ingest request into a fully-formed LogEntry.
func (r *IngestRequest) ToEntry() LogEntry {
	ts := time.Now().UTC()
	if r.Timestamp != nil {
		ts = *r.Timestamp
	}
	return LogEntry{
		ID:        uuid.NewString(),
		Service:   r.Service,
		Level:     r.Level,
		Message:   r.Message,
		Timestamp: ts,
		Metadata:  r.Metadata,
		TraceID:   r.TraceID,
	}
}
