#!/usr/bin/env bash

# set -e: exit asap if a command exits with a non-zero status
set -e

echoerr() { printf "%s\n" "$*" >&2; }

# print error and exit
die () {
  echoerr "ERROR: $1"
  # if $2 is defined AND NOT EMPTY, use $2; otherwise, set to "150"
  errnum=${2-188}
  exit $errnum
}

# Required env vars
[ -z "${HOSTNAME}" ] && die "Need env var HOSTNAME"

#==============================================
# OpenShift or non-sudo environments support
#==============================================

CURRENT_UID="$(id -u)"
CURRENT_GID="$(id -g)"

# Ensure that assigned uid has entry in /etc/passwd.
if ! whoami >/dev/null; then
  echo "extrauser:x:${CURRENT_UID}:0::/home/extrauser:/bin/bash" >> /etc/passwd
fi

# Tests if the container works without sudo access
if [ "${REMOVE_SELUSER_FROM_SUDOERS_FOR_TESTING}" == "true" ]; then
  sudo rm $(which sudo)
  if sudo pwd >/dev/null 2>&1; then
    die "Somehow we still have sudo access despite having removed it. Quitting. $(sudo pwd)"
  fi
fi

# Flag to know if we have sudo access
if sudo pwd >/dev/null 2>&1; then
  export WE_HAVE_SUDO_ACCESS="true"
else
  export WE_HAVE_SUDO_ACCESS="false"
  warn "We don't have sudo"
fi

# if [ ${CURRENT_GID} -ne 1000 ]; then
#   if [ "${WE_HAVE_SUDO_ACCESS}" == "true" ]; then
#     sudo groupadd --gid ${CURRENT_GID} selgroup
#     sudo gpasswd -a $(whoami) selgroup
#   fi
# fi

# Workaround that might help to get dbus working in docker
#  http://stackoverflow.com/a/38355729/511069
#  https://github.com/SeleniumHQ/docker-selenium/issues/87#issuecomment-187659234
#  - still unclear if this helps: `-v /var/run/dbus:/var/run/dbus`
#  - this works generates errors: DBUS_SESSION_BUS_ADDRESS="/dev/null"
#  - this gives less erros: DBUS_SESSION_BUS_ADDRESS="unix:abstract=/dev/null"
DBUS_SERVICE_LOG="${LOGS_DIR}/dbus_service.log"
DBUS_SERVICE_STATUS_LOG="${LOGS_DIR}/dbus_service_status.log"

rm -f /var/lib/dbus/machine-id
mkdir -p /var/run/dbus
service dbus restart > $DBUS_SERVICE_LOG

# Test dbus works
service dbus status > $DBUS_SERVICE_STATUS_LOG
export $(dbus-launch)
export NSS_USE_SHARED_DB=ENABLED
# echo "-- INFO: DBUS_SESSION_BUS_ADDRESS=${DBUS_SESSION_BUS_ADDRESS}"
#=> e.g. DBUS_SESSION_BUS_ADDRESS=unix:abstract=/tmp/dbus-APZO4BE4TJ,guid=6e9c098d053d3038cb0756ae57ecc885
# echo "-- INFO: DBUS_SESSION_BUS_PID=${DBUS_SESSION_BUS_PID}"
#=> e.g. DBUS_SESSION_BUS_PID=44

#-----------------------------------------------
# Perform cleanup to support `docker restart`
log "Stopping supervisord to support docker restart..."
stop >/dev/null 2>&1 || true

if ! rm -f ${LOGS_DIR}/* ; then
  warn "The container has just started yet we already don't have write access to ${LOGS_DIR}/*"
  ls -la ${LOGS_DIR}/ || true
fi

if ! rm -f ${RUN_DIR}/* ; then
  warn "The container has just started yet we already don't have write access to ${RUN_DIR}/*"
  ls -la ${RUN_DIR}/ || true
fi

#---------------------
# Fix/extend ENV vars
#---------------------
export FIREFOX_DEST_BIN="/usr/bin/firefox"
export FIREFOX_VERSION=$(firefox_version)
# CHROME_FLAVOR would allow to have separate installations for stable, beta, unstable
export CHROME_PATH="/usr/bin/google-chrome-${CHROME_FLAVOR}"
export CHROME_VERSION=$(chrome_${CHROME_FLAVOR}_version)

echo "-- INFO: Docker Img. Version: ${DOSEL_VERSION}"
echo "-- INFO: Chrome..... Version: ${CHROME_VERSION}"
echo "-- INFO: Firefox.... Version: ${FIREFOX_VERSION}"

# We recalculate screen dimensions because docker run supports changing them
export SCREEN_DEPTH="${SCREEN_MAIN_DEPTH}+${SCREEN_SUB_DEPTH}"
export GEOMETRY="${SCREEN_WIDTH}""x""${SCREEN_HEIGHT}""x""${SCREEN_DEPTH}"

# These values are only available when the container started
export DOCKER_HOST_IP=$(netstat -nr | grep '^0\.0\.0\.0' | awk '{print $2}')

# export CONTAINER_IP=$(ip addr show dev ${ETHERNET_DEVICE_NAME} | grep "inet " | awk '{print $2}' | cut -d '/' -f 1)
# 2017-09 Found a more portable, even works in alpine:
export CONTAINER_IP=`getent hosts ${HOSTNAME} | awk '{ print $1 }'`

# Video
export FFMPEG_FRAME_SIZE="${SCREEN_WIDTH}x${SCREEN_HEIGHT}"

#----------------------------------------------------------
# Extend required services depending on what the user needs
export SUPERVISOR_NOT_REQUIRED_SRV_LIST1="video-rec"
# if [ "${VIDEO}" = "true" ]; then
#   export SUPERVISOR_REQUIRED_SRV_LIST="${SUPERVISOR_REQUIRED_SRV_LIST}|video-rec"
# else
#   export SUPERVISOR_NOT_REQUIRED_SRV_LIST1="video-rec"
# fi

if [ "${CHROME}" = "true" ]; then
  export SUPERVISOR_REQUIRED_SRV_LIST="${SUPERVISOR_REQUIRED_SRV_LIST}|selenium-node-chrome"
fi

if [ "${FIREFOX}" = "true" ]; then
  export SUPERVISOR_REQUIRED_SRV_LIST="${SUPERVISOR_REQUIRED_SRV_LIST}|selenium-node-firefox"
fi

# Fix extra quotes in Time zone $TZ env var
export TZ=$(echo ${TZ} | sed "s/^\([\"']\)\(.*\)\1\$/\2/g")

# https://github.com/SeleniumHQ/selenium/issues/2078#issuecomment-218320864
# https://github.com/SeleniumHQ/selenium/blob/master/py/selenium/webdriver/firefox/firefox_binary.py#L27
echo "webdriver.log.file has been discontinued." > "${LOGS_DIR}/firefox_browser.log"
echo "Please send us a PR if you know how to set the path for the Firefox browser logs." >> "${LOGS_DIR}/firefox_browser.log"

echo "Setting --user-data-dir=/home/seluser/chrome-user-data-dir" > "${LOGS_DIR}/chrome_browser.log"
echo "breaks the ability of clients to set Chrome options via the capabilities."   >> "${LOGS_DIR}/chrome_browser.log"
echo "Please send us a PR if you know how to set the path for the Firefox browser logs." >> "${LOGS_DIR}/chrome_browser.log"

# Video
export VIDEO_LOG_FILE="${LOGS_DIR}/video-rec-stdout.log"
export VIDEO_PIDFILE="${RUN_DIR}/video.pid"
if [ "${VIDEO_FILE_NAME}" = "" ]; then
  export VIDEO_FILE_NAME="vid"
  [ "${CHROME}" = "true" ] && export VIDEO_FILE_NAME="${VIDEO_FILE_NAME}_chrome_${SELENIUM_NODE_CH_PORT}"
  [ "${FIREFOX}" = "true" ] && export VIDEO_FILE_NAME="${VIDEO_FILE_NAME}_firefox_${SELENIUM_NODE_FF_PORT}"
  [ "${MULTINODE}" = "true" ] && export VIDEO_FILE_NAME="${VIDEO_FILE_NAME}_chrome_or_firefox_${SELENIUM_MULTINODE_PORT}"
fi
export VIDEO_PATH="${VIDEOS_DIR}/${VIDEO_FILE_NAME}.${VIDEO_FILE_EXTENSION}"

# no permissions to modify these log files in CI
if [ "${CI}" != "true" ]; then
    echo "${VIDEO_LOG_FILE}" > VIDEO_LOG_FILE
    echo "${VIDEO_PIDFILE}" > VIDEO_PIDFILE
    echo "${VIDEO_FILE_NAME}" > VIDEO_FILE_NAME
    echo "${VIDEO_PATH}" > VIDEO_PATH
fi

if [ "${SUPERVISOR_HTTP_PORT}" = "0" ]; then
  export SUPERVISOR_HTTP_PORT=$(get_unused_port_from_range ${RANDOM_PORT_FROM} ${RANDOM_PORT_TO})
elif [ "${PICK_ALL_RANDOM_PORTS}" = "true" ]; then
  # User want to pick random ports but may also want to fix some others
  if [ "${SUPERVISOR_HTTP_PORT}" = "${DEFAULT_SUPERVISOR_HTTP_PORT}" ]; then
    export SUPERVISOR_HTTP_PORT=$(get_unused_port_from_range ${RANDOM_PORT_FROM} ${RANDOM_PORT_TO})
  fi
fi

#--------------------------------
# Improve etc/hosts and fix dirs
if [ "${WE_HAVE_SUDO_ACCESS}" == "true" ]; then
  sudo -E improve_etc_hosts.sh
fi

#-------------------------
# Docker alongside docker
if [ "${WE_HAVE_SUDO_ACCESS}" == "true" ]; then
  docker_alongside_docker.sh
fi

#-------------------------------
# Fix small tiny 64mb shm issue
#-------------------------------
# https://github.com/elgalu/docker-selenium/issues/20
if [ "${SHM_TRY_MOUNT_UNMOUNT}" = "true" ] && [ "${WE_HAVE_SUDO_ACCESS}" == "true" ]; then
  sudo umount /dev/shm || true
  sudo mount -t tmpfs -o rw,nosuid,nodev,noexec,relatime,size=${SHM_SIZE} \
    tmpfs /dev/shm || true
fi

# Open a new file descriptor that redirects to stdout:
exec 3>&1

# no permissions to modify these log files in CI
if [ "${CI}" != "true" ]; then
    # Try 2 times first
    start-xvfb.sh || start-xvfb.sh || echo "Couldn't start xvfb"
    export DISPLAY="$(cat DISPLAY)"
    export DISP_N="$(cat DISP_N)"

    # For 1 more time for Xvfb or retry
    if ! timeout --foreground ${WAIT_TIMEOUT} wait-xvfb.sh >/var/log/cont/wait-xvfb.1.log 2>&1 3>&1; then
    start-xvfb.sh || start-xvfb.sh
    export DISPLAY="$(cat DISPLAY)"
    export DISP_N="$(cat DISP_N)"
    fi

    timeout --foreground ${WAIT_TIMEOUT} wait-xvfb.sh >/var/log/cont/wait-xvfb.2.log 2>&1 3>&1 || \
    die "Failed while waiting for Xvfb to start. We cannot continue!"

    echo "${DISPLAY}" > DISPLAY
    echo "${DISP_N}" > DISP_N

    env > env
fi

if [ "${DEBUG}" == "bash" ]; then
  run-supervisord.sh &
  cd /var/log/cont
  exec bash
fi

if [ "${CI}" != "true" ]; then
  exec run-supervisord.sh
fi

# Note: sudo -i creates a login shell for someUser, which implies the following:
# - someUser's user-specific shell profile, if defined, is loaded.
# - $HOME points to someUser's home directory, so there's no need for -H (though you may still specify it)
# - the working directory for the impersonating shell is the someUser's home directory.

# sleep some time to let supervisord start
sleep 2
