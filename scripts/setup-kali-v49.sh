#!/usr/bin/env bash
set -euo pipefail

VERSION="2026.2"
BASE_URL="https://kali.download/cloud-images/kali-${VERSION}"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${ROOT_DIR}/.linuxforge-runtime/images"
mkdir -p "$OUT_DIR"

case "$(uname -m)" in
  arm64|aarch64)
    ARCH="arm64"
    FILE="kali-linux-${VERSION}-cloud-genericcloud-arm64.tar.xz"
    ;;
  x86_64|amd64)
    ARCH="amd64"
    FILE="kali-linux-${VERSION}-cloud-genericcloud-amd64.tar.xz"
    ;;
  *) echo "Unsupported host architecture: $(uname -m)" >&2; exit 1 ;;
esac

ARCHIVE="${OUT_DIR}/${FILE}"
URL="${BASE_URL}/${FILE}"
SUMS="${OUT_DIR}/SHA256SUMS"

echo "Downloading official Kali ${VERSION} ${ARCH} cloud image..."
curl -fL --retry 3 -o "$ARCHIVE" "$URL"
curl -fL --retry 3 -o "$SUMS" "${BASE_URL}/SHA256SUMS"

EXPECTED="$(awk -v file="$FILE" '$2 == file || $2 == "*" file {print $1; exit}' "$SUMS")"
if [[ -z "$EXPECTED" ]]; then
  echo "No SHA-256 entry found for $FILE in official Kali SHA256SUMS" >&2
  exit 1
fi
printf '%s  %s\n' "$EXPECTED" "$FILE" > "$SUMS.expected"
(
  cd "$OUT_DIR"
  shasum -a 256 -c "$SUMS.expected"
)

mkdir -p "${OUT_DIR}/${ARCH}"
tar -xJf "$ARCHIVE" -C "${OUT_DIR}/${ARCH}"
RAW="$(find "${OUT_DIR}/${ARCH}" -type f -name 'disk.raw' -print -quit)"
QCOW="$(find "${OUT_DIR}/${ARCH}" -type f -name '*.qcow2' -print -quit)"
if [[ -z "$QCOW" && -z "$RAW" ]]; then
  echo "No supported disk image found in official archive" >&2
  exit 1
fi

if [[ -z "$QCOW" ]]; then
  if ! command -v qemu-img >/dev/null 2>&1; then
    echo "qemu-img is required to convert Kali's disk.raw cloud archive to qcow2" >&2
    exit 1
  fi
  QCOW="${OUT_DIR}/${ARCH}/kali-linux-${VERSION}-cloud-genericcloud-${ARCH}.qcow2"
  qemu-img convert -p -f raw -O qcow2 "$RAW" "$QCOW"
  rm -f "$RAW"
fi

if command -v qemu-img >/dev/null 2>&1; then
  qemu-img info "$QCOW" >/dev/null
fi

SHA_FILE="${QCOW}.sha256"
shasum -a 256 "$QCOW" | awk '{print $1 "  " $2}' > "$SHA_FILE"

echo "Kali base image ready: $QCOW"
echo "Set FORGE_RUNTIME_IMAGE_PATH to this path."
