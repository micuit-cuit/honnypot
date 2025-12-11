/**
 * Commande touch - Crée des fichiers vides ou met à jour les timestamps
 * Usage: touch [OPTION]... FILE...
 */

function executeTOUCH(parts, fs) {
    if (parts.length < 2) return 'touch: missing file operand\n';
    return fs.createFile(parts[1], '') ? '' : `touch: cannot create file '${parts[1]}'\n`;
}

module.exports = { executeTOUCH };