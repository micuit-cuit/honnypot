/**
 * Commande wget - Utilitaire de téléchargement réseau
 * Usage: wget [OPTION]... [URL]...
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const HoneypotLogger = require('../logger');

function executeWGET(parts, fs, clientIP = '127.0.0.1', username = 'root') {
    if (parts.length < 2) return 'wget: missing URL\n';
    
    // Initialiser le logger
    const logger = new HoneypotLogger();
    
    // Compteur de requêtes global pour simuler la coupure
    if (!global.wgetRequestCount) {
        global.wgetRequestCount = 0;
    }
    
    let urls = [];
    let output = null;
    let quiet = false;
    let verbose = false;
    let continue_ = false;
    let userAgent = 'Wget/1.20.3 (linux-gnu)';
    let tries = 3;
    
    // Parser les options
    for (let i = 1; i < parts.length; i++) {
        const arg = parts[i];
        
        if (arg === '-O' && i + 1 < parts.length) {
            output = parts[++i];
        } else if (arg === '-q' || arg === '--quiet') {
            quiet = true;
        } else if (arg === '-v' || arg === '--verbose') {
            verbose = true;
        } else if (arg === '-c' || arg === '--continue') {
            continue_ = true;
        } else if (arg === '--user-agent' && i + 1 < parts.length) {
            userAgent = parts[++i];
        } else if (arg === '-t' && i + 1 < parts.length) {
            tries = parseInt(parts[++i]) || 3;
        } else if (arg === '--help') {
            return `GNU Wget 1.20.3\n\nUsage: wget [OPTION]... [URL]...\n\nOptions:\n  -O file        save documents to FILE\n  -q, --quiet    quiet mode\n  -v, --verbose  verbose mode\n  -c, --continue continue partial downloads\n  --user-agent=AGENT  identify as AGENT\n  -t NUMBER      set number of retries to NUMBER\n`;
        } else if (!arg.startsWith('-')) {
            urls.push(arg);
        }
    }
    
    if (urls.length === 0) {
        return 'wget: missing URL\nUsage: wget [OPTION]... [URL]...\n';
    }
    
    return new Promise(async (resolve) => {
        let result = '';
        
        for (const url of urls) {
            // Incrémenter le compteur de requêtes
            global.wgetRequestCount++;
            
            // Après 20 requêtes, simuler une coupure de connexion
            if (global.wgetRequestCount > 20) {
                const hostname = url.split('/')[2] || 'localhost';
                const errors = [
                    `--${new Date().toISOString().slice(0, 19)}--  ${url}\nResolving ${hostname}... failed: Name or service not known.\nwget: unable to resolve host address '${hostname}'`,
                    `--${new Date().toISOString().slice(0, 19)}--  ${url}\nResolving ${hostname}... 1.2.3.4\nConnecting to ${hostname}|1.2.3.4|:80... failed: Connection refused.`,
                    `--${new Date().toISOString().slice(0, 19)}--  ${url}\nResolving ${hostname}... 1.2.3.4\nConnecting to ${hostname}|1.2.3.4|:80... failed: Network is unreachable.`,
                    `--${new Date().toISOString().slice(0, 19)}--  ${url}\nResolving ${hostname}... 1.2.3.4\nConnecting to ${hostname}|1.2.3.4|:80... failed: Connection timed out.`
                ];
                resolve(errors[Math.floor(Math.random() * errors.length)] + '\n');
                return;
            }
        
            try {
                await new Promise((urlResolve, urlReject) => {
                    const parsedUrl = new URL(url);
                    const isHttps = parsedUrl.protocol === 'https:';
                    const requestModule = isHttps ? https : http;
                    const filename = output || url.split('/').pop() || 'index.html';
                    
                    if (!quiet) {
                        result += `--${new Date().toISOString().slice(0, 19)}--  ${url}\n`;
                        result += `Resolving ${parsedUrl.hostname}... `;
                    }
                    
                    const options = {
                        hostname: parsedUrl.hostname,
                        port: parsedUrl.port || (isHttps ? 443 : 80),
                        path: parsedUrl.pathname + parsedUrl.search,
                        method: 'GET',
                        headers: {
                            'User-Agent': userAgent
                        }
                    };
                    
                    const req = requestModule.request(options, (res) => {
                        if (!quiet) {
                            result += `${res.socket.remoteAddress || '1.2.3.4'}\n`;
                            result += `Connecting to ${parsedUrl.hostname}|${res.socket.remoteAddress || '1.2.3.4'}|:${options.port}... connected.\n`;
                            result += `HTTP request sent, awaiting response... ${res.statusCode} ${res.statusMessage}\n`;
                        }
                        
                        let data = '';
                        let totalLength = parseInt(res.headers['content-length']) || 0;
                        
                        if (!quiet) {
                            if (totalLength > 0) {
                                result += `Length: ${totalLength} (${(totalLength/1024).toFixed(1)}K) [${res.headers['content-type'] || 'application/octet-stream'}]\n`;
                            } else {
                                result += `Length: unspecified [${res.headers['content-type'] || 'application/octet-stream'}]\n`;
                            }
                            result += `Saving to: '${filename}'\n\n`;
                        }
                        
                        res.on('data', (chunk) => {
                            data += chunk;
                        });
                        
                        res.on('end', () => {
                            // Logger le téléchargement réussi
                            logger.logNetworkRequest(clientIP, username, parts.join(' '), url, true, {
                                statusCode: res.statusCode,
                                contentType: res.headers['content-type'],
                                contentLength: data.length,
                                savedFile: filename
                            });
                            
                            logger.logDownload(clientIP, username, url, filename, data.length, res.headers['content-type']);
                            
                            if (!quiet) {
                                const size = data.length;
                                const speed = (size / 1024 / (Math.random() * 0.5 + 0.1)).toFixed(2);
                                result += `${filename.padEnd(20)} 100%[===================>] ${(size/1024).toFixed(2)}K  ${speed}KB/s    in ${(Math.random() * 0.1 + 0.05).toFixed(3)}s\n\n`;
                                result += `${new Date().toISOString().slice(0, 19)} (${speed} KB/s) - '${filename}' saved [${size}/${totalLength || size}]\n\n`;
                            }
                            
                            fs.writeFile(filename, data);
                            urlResolve();
                        });
                    });
                    
                    req.on('error', (err) => {
                        // Logger l'erreur de requête
                        logger.logNetworkRequest(clientIP, username, parts.join(' '), url, false, {
                            error: err.message
                        });
                        
                        if (!quiet) {
                            result += `failed: ${err.message}\nwget: unable to resolve host address '${parsedUrl.hostname}'\n`;
                        }
                        urlResolve();
                    });
                    
                    req.end();
                });
            } catch (error) {
                if (!quiet) {
                    result += `wget: invalid URL '${url}'\n`;
                }
            }
        }
        
        resolve(result);
    });
}

module.exports = { executeWGET };