// Supported Electron DevTools protocol, connected only to this owned app.
const fs = require('fs')
const crypto = require('crypto')
const path = require('path')
;(async () => {
  const host = JSON.parse(fs.readFileSync('runtime/root5084-private/HOST.json','utf8'))
  const targets = await (await fetch(`http://127.0.0.1:${host.cdpPort}/json/list`)).json()
  const target = targets.find(t => t.type === 'page' && (process.env.CDP_SETTINGS ? t.title.startsWith('Settings -') : t.url.startsWith('app://obsidian.md/')))
  if (!target) throw new Error('No real application page target')
  const file=process.argv[2], expression=fs.readFileSync(file,'utf8')
  const startedAt=new Date().toISOString()
  const ws=new WebSocket(target.webSocketDebuggerUrl)
  const timer=setTimeout(()=>{ws.close();console.error(JSON.stringify({startedAt,source:file,targetId:target.id,error:'DevTools action timed out; action outcome unknown'}));process.exitCode=1},20000)
  ws.addEventListener('open',()=>ws.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true,userGesture:true}})))
  ws.addEventListener('message',event=>{
    const msg=JSON.parse(event.data)
    if(msg.id!==1)return
    clearTimeout(timer);ws.close()
    const record={startedAt,finishedAt:new Date().toISOString(),appPid:host.ownedPids.find(p=>p.role==='official extracted application').pid,targetId:target.id,targetUrl:target.url,source:file,sourceSha256:crypto.createHash('sha256').update(expression).digest('hex'),...msg}
    fs.appendFileSync('runtime/root5084-private/CDP-ACTIONS.ndjson',JSON.stringify(record)+'\n')
    console.log(JSON.stringify(record))
    if(msg.error || msg.result?.exceptionDetails)process.exitCode=1
  })
})().catch(e=>{console.error(e);process.exitCode=1})
