/**
 * Commande uname - Affiche les informations système
 * Usage: uname [OPTION]...
 */

function executeUNAME(parts, fs) {
    let showAll = parts.includes('-a');
    let result = 'Linux';
    
    if (showAll || parts.includes('-n')) result += ' micuit-server';
    if (showAll || parts.includes('-r')) result += ' 5.15.0-generic';
    if (showAll || parts.includes('-v')) result += ' #1 SMP Mon Jan 1 12:00:00 UTC 2024';
    if (showAll || parts.includes('-m')) result += ' x86_64';
    if (showAll || parts.includes('-o')) result += ' GNU/Linux';
    
    return result + '\n';
}

module.exports = { executeUNAME };