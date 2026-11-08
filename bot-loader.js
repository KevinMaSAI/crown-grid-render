'use strict';
const fs=require('node:fs'),path=require('node:path');
let cached=null,cachedKey=null,cachedVersion='unversioned',failedKey=null;
function manifest(){try{return JSON.parse(fs.readFileSync(path.join(__dirname,'bot-version.json'),'utf8'));}catch{return {version:cachedVersion,build:cachedKey||'initial'};}}
function loadStrongBot(){let m=manifest(),key=String(m.version)+':'+String(m.build);if(cached&&(key===cachedKey||key===failedKey))return cached;
 try{for(let id of Object.keys(require.cache))if(path.dirname(id)===__dirname&&/^bot-.*\.js$/.test(path.basename(id))&&id!==__filename)delete require.cache[id];let C=require('./bot-strong').StrongBot;if(typeof C!=='function'||typeof C.prototype.decide!=='function')throw Error('Invalid bot export');cached=C;cachedKey=key;cachedVersion=String(m.version);failedKey=null;return C;}catch(e){failedKey=key;if(cached){console.error('Bot update rejected; retaining previous bot:',e.message);return cached;}throw e;}}
function loadedVersion(){return cachedVersion;}
function loadedBuild(){return cachedKey;}
function availableVersion(){return String(manifest().version);}
module.exports={loadStrongBot,loadedVersion,loadedBuild,availableVersion};
