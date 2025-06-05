#!/bin/bash
set -ex

# Configuração do ambiente
export DEBIAN_FRONTEND=noninteractive

# Adiciona repositório do Chromium
sudo apt-get update -y
sudo apt-get install -y wget gnupg
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list

# Instala o Chromium específico para o Puppeteer
sudo apt-get update -y
sudo apt-get install -y google-chrome-stable

# Cria symlink exigido pelo Puppeteer
sudo ln -s /usr/bin/google-chrome-stable /usr/bin/chromium-browser

# Instala dependências adicionais
sudo apt-get install -y \
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
  xdg-utils

# Cria diretórios necessários
mkdir -p ./sessions ./public
chmod -R 755 ./sessions ./public

echo "✅ Pré-configuração concluída com sucesso!"
