const { Server } = require('ssh2');
const { FakeShell } = require('./fakeShel-js/main.js');
const fs = require('fs');

const server = new Server({
    hostKeys: [fs.readFileSync('host.key')]
}, (client) => {
    console.log('Client connecté nya~');
    
    // Récupérer l'IP réelle du client dès la connexion
    let clientIP = '127.0.0.1'; // IP par défaut
    try {
        if (client._sock && client._sock.remoteAddress) {
            clientIP = client._sock.remoteAddress;
        } else if (client.stream && client.stream.remoteAddress) {
            clientIP = client.stream.remoteAddress;
        }
        console.log(`IP du client détectée: ${clientIP}`);
    } catch (err) {
        console.log('Impossible de détecter l\'IP, utilisation de l\'IP par défaut');
    }
    
    const shell = new FakeShell('test');
    shell.setClientIP(clientIP);
    
    shell.initFileSystem().then(() => {
        console.log('Système de fichiers initialisé pour le client nya~');
    }).catch((err) => {
        console.error('Erreur lors de l\'initialisation du système de fichiers:', err);
    });
    client.on('authentication', (ctx) => {
        shell.logger.logLogin(clientIP, ctx.username, ctx.password, true);
        ctx.accept();
    });

    client.on('ready', () => {
        client.on('session', (accept) => {
            const session = accept();
            session.on('pty', (accept) => accept());
            session.on('shell', (accept) => {
                const stream = accept();
                stream.write(shell.getHeader().replace(/\n/g, '\r\n'));
                stream.write(shell.createCommandPrompt());

                let commandBuffer = '';
                let cursorPos = 0;
                let commandHistory = [];
                let historyIndex = -1;
                let currentCommandBackup = '';

                stream.on('data', async (data) => {
                    //if le charactère est 7f (backspace)
                    if (data[0] === 0x7f) {
                        // Backspace - Supprimer le caractère avant le curseur
                        if (commandBuffer.length > 0 && cursorPos > 0) {
                            commandBuffer = commandBuffer.slice(0, cursorPos - 1) + commandBuffer.slice(cursorPos);
                            cursorPos--;
                            // Réécrire la ligne depuis la position actuelle
                            const remaining = commandBuffer.slice(cursorPos);
                            stream.write('\x1b[D\x1b[K' + remaining);
                            // Repositionner le curseur
                            for (let i = 0; i < remaining.length; i++) {
                                stream.write('\x1b[D');
                            }
                        }
                    } else if (data[0] === 0x03) { // Ctrl+C
                        stream.write('^C\r\n');
                        commandBuffer = '';
                        stream.write(shell.createCommandPrompt());
                    } else if (data[0] === 0x04) { // Ctrl+D
                        stream.write('Bye bye nya~!\r\n');
                        client.end();
                    } else if (data[0] === 0x09) { // Tab - Autocomplétion
                        const words = commandBuffer.split(' ');
                        const currentWord = words[words.length - 1];
                        const commandPart = words[0] || '';
                        
                        // Autocomplétion des commandes si c'est le premier mot
                        if (words.length === 1 && currentWord.length > 0) {
                            const availableCommands = [
                                'ls', 'cat', 'pwd', 'cd', 'mkdir', 'rm', 'touch', 'tree',
                                'find', 'grep', 'head', 'tail', 'wc', 'cp', 'mv', 'ln',
                                'ps', 'free', 'whoami', 'echo', 'clear', 'history', 'ping',
                                'uname', 'date', 'sudo', 'chmod', 'chown', 'awk', 'sed',
                                'sort', 'uniq', 'cut', 'curl', 'wget', 'ssh', 'netstat',
                                'systemctl', 'nmap', 'exit'
                            ];
                            
                            const matches = availableCommands.filter(cmd => 
                                cmd.startsWith(currentWord)
                            );
                            
                            if (matches.length === 1) {
                                // Une seule correspondance - compléter automatiquement
                                const completion = matches[0].slice(currentWord.length);
                                commandBuffer += completion;
                                stream.write(completion);
                                cursorPos += completion.length;
                            } else if (matches.length > 1) {
                                // Plusieurs correspondances - afficher les options
                                stream.write('\r\n');
                                const maxLen = Math.max(...matches.map(m => m.length));
                                const cols = Math.floor(80 / (maxLen + 2));
                                for (let i = 0; i < matches.length; i += cols) {
                                    const row = matches.slice(i, i + cols);
                                    stream.write(row.map(cmd => cmd.padEnd(maxLen + 1)).join(' ') + '\r\n');
                                }
                                stream.write(shell.createCommandPrompt() + commandBuffer);
                                // Repositionner le curseur
                                if (cursorPos < commandBuffer.length) {
                                    const moveLeft = commandBuffer.length - cursorPos;
                                    for (let i = 0; i < moveLeft; i++) {
                                        stream.write('\x1b[D');
                                    }
                                }
                            }
                        } else if (words.length > 1) {
                            // Autocomplétion des fichiers/dossiers
                            try {
                                const currentPath = shell.getCurrentPath();
                                const fs = shell.getFileSystem().fs;
                                const items = fs.listDirectory(currentPath);
                                
                                const matches = items.filter(item => 
                                    item.startsWith(currentWord)
                                );
                                
                                if (matches.length === 1) {
                                    const completion = matches[0].slice(currentWord.length);
                                    const beforeCursor = commandBuffer.slice(0, cursorPos - currentWord.length);
                                    const afterCursor = commandBuffer.slice(cursorPos);
                                    commandBuffer = beforeCursor + matches[0] + afterCursor;
                                    
                                    // Effacer et réécrire la partie modifiée
                                    stream.write('\x1b[K' + matches[0] + afterCursor);
                                    cursorPos = beforeCursor.length + matches[0].length;
                                    
                                    // Repositionner le curseur
                                    for (let i = 0; i < afterCursor.length; i++) {
                                        stream.write('\x1b[D');
                                    }
                                } else if (matches.length > 1) {
                                    // Afficher les correspondances
                                    stream.write('\r\n');
                                    const maxLen = Math.max(...matches.map(m => m.length));
                                    const cols = Math.floor(80 / (maxLen + 2));
                                    for (let i = 0; i < matches.length; i += cols) {
                                        const row = matches.slice(i, i + cols);
                                        stream.write(row.map(item => item.padEnd(maxLen + 1)).join(' ') + '\r\n');
                                    }
                                    stream.write(shell.createCommandPrompt() + commandBuffer);
                                    // Repositionner le curseur
                                    if (cursorPos < commandBuffer.length) {
                                        const moveLeft = commandBuffer.length - cursorPos;
                                        for (let i = 0; i < moveLeft; i++) {
                                            stream.write('\x1b[D');
                                        }
                                    }
                                }
                            } catch (err) {
                                // Ignorer les erreurs d'autocomplétion
                            }
                        }
                    } else if (data[0] === 0x0d) { // Carriage return
                        commandBuffer += '\n';
                        stream.write('\r\n');
                        cursorPos = commandBuffer.length;
                        // effacer la ligne actuelle et reecrire
                    } else if (data[0] === 0x1b && data[1] === 0x5b) { // Flèche gauche
                        if (data[2] === 0x44 && cursorPos > 0) {
                            stream.write(data.toString());
                            cursorPos--;
                        }else if (data[2] === 0x43 && cursorPos < commandBuffer.length) { // Flèche droite
                            stream.write(data.toString());
                            cursorPos++;
                        } else if (data[2] === 0x41) { // Flèche haut
                            if (commandHistory.length > 0 && historyIndex < commandHistory.length - 1) {
                                if (historyIndex === -1) {
                                    currentCommandBackup = commandBuffer;
                                }
                                historyIndex++;
                                // Effacer la ligne complètement et repositionner
                                stream.write('\x1b[2K\x1b[G'); // Effacer ligne + retour début
                                commandBuffer = commandHistory[commandHistory.length - 1 - historyIndex];
                                stream.write(shell.createCommandPrompt().slice(0, -2) + commandBuffer); // Prompt + commande
                                cursorPos = commandBuffer.length;
                            }
                        } else if (data[2] === 0x42) { // Flèche bas
                            if (historyIndex > 0) {
                                historyIndex--;
                                stream.write('\x1b[2K\x1b[G');
                                commandBuffer = commandHistory[commandHistory.length - 1 - historyIndex];
                                stream.write(shell.createCommandPrompt().slice(0, -2) + commandBuffer);
                                cursorPos = commandBuffer.length;
                            } else if (historyIndex === 0) {
                                historyIndex--;
                                stream.write('\x1b[2K\x1b[G');
                                commandBuffer = currentCommandBackup || '';
                                stream.write(shell.createCommandPrompt().slice(0, -2) + commandBuffer);
                                cursorPos = commandBuffer.length;
                            }
                        } else if (data[2] === 0x33 && data[3] === 0x7e) { // Delete key
                            if (cursorPos < commandBuffer.length) {
                                commandBuffer = commandBuffer.slice(0, cursorPos) + commandBuffer.slice(cursorPos + 1);
                                // Réécrire la ligne depuis la position du curseur
                                const remaining = commandBuffer.slice(cursorPos);
                                stream.write('\x1b[K' + remaining);
                                // Repositionner le curseur
                                for (let i = 0; i < remaining.length; i++) {
                                    stream.write('\x1b[D');
                                }
                            }
                        } else if (data[2] === 0x48) { // Home key
                            // Déplacer le curseur au début de la ligne
                            while (cursorPos > 0) {
                                stream.write('\x1b[D');
                                cursorPos--;
                            }
                        } else if (data[2] === 0x46) { // End key  
                            // Déplacer le curseur à la fin de la ligne
                            while (cursorPos < commandBuffer.length) {
                                stream.write('\x1b[C');
                                cursorPos++;
                            }
                        }
                    } else {
                        // Gestion de l'insertion de caractères à la position du curseur
                        const char = data.toString();
                        if (char.charCodeAt(0) >= 32 && char.charCodeAt(0) < 127) { // Caractères imprimables
                            if (cursorPos < commandBuffer.length) {
                                // Insertion au milieu
                                commandBuffer = commandBuffer.slice(0, cursorPos) + char + commandBuffer.slice(cursorPos);
                                // Réécrire depuis la position du curseur
                                const remaining = commandBuffer.slice(cursorPos);
                                stream.write(remaining);
                                // Repositionner le curseur
                                for (let i = 1; i < remaining.length; i++) {
                                    stream.write('\x1b[D');
                                }
                            } else {
                                // Ajout à la fin
                                commandBuffer += char;
                                stream.write(char);
                            }
                            cursorPos++;
                        }
                    }
                    if (commandBuffer.endsWith('\n')) {
                        commandHistory.push(commandBuffer.trim());
                        const command = commandBuffer.trim();
                        commandBuffer = '';
                        cursorPos = 0;
                        console.log('Commande reçue:', command);

                        if (command === 'exit') {
                            shell.logger.logLogout(clientIP, 'test', 'exit_command');
                            stream.write('Bye bye nya~!\r\n');
                            client.end();
                            return;
                        }

                        try {
                            const output = await shell.executeCommand(command);
                            if (output && typeof output === 'string') {
                                stream.write(output.replace(/\n/g, '\r\n'));
                            }
                        } catch (err) {
                            stream.write(`Erreur: ${err.message}\r\n`);
                        }
                        stream.write(shell.createCommandPrompt());
                    }
                    // Logs de débogage (commentés pour production)
                    // console.log('Données reçues du client:', data, 'Buffer actuel:', commandBuffer, 'Cursor position:', cursorPos);
                    // console.table(commandHistory);
                    // console.log('History index:', historyIndex);
                });
            });
        });
    });
    client.on('end', (ctx) => {
        console.log('Client déconnecté nya~');
        shell.logger.logLogout(clientIP, 'test', 'client_end');
    });
    
    client.on('close', () => {
        console.log('Connexion fermée nya~');
        shell.logger.logLogout(clientIP, 'test', 'connection_close');
    });
    
    client.on('error', (err) => {
        console.log('Erreur client nya~:', err.message);
        shell.logger.logLogout(clientIP, 'test', `error: ${err.message}`);
    });
});

const PORT = process.env.SSH_PORT || 22;
const HOST = process.env.SSH_HOST || '0.0.0.0';

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Erreur: Le port ${PORT} est déjà utilisé.`);
        console.log(`💡 Suggestion: Utilisez un autre port avec SSH_PORT=2223 bun ./index.js`);
        process.exit(1);
    } else if (err.code === 'EACCES') {
        console.error(`❌ Erreur: Permissions insuffisantes pour le port ${PORT}.`);
        console.log(`💡 Suggestion: Utilisez un port > 1024 ou exécutez avec sudo`);
        process.exit(1);
    } else {
        console.error('❌ Erreur serveur SSH:', err);
        process.exit(1);
    }
});

server.listen(PORT, HOST, () => {
    console.log(`🐝 Serveur SSH honeypot actif sur ${HOST}:${PORT} nya~`);
    console.log(`🎯 Connexion test: ssh test@${HOST === '0.0.0.0' ? 'localhost' : HOST} -p ${PORT}`);
    console.log(`🔑 Mot de passe: miaou`);
});
