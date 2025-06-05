#!/bin/bash
set -ex

# Configuração otimizada para o Render
export DEBIAN_FRONTEND=noninteractive

# Instala apenas o essencial
sudo apt-get update -yq
sudo apt-get install -yq --no-install-recommends \
  libgbm1 \
  libxshmfence1 \
  libasound2 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgcc1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libx11-6 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  ca-certificates \
  fonts-liberation \
  wget \
  xdg-utils

# Configurações de permissão
mkdir -p ./sessions ./public
chmod -R 755 ./sessions ./public

echo "✅ Pré-configuração concluída!"
