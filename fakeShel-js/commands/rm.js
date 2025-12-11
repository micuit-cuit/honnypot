/**
 * Commande rm - Supprime des fichiers et répertoires
 * Usage: rm [OPTION]... [FILE]...
 */

function executeRM(parts, fs) {
    if (parts.length < 2) return 'rm: missing operand\n';
    
    let recursive = false;
    let force = false;
    let interactive = false;
    let verbose = false;
    let noPreserveRoot = false;
    let files = [];
    
    for (let i = 1; i < parts.length; i++) {
        if (parts[i] === '-r' || parts[i] === '-R') {
            recursive = true;
        } else if (parts[i] === '-f') {
            force = true;
        } else if (parts[i] === '-i') {
            interactive = true;
        } else if (parts[i] === '-v') {
            verbose = true;
        } else if (parts[i] === '-rf' || parts[i] === '-fr') {
            recursive = true;
            force = true;
        } else if (parts[i] === '-rv' || parts[i] === '-vr') {
            recursive = true;
            verbose = true;
        } else if (parts[i] === '--no-preserve-root') {
            noPreserveRoot = true;
        }else if (!parts[i].startsWith('-')) {
            files.push(parts[i]);
        }
    }

    if (files.length === 0) return 'rm: missing operand\n';
    if (files.includes('/') && !noPreserveRoot && recursive) {
        return "rm: it is dangerous to operate recursively on '/'\nrm: use --no-preserve-root to override this failsafe\n";
    }    
    let result = '';
    for (const file of files) {
        // Cas spécial pour la racine /
        if (file === '/' && recursive && noPreserveRoot) {
            // Supprimer tout le contenu de la racine
            const rootNode = fs.findNode('/');
            if (rootNode && rootNode.children) {
                const childrenNames = Array.from(rootNode.children.keys());
                for (const childName of childrenNames) {
                    if (verbose) {
                        result += `removed '/${childName}'\n`;
                    }
                    fs.deleteFile(`/${childName}`);
                }
            }
            continue;
        }
        
        const node = fs.findNode(file);
        if (!node) {
            if (!force) {
                result += `rm: cannot remove '${file}': No such file or directory\n`;
            }
            continue;
        }
        
        if (node.isDirectory() && !recursive) {
            result += `rm: cannot remove '${file}': Is a directory\n`;
            continue;
        }
        
        if (verbose) {
            result += `removed '${file}'\n`;
        }
        
        if (!fs.deleteFile(file)) {
            result += `rm: cannot remove '${file}'\n`;
        }
    }
    return result;
}

module.exports = { executeRM };