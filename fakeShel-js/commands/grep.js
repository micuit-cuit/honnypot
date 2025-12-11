/**
 * Commande grep - Recherche de motifs dans les fichiers
 * Usage: grep [OPTION]... PATTERN [FILE]...
 */

function executeGREP(parts, fs) {
    if (parts.length < 3) return 'grep: missing pattern or file\n';
    let pattern = '';
    let filePath = '';
    let caseInsensitive = false;
    
    for (let i = 1; i < parts.length; i++) {
        if (parts[i] === '-i') {
            caseInsensitive = true;
        } else if (!pattern) {
            pattern = parts[i];
        } else if (!filePath) {
            filePath = parts[i];
            break;
        }
    }
    
    if (!pattern || !filePath) {
        return 'grep: missing pattern or file\n';
    }
    
    const content = fs.readFile(filePath);
    if (!content) {
        return `grep: ${filePath}: No such file or directory\n`;
    }
    
    const lines = content.split('\n');
    let matches = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const searchLine = caseInsensitive ? line.toLowerCase() : line;
        const searchPattern = caseInsensitive ? pattern.toLowerCase() : pattern;
        
        if (searchLine.includes(searchPattern)) {
            matches.push(line);
        }
    }
    
    return matches.join('\n') + (matches.length > 0 ? '\n' : '');
}

module.exports = { executeGREP };