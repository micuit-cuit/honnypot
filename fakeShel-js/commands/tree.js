/**
 * Commande tree - Affiche l'arborescence des répertoires
 * Usage: tree [directory]
 */
const counts = { dirs: 0, files: 0 };

function walk(directory, prefix) {
    let result = '';
    const entries = Array.from(directory.children.values());
    entries.forEach((entry, index, files) => {
        const parts = index == files.length - 1 ? ["└── ", "    "] : ["├── ", "│   "];
        result += prefix + parts[0] + entry.name + '\n';
        if (entry.isDirectory()) {
            counts.dirs += 1;
            result += walk( entry, prefix + parts[1]);
        }else {
            counts.files += 1;
        }
    });
    return result;
}

function executeTREE(parts, fs) {
    counts.dirs = 0;
    counts.files = 0;
    
    const path = parts.length > 1 ? parts[1] : '.';
    let result = walk(fs.findNode(path), '');

    result += `\n${counts.dirs} directories, ${counts.files} files\n`;
    return result;
}

module.exports = { executeTREE };

