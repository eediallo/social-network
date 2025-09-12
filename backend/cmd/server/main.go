package main

import (
	"log"
	"net/http"

	customhttp "social-network/backend/internal/http"
)

func main() {
	h := customhttp.NewRouter()
	log.Println("server starting on :8080")
	if err := http.ListenAndServe(":8080", h); err != nil {
		log.Fatal(err)
	}
}
