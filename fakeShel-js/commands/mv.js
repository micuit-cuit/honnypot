/**
 * Commande mv - Déplace/renomme des fichiers et répertoires
 * Usage: mv [OPTION]... SOURCE DEST
 */

function executeMV(parts, fs) {
    if (parts.length < 3) return 'mv: missing destination file operand after source\n';
    const source = parts[1];
    const dest = parts[2];
    
    const sourceNode = fs.findNode(source);
    if (!sourceNode) {
        return `mv: cannot stat '${source}': No such file or directory\n`;
    }
    
    // Copier puis supprimer l'original
    if (sourceNode.isFile()) {
        const content = fs.readFile(source);
        if (!fs.createFile(dest, content)) {
            return `mv: cannot create regular file '${dest}'\n`;
        }
    } else {
        if (!fs.createDirectory(dest)) {
            return `mv: cannot create directory '${dest}'\n`;
        }
    }
    
    if (!fs.deleteFile(source)) {
        return `mv: cannot remove '${source}'\n`;
    }
    
    return '';
}

module.exports = { executeMV };