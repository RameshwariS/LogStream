package broadcaster

import (
	"sync"

	"github.com/logstream/server/internal/models"
)

// Client represents a connected SSE consumer.
type Client struct {
	ID   string
	Send chan models.LogEntry
}

// Broadcaster fans log entries out to all registered clients.
type Broadcaster struct {
	mu      sync.RWMutex
	clients map[string]*Client
	history []models.LogEntry // in-memory ring buffer (last 500 entries)
}

func New() *Broadcaster {
	return &Broadcaster{
		clients: make(map[string]*Client),
		history: make([]models.LogEntry, 0, 500),
	}
}

// Run reads from the shared log channel and broadcasts to every client.
// Must be started as a goroutine.
func (b *Broadcaster) Run(logCh <-chan interface{}) {
	for raw := range logCh {
		entry, ok := raw.(models.LogEntry)
		if !ok {
			continue
		}
		b.store(entry)
		b.broadcast(entry)
	}
}

// Register adds a client and returns its ID.
func (b *Broadcaster) Register(c *Client) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.clients[c.ID] = c
}

// Unregister removes a client and closes its channel.
func (b *Broadcaster) Unregister(id string) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if c, ok := b.clients[id]; ok {
		close(c.Send)
		delete(b.clients, id)
	}
}

// History returns a copy of the recent log buffer.
func (b *Broadcaster) History() []models.LogEntry {
	b.mu.RLock()
	defer b.mu.RUnlock()
	out := make([]models.LogEntry, len(b.history))
	copy(out, b.history)
	return out
}

func (b *Broadcaster) broadcast(entry models.LogEntry) {
	b.mu.RLock()
	defer b.mu.RUnlock()
	for _, c := range b.clients {
		select {
		case c.Send <- entry:
		default:
			// drop if client channel is full — non-blocking
		}
	}
}

func (b *Broadcaster) store(entry models.LogEntry) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if len(b.history) >= 500 {
		b.history = b.history[1:]
	}
	b.history = append(b.history, entry)
}
