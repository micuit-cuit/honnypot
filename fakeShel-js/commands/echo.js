/**
 * Commande echo - Affiche du texte
 * Usage: echo [STRING]...
 */

function executeECHO(parts, fs) {
    return parts.slice(1).join(' ') + '\n';
}

module.exports = { executeECHO };