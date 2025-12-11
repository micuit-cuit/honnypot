/**
 * Commande tail - Affiche les dernières lignes d'un fichier
 * Usage: tail [OPTION]... [FILE]...
 */

function executeTAIL(parts, fs) {
    if (parts.length < 2) return 'tail: missing operand\n';
    let lines = 10;
    let filePath = '';
    
    for (let i = 1; i < parts.length; i++) {
        if (parts[i] === '-n' && i + 1 < parts.length) {
            lines = parseInt(parts[i + 1]) || 10;
            i++;
        } else if (!parts[i].startsWith('-')) {
            filePath = parts[i];
        }
    }
    
    if (!filePath) return 'tail: missing file operand\n';
    
    const content = fs.readFile(filePath);
    if (!content) {
        return `tail: cannot open '${filePath}' for reading: No such file or directory\n`;
    }
    
    const contentLines = content.split('\n');
    return contentLines.slice(-lines).join('\n') + '\n';
}

module.exports = { executeTAIL };