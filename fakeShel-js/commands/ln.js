/**
 * Commande ln - Crée des liens entre fichiers
 * Usage: ln [OPTION]... TARGET LINK_NAME
 */

function executeLN(parts, fs) {
    if (parts.length < 3) return 'ln: missing destination file operand after source\n';
    
    let symbolic = false;
    let target = '';
    let linkName = '';
    
    // Parse arguments properly
    for (let i = 1; i < parts.length; i++) {
        if (parts[i] === '-s') {
            symbolic = true;
        } else if (!target) {
            target = parts[i];
        } else if (!linkName) {
            linkName = parts[i];
            break;
        }
    }
    
    if (!target || !linkName) {
        return 'ln: missing destination file operand after source\n';
    }
    
    const targetNode = fs.findNode(target);
    if (!targetNode && !symbolic) {
        return `ln: failed to access '${target}': No such file or directory\n`;
    }
    
    // Simulation - créer un fichier qui pointe vers la cible
    const linkContent = symbolic ? `-> ${target}` : (targetNode ? targetNode.content : '');
    if (!fs.createFile(linkName, linkContent)) {
        return `ln: failed to create link '${linkName}'\n`;
    }
    
    return '';
}

module.exports = { executeLN };