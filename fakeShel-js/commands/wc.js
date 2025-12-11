/**
 * Commande wc - Compte les lignes, mots et caractères
 * Usage: wc [OPTION]... [FILE]...
 */

function executeWC(parts, fs) {
    if (parts.length < 2) return 'wc: missing operand\n';
    const path = parts[1];
    const content = fs.readFile(path);
    
    if (!content) {
        return `wc: ${path}: No such file or directory\n`;
    }
    
    const lines = content.split('\n').length - (content.endsWith('\n') ? 1 : 0);
    const words = content.trim().split(/\s+/).length;
    const chars = content.length;
    
    let countLines = true;
    let countWords = true;
    let countChars = true;
    
    if (parts.includes('-l')) {
        countLines = true;
        countWords = false;
        countChars = false;
    } else if (parts.includes('-w')) {
        countLines = false;
        countWords = true;
        countChars = false;
    } else if (parts.includes('-c')) {
        countLines = false;
        countWords = false;
        countChars = true;
    }
    
    let result = '';
    if (countLines) result += lines.toString().padStart(8);
    if (countWords) result += words.toString().padStart(8);
    if (countChars) result += chars.toString().padStart(8);
    result += ` ${path}\n`;
    
    return result;
}

module.exports = { executeWC };