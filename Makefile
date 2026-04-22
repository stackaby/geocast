
BUILD_DIR := ./dist

all-dev:
	make data &
	make dev

all-prod:
	make data &
	make prod

data:
	@test -n "$(BLENDER_PATH)" || (echo "Error: BLENDER_PATH is not set. Please add it to your shell"; exit 1)
	@test -n "$(VIRTUAL_ENV)" || echo "Warning: Not in a virtual environment. Run 'poetry shell' first for dependencies."
	@echo "Using Blender at: $(BLENDER_PATH)"
	PYTHONPATH=$(PWD)/clients/blender ${BLENDER_PATH} ./test/testscene.blend --python ./clients/blender/geocast/bootstrap.py

# make dev will just run the dev code without the vite build step
dev:
	yarn dev:

prod:
	make clean
	make build
	yarn start:

build:
	yarn build:

.PHONY: clean
clean:

	rm -rf $(BUILD_DIR)
