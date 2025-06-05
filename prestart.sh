#!/bin/bash
set -ex

# Configuração do ambiente
export DEBIAN_FRONTEND=noninteractive

# Instala o Google Chrome Stable (que é mais confiável que o Chromium)
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
sudo apt-get update
sudo apt-get install -y google-chrome-stable

# Cria symlink para o Chromium (que o Puppeteer espera)
sudo ln -s /usr/bin/google-chrome-stable /usr/bin/chromium-browser

# Instala dependências necessárias
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
