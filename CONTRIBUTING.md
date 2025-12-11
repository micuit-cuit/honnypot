# Contribution Guidelines

Merci de votre intérêt pour contribuer au SSH Honeypot ! 🎉

## 🚀 Comment Contribuer

### Prérequis
- Node.js/Bun runtime
- Docker et Docker Compose
- Git
- Connaissance de base en cybersécurité

### Types de Contributions Bienvenues
- 🐛 **Bug fixes** : Correction d'erreurs ou de dysfonctionnements
- ✨ **Nouvelles fonctionnalités** : Ajout de commandes, amélioration du terminal
- 📚 **Documentation** : Amélioration du README, ajout d'exemples
- 🔒 **Sécurité** : Renforcement des mesures de sécurité
- 📊 **Monitoring** : Amélioration des logs et de l'analyse

## 🔧 Processus de Développement

### 1. Fork et Clone
```bash
git fork <repository-url>
git clone <your-fork-url>
cd honnypot
```

### 2. Créer une Branche
```bash
git checkout -b feature/nom-de-votre-feature
# ou
git checkout -b bugfix/description-du-bug
```

### 3. Développement Local
```bash
# Installer les dépendances
bun install

# Lancer en mode développement
bun run index.js

# Tester les modifications
ssh test@localhost -p 2222
```

### 4. Tests
```bash
# Construire l'image Docker
docker build -t ssh-honeypot:test .

# Tester avec docker-compose
docker-compose -f docker-compose.test.yml up
```

### 5. Commit et Push
```bash
git add .
git commit -m "type: description courte de la modification"
git push origin feature/nom-de-votre-feature
```

## 📝 Standards de Code

### Convention de Nommage
- **Variables** : camelCase (`commandBuffer`, `currentPath`)
- **Fonctions** : camelCase (`createCommandPrompt`, `handleInput`)
- **Constants** : UPPER_SNAKE_CASE (`DEFAULT_PORT`, `LOG_FORMAT`)
- **Files** : kebab-case (`fake-shell.js`, `docker-compose.yml`)

### Style de Code
```javascript
// ✅ Bon
function handleCommand(input, session) {
    const commands = input.trim().split(' ');
    const command = commands[0];
    
    if (command === 'ls') {
        return listDirectory(session.currentPath);
    }
    
    return 'Command not found';
}

// ❌ Éviter
function handle_command(input,session){
const commands=input.trim().split(' ');
if(commands[0]=='ls'){
return listDirectory(session.currentPath);}
return 'Command not found';}
```

### Messages de Commit
Format : `type: description`

**Types** :
- `feat`: Nouvelle fonctionnalité
- `fix`: Correction de bug
- `docs`: Documentation
- `style`: Formatage (pas de changement de code)
- `refactor`: Refactorisation
- `test`: Ajout/modification de tests
- `security`: Amélioration de sécurité

**Exemples** :
```
feat: ajout commande 'ps' avec simulation processus
fix: correction autocomplétion fichiers avec espaces
docs: mise à jour README avec exemples d'utilisation
security: renforcement permissions Docker container
```

## 🎯 Domaines de Contribution

### 1. Nouvelles Commandes Unix
Ajouter des commandes dans `fakeShel-js/main.js` :
```javascript
case 'nouvelle-commande':
    return handleNouvelleCommande(args, currentPath);
```

### 2. Amélioration Terminal
- Support de nouvelles touches spéciales
- Amélioration de l'autocomplétion
- Gestion des couleurs ANSI
- Support de l'édition en ligne

### 3. Système de Fichiers
- Nouveaux types de fichiers simulés
- Permissions Unix plus réalistes
- Contenu de fichiers dynamique
- Simulation d'applications

### 4. Logging et Analytics
- Nouveaux formats de log
- Métriques de performance
- Détection de patterns d'attaque
- Export vers systèmes externes

### 5. Sécurité Container
- Hardening Docker
- Optimisation des permissions
- Monitoring des ressources
- Intégration avec systèmes de sécurité

## 🔍 Guidelines de Sécurité

### Tests de Sécurité
Avant de soumettre :
```bash
# Scanner l'image Docker
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image ssh-honeypot:bun

# Vérifier les permissions
docker run --rm ssh-honeypot:bun ls -la /app
```

### Considérations
- ❌ **Jamais** d'accès root dans le container
- ❌ **Jamais** de secrets hardcodés
- ✅ **Toujours** valider les inputs
- ✅ **Toujours** limiter les permissions
- ✅ **Toujours** logger les événements de sécurité

## 📋 Checklist Pull Request

- [ ] Code testé localement
- [ ] Tests Docker passent
- [ ] Documentation mise à jour
- [ ] Messages de commit descriptifs
- [ ] Pas de secrets exposés
- [ ] Pas de régression de sécurité
- [ ] Logs appropriés ajoutés

## 🤝 Code de Conduite

- **Respectueux** : Traiter tous les contributeurs avec respect
- **Constructif** : Fournir des critiques constructives
- **Inclusif** : Accueillir toutes les perspectives
- **Éthique** : Utiliser le projet de manière responsable

## 📞 Contact

- **Issues** : Utilisez GitHub Issues pour bugs et features
- **Discussions** : GitHub Discussions pour questions générales
- **Sécurité** : Signaler les vulnérabilités en privé

---

Merci de contribuer à un internet plus sûr ! 🛡️