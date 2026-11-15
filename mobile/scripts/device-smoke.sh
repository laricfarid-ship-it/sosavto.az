#!/usr/bin/env bash
set -uo pipefail
cd mobile/android
./gradlew :app:connectedDebugAndroidTest --no-daemon
result=$?
adb pull /sdcard/Android/data/az.sosavto.app.preview/files/audit ../device-audit || true
exit "$result"
