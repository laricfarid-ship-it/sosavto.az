#!/usr/bin/env bash
set -uo pipefail
cd mobile/android
./gradlew :app:connectedDebugAndroidTest --no-daemon
result=$?
mkdir -p ../device-audit
for image in 01-launch 02-theme 03-settings 04-deletion-request 05-listings; do
  adb pull "/data/local/tmp/sosavto-$image.png" "../device-audit/$image.png" || true
done
exit "$result"
