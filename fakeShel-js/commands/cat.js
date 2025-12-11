/**
 * Commande cat - Affiche le contenu des fichiers
 * Usage: cat [OPTION]... [FILE]...
 */

function executeCAT(parts, fs) {
    if (parts.length < 2) return 'cat: missing file operand\n';
    const content = fs.readFile(parts[1]);
    return content ? content + '\n' : `cat: ${parts[1]}: No such file or directory\n`;
}

module.exports = { executeCAT };