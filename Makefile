
BUILD_DIR := ./frontend/dist

all-dev: data dev
all-prod: data build

data:
	@test -n "$(BLENDER_PATH)" || (echo "Error: BLENDER_PATH is not set. Please add it to your shell"; exit 1)
	@test -n "$(VIRTUAL_ENV)" || echo "Warning: Not in a virtual environment. Run 'poetry shell' first for dependencies."
	@echo "Using Blender at: $(BLENDER_PATH)"
	PYTHONPATH=$(PWD)/clients/blender ${BLENDER_PATH} ./test/testscene.blend --python ./clients/blender/geocast/bootstrap.py

# make dev will just run the dev code without the vite build step
dev:
#	DEV=true docker compose up --watch
	yarn dev: && node ./backend/src/server.js

prod:
	make clean && make build
	docker compose up

build:
	yarn build:
	cp ./backend/src/server.js ./frontend/dist/assets/

.PHONY: clean
clean:

	docker compose down --rmi local

	rm -rf $(BUILD_DIR)
