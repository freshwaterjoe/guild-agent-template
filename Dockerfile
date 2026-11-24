FROM node:22-bookworm-slim

# Install everything at build time: the container has no internet when it runs.
# Add system tools your workspace needs here (for example, Python libraries or
# a PDF renderer), and keep the image as small as you can: it affects start-up.
WORKDIR /agent

# Python 3 and the libraries most published skills use (Guild decision 058), so a skill that runs a
# Python script works on Guild's shared runner without code of its own: PDFs (pypdf, pdfplumber,
# reportlab), Word, Excel and PowerPoint files (python-docx, openpyxl, python-pptx), data and charts
# (pandas, matplotlib) and images (Pillow).
#
# And the programs Claude Code skills often reach for (Guild decision 065): ffmpeg for video and
# audio; LibreOffice without a screen, to turn Word, Excel and PowerPoint files into PDFs and check
# how they look; pandoc to convert between document formats; git; and metric-compatible fonts, so
# documents lay out as they would on the buyer's machine.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 python3-pip \
    ffmpeg \
    libreoffice-writer-nogui libreoffice-calc-nogui libreoffice-impress-nogui \
    pandoc \
    git \
    fonts-liberation2 fonts-dejavu-core \
  && pip3 install --no-cache-dir --break-system-packages \
    pypdf pdfplumber reportlab python-docx openpyxl python-pptx pandas matplotlib pillow \
  && apt-get purge -y python3-pip && apt-get autoremove -y \
  && rm -rf /var/lib/apt/lists/* /root/.cache

# A web toolkit (Guild decision 058, GLD-267), so skills that design and build for the web can make
# and check their work: React, Motion and TypeScript to write with, esbuild to bundle, and
# Playwright with a headless Chromium to render pages and take screenshots. On the PATH, and linked
# into each task's workspace as node_modules, so imports resolve there.
COPY toolkit/package.json toolkit/package-lock.json /opt/guild-toolkit/
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/guild-toolkit/browsers
RUN cd /opt/guild-toolkit \
  && npm ci --no-audit --no-fund \
  && npx playwright install --with-deps --only-shell chromium \
  && rm -rf /root/.npm /root/.cache /var/lib/apt/lists/* \
  && chmod -R a+rX /opt/guild-toolkit
ENV PATH=/opt/guild-toolkit/node_modules/.bin:$PATH

# The harness that drives the model (Guild decision 067): the Claude Agent SDK for Claude models,
# OpenAI's Codex SDK for OpenAI's. Left empty, both are installed, so your agent runs on whichever
# provider its settings name. Guild builds its shared runners with one each (HARNESS=claude or
# HARNESS=codex) and leaves the other's packages out: each carries a program of a few hundred MB.
ARG HARNESS=""
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
  && if [ "$HARNESS" = "codex" ]; then rm -rf node_modules/@anthropic-ai; fi \
  && if [ "$HARNESS" = "claude" ]; then rm -rf node_modules/@openai; fi \
  && rm -rf /root/.npm
ENV GUILD_HARNESS=$HARNESS
COPY src ./src
COPY specialist ./specialist
COPY guild.manifest.json ./

RUN mkdir -p /work && chown node /work
USER node
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "src/main.ts"]
