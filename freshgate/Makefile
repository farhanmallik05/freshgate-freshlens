.PHONY: setup check dev up down demo bench clean

setup:
	@echo "Installing dependencies across packages..."
	pnpm -C engine install
	@if [ -f dashboard/package.json ]; then pnpm -C dashboard install; fi
	@if [ -f demo/package.json ]; then pnpm -C demo install; fi

check:
	@echo "Running lint, typecheck, and tests..."
	pnpm -C engine check
	pnpm -C engine test

dev:
	pnpm -C engine dev

up:
	docker compose -f deploy/docker-compose.yml --profile mock up -d

down:
	docker compose -f deploy/docker-compose.yml down

demo:
	pnpm -C demo dev

bench:
	pnpm -C bench run-bench

clean:
	rm -rf node_modules engine/node_modules dashboard/node_modules demo/node_modules engine/dist dashboard/.next data
