#!/bin/bash
# Renders the PWA icons in public/ from branding/app-icon.svg (needs rsvg-convert and ImageMagick).
# Opaque square PNGs, no alpha channel: iOS rounds the corners and would paint transparency black.
set -euo pipefail
cd "$(dirname "$0")/.."
src=branding/app-icon.svg
mkdir -p public/icons
render() { # size scale out
  sed "s/SCALE/$2/" "$src" | rsvg-convert -w "$1" -h "$1" -b '#B8252C' -f png - \
    | magick png:- -alpha off -strip "PNG24:$3"
}
render 180 1 public/apple-touch-icon.png
render 167 1 public/icons/apple-touch-icon-167.png
render 152 1 public/icons/apple-touch-icon-152.png
render 192 1 public/icons/icon-192.png
render 512 1 public/icons/icon-512.png
# Maskable: Android may crop to a circle, so keep the artwork inside the central 80%.
render 512 0.8 public/icons/icon-maskable-512.png
