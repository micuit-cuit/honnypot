const fs = require('fs');
const readline = require('readline');
const { FakeFileSystem } = require('./fakeFileSystem.js');
const { executeCommand: executeModularCommand } = require('./commands/index.js');
const { CommandExecutor } = require('./commandParser.js');
const HoneypotLogger = require('./logger');

// Structure pour les arguments
class Arg {
    constructor(name, value) {
        this.name = name;
        this.value = value;
    }
}

// Fonctions utilitaires
function resolveHome(path, user) {
    // remplace ~ par /home/user
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

function renderHome(path, user) {
    // remplace /home/user par ~
    let homePath = `/home/${user}`;
    if (user === 'root') {
        homePath = '/root';
    }
    if (path.startsWith(homePath)) {
        return '~' + path.substring(homePath.length);
    }
    return path;
}

function resolveFile(path, args = []) {
    try {
        // lit le contenu du fichier
        let content = fs.readFileSync(path, 'utf8');
        
        // remplace les arguments {{arg_name}} avec des regex
        const regex = /\{\{(.*?)\}\}/g;
        content = content.replace(regex, (match, argName) => {
            if (argName.startsWith('RANDOM_')) {
                // génère une valeur aléatoire
                const parts = argName.substring(7).split('-');
                const min = parseInt(parts[0]);
                const max = parseInt(parts[1]);
                const range = max - min + 1;
                return (min + Math.floor(Math.random() * range)).toString();
            }
            
            for (const arg of args) {
                if (arg.name === argName) {
                    return arg.value;
                }
            }
            return '';
        });
        
        return content;
    } catch (error) {
        return "Erreur: Impossible d'ouvrir le fichier.";
    }
}

function createCommandPrompt(user, path) {
    // crée l'invite de commande avec couleurs
    const renderedPath = renderHome(path, user);
    const prompt = `\x1b[92m${user}\x1b[0m@\x1b[33mmicuit-server\x1b[0m \x1b[32m${renderedPath}\x1b[0m> `;
    return prompt;
}

/**
 * Classe principale pour gérer le shell fake
 * Encapsule l'accès au filesystem, l'exécution de commandes et la récupération du header
 */
class FakeShell {
    constructor(username = 'root') {
        this.username = username;
        this.rl = null;
        this.simpleFS = null;
        this.logger = new HoneypotLogger();
        this.clientIP = '127.0.0.1'; // IP par défaut, sera mise à jour par le serveur SSH
    }



    /**
     * Définit l'adresse IP du client
     * @param {string} ip - L'adresse IP du client
     */
    setClientIP(ip) {
        this.clientIP = ip;
    }

    /**
     * Récupère l'adresse IP du client
     * @returns {string} L'adresse IP du client
     */
    getClientIP() {
        return this.clientIP;
    }

    createCommandPrompt() {
        // crée l'invite de commande avec couleurs
        const renderedPath = renderHome(this.getCurrentPath(), this.username);
        const prompt = `\x1b[92m${this.username}\x1b[0m@\x1b[33mmicuit-server\x1b[0m \x1b[32m${renderedPath}\x1b[0m> `;
        return prompt;
    }

    /**
     * Récupère le header du système avec les variables remplacées
     * @returns {string} Le contenu du header
     */
    getHeader() {
        return resolveFile('header.txt', [new Arg('USERNAME', this.username)]);
    }

    /**
     * Initialise le filesystem fake
     * @returns {Promise<void>}
     */
    async initFileSystem() {
        this.simpleFS = new SimpleFakeFS(this.username, 'users');
        this.simpleFS.setClientIP(this.clientIP); // Passer l'IP du client
        const configData = resolveFile('filesystem_config.txt', [new Arg('USERNAME', this.username)]);
        await this.simpleFS.initData(configData);
        
        // Le répertoire home est déjà créé par le constructeur du filesystem
        const homeDir = `/home/${this.username}`;
        
        // Créer les fichiers de base dans le home
        this.simpleFS.createFile(`${homeDir}/.bash_history`, '');
        
        // Utiliser executeCommand pour changer de répertoire via la logique du shell
        this.executeCommand(`cd ${homeDir}`);
    }

    /**
     * Accède au filesystem fake
     * @returns {SimpleFakeFS} L'instance du filesystem
     */
    getFileSystem() {
        return this.simpleFS;
    }

    /**
     * Exécute une commande dans le shell fake
     * @param {string} command - La commande à exécuter
     * @returns {Promise<string>} Le résultat de la commande
     */
    async executeCommand(command) {
        if (!this.simpleFS) {
            throw new Error('Le filesystem n\'est pas initialisé. Appelez initFileSystem() d\'abord.');
        }
        
        // Logger la commande
        this.logger.logCommand(this.clientIP, this.username, command, this.getCurrentPath());
        
        // Détecter les activités suspectes
        this.logger.detectSuspiciousActivity(this.clientIP, this.username, command);
        
        const result = await this.simpleFS.executeCommand(command);
        
        // Sauvegarde la commande dans .bash_history
        if (command.trim()) {
            try {
                const historyPath = `/home/${this.username}/.bash_history`;
                const currentHistory = this.simpleFS.fs.readFile(historyPath) || '';
                this.simpleFS.fs.writeFile(historyPath, currentHistory + command + '\n');
            } catch (error) {
                // Ignore les erreurs de sauvegarde de l'historique
            }
        }
        
        return result;
    }

    /**
     * Récupère le chemin actuel
     * @returns {string} Le chemin actuel
     */
    getCurrentPath() {
        if (!this.simpleFS) {
            throw new Error('Le filesystem n\'est pas initialisé. Appelez initFileSystem() d\'abord.');
        }
        return this.simpleFS.getCurrentPath();
    }

    /**
     * Démarre le shell interactif
     * @returns {Promise<void>}
     */
    async startInteractiveShell() {
        // Affiche le header
        console.log(this.getHeader());
        
        // Initialise le filesystem
        await this.initFileSystem();
        
        // Configure readline
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        // Gestion de la fermeture propre
        this.rl.on('close', () => {
            console.log('\nAu revoir!');
            process.exit(0);
        });

        // Gestion des signaux
        process.on('SIGINT', () => {
            if (this.rl) {
                this.rl.close();
            }
        });
        
        // Démarre le traitement des commandes
        this.processCommand();
    }

    /**
     * Traite les commandes de manière récursive
     * @private
     */
    processCommand() {
        if (!this.rl) {
            throw new Error('L\'interface readline n\'est pas initialisée.');
        }
        
        const prompt = this.createCommandPrompt();
        this.rl.question(prompt, async (command) => {
            if (command === 'exit' || command === null) {
                this.rl.close();
                return;
            }
            
            if (command.trim()) {
                try {
                    const result = await this.executeCommand(command);
                    if (result) {
                        process.stdout.write(result);
                    }
                } catch (error) {
                    process.stdout.write(`Error: ${error.message}\n`);
                }
            }
            
            // Continuer avec la prochaine commande
            this.processCommand();
        });
    }

    /**
     * Ferme le shell
     */
    close() {
        if (this.rl) {
            this.rl.close();
        }
    }
}

// Classe shell simplifiée pour reproduire le comportement du C++
class SimpleFakeFS {
    constructor(user, group) {
        this.fs = new FakeFileSystem(user, group);
        this.commandExecutor = new CommandExecutor(this.fs, { executeCommand: executeModularCommand });
        this.clientIP = '127.0.0.1';
        this.username = user;
    }
    
    setClientIP(ip) {
        this.clientIP = ip;
    }

    async initData(configData) {
        // Parse la configuration directement depuis les données
        this.fs.parseTreeConfig(configData);
    }

    createFile(path, content) {
        return this.fs.createFile(path, content);
    }

    async executeCommand(command) {
        // Vérifier s'il y a des pipes ou des redirections
        if (command.includes(' | ') || command.includes(' > ') || command.includes(' >> ') || command.includes(' 2> ')) {
            return await this.commandExecutor.execute(command);
        }
        
        // Commandes simples sans pipes/redirections
        const parts = command.trim().split(/\s+/);
        const cmd = parts[0];
        
        // Utiliser le système modulaire pour les commandes de base
        const basicCommands = ['ls', 'cat', 'pwd', 'cd', 'mkdir', 'rm', 'touch', 'tree', 
                              'find', 'grep', 'head', 'tail', 'wc', 'cp', 'mv', 'ln', 
                              'ps', 'free', 'whoami', 'echo', 'clear', 'history', 'ping', 
                              'uname', 'date', 'sudo', 'chmod', 'chown', 'awk', 'sed', 
                              'sort', 'uniq', 'cut', 'curl', 'wget', 'ssh', 'netstat',
                              'systemctl', 'nmap'];
        
        if (basicCommands.includes(cmd)) {
            return await executeModularCommand(command, this.fs, this.clientIP, this.username);
        }
        
        // Commandes avancées qui ne sont pas encore modulaires
        if (cmd === 'du') {
            const path = parts.length > 1 ? parts[1] : '.';
            let humanReadable = parts.includes('-h');
            let summarize = parts.includes('-s');
            
            return this.calculateDiskUsage(path, humanReadable, summarize);
            
        } else if (cmd === 'df') {
            let humanReadable = parts.includes('-h');
            return this.showDiskSpace(humanReadable);
            
        } else if (cmd === 'file') {
            if (parts.length < 2) return 'file: missing operand\n';
            const path = parts[1];
            const node = this.fs.findNode(path);
            if (!node) {
                return `file: cannot open '${path}' (No such file or directory)\n`;
            }
            
            if (node.isDirectory()) {
                return `${path}: directory\n`;
            } else {
                // Determine file type based on extension or content
                const ext = path.split('.').pop().toLowerCase();
                let fileType = 'ASCII text';
                
                if (['js', 'ts', 'json', 'txt', 'md', 'html', 'css', 'xml', 'yaml', 'yml'].includes(ext)) {
                    fileType = 'ASCII text';
                } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(ext)) {
                    fileType = 'image data';
                } else if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) {
                    fileType = 'audio data';
                } else if (['mp4', 'avi', 'mkv', 'mov'].includes(ext)) {
                    fileType = 'video data';
                } else if (['zip', 'tar', 'gz', 'bz2', '7z'].includes(ext)) {
                    fileType = 'compressed data';
                } else if (['exe', 'bin', 'so', 'dll'].includes(ext)) {
                    fileType = 'executable';
                }
                
                return `${path}: ${fileType}\n`;
            }
            
        } else if (cmd === 'head') {
            if (parts.length < 2) return 'head: missing operand\n';
            let lines = 10;
            let filePath = '';
            
            for (let i = 1; i < parts.length; i++) {
                if (parts[i] === '-n' && i + 1 < parts.length) {
                    lines = parseInt(parts[i + 1]) || 10;
                    i++; // Skip next argument
                } else if (!parts[i].startsWith('-')) {
                    filePath = parts[i];
                }
            }
            
            if (!filePath) return 'head: missing file operand\n';
            
            const content = this.fs.readFile(filePath);
            if (!content) {
                return `head: cannot open '${filePath}' for reading: No such file or directory\n`;
            }
            
            const contentLines = content.split('\n');
            return contentLines.slice(0, lines).join('\n') + '\n';
            
        } else if (cmd === 'tail') {
            if (parts.length < 2) return 'tail: missing operand\n';
            let lines = 10;
            let filePath = '';
            
            for (let i = 1; i < parts.length; i++) {
                if (parts[i] === '-n' && i + 1 < parts.length) {
                    lines = parseInt(parts[i + 1]) || 10;
                    i++; // Skip next argument
                } else if (!parts[i].startsWith('-')) {
                    filePath = parts[i];
                }
            }
            
            if (!filePath) return 'tail: missing file operand\n';
            
            const content = this.fs.readFile(filePath);
            if (!content) {
                return `tail: cannot open '${filePath}' for reading: No such file or directory\n`;
            }
            
            const contentLines = content.split('\n');
            return contentLines.slice(-lines).join('\n') + '\n';
            
        } else if (cmd === 'wc') {
            if (parts.length < 2) return 'wc: missing operand\n';
            const path = parts[1];
            const content = this.fs.readFile(path);
            
            if (!content) {
                return `wc: ${path}: No such file or directory\n`;
            }
            
            const lines = content.split('\n').length - (content.endsWith('\n') ? 1 : 0);
            const words = content.trim().split(/\s+/).length;
            const chars = content.length;
            
            let countLines = true;
            let countWords = true;
            let countChars = true;
            
            if (parts.includes('-l')) {
                countLines = true;
                countWords = false;
                countChars = false;
            } else if (parts.includes('-w')) {
                countLines = false;
                countWords = true;
                countChars = false;
            } else if (parts.includes('-c')) {
                countLines = false;
                countWords = false;
                countChars = true;
            }
            
            let result = '';
            if (countLines) result += lines.toString().padStart(8);
            if (countWords) result += words.toString().padStart(8);
            if (countChars) result += chars.toString().padStart(8);
            result += ` ${path}\n`;
            
            return result;
            
        } else if (cmd === 'grep') {
            if (parts.length < 3) return 'grep: missing pattern or file\n';
            let pattern = '';
            let filePath = '';
            let caseInsensitive = false;
            
            for (let i = 1; i < parts.length; i++) {
                if (parts[i] === '-i') {
                    caseInsensitive = true;
                } else if (!pattern) {
                    pattern = parts[i];
                } else if (!filePath) {
                    filePath = parts[i];
                    break; // Stop after finding the file
                }
            }
            
            if (!pattern || !filePath) {
                return 'grep: missing pattern or file\n';
            }
            
            const content = this.fs.readFile(filePath);
            if (!content) {
                return `grep: ${filePath}: No such file or directory\n`;
            }
            
            const lines = content.split('\n');
            let matches = [];
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const searchLine = caseInsensitive ? line.toLowerCase() : line;
                const searchPattern = caseInsensitive ? pattern.toLowerCase() : pattern;
                
                if (searchLine.includes(searchPattern)) {
                    matches.push(line);
                }
            }
            
            return matches.join('\n') + (matches.length > 0 ? '\n' : '');
            
        } else if (cmd === 'touch') {
            if (parts.length < 2) return 'touch: missing file operand\n';
            return this.fs.createFile(parts[1], '') ? '' : `touch: cannot create file '${parts[1]}'\n`;
            
        } else if (cmd === 'chmod') {
            if (parts.length < 3) return 'chmod: missing operand\n';
            const mode = parts[1];
            const path = parts[2];
            
            // Simulation basique de chmod - ne change pas vraiment les permissions
            const node = this.fs.findNode(path);
            if (!node) {
                return `chmod: cannot access '${path}': No such file or directory\n`;
            }
            
            return ''; // Succès silencieux
            
        } else if (cmd === 'chown') {
            if (parts.length < 3) return 'chown: missing operand\n';
            const owner = parts[1];
            const path = parts[2];
            
            // Simulation basique de chown
            const node = this.fs.findNode(path);
            if (!node) {
                return `chown: cannot access '${path}': No such file or directory\n`;
            }
            
            return ''; // Succès silencieux
            
        } else if (cmd === 'ps') {
            // Simulation de processus
            const processes = [
                '  PID TTY          TIME CMD',
                `${(Math.random() * 1000 + 1000).toFixed(0)} pts/0    00:00:00 bash`,
                `${(Math.random() * 1000 + 2000).toFixed(0)} pts/0    00:00:00 ssh`,
                `${(Math.random() * 1000 + 3000).toFixed(0)} ?        00:00:01 systemd`,
            ];
            
            if (parts.includes('aux')) {
                return this.generatePsAux();
            }
            
            return processes.join('\n') + '\n';
            
        } else if (cmd === 'top') {
            return this.generateTop();
            
        } else if (cmd === 'free') {
            let humanReadable = parts.includes('-h');
            return this.showMemoryInfo(humanReadable);
            
        } else if (cmd === 'uptime') {
            const uptime = Math.floor(Math.random() * 1000000 + 100000); // Simulation
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const loadAvg = [(Math.random() * 2).toFixed(2), (Math.random() * 2).toFixed(2), (Math.random() * 2).toFixed(2)];
            
            return ` ${new Date().toTimeString().slice(0, 8)} up ${hours}:${minutes.toString().padStart(2, '0')}, 1 user, load average: ${loadAvg.join(', ')}\n`;
            
        } else if (cmd === 'date') {
            return new Date().toString() + '\n';
            
        } else if (cmd === 'id') {
            const user = this.fs.getCurrentUser();
            const uid = user === 'root' ? 0 : 1000;
            const gid = user === 'root' ? 0 : 1000;
            return `uid=${uid}(${user}) gid=${gid}(${user}) groups=${gid}(${user})\n`;
            
        } else if (cmd === 'uname') {
            let showAll = parts.includes('-a');
            let result = 'Linux';
            
            if (showAll || parts.includes('-n')) result += ' micuit-server';
            if (showAll || parts.includes('-r')) result += ' 5.15.0-generic';
            if (showAll || parts.includes('-v')) result += ' #1 SMP Mon Jan 1 12:00:00 UTC 2024';
            if (showAll || parts.includes('-m')) result += ' x86_64';
            if (showAll || parts.includes('-o')) result += ' GNU/Linux';
            
            return result + '\n';
            
        } else if (cmd === 'hostname') {
            return 'micuit-server\n';
            
        } else if (cmd === 'which') {
            if (parts.length < 2) return 'which: missing operand\n';
            const command = parts[1];
            const commonCommands = {
                'ls': '/usr/bin/ls',
                'cat': '/usr/bin/cat',
                'grep': '/usr/bin/grep',
                'find': '/usr/bin/find',
                'ps': '/usr/bin/ps',
                'top': '/usr/bin/top',
                'vim': '/usr/bin/vim',
                'nano': '/usr/bin/nano',
                'bash': '/usr/bin/bash',
                'python': '/usr/bin/python3',
                'node': '/usr/bin/node',
                'git': '/usr/bin/git'
            };
            
            return commonCommands[command] ? commonCommands[command] + '\n' : '';
            
        } else if (cmd === 'env') {
            const envVars = [
                `USER=${this.fs.getCurrentUser()}`,
                `HOME=/home/${this.fs.getCurrentUser()}`,
                `PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`,
                'SHELL=/bin/bash',
                'TERM=xterm-256color',
                'LANG=en_US.UTF-8',
                `PWD=${this.fs.getCurrentPath()}`,
            ];
            
            return envVars.join('\n') + '\n';
            
        } else if (cmd === 'man') {
            const command = parts.length > 1 ? parts[1] : '';
            if (!command) return 'What manual page do you want?\n';
            
            return this.generateManPage(command);
            
        } else if (cmd === 'less' || cmd === 'more') {
            if (parts.length < 2) return `${cmd}: missing file operand\n`;
            const path = parts[1];
            const content = this.fs.readFile(path);
            
            if (!content) {
                return `${cmd}: ${path}: No such file or directory\n`;
            }
            
            // Simulation - dans un vrai shell, cela ouvrirait un pager
            return content + '\n(END)\n';
            
        } else if (cmd === 'cp') {
            if (parts.length < 3) return 'cp: missing destination file operand after source\n';
            const source = parts[1];
            const dest = parts[2];
            let recursive = parts.includes('-r') || parts.includes('-R');
            
            const sourceNode = this.fs.findNode(source);
            if (!sourceNode) {
                return `cp: cannot stat '${source}': No such file or directory\n`;
            }
            
            if (sourceNode.isDirectory() && !recursive) {
                return `cp: -r not specified; omitting directory '${source}'\n`;
            }
            
            if (sourceNode.isFile()) {
                const content = this.fs.readFile(source);
                if (!this.fs.createFile(dest, content)) {
                    return `cp: cannot create regular file '${dest}'\n`;
                }
            } else {
                // Pour les répertoires, une copie récursive simplifiée
                if (!this.fs.createDirectory(dest)) {
                    return `cp: cannot create directory '${dest}'\n`;
                }
                // Note: une vraie implémentation copierait récursivement tout le contenu
            }
            
            return '';
            
        } else if (cmd === 'mv') {
            if (parts.length < 3) return 'mv: missing destination file operand after source\n';
            const source = parts[1];
            const dest = parts[2];
            
            const sourceNode = this.fs.findNode(source);
            if (!sourceNode) {
                return `mv: cannot stat '${source}': No such file or directory\n`;
            }
            
            // Copier puis supprimer l'original
            if (sourceNode.isFile()) {
                const content = this.fs.readFile(source);
                if (!this.fs.createFile(dest, content)) {
                    return `mv: cannot create regular file '${dest}'\n`;
                }
            } else {
                if (!this.fs.createDirectory(dest)) {
                    return `mv: cannot create directory '${dest}'\n`;
                }
            }
            
            if (!this.fs.deleteFile(source)) {
                return `mv: cannot remove '${source}'\n`;
            }
            
            return '';
            
        } else if (cmd === 'ln') {
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
            
            const targetNode = this.fs.findNode(target);
            if (!targetNode && !symbolic) {
                return `ln: failed to access '${target}': No such file or directory\n`;
            }
            
            // Simulation - créer un fichier qui pointe vers la cible
            const linkContent = symbolic ? `-> ${target}` : (targetNode ? targetNode.content : '');
            if (!this.fs.createFile(linkName, linkContent)) {
                return `ln: failed to create link '${linkName}'\n`;
            }
            
            return '';
            
        } else if (cmd === 'sort') {
            if (parts.length < 2) return 'sort: missing file operand\n';
            let numeric = false;
            let reverse = false;
            let filePath = '';
            
            for (let i = 1; i < parts.length; i++) {
                if (parts[i] === '-n') {
                    numeric = true;
                } else if (parts[i] === '-r') {
                    reverse = true;
                } else if (!parts[i].startsWith('-')) {
                    filePath = parts[i];
                }
            }
            
            if (!filePath) return 'sort: missing file operand\n';
            
            const content = this.fs.readFile(filePath);
            if (!content) {
                return `sort: ${filePath}: No such file or directory\n`;
            }
            
            const lines = content.split('\n').filter(line => line.trim() !== '');
            
            if (numeric) {
                lines.sort((a, b) => {
                    const numA = parseFloat(a) || 0;
                    const numB = parseFloat(b) || 0;
                    return reverse ? numB - numA : numA - numB;
                });
            } else {
                lines.sort((a, b) => reverse ? b.localeCompare(a) : a.localeCompare(b));
            }
            
            return lines.join('\n') + '\n';
            
        } else if (cmd === 'uniq') {
            if (parts.length < 2) return 'uniq: missing file operand\n';
            const path = parts[1];
            const content = this.fs.readFile(path);
            
            if (!content) {
                return `uniq: ${path}: No such file or directory\n`;
            }
            
            const lines = content.split('\n');
            const uniqueLines = [];
            let lastLine = null;
            
            for (const line of lines) {
                if (line !== lastLine) {
                    uniqueLines.push(line);
                    lastLine = line;
                }
            }
            
            return uniqueLines.join('\n') + '\n';
            
        } else if (cmd === 'cut') {
            if (parts.length < 2) return 'cut: missing file operand\n';
            let delimiter = '\t';
            let fields = '';
            let filePath = '';
            
            for (let i = 1; i < parts.length; i++) {
                if (parts[i] === '-d' && i + 1 < parts.length) {
                    delimiter = parts[i + 1];
                    i++;
                } else if (parts[i] === '-f' && i + 1 < parts.length) {
                    fields = parts[i + 1];
                    i++;
                } else if (parts[i].startsWith('-d')) {
                    delimiter = parts[i].substring(2) || ',';
                } else if (parts[i].startsWith('-f')) {
                    fields = parts[i].substring(2);
                } else if (!parts[i].startsWith('-')) {
                    filePath = parts[i];
                }
            }
            
            if (!filePath) return 'cut: missing file operand\n';
            if (!fields) return 'cut: you must specify a list of bytes, characters, or fields\n';
            
            const content = this.fs.readFile(filePath);
            if (!content) {
                return `cut: ${filePath}: No such file or directory\n`;
            }
            
            const lines = content.split('\n');
            const fieldNumbers = fields.split(',').map(f => parseInt(f.trim()) - 1);
            const result = [];
            
            for (const line of lines) {
                if (line.trim() === '') continue;
                const columns = line.split(delimiter);
                const selectedColumns = fieldNumbers.map(i => columns[i] || '').join(delimiter);
                result.push(selectedColumns);
            }
            
            return result.join('\n') + '\n';
            
        } else if (cmd === 'awk') {
            // Simulation très basique d'awk
            if (parts.length < 2) return 'awk: missing program\n';
            const program = parts[1];
            const filePath = parts.length > 2 ? parts[2] : '';
            
            if (program === "'{print $1}'") {
                // Cas spécial pour imprimer la première colonne
                if (!filePath) return 'awk: missing file\n';
                const content = this.fs.readFile(filePath);
                if (!content) return `awk: ${filePath}: No such file or directory\n`;
                
                const lines = content.split('\n');
                const result = [];
                for (const line of lines) {
                    if (line.trim() === '') continue;
                    const firstColumn = line.split(/\s+/)[0];
                    result.push(firstColumn);
                }
                return result.join('\n') + '\n';
            }
            
            return 'awk: simplified implementation - only supports {print $1}\n';
            
        } else if (cmd === 'sed') {
            // Simulation très basique de sed
            if (parts.length < 2) return 'sed: missing command\n';
            const command = parts[1];
            const filePath = parts.length > 2 ? parts[2] : '';
            
            if (command.startsWith('s/') && filePath) {
                const content = this.fs.readFile(filePath);
                if (!content) return `sed: ${filePath}: No such file or directory\n`;
                
                // Parse s/old/new/ pattern
                const matches = command.match(/^s\/(.+?)\/(.+?)\/([g]?)$/);
                if (matches) {
                    const [, searchPattern, replacement, flags] = matches;
                    const global = flags.includes('g');
                    
                    let result = content;
                    if (global) {
                        result = result.replace(new RegExp(searchPattern, 'g'), replacement);
                    } else {
                        result = result.replace(new RegExp(searchPattern), replacement);
                    }
                    
                    return result + '\n';
                }
            }
            
            return 'sed: simplified implementation - only supports s/pattern/replacement/[g]\n';
            
        } else if (cmd === 'tar') {
            if (parts.length < 2) return 'tar: You must specify one of the operation options\n';
            
            const options = parts[1];
            if (options.includes('t')) {
                // List contents
                return 'file1.txt\nfile2.txt\ndirectory/\ndirectory/file3.txt\n';
            } else if (options.includes('x')) {
                return 'tar: extract simulation - files would be extracted here\n';
            } else if (options.includes('c')) {
                return 'tar: create simulation - archive would be created\n';
            }
            
            return 'tar: simplified simulation\n';
            
        } else if (cmd === 'zip' || cmd === 'unzip') {
            const action = cmd === 'zip' ? 'create' : 'extract';
            return `${cmd}: ${action} simulation - operation would be performed here\n`;
            
        } else if (cmd === 'ping') {
            if (parts.length < 2) return 'ping: usage error: Destination address required\n';
            const host = parts[1];
            
            // Simulation de ping
            const responses = [
                `PING ${host} (${this.generateRandomIP()}) 56(84) bytes of data.`,
                `64 bytes from ${host} (${this.generateRandomIP()}): icmp_seq=1 ttl=64 time=${(Math.random() * 50 + 1).toFixed(1)} ms`,
                `64 bytes from ${host} (${this.generateRandomIP()}): icmp_seq=2 ttl=64 time=${(Math.random() * 50 + 1).toFixed(1)} ms`,
                `64 bytes from ${host} (${this.generateRandomIP()}): icmp_seq=3 ttl=64 time=${(Math.random() * 50 + 1).toFixed(1)} ms`,
                ``,
                `--- ${host} ping statistics ---`,
                `3 packets transmitted, 3 received, 0% packet loss, time 2000ms`,
                `rtt min/avg/max/mdev = ${(Math.random() * 10 + 1).toFixed(1)}/${(Math.random() * 30 + 10).toFixed(1)}/${(Math.random() * 50 + 30).toFixed(1)}/${(Math.random() * 10).toFixed(1)} ms`
            ];
            
            return responses.join('\n') + '\n';
            
        } else if (cmd === 'whoami') {
            return this.fs.getCurrentUser() + '\n';
            
        } else if (cmd === 'echo') {
            return parts.slice(1).join(' ') + '\n';
            
        } else if (cmd === 'clear') {
            process.stdout.write('\x1b[2J\x1b[0f');
            return '';
            
        } else if (cmd === 'history') {
            const historyContent = this.fs.readFile(`/home/${this.fs.getCurrentUser()}/.bash_history`);
            return historyContent ? historyContent + '\n' : '';
            
        } else {
            return `${cmd}: command not found\n`;
        }
    }

    getCurrentPath() {
        return this.fs.getCurrentPath();
    }

    // Méthodes utilitaires pour les nouvelles commandes
    generateTree(path, prefix = '', isLast = true) {
        const node = this.fs.findNode(path);
        if (!node) {
            return `${path}: No such file or directory\n`;
        }

        let result = '';
        const isRoot = prefix === '';
        
        if (!isRoot) {
            result += prefix + (isLast ? '└── ' : '├── ') + node.name + '\n';
        } else {
            result += node.name + '\n';
        }

        if (node.isDirectory()) {
            const children = Array.from(node.children.values());
            children.forEach((child, index) => {
                const isLastChild = index === children.length - 1;
                const newPrefix = isRoot ? '' : prefix + (isLast ? '    ' : '│   ');
                result += this.generateTree(
                    path === '.' || path === '/' ? 
                    (path === '/' ? '/' + child.name : child.name) : 
                    path + '/' + child.name, 
                    newPrefix, 
                    isLastChild
                );
            });
        }

        return result;
    }

    findFiles(path, pattern, type = null) {
        const node = this.fs.findNode(path);
        if (!node) {
            return `find: '${path}': No such file or directory\n`;
        }

        let results = [];
        
        const searchNode = (currentNode, currentPath) => {
            // Check if current node matches the pattern
            if (this.matchesPattern(currentNode.name, pattern)) {
                if (!type || 
                    (type === 'f' && currentNode.isFile()) ||
                    (type === 'd' && currentNode.isDirectory())) {
                    results.push(currentPath);
                }
            }

            // Recurse into directories
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

    matchesPattern(filename, pattern) {
        // Simple glob pattern matching (* and ?)
        if (pattern === '*') return true;
        
        // Convert glob pattern to regex
        let regexPattern = pattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
            .replace(/\*/g, '.*')                 // * becomes .*
            .replace(/\?/g, '.');                 // ? becomes .

        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(filename);
    }

    calculateDiskUsage(path, humanReadable = false, summarize = false) {
        const node = this.fs.findNode(path);
        if (!node) {
            return `du: cannot access '${path}': No such file or directory\n`;
        }

        let totalSize = 0;
        const sizes = [];

        const calculateSize = (currentNode, currentPath) => {
            let size = 0;
            
            if (currentNode.isFile()) {
                size = currentNode.content ? currentNode.content.length : 0;
            } else if (currentNode.isDirectory()) {
                for (const [name, child] of currentNode.children) {
                    const childPath = currentPath + '/' + name;
                    size += calculateSize(child, childPath);
                }
                if (!summarize) {
                    sizes.push({ path: currentPath, size: Math.ceil(size / 1024) || 1 });
                }
            }
            
            return size;
        };

        totalSize = calculateSize(node, path);
        
        if (summarize) {
            sizes.push({ path, size: Math.ceil(totalSize / 1024) || 1 });
        }

        let result = '';
        for (const { path: itemPath, size } of sizes) {
            const displaySize = humanReadable ? this.formatHumanReadable(size * 1024) : size.toString();
            result += `${displaySize}\t${itemPath}\n`;
        }

        return result;
    }

    formatHumanReadable(bytes) {
        const units = ['B', 'K', 'M', 'G', 'T'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return unitIndex === 0 ? 
            `${size}${units[unitIndex]}` : 
            `${size.toFixed(1)}${units[unitIndex]}`;
    }

    showDiskSpace(humanReadable = false) {
        const total = 10485760; // 10GB simulation
        const used = Math.floor(total * (0.3 + Math.random() * 0.4)); // 30-70% used
        const available = total - used;
        const usePercent = Math.floor((used / total) * 100);

        let result = 'Filesystem     1K-blocks    Used Available Use% Mounted on\n';
        
        if (humanReadable) {
            result = 'Filesystem      Size  Used Avail Use% Mounted on\n';
            result += `/dev/sda1       ${this.formatHumanReadable(total * 1024)}  ${this.formatHumanReadable(used * 1024)} ${this.formatHumanReadable(available * 1024)}  ${usePercent}% /\n`;
        } else {
            result += `/dev/sda1      ${total}  ${used} ${available}  ${usePercent}% /\n`;
        }

        return result;
    }

    generatePsAux() {
        const processes = [
            'USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND',
            `root         1  0.0  0.2 169484  9284 ?        Ss   ${this.getRandomTime()}   0:01 /sbin/init`,
            `root         2  0.0  0.0      0     0 ?        S    ${this.getRandomTime()}   0:00 [kthreadd]`,
            `root         3  0.0  0.0      0     0 ?        I<   ${this.getRandomTime()}   0:00 [rcu_gp]`,
            `${this.fs.getCurrentUser()}      ${Math.floor(Math.random() * 1000 + 1000)}  0.1  0.5  25632  8192 pts/0    Ss   ${this.getRandomTime()}   0:00 -bash`,
            `${this.fs.getCurrentUser()}      ${Math.floor(Math.random() * 1000 + 2000)}  0.0  0.1   7236  2048 pts/0    R+   ${this.getRandomTime()}   0:00 ps aux`,
        ];
        return processes.join('\n') + '\n';
    }

    generateTop() {
        const uptime = Math.floor(Math.random() * 1000000 + 100000);
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        
        return `top - ${new Date().toTimeString().slice(0, 8)} up ${hours}:${minutes.toString().padStart(2, '0')}, 1 user, load average: ${(Math.random() * 2).toFixed(2)}, ${(Math.random() * 2).toFixed(2)}, ${(Math.random() * 2).toFixed(2)}
Tasks: ${Math.floor(Math.random() * 50 + 100)} total,   1 running, ${Math.floor(Math.random() * 30 + 80)} sleeping,   0 stopped,   0 zombie
%Cpu(s): ${(Math.random() * 10).toFixed(1)}%us, ${(Math.random() * 5).toFixed(1)}%sy, 0.0%ni, ${(90 + Math.random() * 8).toFixed(1)}%id, 0.0%wa, 0.0%hi, 0.0%si, 0.0%st
KiB Mem : ${Math.floor(Math.random() * 2000000 + 8000000)} total, ${Math.floor(Math.random() * 1000000 + 2000000)} free, ${Math.floor(Math.random() * 1000000 + 1000000)} used, ${Math.floor(Math.random() * 1000000 + 2000000)} buff/cache
KiB Swap: ${Math.floor(Math.random() * 1000000 + 2000000)} total, ${Math.floor(Math.random() * 1000000 + 1500000)} free, ${Math.floor(Math.random() * 500000)} used. ${Math.floor(Math.random() * 2000000 + 6000000)} avail Mem

  PID USER      PR  NI    VIRT    RES    SHR S  %CPU %MEM     TIME+ COMMAND
    1 root      20   0  169484   9284   6688 S   0.0  0.1   0:01.${Math.floor(Math.random() * 99).toString().padStart(2, '0')} systemd
${Math.floor(Math.random() * 1000 + 1000)} ${this.fs.getCurrentUser()}      20   0   25632   8192   3456 S   0.0  0.1   0:00.${Math.floor(Math.random() * 99).toString().padStart(2, '0')} bash
${Math.floor(Math.random() * 1000 + 2000)} ${this.fs.getCurrentUser()}      20   0    7236   2048   1536 R   0.0  0.0   0:00.${Math.floor(Math.random() * 99).toString().padStart(2, '0')} top
`;
    }

    showMemoryInfo(humanReadable = false) {
        const total = Math.floor(Math.random() * 2000000 + 8000000);
        const used = Math.floor(total * (0.3 + Math.random() * 0.4));
        const free = total - used;
        const buffers = Math.floor(total * 0.1);
        const cached = Math.floor(total * 0.2);

        if (humanReadable) {
            return `              total        used        free      shared  buff/cache   available
Mem:          ${this.formatHumanReadable(total * 1024)}       ${this.formatHumanReadable(used * 1024)}       ${this.formatHumanReadable(free * 1024)}        ${this.formatHumanReadable(Math.floor(total * 0.01) * 1024)}       ${this.formatHumanReadable((buffers + cached) * 1024)}       ${this.formatHumanReadable((free + buffers + cached) * 1024)}
Swap:         ${this.formatHumanReadable(Math.floor(total * 0.5) * 1024)}          0B       ${this.formatHumanReadable(Math.floor(total * 0.5) * 1024)}
`;
        } else {
            return `              total        used        free      shared  buff/cache   available
Mem:        ${total}     ${used}     ${free}       ${Math.floor(total * 0.01)}     ${buffers + cached}     ${free + buffers + cached}
Swap:       ${Math.floor(total * 0.5)}           0     ${Math.floor(total * 0.5)}
`;
        }
    }

    getRandomTime() {
        const hour = Math.floor(Math.random() * 24).toString().padStart(2, '0');
        const minute = Math.floor(Math.random() * 60).toString().padStart(2, '0');
        return `${hour}:${minute}`;
    }

    generateRandomIP() {
        return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
    }

    generateManPage(command) {
        const manPages = {
            'ls': `LS(1)                              User Commands                              LS(1)

NAME
       ls - list directory contents

SYNOPSIS
       ls [OPTION]... [FILE]...

DESCRIPTION
       List information about the FILEs (the current directory by default).

       -a, --all
              do not ignore entries starting with .

       -l     use a long listing format

       -h, --human-readable
              with -l, print sizes in human readable format

EXAMPLES
       ls -la
              List all files in long format

AUTHOR
       Written by Richard M. Stallman and David MacKenzie.

                                                                            LS(1)
`,
            'cat': `CAT(1)                             User Commands                             CAT(1)

NAME
       cat - concatenate files and print on the standard output

SYNOPSIS
       cat [OPTION]... [FILE]...

DESCRIPTION
       Concatenate FILE(s) to standard output.

       With no FILE, or when FILE is -, read standard input.

EXAMPLES
       cat file1.txt
              Display contents of file1.txt

AUTHOR
       Written by Torbjörn Granlund and Richard M. Stallman.

                                                                           CAT(1)
`,
            'grep': `GREP(1)                            User Commands                            GREP(1)

NAME
       grep - print lines matching a pattern

SYNOPSIS
       grep [OPTIONS] PATTERN [FILE...]

DESCRIPTION
       grep searches for PATTERN in each FILE or standard input.

       -i, --ignore-case
              Ignore case distinctions

       -v, --invert-match
              Invert the sense of matching

EXAMPLES
       grep "pattern" file.txt
              Search for "pattern" in file.txt

AUTHOR
       Written by Mike Haertel and others.

                                                                          GREP(1)
`,
            'rm': `RM(1)                              User Commands                              RM(1)

NAME
       rm - remove files or directories

SYNOPSIS
       rm [OPTION]... [FILE]...

DESCRIPTION
       Remove (unlink) the FILE(s).

       -f, --force
              ignore nonexistent files and arguments, never prompt

       -r, -R, --recursive
              remove directories and their contents recursively

       -v, --verbose
              explain what is being done

AUTHOR
       Written by Paul Rubin, David MacKenzie, Richard M. Stallman, and Jim Meyering.

                                                                            RM(1)
`,
            'cd': `CD(1)                              Shell Builtins                            CD(1)

NAME
       cd - change the working directory

SYNOPSIS
       cd [DIRECTORY]

DESCRIPTION
       Change the current directory to DIRECTORY.  The default DIRECTORY is
       the value of the HOME shell variable.

EXAMPLES
       cd /home/user
              Change to /home/user directory

       cd
              Change to home directory

AUTHOR
       Shell builtin command.

                                                                            CD(1)
`
        };

        return manPages[command] || `No manual entry for ${command}\n`;
    }
}

// Fonction principale pour compatibilité avec l'ancien code
async function main() {
    // récupère le premier argument comme username si fourni sinon "root"
    const username = process.argv[2] || 'root';
    
    // affiche le header
    const header = resolveFile('header.txt', [new Arg('USERNAME', username)]);
    console.log(header);
    
    // lance le shell interactif
    const simpleFS = new SimpleFakeFS(username, 'users');
    const configData = resolveFile('filesystem_config.txt', [new Arg('USERNAME', username)]);
    await simpleFS.initData(configData);
    
    simpleFS.createFile(`/home/${username}/.bash_history`, '');
    simpleFS.executeCommand(`cd /home/${username}`);
    
    // Interface readline pour l'entrée utilisateur
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    // Fonction récursive pour traiter les commandes
    function processCommand() {
        const prompt = createCommandPrompt(username, simpleFS.getCurrentPath());
        rl.question(prompt, (command) => {
            if (command === 'exit' || command === null) {
                rl.close();
                return;
            }
            
            if (command.trim()) {
                const result = simpleFS.executeCommand(command);
                if (result) {
                    process.stdout.write(result);
                }
                
                // sauvegarde la commande dans .bash_history
                try {
                    const historyPath = `/home/${username}/.bash_history`;
                    const currentHistory = simpleFS.fs.readFile(historyPath) || '';
                    simpleFS.fs.writeFile(historyPath, currentHistory + command + '\n');
                } catch (error) {
                    // Ignore les erreurs de sauvegarde de l'historique
                }
            }
            
            // Continuer avec la prochaine commande
            processCommand();
        });
    }
    
    // Gestion de la fermeture propre
    rl.on('close', () => {
        console.log('\nAu revoir!');
        process.exit(0);
    });

    // Gestion des signaux
    process.on('SIGINT', () => {
        rl.close();
    });
    
    // Démarrer le traitement des commandes
    processCommand();
}

// Lancer le programme principal si ce fichier est exécuté directement
if (require.main === module) {
    main().catch(console.error);
}

// Export de la classe principale
module.exports = { FakeShell, Arg };