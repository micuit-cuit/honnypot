/**
 * Commande sort - Trie les lignes de fichiers texte
 * Usage: sort [OPTION]... [FILE]...
 */

function executeSORT(parts, fs) {
    let reverse = false;
    let numeric = false;
    let unique = false;
    let files = [];
    
    // Parser les options
    for (let i = 1; i < parts.length; i++) {
        if (parts[i] === '-r') {
            reverse = true;
        } else if (parts[i] === '-n') {
            numeric = true;
        } else if (parts[i] === '-u') {
            unique = true;
        } else if (!parts[i].startsWith('-')) {
            files.push(parts[i]);
        }
    }
    
    let allLines = [];
    
    if (files.length === 0) {
        return 'sort: no input files\n';
    }
    
    // Lire tous les fichiers
    for (const file of files) {
        const content = fs.readFile(file);
        if (content === null) {
            return `sort: cannot read: ${file}: No such file or directory\n`;
        }
        const lines = content.split('\n').filter(line => line.length > 0);
        allLines = allLines.concat(lines);
    }
    
    // Trier
    if (numeric) {
        allLines.sort((a, b) => {
            const numA = parseFloat(a) || 0;
            const numB = parseFloat(b) || 0;
            return numA - numB;
        });
    } else {
        allLines.sort();
    }
    
    if (reverse) {
        allLines.reverse();
    }
    
    if (unique) {
        allLines = [...new Set(allLines)];
    }
    
    return allLines.join('\n') + (allLines.length > 0 ? '\n' : '');
}

module.exports = { executeSORT };