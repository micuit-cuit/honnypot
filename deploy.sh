#!/bin/bash

# Script de construction et démarrage du honeypot Docker avec Bun

set -e  # Arrêter en cas d'erreur

echo "🐝 Construction de l'image Docker SSH Honeypot (Bun)..."

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé ou accessible"
    exit 1
fi

# Vérifier que docker-compose est installé
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose n'est pas installé ou accessible"
    exit 1
fi

# Construire l'image Docker
docker build -t ssh-honeypot:bun .

if [ $? -eq 0 ]; then
    echo "✅ Image construite avec succès !"
    
    echo "🚀 Démarrage du conteneur..."
    
    # Créer le dossier logs s'il n'existe pas
    mkdir -p logs
    
    # Démarrer avec docker-compose
    docker-compose up -d
    
    if [ $? -eq 0 ]; then
        echo "✅ Honeypot démarré avec succès !"
        echo ""
        echo "📋 Informations de connexion :"
        echo "   Host: localhost"
        echo "   Port: 22"
        echo "   User: test"
        echo "   Password: miaou"
        echo ""
        echo "🔍 Commandes utiles :"
        echo "   docker-compose logs -f honeypot  # Voir les logs en temps réel"
        echo "   docker-compose stop             # Arrêter le honeypot"
        echo "   docker-compose restart          # Redémarrer le honeypot"
        echo "   ssh test@localhost -p 22        # Tester la connexion"
        echo ""
        echo "📁 Logs disponibles dans : ./logs/"
    else
        echo "❌ Erreur lors du démarrage du conteneur"
        exit 1
    fi
else
    echo "❌ Erreur lors de la construction de l'image"
    exit 1
fi