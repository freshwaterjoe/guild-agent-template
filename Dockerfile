FROM node:22-bookworm-slim

# Install everything at build time: the container has no internet when it runs.
# Add system tools your workspace needs here (for example, Python libraries or
# a PDF renderer), and keep the image as small as you can: it affects start-up.
WORKDIR /agent
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && rm -rf /root/.npm
COPY src ./src
COPY specialist ./specialist

RUN mkdir -p /work && chown node /work
USER node
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "src/main.ts"]
