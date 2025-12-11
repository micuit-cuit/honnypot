/**
 * Commande chown - Change le propriétaire des fichiers
 * Usage: chown [OPTION]... OWNER[:GROUP] FILE...
 */

function executeCHOWN(parts, fs) {
    if (parts.length < 3) return 'chown: missing operand\n';
    
    const ownership = parts[1];
    const files = parts.slice(2);
    
    let result = '';
    
    // Parse owner:group
    const [owner, group] = ownership.split(':');
    
    for (const file of files) {
        const node = fs.findNode(file);
        if (!node) {
            result += `chown: cannot access '${file}': No such file or directory\n`;
            continue;
        }
        
        if (fs.current_user !== 'root') {
            result += `chown: changing ownership of '${file}': Operation not permitted\n`;
            continue;
        }
        
        if (owner) {
            node.owner = owner;
        }
        if (group) {
            node.group = group;
        }
    }
    
    return result;
}

module.exports = { executeCHOWN };