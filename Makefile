.PHONY: dev dev-frontend dev-backend build build-frontend build-backend test test-frontend test-backend lint lint-frontend lint-backend clean infra-up infra-down infra-reset openapi-generate type-check help

# =============================================================================
# Development
# =============================================================================

dev: infra-up dev-frontend dev-backend  ## Start full dev environment

dev-frontend:  ## Start frontend dev server
	cd frontend && pnpm dev

dev-backend:  ## Start backend dev server
	cd backend && ./gradlew bootRun

# =============================================================================
# Build
# =============================================================================

build: build-frontend build-backend  ## Build everything

build-frontend:  ## Build frontend
	cd frontend && pnpm turbo build

build-backend:  ## Build backend
	cd backend && ./gradlew build -x test

# =============================================================================
# Test
# =============================================================================

test: test-frontend test-backend  ## Run all tests

test-frontend:  ## Run frontend tests
	cd frontend && pnpm turbo test

test-backend:  ## Run backend tests
	cd backend && ./gradlew test

# =============================================================================
# Lint
# =============================================================================

lint: lint-frontend lint-backend  ## Run all linters

lint-frontend:  ## Run frontend linters
	cd frontend && pnpm turbo lint

lint-backend:  ## Run backend linter
	cd backend && ./gradlew spotlessCheck

# =============================================================================
# Infrastructure
# =============================================================================

infra-up:  ## Start Docker containers (PostgreSQL + Redis)
	docker compose -f docker/docker-compose.yml up -d

infra-down:  ## Stop Docker containers
	docker compose -f docker/docker-compose.yml down

infra-reset:  ## Reset Docker containers (delete volumes)
	docker compose -f docker/docker-compose.yml down -v

# =============================================================================
# OpenAPI Pipeline
# =============================================================================

openapi-generate:  ## Generate API client from OpenAPI schema
	cd backend && ./gradlew bootRun &
	sleep 10
	curl -o schema/openapi.yaml http://localhost:8080/api-docs.yaml
	cd frontend && pnpm --filter @humanwrites/api-client generate
	kill %1 2>/dev/null || true

# =============================================================================
# Clean
# =============================================================================

clean:  ## Clean all build artifacts
	cd frontend && pnpm turbo clean
	cd backend && ./gradlew clean
	rm -rf frontend/node_modules
	rm -rf frontend/apps/web/.next

# =============================================================================
# Type Check
# =============================================================================

type-check:  ## Run type checks
	cd frontend && pnpm turbo type-check
	cd backend && ./gradlew compileKotlin

# =============================================================================
# Help
# =============================================================================

help:  ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
