
build_base_flavor:
	docker build -f Dockerfile.base -t saucelabs/sauce-playwright:${PLAYWRIGHT_VERSION} .

build_saucectl_flavor: build_base_flavor
	docker build -f Dockerfile.saucectl -t saucelabs/sauce-playwright:${PLAYWRIGHT_VERSION}-${SAUCECTL_VERSION} .
