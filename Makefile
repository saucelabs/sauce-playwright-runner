DOCKER_IMAGE_NAME := saucelabs/sauce-playwright

docker:
	docker build -t $(DOCKER_IMAGE_NAME):latest .
