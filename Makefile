.PHONY: all
all: lint build

.PHONY: lint
lint: eslint depcruise

.PHONY: build
build: node_modules defs
	npx tsc --build

.PHONY: watch
watch: node_modules defs
	pnpm watch

.PHONY: eslint
eslint: node_modules defs
	pnpm lint

.PHONY: depcruise
depcruise: node_modules defs
	npx depcruise src --config

.PHONY: fix
fix: node_modules defs
	npx eslint . --ext .ts --fix

node_modules: package.json pnpm-lock.yaml
	pnpm install --frozen-lockfile

.PHONY: defs
defs: NetscriptDefinitions.d.ts

NetscriptDefinitions.d.ts:
	pnpm defs
