/**
 * Commande whoami - Affiche le nom de l'utilisateur actuel
 * Usage: whoami
 */

function executeWHOAMI(parts, fs) {
    return fs.getCurrentUser() + '\n';
}

module.exports = { executeWHOAMI };