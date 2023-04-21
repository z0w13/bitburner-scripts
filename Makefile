.PHONY: watch
watch: node_modules
	pnpm viteburner dev

.PHONY: lint
lint: eslint depcruise

.PHONY: typescript
typescript:
	pnpm tsc --noEmit

.PHONY: eslint
eslint: node_modules
	pnpm lint

.PHONY: depcruise
depcruise: node_modules
	npx depcruise src --config

.PHONY: fix
fix: node_modules
	npx eslint . --ext .ts --fix

node_modules: package.json pnpm-lock.yaml
	pnpm install --frozen-lockfile
	touch node_modules # ensure node_modules timestamp gets updated
