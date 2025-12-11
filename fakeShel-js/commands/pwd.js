/**
 * Commande pwd - Affiche le répertoire de travail courant
 * Usage: pwd [OPTION]...
 */

function executePWD(parts, fs) {
    return fs.getCurrentPath() + '\n';
}

module.exports = { executePWD };