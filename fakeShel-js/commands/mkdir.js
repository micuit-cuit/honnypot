/**
 * Commande mkdir - Crée des répertoires
 * Usage: mkdir [OPTION]... DIRECTORY...
 */

function executeMKDIR(parts, fs) {
    if (parts.length < 2) return 'mkdir: missing operand\n';
    let recursive = false;
    let paths = [];
    
    for (let i = 1; i < parts.length; i++) {
        if (parts[i] === '-p') {
            recursive = true;
        } else {
            paths.push(parts[i]);
        }
    }
    
    if (paths.length === 0) return 'mkdir: missing operand\n';
    
    let result = '';
    for (const path of paths) {
        if (!fs.createDirectory(path)) {
            result += `mkdir: cannot create directory '${path}'\n`;
        }
    }
    return result;
}

module.exports = { executeMKDIR };