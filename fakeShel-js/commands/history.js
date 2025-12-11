/**
 * Commande history - Affiche l'historique des commandes
 * Usage: history
 */

function executeHISTORY(parts, fs) {
    const historyContent = fs.readFile(`/home/${fs.getCurrentUser()}/.bash_history`);
    return historyContent ? historyContent + '\n' : '';
}

module.exports = { executeHISTORY };