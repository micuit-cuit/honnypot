/**
 * Commande sed - Éditeur de flux pour filtrer et transformer du texte
 * Usage: sed [OPTION]... {script-only-if-no-other-script} [input-file]...
 */

function executeSED(parts, fs) {
    if (parts.length < 2) return 'sed: no input files\n';
    
    const script = parts[1];
    const files = parts.slice(2);
    
    let result = '';
    
    if (files.length === 0) {
        return 'sed: no input files\n';
    }
    
    for (const file of files) {
        const content = fs.readFile(file);
        if (content === null) {
            result += `sed: can't read ${file}: No such file or directory\n`;
            continue;
        }
        
        let lines = content.split('\n');
        
        // Patterns basiques de sed
        if (script.startsWith('s/')) {
            // Substitution s/pattern/replacement/flags
            const parts = script.split('/');
            if (parts.length >= 3) {
                const pattern = parts[1];
                const replacement = parts[2];
                const flags = parts[3] || '';
                
                const regex = new RegExp(pattern, flags.includes('g') ? 'g' : '');
                lines = lines.map(line => line.replace(regex, replacement));
            }
        } else if (script.includes('d')) {
            // Suppression de lignes
            if (script === 'd') {
                lines = []; // Supprimer toutes les lignes
            } else if (script.match(/^\d+d$/)) {
                const lineNum = parseInt(script) - 1;
                lines.splice(lineNum, 1);
            }
        } else if (script.includes('p')) {
            if (script === 'p') {
                lines = lines.concat(lines); // Dupliquer toutes les lignes
            }
        }
        
        result += lines.join('\n');
        if (result && !result.endsWith('\n')) result += '\n';
    }
    
    return result;
}

module.exports = { executeSED };