/**
 * Commande uniq - Rapport ou omission de lignes répétées
 * Usage: uniq [OPTION]... [INPUT [OUTPUT]]
 */

function executeUNIQ(parts, fs) {
    let count = false;
    let repeated = false;
    let unique = false;
    let files = [];
    
    // Parser les options
    for (let i = 1; i < parts.length; i++) {
        if (parts[i] === '-c') {
            count = true;
        } else if (parts[i] === '-d') {
            repeated = true;
        } else if (parts[i] === '-u') {
            unique = true;
        } else if (!parts[i].startsWith('-')) {
            files.push(parts[i]);
        }
    }
    
    if (files.length === 0) {
        return 'uniq: no input files\n';
    }
    
    const content = fs.readFile(files[0]);
    if (content === null) {
        return `uniq: cannot read: ${files[0]}: No such file or directory\n`;
    }
    
    const lines = content.split('\n').filter(line => line.length > 0);
    let result = '';
    let currentLine = '';
    let currentCount = 0;
    
    for (const line of lines) {
        if (line === currentLine) {
            currentCount++;
        } else {
            if (currentLine !== '') {
                if (count) {
                    result += `${currentCount.toString().padStart(7)} ${currentLine}\n`;
                } else if (repeated && currentCount > 1) {
                    result += currentLine + '\n';
                } else if (unique && currentCount === 1) {
                    result += currentLine + '\n';
                } else if (!repeated && !unique) {
                    result += currentLine + '\n';
                }
            }
            currentLine = line;
            currentCount = 1;
        }
    }
    
    // Dernière ligne
    if (currentLine !== '') {
        if (count) {
            result += `${currentCount.toString().padStart(7)} ${currentLine}\n`;
        } else if (repeated && currentCount > 1) {
            result += currentLine + '\n';
        } else if (unique && currentCount === 1) {
            result += currentLine + '\n';
        } else if (!repeated && !unique) {
            result += currentLine + '\n';
        }
    }
    
    return result;
}

module.exports = { executeUNIQ };