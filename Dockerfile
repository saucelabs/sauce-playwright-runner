FROM saucelabs/testrunner-image:v0.1.0

USER root

RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -

#=============================
# Install WebKit dependencies
#=============================
RUN sudo apt-get update -y
RUN sudo apt-get install -y \
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
    libvpx5

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
RUN npm install

# Playwright caches the downloaded browser by default in ~/.cache/ms-playwright
# However, running the container in CI may result in a different active user and therefore home folder.
# That's why we let Playwright know where the location actually is.
ENV PLAYWRIGHT_BROWSERS_PATH=/home/seluser/.cache/ms-playwright

#==================
# Install saucectl
#==================
ARG SAUCECTL_VERSION=0.11.1
ENV SAUCECTL_BINARY=saucectl_${SAUCECTL_VERSION}_linux_64-bit.tar.gz
RUN curl -L -o ${SAUCECTL_BINARY} \
  -H "Accept: application/octet-stream" \
  https://github.com/saucelabs/saucectl/releases/download/v${SAUCECTL_VERSION}/${SAUCECTL_BINARY} \
  && tar -xvzf ${SAUCECTL_BINARY} \
  && mkdir /home/seluser/bin/ \
  && mv ./saucectl /home/seluser/bin/saucectl \
  && rm ${SAUCECTL_BINARY}

COPY --chown=seluser:seluser . .

# Workaround for permissions in CI if run with a different user
RUN chmod 777 -R /home/seluser/

#==================
# ENTRYPOINT & CMD
#==================
# IMPORTANT: Using the string form `CMD "entry.sh"` without
# brackets [] causes Docker to run your process
# And using `bash` which doesn’t handle signals properly
CMD ["./entry.sh"]
