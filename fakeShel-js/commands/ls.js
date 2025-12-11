/**
 * Commande ls - Liste le contenu des répertoires
 * Usage: ls [OPTION]... [FILE]...
 */

function executeLS(parts, fs) {
    let path = '.';
    let detailed = false;
    let showAll = false;
    let humanReadable = false;
    
    for (let i = 1; i < parts.length; i++) {
        if (parts[i] === '-l') {
            detailed = true;
        } else if (parts[i] === '-la' || parts[i] === '-al') {
            detailed = true;
            showAll = true;
        } else if (parts[i] === '-a') {
            showAll = true;
        } else if (parts[i] === '-h') {
            humanReadable = true;
        } else if (parts[i] === '-lh' || parts[i] === '-hl') {
            detailed = true;
            humanReadable = true;
        } else if (!parts[i].startsWith('-')) {
            path = parts[i];
        }
    }
    
    if (detailed) {
        return fs.listDirectoryDetailed(path);
    } else {
        const files = fs.listDirectory(path);
        const groupedFiles = [];
        for (let i = 0; i < files.length; i += 5) {
            groupedFiles.push(files.slice(i, i + 5).join(' '));
        }
        return groupedFiles.join('\n') + (groupedFiles.length > 0 ? '\n' : '');
    }
}

module.exports = { executeLS };