DOCKER_IMAGE_NAME := saucelabs/stt-playwright-node

docker:
	docker build -t $(DOCKER_IMAGE_NAME):latest .
