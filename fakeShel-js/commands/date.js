/**
 * Commande date - Affiche ou définit la date système
 * Usage: date [OPTION]... [+FORMAT]
 */

function executeDATE(parts, fs) {
    return new Date().toString() + '\n';
}

module.exports = { executeDATE };