package main

import (
	"log"
	"os"

	"github.com/logstream/server/config"
	"github.com/logstream/server/internal/broadcaster"
	"github.com/logstream/server/internal/handlers"
	"github.com/logstream/server/internal/middleware"
	"net/http"
)

func main() {
	cfg := config.Load()

	// Central log channel — backbone of the producer-consumer pipeline
	logCh := make(chan interface{}, 256)

	// Start broadcaster: fans out logs from channel to all connected SSE clients
	bc := broadcaster.New()
	go bc.Run(logCh)

	mux := http.NewServeMux()

	// ── Public ──────────────────────────────────────────────────────────────
	mux.HandleFunc("GET /health", handlers.Health)
	mux.HandleFunc("POST /api/auth/login", handlers.Login(cfg))

	// ── Ingestion (API key protected) ────────────────────────────────────────
	mux.Handle("POST /api/logs",
		middleware.APIKey(cfg)(http.HandlerFunc(handlers.IngestLog(logCh))),
	)

	// ── Streaming (JWT protected) ────────────────────────────────────────────
	mux.Handle("GET /stream",
		middleware.JWT(cfg)(http.HandlerFunc(handlers.SSEStream(bc))),
	)
	mux.Handle("GET /api/logs",
		middleware.JWT(cfg)(http.HandlerFunc(handlers.QueryLogs(bc))),
	)

	addr := ":" + cfg.Port
	log.Printf("LogStream server listening on %s", addr)

	srv := &http.Server{
		Addr:    addr,
		Handler: middleware.CORS(mux),
	}

	if err := srv.ListenAndServe(); err != nil {
		log.Printf("server error: %v", err)
		os.Exit(1)
	}
}
