FROM saucelabs/testrunner-image:v0.3.0

USER root

# (Optional) Install XVFB if there's a need to run browsers in headful mode
RUN apt-get update && apt-get install -y --no-install-recommends \
    xvfb

USER seluser

#=================
# Install Node.JS
#=================
ENV NODE_VERSION=12.16.2
ENV NVM_VERSION=0.35.3
RUN wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v${NVM_VERSION}/install.sh | bash \
  && export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")" \
  && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" \
  && nvm install ${NODE_VERSION}

ENV PATH="/home/seluser/bin:/home/seluser/.nvm/versions/node/v${NODE_VERSION}/bin:${PATH}" \
    WDIO_LOG_PATH="/home/seluser/docker.log"

WORKDIR /home/seluser

COPY package.json .
COPY package-lock.json .
RUN npm ci --production


# Playwright caches the downloaded browser by default in ~/.cache/ms-playwright
# However, running the container in CI may result in a different active user and therefore home folder.
# That's why we let Playwright know where the location actually is.
ENV PLAYWRIGHT_BROWSERS_PATH=/home/seluser/.cache/ms-playwright

RUN npx playwright install
RUN npx playwright install-deps

COPY --chown=seluser:seluser . .

ENV IMAGE_NAME=saucelabs/stt-playwright-node

ARG BUILD_TAG
ENV IMAGE_TAG=${BUILD_TAG}

ARG PLAYWRIGHT_VERSION
ENV PLAYWRIGHT_VERSION=${PLAYWRIGHT_VERSION}

# Let saucectl know where to mount files
RUN mkdir -p /home/seluser/__project__/ && chown seluser:seluser /home/seluser/__project__/
LABEL com.saucelabs.project-dir=/home/seluser/__project__/
ENV SAUCE_PROJECT_DIR=/home/seluser/__project__/

# Let saucectl know what command to execute
LABEL com.saucelabs.entrypoint=/home/seluser/bin/folio

# Let saucectl know where to read job details url
LABEL com.saucelabs.job-info=/tmp/output.json
RUN echo "{}" > /tmp/output.json

#==================
# ENTRYPOINT & CMD
#==================
# IMPORTANT: Using the string form `CMD "entry.sh"` without
# brackets [] causes Docker to run your process
# And using `bash` which doesn’t handle signals properly
CMD ["./entry.sh"]
