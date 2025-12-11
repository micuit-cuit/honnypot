# Image de base Bun Alpine pour une taille réduite et performance optimale
FROM oven/bun:1-alpine

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S honeypot && \
    adduser -S honeypot -u 1001 -G honeypot

# Créer le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
COPY bun.lockb ./

# Installer les dépendances avec Bun
RUN bun install --frozen-lockfile --production

# Copier le code source
COPY index.js ./
COPY fakeShel-js/ ./fakeShel-js/
COPY filesystem_config.txt ./
COPY header.txt ./

# Créer le répertoire logs avec les bonnes permissions
RUN mkdir -p /app/logs && \
    chown honeypot:honeypot /app/logs && \
    chmod 755 /app/logs

# Définir les permissions strictes sur les autres fichiers/dossiers
RUN chown -R root:root /app && \
    chmod -R 444 /app/index.js && \
    chmod -R 444 /app/fakeShel-js/ && \
    chmod -R 444 /app/filesystem_config.txt && \
    chmod -R 444 /app/header.txt && \
    chmod -R 444 /app/package*.json && \
    chmod -R 444 /app/bun.lockb && \
    chmod -R 555 /app/node_modules

# Créer un répertoire temporaire en lecture seule
RUN mkdir -p /app/temp && \
    chown root:root /app/temp && \
    chmod 555 /app/temp

# Passer à l'utilisateur non-root
USER honeypot

# Exposer le port SSH
EXPOSE 22

# Variables d'environnement
ENV NODE_ENV=production
ENV LOG_DIR=/app/logs

# Commande de démarrage
CMD ["bun", "run", "index.js"]