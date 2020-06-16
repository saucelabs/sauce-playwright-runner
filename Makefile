DOCKER_IMAGE_NAME := saucelabs/stt-playwright-jest-node

docker:
	docker build -t $(DOCKER_IMAGE_NAME):latest .
