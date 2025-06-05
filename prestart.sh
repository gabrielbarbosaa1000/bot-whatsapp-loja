#!/bin/bash
set -ex

# Instala dependências do sistema
sudo apt-get update
sudo apt-get install -y \
  wget \
  libgbm-dev \
  libxshmfence-dev \
  libglu1-mesa-dev \
  libx11-dev \
  libx11-xcb-dev \
  libxcomposite-dev \
  libxcursor-dev \
  libxdamage-dev \
  libxext-dev \
  libxfixes-dev \
  libxi-dev \
  libxrandr-dev \
  libxrender-dev \
  libxss-dev \
  libxtst-dev \
  libnss3-dev \
  libatk1.0-dev \
  libatk-bridge2.0-dev \
  libgtk-3-dev \
  libgdk-pixbuf2.0-dev \
  libdrm-dev \
  libxkbcommon-dev

# Cria diretórios necessários
mkdir -p ./sessions ./public

echo "✅ Pré-inicialização concluída!"
