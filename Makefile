
BUILD_DIR := ./dist

all-dev: data dev
all-prod: data build

data:
	@test -n "$(BLENDER_PATH)" || (echo "Error: BLENDER_PATH is not set. Please add it to your shell"; exit 1)
	@echo "Using Blender at: $(BLENDER_PATH)"
	${BLENDER_PATH} ./test/testscene.blend --python ./src/exporters/blender.py

# make dev will just run the dev code without the vite build step
dev: ./data.json
	node assets/scripts/server.js &
	npm run dev

build:
	npm run build
	cp ./data.json ./dist/
	# Then copy the data into the dist location
	npx vite dist


.PHONY: clean
clean:
	rm -r $(BUILD_DIR)
