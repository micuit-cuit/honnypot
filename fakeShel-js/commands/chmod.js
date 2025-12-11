/**
 * Commande chmod - Change les permissions des fichiers
 * Usage: chmod [OPTION]... MODE FILE...
 */

function executeCHMOD(parts, fs) {
    if (parts.length < 3) return 'chmod: missing operand\n';
    
    const mode = parts[1];
    const files = parts.slice(2);
    
    let result = '';
    
    for (const file of files) {
        const node = fs.findNode(file);
        if (!node) {
            result += `chmod: cannot access '${file}': No such file or directory\n`;
            continue;
        }
        
        // Gestion simple de +x (ajout d'exécution)
        if (mode === '+x') {
            node.permissions.owner_execute = true;
            node.permissions.group_execute = true;
            node.permissions.other_execute = true;
        } else if (mode === '-x') {
            node.permissions.owner_execute = false;
            node.permissions.group_execute = false;
            node.permissions.other_execute = false;
        } else if (mode.match(/^[0-7]{3}$/)) {
            // Mode octal simple
            const octal = parseInt(mode);
            const owner = Math.floor(octal / 100);
            const group = Math.floor((octal % 100) / 10);
            const other = octal % 10;
            
            node.permissions.owner_read = (owner & 4) !== 0;
            node.permissions.owner_write = (owner & 2) !== 0;
            node.permissions.owner_execute = (owner & 1) !== 0;
            
            node.permissions.group_read = (group & 4) !== 0;
            node.permissions.group_write = (group & 2) !== 0;
            node.permissions.group_execute = (group & 1) !== 0;
            
            node.permissions.other_read = (other & 4) !== 0;
            node.permissions.other_write = (other & 2) !== 0;
            node.permissions.other_execute = (other & 1) !== 0;
        }
    }
    
    return result;
}

module.exports = { executeCHMOD };