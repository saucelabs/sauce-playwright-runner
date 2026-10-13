#!/bin/bash
set -e

# Usage: bundle.macos.sh [amd64|arm64]   (default: amd64)
#
# amd64 -> playwright-macos-amd64.zip: multi-arch bundle for macOS 13-15
#          (x64 base with arm64 Chromium/WebKit overlaid, see below).
# arm64 -> playwright-macos-arm64.zip: native arm64 bundle for macOS 26+.
#          Playwright caps host detection at mac26, so macOS 27 resolves to
#          mac26-arm64 too.
#
# The arm64 bundle cannot be folded into the amd64 one: playwright names browser
# directories by browser and revision only, so arm64 and x64 Firefox (and
# ffmpeg) share one directory, as do the mac15 and mac26 WebKit builds.
ARCH="${1:-amd64}"
if [ "$ARCH" != "amd64" ] && [ "$ARCH" != "arm64" ]; then
  echo "ERROR: unknown arch '$ARCH', expected amd64 or arm64" >&2
  exit 1
fi

# Run common bundling steps
bash ./scripts/bundle.sh

export PLAYWRIGHT_SKIP_BROWSER_GC=1

# Final cache location used by the bundle at runtime
FINAL_CACHE="$PWD/bundle/Cache"

pushd bundle/

if [ "$ARCH" = "arm64" ]; then
  # Single install straight into the final cache: nothing to merge.
  echo "--- Installing mac26-arm64 browsers ---"
  export PLAYWRIGHT_BROWSERS_PATH="$FINAL_CACHE"
  export PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=mac26-arm64
  npx playwright install chromium chromium-headless-shell firefox webkit
  npx playwright install-deps chromium firefox webkit
  unset PLAYWRIGHT_HOST_PLATFORM_OVERRIDE

  # Fail if any executable in the bundle is not arm64. A browser that silently
  # falls back to an x64 build would still install fine here, then need Rosetta
  # on the VM. Only Mach-O files are checked: lipo rejects anything else, so
  # shell wrappers such as webkit's pw_run.sh are skipped. Universal binaries
  # pass as long as they contain an arm64 slice (webkit ships some dylibs, e.g.
  # libswiftCompatibilitySpan.dylib, as x86_64 + arm64).
  non_arm64=""
  while IFS= read -r -d '' f; do
    archs=$(lipo -archs "$f" 2>/dev/null) || continue
    case " $archs " in
      *" arm64 "*|*" arm64e "*) ;;
      *) non_arm64+="$f ($archs)"$'\n' ;;
    esac
  done < <(find "$FINAL_CACHE" "$PWD/node" -type f -perm +111 -print0)
  if [ -n "$non_arm64" ]; then
    echo "ERROR: non-arm64 executables in the arm64 bundle:" >&2
    echo "$non_arm64" >&2
    exit 1
  fi
  echo "OK: all executables are arm64"
else
  # =============================================================================
  # Multi-arch bundling strategy: Install ARM64 and x64 browsers into separate
  # isolated directories, then merge into the final Cache/.
  #
  # This avoids fragile INSTALLATION_COMPLETE marker manipulation and the
  # backup/restore dance needed when both architectures share a single cache.
  #
  # - Chromium & Headless Shell: arm64 and x64 extract to different subdirectory
  #   names (chrome-mac-arm64/ vs chrome-mac-x64/), so they coexist after merge.
  # - Firefox: Both architectures extract to the same path (firefox/), so only
  #   x64 is kept — it runs on Apple Silicon via Rosetta 2.
  # - WebKit: Only arm64 is installed (mac14-arm64 for macOS 14/15 compat).
  #   Playwright 1.58+ dropped webkit support for mac13.
  # =============================================================================

  # --- Step 1: Install ARM64 browsers into isolated directory ---
  echo "--- Step 1: Installing ARM64 browsers (mac14-arm64) ---"
  export PLAYWRIGHT_BROWSERS_PATH="$PWD/Cache-arm64"
  export PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=mac14-arm64
  npx playwright install chromium chromium-headless-shell webkit
  npx playwright install-deps chromium webkit
  unset PLAYWRIGHT_HOST_PLATFORM_OVERRIDE

  # --- Step 1b: Install macOS 15 ARM64 WebKit ---
  # WebKit ships a distinct binary per macOS major version: macOS 14 pins revision
  # 2251 (folder webkit_mac14-arm64_special-2251/) while macOS 15 uses the default
  # revision (folder webkit-<rev>/). The mac14 build does NOT satisfy macOS 15, which
  # looks for webkit-<rev>/ and otherwise fails with "Executable doesn't exist".
  # Because the two folder names differ, both builds coexist in the cache after the
  # merge. macOS 26+ also resolves to webkit-<rev>/ but needs its own build, which is
  # why it is served by the arm64 bundle instead.
  # (Chromium/Firefox arm64 share one binary across mac14/mac15, so they need no equivalent.)
  echo "--- Step 1b: Installing mac15-arm64 WebKit ---"
  export PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=mac15-arm64
  npx playwright install webkit
  unset PLAYWRIGHT_HOST_PLATFORM_OVERRIDE

  # --- Step 2: Install x64 browsers into isolated directory ---
  echo "--- Step 2: Installing x64 browsers (mac14 host -> mac-x64 builds) ---"
  export PLAYWRIGHT_BROWSERS_PATH="$PWD/Cache-intel"
  # Playwright 1.62 removed mac13 from its host platform table, so `mac13` resolves
  # to no download URL and the install aborts. mac14 resolves to the same mac-x64
  # artifacts mac13 used to receive.
  export PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=mac14
  npx playwright install chromium chromium-headless-shell firefox
  npx playwright install-deps chromium firefox
  unset PLAYWRIGHT_HOST_PLATFORM_OVERRIDE

  # The x64 bundle serves the oldest platforms in the test matrix, currently
  # macOS 13. A browser whose LSMinimumSystemVersion climbs above that still
  # installs and bundles fine here, then fails to launch only on a real machine
  # running the oldest supported macOS — so the loss is invisible until it reaches
  # a customer. Playwright 1.62 is why the floor is 13.0 rather than 12.0: its
  # Chrome for Testing build moved from 149 (min macOS 12.0) to 151 (min macOS
  # 13.0), so macOS 12 Chromium was dropped from the matrix rather than shipped
  # broken.
  #
  # Fail the build instead, so a bump that drops a supported platform has to be
  # an explicit decision.
  OLDEST_SUPPORTED_MACOS=13.0
  for app_plist in $(find "$PWD/Cache-intel" -maxdepth 4 -name Info.plist -path '*.app/Contents/*'); do
    min_os=$(/usr/libexec/PlistBuddy -c "Print :LSMinimumSystemVersion" "$app_plist" 2>/dev/null || echo "")
    [ -z "$min_os" ] && continue
    if [ "$(printf '%s\n%s\n' "$min_os" "$OLDEST_SUPPORTED_MACOS" | sort -V | head -n1)" != "$min_os" ]; then
      echo "ERROR: $app_plist requires macOS $min_os, but this bundle is expected to" >&2
      echo "       run on macOS $OLDEST_SUPPORTED_MACOS and up." >&2
      echo "       Either keep the previous browser version, or drop the platforms it no" >&2
      echo "       longer supports from the test matrix and raise OLDEST_SUPPORTED_MACOS." >&2
      exit 1
    fi
    echo "OK: $(basename "$(dirname "$(dirname "$app_plist")")") supports macOS $min_os+"
  done

  # --- Step 3: Merge both caches into the final Cache/ directory ---
  echo "--- Step 3: Merging ARM64 and x64 browsers into final cache ---"
  rm -rf "$FINAL_CACHE"
  mkdir -p "$FINAL_CACHE"

  # Use x64 (Intel) as the base layer
  cp -a Cache-intel/* "$FINAL_CACHE/"

  # Overlay ARM64 on top — rsync --ignore-existing adds arm64 subdirectories
  # (chrome-mac-arm64/, webkit-*/) without overwriting x64 files or markers.
  rsync -a --ignore-existing Cache-arm64/ "$FINAL_CACHE/"

  # Clean up temporary caches
  rm -rf Cache-arm64 Cache-intel
fi

export PLAYWRIGHT_BROWSERS_PATH="$FINAL_CACHE"

# --- Verify ---
echo "--- Verification: final cache contents ---"
find "$FINAL_CACHE" -maxdepth 2 -type d | sort
npx playwright --version

popd

# Archive Bundle with symlinks preserved (required for macOS .app bundles)
zip --symlinks -r "playwright-macos-${ARCH}.zip" bundle/
