/**
 * Commande find - Recherche des fichiers et répertoires
 * Usage: find [path] [expression]
 */

function matchesPattern(filename, pattern) {
    if (pattern === '*') return true;
    
    let regexPattern = pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filename);
}

function findFiles(fs, path, pattern, type = null) {
    const node = fs.findNode(path);
    if (!node) {
        return `find: '${path}': No such file or directory\n`;
    }

    let results = [];
    
    const searchNode = (currentNode, currentPath) => {
        if (matchesPattern(currentNode.name, pattern)) {
            if (!type || 
                (type === 'f' && currentNode.isFile()) ||
                (type === 'd' && currentNode.isDirectory())) {
                results.push(currentPath);
            }
        }

        if (currentNode.isDirectory()) {
            for (const [name, child] of currentNode.children) {
                const childPath = currentPath === '.' ? name : currentPath + '/' + name;
                searchNode(child, childPath);
            }
        }
    };

    searchNode(node, path);
    return results.join('\n') + (results.length > 0 ? '\n' : '');
}

function executeFIND(parts, fs) {
    if (parts.length < 2) {
        return findFiles(fs, '.', '*');
    }
    
    let searchPath = '.';
    let pattern = '*';
    let type = null;
    
    for (let i = 1; i < parts.length; i++) {
        if (parts[i] === '-name' && i + 1 < parts.length) {
            pattern = parts[i + 1];
            i++;
        } else if (parts[i] === '-type' && i + 1 < parts.length) {
            type = parts[i + 1];
            i++;
        } else if (!parts[i].startsWith('-')) {
            searchPath = parts[i];
        }
    }
    
    return findFiles(fs, searchPath, pattern, type);
}

module.exports = { executeFIND };