/**
 * Système de logging pour le honeypot
 * Capture toutes les activités suspectes et légitimes
 */

const fs = require('fs');
const path = require('path');

class HoneypotLogger {
    constructor(logDir = './logs') {
        this.logDir = logDir;
        this.currentLogFile = null;
        this.initializeLogger();
    }

    initializeLogger() {
        // Créer le dossier de logs s'il n'existe pas
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }

        // Nom de fichier avec date du jour
        const today = new Date().toISOString().split('T')[0];
        this.currentLogFile = path.join(this.logDir, `honeypot-${today}.log`);
    }

    /**
     * Format standard des logs : [IP][TIMESTAMP][TYPE] MESSAGE
     */
    formatLogEntry(ip, type, message, data = null) {
        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
        let logEntry = `[${ip}][${timestamp}][${type}] ${message}`;
        
        if (data) {
            logEntry += ` | DATA: ${JSON.stringify(data)}`;
        }
        
        return logEntry + '\n';
    }

    /**
     * Écriture dans le fichier de log
     */
    writeLog(entry) {
        try {
            fs.appendFileSync(this.currentLogFile, entry);
        } catch (error) {
            console.error('Erreur lors de l\'écriture du log:', error);
        }
    }

    /**
     * Log des tentatives de connexion
     */
    logLogin(ip, username, password, success = false) {
        const type = success ? 'login_success' : 'login_attempt';
        const message = `User: ${username} | Password: ${password} | Success: ${success}`;
        const entry = this.formatLogEntry(ip, type, message);
        this.writeLog(entry);
    }

    /**
     * Log des déconnexions
     */
    logLogout(ip, username, reason = 'normal') {
        const message = `User: ${username} | Reason: ${reason}`;
        const entry = this.formatLogEntry(ip, 'logout', message);
        this.writeLog(entry);
    }

    /**
     * Log des commandes exécutées
     */
    logCommand(ip, username, command, result = null) {
        const message = `User: ${username} | Command: ${command}`;
        const data = result ? { output_length: result.length, preview: result.substring(0, 200) } : null;
        const entry = this.formatLogEntry(ip, 'command', message, data);
        this.writeLog(entry);
    }

    /**
     * Log des requêtes réseau (curl, wget, etc.)
     */
    logNetworkRequest(ip, username, command, url, success, responseData = null) {
        const message = `User: ${username} | Command: ${command} | URL: ${url} | Success: ${success}`;
        const data = responseData ? {
            status_code: responseData.statusCode,
            content_type: responseData.contentType,
            content_length: responseData.contentLength,
            headers: responseData.headers,
            saved_file: responseData.savedFile
        } : null;
        const entry = this.formatLogEntry(ip, 'network_request', message, data);
        this.writeLog(entry);
    }

    /**
     * Log des tentatives d'accès aux fichiers
     */
    logFileAccess(ip, username, operation, filePath, success = true) {
        const message = `User: ${username} | Operation: ${operation} | File: ${filePath} | Success: ${success}`;
        const entry = this.formatLogEntry(ip, 'file_access', message);
        this.writeLog(entry);
    }

    /**
     * Log des erreurs système
     */
    logError(ip, username, error, context = '') {
        const message = `User: ${username} | Error: ${error} | Context: ${context}`;
        const entry = this.formatLogEntry(ip, 'error', message);
        this.writeLog(entry);
    }

    /**
     * Log des tentatives de privilege escalation
     */
    logPrivilegeEscalation(ip, username, command, targetUser = null) {
        const message = `User: ${username} | Command: ${command} | Target: ${targetUser || 'root'}`;
        const entry = this.formatLogEntry(ip, 'privilege_escalation', message);
        this.writeLog(entry);
    }

    /**
     * Log des activités suspectes
     */
    logSuspiciousActivity(ip, username, activity, details) {
        const message = `User: ${username} | Activity: ${activity} | Details: ${details}`;
        const entry = this.formatLogEntry(ip, 'suspicious', message);
        this.writeLog(entry);
    }

    /**
     * Log des téléchargements de fichiers
     */
    logDownload(ip, username, url, fileName, fileSize, contentType) {
        const message = `User: ${username} | Downloaded: ${fileName} | From: ${url}`;
        const data = {
            file_size: fileSize,
            content_type: contentType,
            saved_as: fileName
        };
        const entry = this.formatLogEntry(ip, 'download', message, data);
        this.writeLog(entry);
    }

    /**
     * Log des activités suspectes
     */
    logSuspicious(ip, username, command, pattern, description = '') {
        const message = `User: ${username} | Suspicious command: ${command} | Pattern: ${pattern}`;
        const data = {
            command,
            pattern,
            description,
            risk_level: 'HIGH'
        };
        const entry = this.formatLogEntry(ip, 'suspicious', message, data);
        this.writeLog(entry);
    }

    /**
     * Log des scans de ports (nmap, netstat, etc.)
     */
    logPortScan(ip, username, command, target, results = null) {
        const message = `User: ${username} | Command: ${command} | Target: ${target}`;
        const data = results ? { ports_found: results.length, results: results } : null;
        const entry = this.formatLogEntry(ip, 'port_scan', message, data);
        this.writeLog(entry);
    }

    /**
     * Obtenir les statistiques des logs
     */
    /**
     * Détecte les activités suspectes basées sur des patterns de commandes
     * @param {string} clientIP - L'adresse IP du client
     * @param {string} username - Le nom d'utilisateur
     * @param {string} command - La commande exécutée
     */
    detectSuspiciousActivity(clientIP, username, command) {
        const suspiciousPatterns = [
            // Accès aux fichiers système sensibles
            /cat.*\/etc\/passwd/,
            /cat.*\/etc\/shadow/,
            /cat.*\/etc\/hosts/,
            /\/etc\/ssh\/sshd_config/,
            
            // Recherche de fichiers sensibles
            /find.*-name.*\.key/,
            /find.*-name.*\.pem/,
            /find.*-name.*password/,
            /find.*-name.*secret/,
            
            // Outils de hacking
            /netcat|nc.*-l/,
            /nmap.*-s/,
            /wget.*\.sh/,
            /curl.*\.sh/,
            
            // Tentatives d'élévation de privilèges
            /sudo\s+su/,
            /chmod.*777/,
            /chmod.*\+s/,
            
            // Manipulation de logs
            /rm.*\/var\/log/,
            /cat.*\/dev\/null.*log/,
            
            // Backdoors et reverse shells
            /bash.*-i/,
            /sh.*-i/,
            /python.*pty/,
            /ruby.*reverse/
        ];

        for (const pattern of suspiciousPatterns) {
            if (pattern.test(command)) {
                this.logSuspicious(clientIP, username, command, pattern.source);
                return true;
            }
        }
        
        return false;
    }

    /**
     * Obtient les statistiques des logs
     * @returns {Object} Statistiques des activités loggées
     */
    getLogStats() {
        try {
            const logContent = fs.readFileSync(this.currentLogFile, 'utf8');
            const lines = logContent.split('\n').filter(line => line.trim());
            
            const stats = {
                total_events: lines.length,
                login_attempts: 0,
                commands_executed: 0,
                network_requests: 0,
                suspicious_activities: 0,
                downloads: 0
            };

            lines.forEach(line => {
                if (line.includes('[login_attempt]')) stats.login_attempts++;
                if (line.includes('[command]')) stats.commands_executed++;
                if (line.includes('[network_request]')) stats.network_requests++;
                if (line.includes('[suspicious]')) stats.suspicious_activities++;
                if (line.includes('[download]')) stats.downloads++;
            });

            return stats;
        } catch (error) {
            return { error: 'Unable to read log file' };
        }
    }

    /**
     * Rechercher dans les logs
     */
    searchLogs(pattern, type = null) {
        try {
            const logContent = fs.readFileSync(this.currentLogFile, 'utf8');
            const lines = logContent.split('\n').filter(line => line.trim());
            
            return lines.filter(line => {
                const matchesPattern = line.toLowerCase().includes(pattern.toLowerCase());
                const matchesType = type ? line.includes(`[${type}]`) : true;
                return matchesPattern && matchesType;
            });
        } catch (error) {
            return [];
        }
    }
}

// Instance globale du logger
let globalLogger = null;

/**
 * Obtenir l'instance globale du logger
 */
function getLogger() {
    if (!globalLogger) {
        globalLogger = new HoneypotLogger();
    }
    return globalLogger;
}

/**
 * Fonctions utilitaires rapides
 */
function logLogin(ip, username, password, success) {
    getLogger().logLogin(ip, username, password, success);
}

function logCommand(ip, username, command, result) {
    getLogger().logCommand(ip, username, command, result);
}

function logNetworkRequest(ip, username, command, url, success, responseData) {
    getLogger().logNetworkRequest(ip, username, command, url, success, responseData);
}

function logDownload(ip, username, url, fileName, fileSize, contentType) {
    getLogger().logDownload(ip, username, url, fileName, fileSize, contentType);
}

function logSuspicious(ip, username, activity, details) {
    getLogger().logSuspiciousActivity(ip, username, activity, details);
}

module.exports = HoneypotLogger;