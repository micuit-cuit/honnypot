/**
 * Parser de commandes avec support des pipes et redirections
 */

class CommandParser {
    constructor() {
        this.commands = [];
        this.redirections = [];
    }
    
    parse(input) {
        const result = {
            commands: [],
            redirections: {
                stdout: null,
                stderr: null,
                append: false
            }
        };
        
        let cleanInput = input;
        
        if (cleanInput.includes(' > ')) {
            const parts = cleanInput.split(' > ');
            cleanInput = parts[0];
            result.redirections.stdout = parts[1].trim();
            result.redirections.append = false;
        }
        
        if (cleanInput.includes(' >> ')) {
            const parts = cleanInput.split(' >> ');
            cleanInput = parts[0];
            result.redirections.stdout = parts[1].trim();
            result.redirections.append = true;
        }
        
        if (cleanInput.includes(' 2> ')) {
            const parts = cleanInput.split(' 2> ');
            cleanInput = parts[0];
            result.redirections.stderr = parts[1].trim();
        }
        
        const pipeSegments = cleanInput.split(' | ');
        
        result.commands = pipeSegments.map(segment => {
            return segment.trim().split(/\s+/);
        });
        
        return result;
    }
}

class CommandExecutor {
    constructor(fs, commandsModule) {
        this.fs = fs;
        this.commandsModule = commandsModule;
        this.parser = new CommandParser();
    }
    
    async execute(input) {
        if (!input || !input.trim()) return '';
        
        const parsed = this.parser.parse(input);
        let currentOutput = '';
        
        for (let i = 0; i < parsed.commands.length; i++) {
            const commandParts = parsed.commands[i];
            const commandName = commandParts[0];
            
            const commandPath = this.fs.commandExists(commandName);
            if (!commandPath) {
                return `${commandName}: command not found\n`;
            }
            
            try {
                let output;
                
                if (i === 0) {
                    const result = this.commandsModule.executeCommand(commandParts.join(' '), this.fs);
                    output = result instanceof Promise ? await result : result;
                } else {
                    const result = this.executeWithInput(commandParts, currentOutput);
                    output = result instanceof Promise ? await result : result;
                }
                
                currentOutput = output || '';
                
            } catch (error) {
                return `${commandName}: command failed: ${error.message}\n`;
            }
        }
        
        if (parsed.redirections.stdout) {
            this.handleRedirection(currentOutput, parsed.redirections.stdout, parsed.redirections.append);
            return '';
        }
        
        return currentOutput;
    }
    
    executeWithInput(commandParts, input) {
        const commandName = commandParts[0];
        
        if (commandName === 'grep') {
            return this.executeGrepWithInput(commandParts, input);
        } else if (commandName === 'sort') {
            return this.executeSortWithInput(commandParts, input);
        } else if (commandName === 'uniq') {
            return this.executeUniqWithInput(commandParts, input);
        } else if (commandName === 'awk') {
            return this.executeAwkWithInput(commandParts, input);
        } else if (commandName === 'sed') {
            return this.executeSedWithInput(commandParts, input);
        } else if (commandName === 'cut') {
            return this.executeCutWithInput(commandParts, input);
        } else if (commandName === 'head') {
            return this.executeHeadWithInput(commandParts, input);
        } else if (commandName === 'tail') {
            return this.executeTailWithInput(commandParts, input);
        } else {
            const result = this.commandsModule.executeCommand(commandParts.join(' '), this.fs);
            return result instanceof Promise ? result : Promise.resolve(result);
        }
    }
    
    executeGrepWithInput(parts, input) {
        if (parts.length < 2) return input;
        
        const pattern = parts[1];
        const lines = input.split('\n');
        const matches = lines.filter(line => line.includes(pattern));
        return matches.join('\n') + (matches.length > 0 ? '\n' : '');
    }
    
    executeSortWithInput(parts, input) {
        let reverse = false;
        let numeric = false;
        
        for (let i = 1; i < parts.length; i++) {
            if (parts[i] === '-r') reverse = true;
            if (parts[i] === '-n') numeric = true;
        }
        
        let lines = input.split('\n').filter(line => line.length > 0);
        
        if (numeric) {
            lines.sort((a, b) => parseFloat(a) - parseFloat(b));
        } else {
            lines.sort();
        }
        
        if (reverse) lines.reverse();
        
        return lines.join('\n') + (lines.length > 0 ? '\n' : '');
    }
    
    executeUniqWithInput(parts, input) {
        const lines = input.split('\n').filter(line => line.length > 0);
        const uniqueLines = [...new Set(lines)];
        return uniqueLines.join('\n') + (uniqueLines.length > 0 ? '\n' : '');
    }
    
    executeAwkWithInput(parts, input) {
        if (parts.length < 2) return input;
        
        const program = parts[1];
        const lines = input.split('\n');
        let result = '';
        
        lines.forEach(line => {
            if (program === '{print $1}') {
                const fields = line.trim().split(/\s+/);
                result += (fields[0] || '') + '\n';
            } else if (program === '{print $2}') {
                const fields = line.trim().split(/\s+/);
                result += (fields[1] || '') + '\n';
            } else {
                result += line + '\n';
            }
        });
        
        return result;
    }
    
    executeSedWithInput(parts, input) {
        if (parts.length < 2) return input;
        
        const script = parts[1];
        let lines = input.split('\n');
        
        if (script.startsWith('s/')) {
            const scriptParts = script.split('/');
            if (scriptParts.length >= 3) {
                const pattern = scriptParts[1];
                const replacement = scriptParts[2];
                const flags = scriptParts[3] || '';
                
                const regex = new RegExp(pattern, flags.includes('g') ? 'g' : '');
                lines = lines.map(line => line.replace(regex, replacement));
            }
        }
        
        return lines.join('\n');
    }
    
    executeCutWithInput(parts, input) {
        return input;
    }
    
    executeHeadWithInput(parts, input) {
        let lineCount = 10;
        
        for (let i = 1; i < parts.length; i++) {
            if (parts[i] === '-n' && i + 1 < parts.length) {
                lineCount = parseInt(parts[i + 1]) || 10;
                break;
            } else if (parts[i].startsWith('-n')) {
                lineCount = parseInt(parts[i].substring(2)) || 10;
                break;
            } else if (parts[i].startsWith('-') && !isNaN(parseInt(parts[i].substring(1)))) {
                lineCount = parseInt(parts[i].substring(1));
                break;
            }
        }
        
        const lines = input.split('\n');
        return lines.slice(0, lineCount).join('\n') + '\n';
    }
    
    executeTailWithInput(parts, input) {
        let lineCount = 10;
        
        for (let i = 1; i < parts.length; i++) {
            if (parts[i] === '-n' && i + 1 < parts.length) {
                lineCount = parseInt(parts[i + 1]) || 10;
                break;
            } else if (parts[i].startsWith('-n')) {
                lineCount = parseInt(parts[i].substring(2)) || 10;
                break;
            } else if (parts[i].startsWith('-') && !isNaN(parseInt(parts[i].substring(1)))) {
                lineCount = parseInt(parts[i].substring(1));
                break;
            }
        }
        
        const lines = input.split('\n');
        return lines.slice(-lineCount).join('\n') + '\n';
    }
    
    handleRedirection(output, file, append = false) {
        if (append) {
            const existingContent = this.fs.readFile(file) || '';
            this.fs.writeFile(file, existingContent + output);
        } else {
            this.fs.writeFile(file, output);
        }
    }
}

module.exports = { CommandParser, CommandExecutor };