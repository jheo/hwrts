.PHONY: dev dev-frontend dev-backend build build-frontend build-backend test test-frontend test-backend lint lint-frontend lint-backend clean infra-up infra-down infra-reset schema-generate client-generate openapi-generate type-check help

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

schema-generate:  ## Generate OpenAPI schema from running backend
	@echo "Starting backend server..."
	@cd backend && ./gradlew bootRun &
	@echo "Waiting for server to start..."
	@for i in $$(seq 1 30); do \
		curl -s http://localhost:8080/actuator/health > /dev/null 2>&1 && break; \
		sleep 1; \
	done
	@mkdir -p schema
	curl -s http://localhost:8080/api-docs.yaml -o schema/openapi.yaml
	@echo "Schema saved to schema/openapi.yaml"
	@kill %1 2>/dev/null || true

client-generate:  ## Generate TypeScript client from OpenAPI schema
	cd frontend && pnpm --filter @humanwrites/api-client generate

openapi-generate: schema-generate client-generate  ## Full OpenAPI pipeline: schema + client

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
