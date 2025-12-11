/**
 * Commande cp - Copie des fichiers et répertoires
 * Usage: cp [OPTION]... SOURCE DEST
 */

function executeCP(parts, fs) {
    if (parts.length < 3) return 'cp: missing destination file operand after source\n';
    const source = parts[1];
    const dest = parts[2];
    let recursive = parts.includes('-r') || parts.includes('-R');
    
    const sourceNode = fs.findNode(source);
    if (!sourceNode) {
        return `cp: cannot stat '${source}': No such file or directory\n`;
    }
    
    if (sourceNode.isDirectory() && !recursive) {
        return `cp: -r not specified; omitting directory '${source}'\n`;
    }
    
    if (sourceNode.isFile()) {
        const content = fs.readFile(source);
        if (!fs.createFile(dest, content)) {
            return `cp: cannot create regular file '${dest}'\n`;
        }
    } else {
        if (!fs.createDirectory(dest)) {
            return `cp: cannot create directory '${dest}'\n`;
        }
    }
    
    return '';
}

module.exports = { executeCP };