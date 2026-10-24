// Observe the installed live plugin; disk parsing is comparison only, never loader substitution.
const fs=require('fs'), crypto=require('crypto'), assert=require('assert/strict'), cp=require('child_process');
const path=require('path');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
const [id,phase]=process.argv.slice(2), q='qualification/root5078',rt='runtime/root5084-private';
const manifest=JSON.parse(fs.readFileSync('qualification/root4958/CASE-MANIFEST.json'));
assert.equal(hash(fs.readFileSync('qualification/root4958/CASE-MANIFEST.json')),'bb1306821bfc8aa4549d85f5ff4a8dd776ead35d2b289016ade66cb6b1aea9c1');
const c=manifest.cases.find(c=>c.id===id);assert(c);
const host=JSON.parse(fs.readFileSync(rt+'/HOST.json'));
const targets=await(await fetch(`http://127.0.0.1:${host.cdpPort}/json/list`)).json();
const target=targets.find(t=>t.url==='app://obsidian.md/index.html');assert(target);
const ws=new WebSocket(target.webSocketDebuggerUrl);
const expression=`(()=>({vault:app.vault.adapter.basePath,settings:app.plugins.getPlugin('yolo')?.settings,unreadable:!!app.plugins.getPlugin('yolo')?.unreadableSettingsNotice,enabled:app.plugins.enabledPlugins.has('yolo'),notices:[...document.querySelectorAll('.notice')].map(e=>e.textContent),appTitle:document.title,versions:process.versions}))()`;
const live=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{ws.close();reject(Error('Live observer timed out'))},10000);ws.onopen=()=>ws.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression,returnByValue:true}}));ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.id!==1)return;clearTimeout(timer);ws.close();if(m.error||m.result.exceptionDetails)reject(Error(JSON.stringify(m)));else resolve(m.result.result.value)};});
// Obsidian 1.14 settings are a separate BrowserWindow; save notices can land there.
const noticeTargets=[{id:target.id,url:target.url,notices:live.notices}];
for(const t of targets.filter(t=>t.type==='page'&&t.id!==target.id&&!t.url.startsWith('devtools:'))){
 const notices=await new Promise((resolve,reject)=>{const other=new WebSocket(t.webSocketDebuggerUrl);const timer=setTimeout(()=>{other.close();reject(Error('Notice observer timeout'))},5000);other.onopen=()=>other.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression:"[...document.querySelectorAll('.notice')].map(e=>e.textContent)",returnByValue:true}}));other.onmessage=e=>{const m=JSON.parse(e.data);if(m.id!==1)return;clearTimeout(timer);other.close();if(m.error||m.result.exceptionDetails)reject(Error(JSON.stringify(m)));else resolve(m.result.result.value)};});noticeTargets.push({id:t.id,url:t.url,notices});live.notices.push(...notices);
}
const vault=path.resolve(rt,'vaults',id);assert.equal(live.vault,vault);assert(live.enabled);assert(live.settings);
const file=vault+'/.obsidian/plugins/yolo/data.json',bytes=fs.readFileSync(file);
const members=Object.fromEntries(Object.entries(manifest.builtMembers).map(([name,v])=>{const b=fs.readFileSync(vault+'/.obsidian/plugins/yolo/'+name);assert.equal(hash(b),v.sha256);return[name,{bytes:b.length,sha256:hash(b)}]}));
const project=(s)=>({chatModelId:s.chatModelId,chatTitleModelId:s.chatTitleModelId,models:s.chatModels.map((m,i)=>Object.fromEntries(Object.keys(c.expected.models[i]).map(k=>[k,m[k]]))),continuationModelId:s.continuationOptions.continuationModelId,tabCompletionModelId:s.continuationOptions.tabCompletionModelId,assistantModelIds:['writer','other'].map(id=>s.assistants.find(a=>a.id===id)?.modelId),reasoningLevelByModelId:s.chatOptions.reasoningLevelByModelId,delegation:s.mcp.builtinCapabilityOptions.subagent_delegation,systemPrompt:s.systemPrompt,providers:s.providers,cliModelIdByRuntime:s.chatOptions.cliModelIdByRuntime});
let disk, result={id,phase,observedAt:new Date().toISOString(),appPid:host.ownedPids.filter(p=>p.role==='official extracted application').at(-1).pid,targetId:target.id,vault,appTitle:live.appTitle,versions:live.versions,enabled:live.enabled,notices:live.notices,noticeTargets,installedMembers:members,data:{bytes:bytes.length,sha256:hash(bytes)},liveSettingsSha256:hash(JSON.stringify(live.settings))};
if(id==='malformed'&&!phase.includes('recovery')){assert.equal(hash(bytes),c.sha256);assert(live.unreadable);assert(live.notices.some(n=>n.includes('could not read its settings file')));if(phase==='saved'){assert(live.notices.some(n=>n.includes('Not saved:')));assert.notEqual(live.settings.chatOptions.chatFontScale,1.05);result.actualUiSaveRefused=true;}result.loadDefaultVersion=live.settings.version;result.malformedBytesUnchanged=true;result.liveFontScale=live.settings.chatOptions.chatFontScale;}
else {const expected=id==='malformed'?manifest.cases.find(x=>x.id==='restored-v89').expected:c.expected;
// Recovery uses the sealed valid fixture oracle with identical expected keys.
if(id==='malformed'){c.expected=expected;assert.equal(live.unreadable,false);}
assert.equal(live.settings.version,90);assert.deepEqual(project(live.settings),expected);result.liveProjection=project(live.settings);
if(phase==='initial'||phase==='recovery-initial'){assert.equal(hash(bytes),id==='malformed'?manifest.cases.find(x=>x.id==='restored-v89').sha256:c.sha256);result.diskIsOriginalFixture=true;}
else {disk=JSON.parse(bytes);assert.equal(disk.version,90);assert.deepEqual(project(disk),expected);assert.equal(live.settings.chatOptions.chatFontScale,1.05);assert.equal(disk.chatOptions.chatFontScale,1.05);result.persistedProjection=project(disk);result.chatFontScale=1.05;result.metadata=disk.__meta;}
}
fs.mkdirSync(q+'/observations',{recursive:true});const reportPath=`${q}/observations/${id}-${phase}.json`;fs.writeFileSync(fs.existsSync(reportPath)?`${q}/observations/${id}-${phase}-${result.appPid}.json`:reportPath,JSON.stringify(result,null,2)+'\n');
fs.writeFileSync(`${rt}/${id}-${phase}-live.json`,JSON.stringify(live,null,2)+'\n');console.log(JSON.stringify({id,phase,status:'pass',appPid:result.appPid,dataSha256:result.data.sha256,liveSettingsSha256:result.liveSettingsSha256}));
})().catch(e=>{console.error(e);process.exitCode=1});
