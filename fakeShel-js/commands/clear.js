/**
 * Commande clear - Efface l'écran du terminal
 * Usage: clear
 */

function executeCLEAR(parts, fs) {
    return '\x1b[2J\x1b[0f';
}

module.exports = { executeCLEAR };