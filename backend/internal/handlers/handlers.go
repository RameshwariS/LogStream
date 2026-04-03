package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/golang-jwt/jwt/v5"
	"github.com/logstream/server/config"
	"github.com/logstream/server/internal/broadcaster"
	"github.com/logstream/server/internal/models"
)

// ── Health ───────────────────────────────────────────────────────────────────

func Health(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "time": time.Now().UTC().Format(time.RFC3339)})
}

// ── Auth ─────────────────────────────────────────────────────────────────────

func Login(cfg *config.Config) http.HandlerFunc {
	type req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	return func(w http.ResponseWriter, r *http.Request) {
		var body req
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "invalid body", http.StatusBadRequest)
			return
		}
		// TODO: replace with real user store
		if body.Username != "admin" || body.Password != "password" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"sub": body.Username,
			"exp": time.Now().Add(24 * time.Hour).Unix(),
		})
		signed, err := token.SignedString([]byte(cfg.JWTSecret))
		if err != nil {
			http.Error(w, "token error", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"token": signed})
	}
}

// ── Ingest ───────────────────────────────────────────────────────────────────

func IngestLog(logCh chan<- interface{}) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req models.IngestRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid JSON", http.StatusBadRequest)
			return
		}
		if req.Service == "" || req.Message == "" {
			http.Error(w, "service and message are required", http.StatusUnprocessableEntity)
			return
		}
		entry := req.ToEntry()
		select {
		case logCh <- entry:
		default:
			http.Error(w, "server overloaded", http.StatusServiceUnavailable)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusAccepted)
		json.NewEncoder(w).Encode(map[string]string{"id": entry.ID, "status": "accepted"})
	}
}

// ── SSE Stream ───────────────────────────────────────────────────────────────

func SSEStream(bc *broadcaster.Broadcaster) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "streaming not supported", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("X-Accel-Buffering", "no")

		client := &broadcaster.Client{
			ID:   uuid.NewString(),
			Send: make(chan models.LogEntry, 64),
		}
		bc.Register(client)
		defer bc.Unregister(client.ID)

		// Send recent history on connect
		for _, entry := range bc.History() {
			writeSSE(w, entry)
		}
		flusher.Flush()

		for {
			select {
			case <-r.Context().Done():
				return
			case entry, ok := <-client.Send:
				if !ok {
					return
				}
				writeSSE(w, entry)
				flusher.Flush()
			}
		}
	}
}

func writeSSE(w http.ResponseWriter, entry models.LogEntry) {
	data, _ := json.Marshal(entry)
	fmt.Fprintf(w, "id: %s\ndata: %s\n\n", entry.ID, data)
}

// ── Query ────────────────────────────────────────────────────────────────────

func QueryLogs(bc *broadcaster.Broadcaster) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		service := q.Get("service")
		level := q.Get("level")

		logs := bc.History()
		filtered := logs[:0]
		for _, l := range logs {
			if service != "" && l.Service != service {
				continue
			}
			if level != "" && string(l.Level) != level {
				continue
			}
			filtered = append(filtered, l)
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(filtered)
	}
}
