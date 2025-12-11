/**
 * Index des commandes - Gestionnaire central des commandes
 * Charge et exécute les commandes de manière modulaire
 */

// Import de toutes les commandes
const { executeLS } = require('./ls');
const { executeCAT } = require('./cat');
const { executePWD } = require('./pwd');
const { executeCD } = require('./cd');
const { executeMKDIR } = require('./mkdir');
const { executeRM } = require('./rm');
const { executeTOUCH } = require('./touch');
const { executeTREE } = require('./tree');
const { executeFIND } = require('./find');
const { executeGREP } = require('./grep');
const { executeHEAD } = require('./head');
const { executeTAIL } = require('./tail');
const { executeWC } = require('./wc');
const { executeCP } = require('./cp');
const { executeMV } = require('./mv');
const { executeLN } = require('./ln');
const { executePS } = require('./ps');
const { executeFREE } = require('./free');
const { executeWHOAMI } = require('./whoami');
const { executeECHO } = require('./echo');
const { executeCLEAR } = require('./clear');
const { executeHISTORY } = require('./history');
const { executePING } = require('./ping');
const { executeUNAME } = require('./uname');
const { executeDATE } = require('./date');
const { executeSUDO } = require('./sudo');
const { executeCHMOD } = require('./chmod');
const { executeCHOWN } = require('./chown');
const { executeAWK } = require('./awk');
const { executeSED } = require('./sed');
const { executeSORT } = require('./sort');
const { executeUNIQ } = require('./uniq');
const { executeCUT } = require('./cut');
const { executeCURL } = require('./curl');
const { executeWGET } = require('./wget');
const { executeSSH } = require('./ssh');
const { executeNETSTAT } = require('./netstat');
const { executeSYSTEMCTL } = require('./systemctl');
const { executeNMAP } = require('./nmap');

// Mapping des commandes
const COMMANDS = {
    'ls': executeLS,
    'cat': executeCAT,
    'pwd': executePWD,
    'cd': executeCD,
    'mkdir': executeMKDIR,
    'rm': executeRM,
    'touch': executeTOUCH,
    'tree': executeTREE,
    'find': executeFIND,
    'grep': executeGREP,
    'head': executeHEAD,
    'tail': executeTAIL,
    'wc': executeWC,
    'cp': executeCP,
    'mv': executeMV,
    'ln': executeLN,
    'ps': executePS,
    'free': executeFREE,
    'whoami': executeWHOAMI,
    'echo': executeECHO,
    'clear': executeCLEAR,
    'history': executeHISTORY,
    'ping': executePING,
    'uname': executeUNAME,
    'date': executeDATE,
    'sudo': executeSUDO,
    'chmod': executeCHMOD,
    'chown': executeCHOWN,
    'awk': executeAWK,
    'sed': executeSED,
    'sort': executeSORT,
    'uniq': executeUNIQ,
    'cut': executeCUT,
    'curl': executeCURL,
    'wget': executeWGET,
    'ssh': executeSSH,
    'netstat': executeNETSTAT,
    'systemctl': executeSYSTEMCTL,
    'nmap': executeNMAP,
};

/**
 * Exécute une commande de manière modulaire
 * @param {string} command - La commande complète à exécuter
 * @param {Object} fs - L'instance du système de fichiers
 * @param {string} clientIP - L'adresse IP du client (optionnel)
 * @param {string} username - Le nom d'utilisateur (optionnel)
 * @returns {Promise<string>|string} Le résultat de la commande
 */
async function executeCommand(command, fs, clientIP = '127.0.0.1', username = 'root') {
    const parts = command.trim().split(/\s+/);
    const cmd = parts[0];
    
    // Vérifier si la commande existe dans le système de fichiers
    const commandPath = fs.commandExists(cmd);
    if (!commandPath) {
        return `${cmd}: command not found\n`;
    }
    
    // Vérifier si nous avons l'implémentation de cette commande
    if (COMMANDS[cmd]) {
        let result;
        // Passer les paramètres supplémentaires pour les commandes qui en ont besoin
        if (cmd === 'curl' || cmd === 'wget' || cmd === 'ssh' || cmd === 'nmap') {
            result = COMMANDS[cmd](parts, fs, clientIP, username);
        } else {
            result = COMMANDS[cmd](parts, fs);
        }
        // Gérer les fonctions asynchrones
        if (result instanceof Promise) {
            return await result;
        }
        return result;
    }
    
    // Commande existe dans le FS mais pas d'implémentation
    return `${cmd}: permission denied\n`;
}

/**
 * Obtient la liste de toutes les commandes disponibles
 * @returns {Array<string>} Liste des commandes
 */
function getAvailableCommands() {
    return Object.keys(COMMANDS).sort();
}

/**
 * Vérifie si une commande existe
 * @param {string} cmd - Le nom de la commande
 * @returns {boolean} True si la commande existe
 */
function hasCommand(cmd) {
    return COMMANDS.hasOwnProperty(cmd);
}

module.exports = {
    executeCommand,
    getAvailableCommands,
    hasCommand,
    COMMANDS
};