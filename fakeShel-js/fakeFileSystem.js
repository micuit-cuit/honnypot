/**
 * Système de fichiers virtuel en JavaScript
 * Implémentation complète avec gestion des permissions et configuration par fichier
 */

class Permissions {
    constructor() {
        this.owner_read = true;
        this.owner_write = true;
        this.owner_execute = false;
        this.group_read = true;
        this.group_write = false;
        this.group_execute = false;
        this.other_read = true;
        this.other_write = false;
        this.other_execute = false;
    }

    toString() {
        let result = "";
        result += this.owner_read ? "r" : "-";
        result += this.owner_write ? "w" : "-";
        result += this.owner_execute ? "x" : "-";
        result += this.group_read ? "r" : "-";
        result += this.group_write ? "w" : "-";
        result += this.group_execute ? "x" : "-";
        result += this.other_read ? "r" : "-";
        result += this.other_write ? "w" : "-";
        result += this.other_execute ? "x" : "-";
        return result;
    }

    static fromString(permStr) {
        const perm = new Permissions();
        if (permStr.length === 9) {
            perm.owner_read = permStr[0] === 'r';
            perm.owner_write = permStr[1] === 'w';
            perm.owner_execute = permStr[2] === 'x';
            perm.group_read = permStr[3] === 'r';
            perm.group_write = permStr[4] === 'w';
            perm.group_execute = permStr[5] === 'x';
            perm.other_read = permStr[6] === 'r';
            perm.other_write = permStr[7] === 'w';
            perm.other_execute = permStr[8] === 'x';
        }
        return perm;
    }
}

const NodeType = {
    FILE: 'file',
    DIRECTORY: 'directory'
};

class FakeNode {
    constructor(name, type, owner = 'root', group = 'root') {
        this.name = name;
        this.type = type;
        this.permissions = new Permissions();
        
        // Pour les répertoires, donner les permissions d'exécution
        if (type === NodeType.DIRECTORY) {
            this.permissions.owner_execute = true;
            this.permissions.group_execute = true;
            this.permissions.other_execute = true;
        }
        
        this.owner = owner;
        this.group = group;
        this.creation_time = new Date();
        this.modification_time = new Date();
        this.content = '';
        this.real_content_path = '';
        this.children = new Map();
    }

    isDirectory() {
        return this.type === NodeType.DIRECTORY;
    }

    isFile() {
        return this.type === NodeType.FILE;
    }
}

class FakeFileSystem {
    constructor(user = 'user', group = 'users') {
        this.root = new FakeNode('/', NodeType.DIRECTORY);
        this.current_user = user;
        this.current_group = group;
        this.current_path = '/';
        this.createDefaultStructure();
    }

    createDefaultStructure() {
        // Créer une structure de base typique d'un système Unix
        this.createDirectory('/home');
        this.createDirectory('/etc');
        this.createDirectory('/var');
        this.createDirectory('/tmp');
        this.createDirectory('/bin');
        this.createDirectory('/usr');
        this.createDirectory('/usr/bin');
        this.createDirectory('/sbin');
        this.createDirectory('/usr/sbin');
        
        // Créer les fichiers de commandes exécutables
        this.createSystemCommands();
        this.createDirectory('/usr/local');
        this.createDirectory(`/home/${this.current_user}`);
        
        // Quelques fichiers par défaut
        this.writeFile('/etc/passwd', `root:x:0:0:root:/root:/bin/bash\n${this.current_user}:x:1000:1000:User:/home/${this.current_user}:/bin/bash\n`);
        this.writeFile('/etc/hosts', '127.0.0.1 localhost\n::1 localhost\n');
        this.writeFile(`/home/${this.current_user}/.bashrc`, '# ~/.bashrc\nexport PATH=$PATH:/usr/local/bin\n');
    }
    
    createSystemCommands() {
        // Commandes de base dans /bin
        const binCommands = [
            'ls', 'cd', 'pwd', 'mkdir', 'rmdir', 'rm', 'cp', 'mv', 
            'cat', 'echo', 'touch', 'grep', 'ps', 'kill', 'chmod',
            'chown', 'su', 'tar', 'nano', 'vi', 'sort', 'uniq', 'cut',
            'ssh', 'netstat', 'systemctl'
        ];
        
        // Commandes système dans /usr/bin
        const usrBinCommands = [
            'find', 'wget', 'curl', 'tree', 'whoami', 'id', 'awk', 'sed',
            'head', 'tail', 'wc', 'free', 'clear', 'history', 'ping', 'uname', 'date',
            'nmap'
        ];
        
        // Commandes admin dans /sbin
        const sbinCommands = [
            'sudo'
        ];
        
        // Créer les fichiers exécutables avec permissions appropriées
        for (const cmd of binCommands) {
            this.createExecutableCommand(`/bin/${cmd}`);
        }
        
        for (const cmd of usrBinCommands) {
            this.createExecutableCommand(`/usr/bin/${cmd}`);
        }
        
        for (const cmd of sbinCommands) {
            this.createExecutableCommand(`/sbin/${cmd}`);
        }
    }
    
    createExecutableCommand(path) {
        this.writeFile(path, `#!/bin/bash\n# ${path.split('/').pop()} command\n`);
        const node = this.findNode(path);
        if (node) {
            // Donner les permissions d'exécution
            node.permissions.owner_execute = true;
            node.permissions.group_execute = true;
            node.permissions.other_execute = true;
        }
    }

    async loadConfig(configFile) {
        try {
            if (typeof window !== 'undefined') {
                // Environnement navigateur
                const response = await fetch(configFile);
                const configText = await response.text();
                this.parseTreeConfig(configText);
            } else {
                // Environnement Node.js
                const fs = require('fs').promises;
                const configText = await fs.readFile(configFile, 'utf8');
                this.parseTreeConfig(configText);
            }
            return true;
        } catch (error) {
            console.error('Erreur lors du chargement de la configuration:', error);
            return false;
        }
    }

    parseTreeConfig(configText) {
        const lines = configText.split('\n');
        
        for (let line of lines) {
            line = line.trim();
            
            // Ignorer les commentaires et lignes vides
            if (line === '' || line.startsWith('#')) continue;
            
            const arrowPos = line.indexOf('->');
            if (arrowPos !== -1) {
                let virtualPath = line.substring(0, arrowPos).trim();
                let rest = line.substring(arrowPos + 2).trim();
                
                const parts = rest.split(' ');
                let realPath = parts[0] || '';
                let permissions = parts[1] || '';
                let ownership = parts[2] || '';
                
                // Déterminer si c'est un fichier ou un dossier
                const isDirectory = virtualPath.endsWith('/') || realPath.endsWith('/');
                
                if (isDirectory) {
                    this.createDirectory(virtualPath);
                } else {
                    let content = '';
                    if (realPath && realPath !== '-') {
                        content = this.loadRealContent(realPath);
                    }
                    this.createFile(virtualPath, content);
                    
                    // Stocker le chemin réel pour référence
                    const node = this.findNode(virtualPath);
                    if (node) {
                        node.real_content_path = realPath;
                    }
                }
                
                // Appliquer les permissions si spécifiées
                if (permissions && permissions !== '-') {
                    this.changePermissions(virtualPath, permissions);
                }
                
                // Appliquer la propriété si spécifiée
                if (ownership && ownership !== '-') {
                    const colonPos = ownership.indexOf(':');
                    if (colonPos !== -1) {
                        const owner = ownership.substring(0, colonPos);
                        const group = ownership.substring(colonPos + 1);
                        this.changeOwner(virtualPath, owner, group);
                    } else {
                        this.changeOwner(virtualPath, ownership);
                    }
                }
            } else {
                // Format simple: juste le chemin
                line = line.trim();
                if (line.endsWith('/')) {
                    this.createDirectory(line);
                } else {
                    this.createFile(line, '');
                }
            }
        }
    }

    loadRealContent(realPath) {
        if (typeof window !== 'undefined') {
            // Dans le navigateur, on ne peut pas lire des fichiers locaux
            return '';
        } else {
            // Environnement Node.js
            try {
                const fs = require('fs');
                return fs.readFileSync(realPath, 'utf8');
            } catch (error) {
                return '';
            }
        }
    }

    findNode(path) {
        const normalized = this.normalizePath(path);
        if (normalized === '/') return this.root;
        
        const parts = this.splitPath(normalized);
        let current = this.root;
        
        for (const part of parts) {
            if (!current.children.has(part)) {
                return null;
            }
            current = current.children.get(part);
        }
        return current;
    }

    normalizePath(path) {
        if (!path || path[0] !== '/') {
            // Chemin relatif - le convertir en absolu
            return this.getAbsolutePath(path);
        }
        return path;
    }

    getAbsolutePath(relativePath) {
        if (!relativePath || relativePath[0] === '/') {
            return relativePath;
        }
        
        if (relativePath === '.') {
            return this.current_path;
        }
        
        if (relativePath === '..') {
            if (this.current_path === '/') return '/';
            
            // Supprimer le slash final pour un traitement uniforme
            let currentPath = this.current_path;
            if (currentPath.endsWith('/') && currentPath !== '/') {
                currentPath = currentPath.slice(0, -1);
            }
            
            const lastSlash = currentPath.lastIndexOf('/');
            if (lastSlash === 0) return '/';
            return currentPath.substring(0, lastSlash) + '/';
        }
        
        let result = this.current_path;
        if (!result.endsWith('/')) result += '/';
        result += relativePath;
        
        return result;
    }

    splitPath(path) {
        return path.split('/').filter(part => part !== '');
    }

    hasReadPermission(node) {
        if (!node) return false;
        if (this.current_user === 'root') return true;
        if (node.owner === this.current_user) return node.permissions.owner_read;
        if (node.group === this.current_group) return node.permissions.group_read;
        return node.permissions.other_read;
    }

    hasWritePermission(node) {
        if (!node) return false;
        if (this.current_user === 'root') return true;
        if (node.owner === this.current_user) return node.permissions.owner_write;
        if (node.group === this.current_group) return node.permissions.group_write;
        return node.permissions.other_write;
    }

    hasExecutePermission(node) {
        if (!node) return false;
        if (this.current_user === 'root') return true;
        if (node.owner === this.current_user) return node.permissions.owner_execute;
        if (node.group === this.current_group) return node.permissions.group_execute;
        return node.permissions.other_execute;
    }

    changeDirectory(path) {
        const targetPath = this.normalizePath(path);
        const node = this.findNode(targetPath);
        
        if (!node || !node.isDirectory()) {
            return false;
        }
        
        if (!this.hasExecutePermission(node)) {
            return false;
        }
        
        this.current_path = targetPath;
        if (this.current_path !== '/' && !this.current_path.endsWith('/')) {
            this.current_path += '/';
        }
        return true;
    }

    createFile(path, content = '') {
        const normalized = this.normalizePath(path);
        const parts = this.splitPath(normalized);
        
        if (parts.length === 0) return false;
        
        const filename = parts.pop();
        
        let parent = this.root;
        for (const part of parts) {
            if (!parent.children.has(part)) {
                // Créer le répertoire parent s'il n'existe pas
                const newDir = new FakeNode(part, NodeType.DIRECTORY, this.current_user, this.current_group);
                parent.children.set(part, newDir);
            }
            parent = parent.children.get(part);
            if (!parent.isDirectory()) return false;
        }
        
        if (!this.hasWritePermission(parent)) {
            return false;
        }
        
        const newFile = new FakeNode(filename, NodeType.FILE, this.current_user, this.current_group);
        newFile.content = content;
        parent.children.set(filename, newFile);
        
        return true;
    }

    createDirectory(path) {
        const normalized = this.normalizePath(path);
        if (normalized === '/') return true; // Root existe déjà
        
        const parts = this.splitPath(normalized);
        let current = this.root;
        
        for (const part of parts) {
            if (!current.children.has(part)) {
                if (!this.hasWritePermission(current)) {
                    return false;
                }
                const newDir = new FakeNode(part, NodeType.DIRECTORY, this.current_user, this.current_group);
                current.children.set(part, newDir);
            }
            current = current.children.get(part);
            if (!current.isDirectory()) return false;
        }
        
        return true;
    }

    readFile(path) {
        const node = this.findNode(path);
        if (!node || !node.isFile()) {
            return '';
        }
        
        if (!this.hasReadPermission(node)) {
            return '';
        }
        
        // Si le fichier a un chemin vers du contenu réel, charger depuis ce fichier
        if (node.real_content_path) {
            const realContent = this.loadRealContent(node.real_content_path);
            if (realContent) {
                return realContent;
            }
        }
        
        return node.content;
    }

    writeFile(path, content, append = false) {
        let node = this.findNode(path);
        if (!node) {
            // Le fichier n'existe pas, le créer
            return this.createFile(path, content);
        }
        
        if (!node.isFile() || !this.hasWritePermission(node)) {
            return false;
        }
        
        if (append) {
            node.content += content;
        } else {
            node.content = content;
        }
        
        node.modification_time = new Date();
        return true;
    }

    listDirectory(path = '.') {
        const node = this.findNode(path);
        
        if (!node || !node.isDirectory() || !this.hasReadPermission(node)) {
            return [];
        }
        
        const result = Array.from(node.children.keys());
        return result.sort();
    }

    listDirectoryDetailed(path = '.') {
        const node = this.findNode(path);
        if (!node || !node.isDirectory() || !this.hasReadPermission(node)) {
            return '';
        }
        
        const items = Array.from(node.children.entries()).sort();
        let result = '';
        
        for (const [name, child] of items) {
            const typeChar = child.isDirectory() ? 'd' : '-';
            const size = child.isFile() ? child.content.length : 4096;
            const timeStr = child.modification_time.toDateString();
            
            result += `${typeChar}${child.permissions.toString()} ${child.owner} ${child.group} ${size} ${timeStr} ${name}\n`;
        }
        
        return result;
    }

    exists(path) {
        return this.findNode(path) !== null;
    }

    isDirectory(path) {
        const node = this.findNode(path);
        return node && node.isDirectory();
    }

    isFile(path) {
        const node = this.findNode(path);
        return node && node.isFile();
    }

    changePermissions(path, permissions) {
        const node = this.findNode(path);
        if (!node) return false;
        
        node.permissions = Permissions.fromString(permissions);
        return true;
    }

    changeOwner(path, newOwner, newGroup = '') {
        const node = this.findNode(path);
        if (!node) return false;
        
        node.owner = newOwner;
        if (newGroup) {
            node.group = newGroup;
        }
        return true;
    }

    setCurrentUser(user, group = '') {
        this.current_user = user;
        if (group) {
            this.current_group = group;
        }
    }

    getCurrentPath() {
        return this.current_path;
    }

    getCurrentUser() {
        return this.current_user;
    }

    getCurrentGroup() {
        return this.current_group;
    }

    printTree(path = '/', depth = 0) {
        const node = this.findNode(path);
        if (!node || !this.hasReadPermission(node)) return '';
        
        let result = '';
        const indent = '  '.repeat(depth);
        result += indent + node.name;
        if (node.isDirectory()) result += '/';
        result += '\n';
        
        if (node.isDirectory()) {
            for (const [name, child] of Array.from(node.children.entries()).sort()) {
                result += this.printTree(path === '/' ? '/' + name : path + '/' + name, depth + 1);
            }
        }
        
        return result;
    }

    deleteFile(path) {
        const normalized = this.normalizePath(path);
        const parts = this.splitPath(normalized);
        
        if (parts.length === 0) return false;
        
        const filename = parts.pop();
        let parent = this.root;
        
        for (const part of parts) {
            if (!parent.children.has(part)) return false;
            parent = parent.children.get(part);
        }
        
        if (!this.hasWritePermission(parent) || !parent.children.has(filename)) {
            return false;
        }
        
        parent.children.delete(filename);
        return true;
    }

    deleteDirectory(path) {
        const node = this.findNode(path);
        if (!node || !node.isDirectory()) return false;
        
        // Vérifier que le répertoire est vide
        if (node.children.size > 0) return false;
        
        return this.deleteFile(path);
    }
    
    // Vérifier si une commande existe dans le PATH
    commandExists(commandName) {
        const paths = ['/bin', '/usr/bin', '/sbin', '/usr/sbin'];
        
        for (const path of paths) {
            const fullPath = `${path}/${commandName}`;
            const node = this.findNode(fullPath);
            if (node && node.isFile() && node.permissions.other_execute) {
                return fullPath;
            }
        }
        return null;
    }
}

// Export pour Node.js et navigateur
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FakeFileSystem, Permissions, NodeType, FakeNode };
}

if (typeof window !== 'undefined') {
    window.FakeFileSystem = FakeFileSystem;
    window.Permissions = Permissions;
    window.NodeType = NodeType;
    window.FakeNode = FakeNode;
}