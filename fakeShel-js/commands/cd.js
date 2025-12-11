/**
 * Commande cd - Change le répertoire de travail
 * Usage: cd [DIR]
 */

function resolveHome(path, user) {
    let homePath = `/home/${user}`;
    if (user === 'root') {
        homePath = '/root';
    }
    if (path.startsWith('~/')) {
        return homePath + path.substring(1);
    } else if (path === '~') {
        return homePath;
    }
    return path;
}

function executeCD(parts, fs) {
    const path = parts.length > 1 ? parts[1] : `/home/${fs.getCurrentUser()}`;
    const resolved = path.startsWith('~') ? resolveHome(path, fs.getCurrentUser()) : path;
    return fs.changeDirectory(resolved) ? '' : `cd: ${path}: No such file or directory\n`;
}

module.exports = { executeCD };