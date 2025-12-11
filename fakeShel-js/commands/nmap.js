/**
 * Commande nmap - Scanner de ports et découverte réseau
 * Usage: nmap [options] target
 */

const HoneypotLogger = require('../logger');

function executeNMAP(parts, fs, clientIP = '127.0.0.1', username = 'root') {
    // Initialiser le logger
    const logger = new HoneypotLogger();
    
    let target = 'localhost';
    let verbose = false;
    let scanType = 'SYN Stealth';
    let portRange = false;
    
    // Parser les arguments
    for (let i = 1; i < parts.length; i++) {
        const arg = parts[i];
        
        if (arg === '-v' || arg === '--verbose') {
            verbose = true;
        } else if (arg === '-sS') {
            scanType = 'SYN Stealth';
        } else if (arg === '-sT') {
            scanType = 'Connect';
        } else if (arg === '-sU') {
            scanType = 'UDP Scan';
        } else if (arg.startsWith('-p')) {
            portRange = arg.substring(2) || parts[i + 1];
            if (!arg.substring(2)) i++; // Skip next arg if -p was separate
        } else if (!arg.startsWith('-')) {
            target = arg;
        }
    }
    
    let result = '';
    
    if (verbose) {
        result += `Starting Nmap 7.80 ( https://nmap.org ) at ${new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC\n`;
        result += `Initiating ${scanType} Scan against ${target}\n`;
        result += `Scanning ${target} [1000 ports]\n`;
    }
    
    // Ports simulés
    const commonPorts = [
        { port: 22, service: 'ssh', state: 'open' },
        { port: 23, service: 'telnet', state: 'filtered' },
        { port: 25, service: 'smtp', state: 'closed' },
        { port: 53, service: 'domain', state: 'open' },
        { port: 80, service: 'http', state: 'open' },
        { port: 110, service: 'pop3', state: 'closed' },
        { port: 143, service: 'imap', state: 'closed' },
        { port: 443, service: 'https', state: 'open' },
        { port: 993, service: 'imaps', state: 'closed' },
        { port: 995, service: 'pop3s', state: 'closed' },
        { port: 3306, service: 'mysql', state: 'open' },
        { port: 5432, service: 'postgresql', state: 'closed' },
        { port: 6379, service: 'redis', state: 'open' },
        { port: 27017, service: 'mongodb', state: 'closed' }
    ];
    
    if (verbose) {
        result += `Completed ${scanType} Scan at ${new Date().toISOString().slice(11, 19)}, 0.42s elapsed (1000 total ports)\n`;
    }
    
    result += `Nmap scan report for ${target}\n`;
    
    // Déterminer l'IP selon la cible
    let hostIP = target;
    if (target.includes('.com') || target.includes('.org') || !target.match(/^\d/)) {
        hostIP = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
        result += `Host is up (0.00${Math.floor(Math.random() * 99)}s latency).\n`;
        result += `rDNS record for ${hostIP}: ${target}\n`;
    } else {
        result += `Host is up (0.00${Math.floor(Math.random() * 99)}s latency).\n`;
    }
    
    result += `\nPORT     STATE    SERVICE\n`;
    
    // Afficher les ports selon l'état
    const openPorts = commonPorts.filter(p => p.state === 'open');
    const filteredPorts = commonPorts.filter(p => p.state === 'filtered');
    const closedCount = commonPorts.filter(p => p.state === 'closed').length;
    
    for (const port of openPorts) {
        result += `${port.port}/tcp`.padEnd(9) + port.state.padEnd(9) + port.service + '\n';
    }
    
    for (const port of filteredPorts) {
        result += `${port.port}/tcp`.padEnd(9) + port.state.padEnd(9) + port.service + '\n';
    }
    
    if (closedCount > 0) {
        result += `\nNot shown: ${closedCount} closed ports\n`;
    }
    
    result += `\nNmap done: 1 IP address (1 host up) scanned in 0.42 seconds\n`;
    
    // Logger la tentative de scan nmap
    logger.logNetworkRequest(clientIP, username, parts.join(' '), target, true, {
        scanType,
        portRange: portRange || 'default',
        openPorts: openPorts.length,
        filteredPorts: filteredPorts.length,
        closedPorts: closedCount
    });
    
    return result;
}

module.exports = { executeNMAP };