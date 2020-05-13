PLAYWRIGHT_VERSION=1.0.0
SAUCECTL_VERSION=0.5.0

build_base_flavor:
	docker build -f Dockerfile.base \
		--build-arg PLAYWRIGHT_VERSION=${PLAYWRIGHT_VERSION} \
		-t saucelabs/sauce-playwright:${PLAYWRIGHT_VERSION} .\
		${NO_CACHE}

build_saucectl_flavor:
	docker build -f Dockerfile.saucectl \
		--build-arg SAUCECTL_VERSION=${SAUCECTL_VERSION} \
		--build-arg PLAYWRIGHT_VERSION=${PLAYWRIGHT_VERSION} \
		-t saucelabs/sauce-playwright:${PLAYWRIGHT_VERSION}-saucectl${SAUCECTL_VERSION} .\
		${NO_CACHE}

build_all_flavors: build_base_flavor build_saucectl_flavor

push_base_flavor:
	docker push saucelabs/sauce-playwright:${PLAYWRIGHT_VERSION}

push_saucectl_flavor:
	docker push ${DOCKER_REGISTRY}saucelabs/sauce-playwright:${PLAYWRIGHT_VERSION}-saucectl${SAUCECTL_VERSION}

push_all_flavors: push_base_flavor push_saucectl_flavor
