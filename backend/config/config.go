package config

import "os"

type Config struct {
	Port      string
	JWTSecret string
	APIKey    string
}

func Load() *Config {
	return &Config{
		Port:      getEnv("PORT", "8080"),
		JWTSecret: getEnv("JWT_SECRET", "change-me-in-production"),
		APIKey:    getEnv("API_KEY", "dev-api-key"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
