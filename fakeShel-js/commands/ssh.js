/**
 * Commande ssh - Client SSH pour connexions à distance
 * Usage: ssh [user@]hostname [command]
 */

const HoneypotLogger = require('../logger');

function executeSSH(parts, fs, clientIP = '127.0.0.1', currentUsername = 'root') {
    if (parts.length < 2) {
        return 'usage: ssh [-46AaCfGgKkMNnqsTtVvXxYy] [-B bind_interface]\n           [-b bind_address] [-c cipher_spec] [-D [bind_address:]port]\n           [-E log_file] [-e escape_char] [-F configfile] [-I pkcs11]\n           [-i identity_file] [-J [user@]host[:port]] [-L address]\n           [-l login_name] [-m mac_spec] [-O ctl_cmd] [-o option] [-p port]\n           [-Q query_option] [-R address] [-S ctl_path] [-W host:port]\n           [-w local_tun[:remote_tun]] destination [command]\n';
    }
    
    // Initialiser le logger
    const logger = new HoneypotLogger();
    
    const target = parts[1];
    const command = parts.slice(2).join(' ');
    
    // Extraire user et hostname
    let username = 'root';
    let hostname = target;
    if (target.includes('@')) {
        [username, hostname] = target.split('@');
    }
    
    let result = '';
    
    // Simulation de connexion SSH
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        result += `ssh: connect to host ${hostname} port 22: Connection refused\n`;
        return result;
    }
    
    // Simulation d'authentification
    result += `The authenticity of host '${hostname} (192.168.1.100)' can't be established.\n`;
    result += `ECDSA key fingerprint is SHA256:${generateRandomHash()}.\n`;
    result += `Are you sure you want to continue connecting (yes/no/[fingerprint])? \n`;
    
    // Si c'est une commande, simuler l'exécution distante
    // Logger la tentative de connexion SSH
    logger.logNetworkRequest(clientIP, currentUsername, parts.join(' '), hostname, false, {
        sshTarget: target,
        sshUsername: username,
        sshCommand: command || 'interactive'
    });
    
    if (command) {
        result += `Warning: Permanently added '${hostname}' (ECDSA) to the list of known hosts.\n`;
        result += `${username}@${hostname}'s password: \n`;
        result += `Permission denied, please try again.\n`;
        result += `${username}@${hostname}'s password: \n`;
        result += `Permission denied, please try again.\n`;
        result += `${username}@${hostname}'s password: \n`;
        result += `${username}@${hostname}: Permission denied (publickey,password).\n`;
    } else {
        result += `ssh: Could not resolve hostname ${hostname}: Name or service not known\n`;
    }
    
    return result;
}

function generateRandomHash() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let hash = '';
    for (let i = 0; i < 43; i++) {
        hash += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return hash;
}

module.exports = { executeSSH };