FROM saucelabs/testrunner-image:v0.1.1

USER root

# For reference: https://github.com/microsoft/playwright/blob/master/docs/docker/Dockerfile.bionic
# ^ Microsoft's official playwright bionic docker container

RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -

#=============================
# Install WebKit dependencies
#=============================
RUN sudo apt-get update && sudo apt-get install -y \
    libwoff1 \
    libopus0 \
    libwebp6 \
    libwebpdemux2 \
    libenchant1c2a \
    libgudev-1.0-0 \
    libsecret-1-0 \
    libhyphen0 \
    libgdk-pixbuf2.0-0 \
    libegl1 \
    libnotify4 \
    libxslt1.1 \
    libevent-2.1-6 \
    libgles2 \
    libvpx5 \
    libxcomposite1 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libepoxy0 \
    libgtk-3-0 \
    libharfbuzz-icu0

# ==================================================================
# Install gstreamer and plugins to support video playback in WebKit
# ==================================================================
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgstreamer-gl1.0-0 \
    libgstreamer-plugins-bad1.0-0 \
    gstreamer1.0-plugins-good \
    gstreamer1.0-libav

#===============================
# Install Chromium dependencies
#===============================

RUN apt-get install -y \
    libnss3 \
    libxss1 \
    libasound2

#==============================
# Install Firefox dependencies
#==============================

RUN apt-get install -y \
    libdbus-glib-1-2 \
    libxt6

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
ENV PLAYWRIGHT_VERSION=^1.4.1


# Playwright caches the downloaded browser by default in ~/.cache/ms-playwright
# However, running the container in CI may result in a different active user and therefore home folder.
# That's why we let Playwright know where the location actually is.
ENV PLAYWRIGHT_BROWSERS_PATH=/home/seluser/.cache/ms-playwright

COPY --chown=seluser:seluser . .

# Workaround for permissions in CI if run with a different user
RUN chmod 777 -R /home/seluser/

ENV IMAGE_NAME=saucelabs/stt-playwright-node
ARG BUILD_TAG
ENV IMAGE_TAG=${BUILD_TAG}

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
