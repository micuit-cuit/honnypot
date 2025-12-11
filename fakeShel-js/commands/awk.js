/**
 * Commande awk - Traitement de texte et extraction de données
 * Usage: awk 'pattern { action }' file...
 */

function executeAWK(parts, fs) {
    if (parts.length < 2) return 'awk: no program text at all\n';
    
    const program = parts[1];
    const files = parts.slice(2);
    
    let result = '';
    
    if (files.length === 0) {
        return 'awk: no input files\n';
    }
    
    for (const file of files) {
        const content = fs.readFile(file);
        if (content === null) {
            result += `awk: can't open file ${file}\n`;
            continue;
        }
        
        const lines = content.split('\n');
        
        // Patterns basiques
        if (program === '{print}' || program === '{print $0}') {
            result += content;
        } else if (program === '{print NF}') {
            lines.forEach(line => {
                const fields = line.trim().split(/\s+/);
                result += fields.length + '\n';
            });
        } else if (program === '{print $1}') {
            lines.forEach(line => {
                const fields = line.trim().split(/\s+/);
                result += (fields[0] || '') + '\n';
            });
        } else if (program === '{print $2}') {
            lines.forEach(line => {
                const fields = line.trim().split(/\s+/);
                result += (fields[1] || '') + '\n';
            });
        } else {
            result += content; // Fallback
        }
    }
    
    return result;
}

module.exports = { executeAWK };