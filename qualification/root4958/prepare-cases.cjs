// Preparation only: original fixture bytes, no Obsidian shim or settings parser.
// Run from the product root before application execution.
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const ts = require('typescript')
const source = 'src/settings/schema/migrations/89_to_90.fixtures.ts'
const fixtureModule = { exports: {} }
new Function('exports', ts.transpileModule(fs.readFileSync(source, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)(fixtureModule.exports)
const { selectedV89, nanoV89, o4V89 } = fixtureModule.exports
const q = 'qualification/root4958'
const runtime = path.resolve('runtime/root4998-private')
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
const replacements = { [nanoV89.id]: 'openai/gpt-5.6-luna', [o4V89.id]: 'openai/gpt-5.6-terra' }
const raw = () => {
  const s = selectedV89()
  s.providers.forEach(p => { delete p.apiKey })
  s.systemPrompt = 'ROOT4958 synthetic unrelated control'
  return s
}
const cases = []
function add(id, settings, renames, note) {
  const rename = value => renames[value] || value
  const expected = {
    chatModelId: rename(settings.chatModelId), chatTitleModelId: rename(settings.chatTitleModelId),
    models: settings.chatModels.map(m => ({ ...m, id: rename(m.id), model: renames[m.id] ? rename(m.id).slice(7) : m.model })),
    continuationModelId: rename(settings.continuationOptions.continuationModelId),
    tabCompletionModelId: rename(settings.continuationOptions.tabCompletionModelId),
    assistantModelIds: settings.assistants.map(a => rename(a.modelId)),
    reasoningLevelByModelId: Object.fromEntries(Object.entries(settings.chatOptions.reasoningLevelByModelId).map(([k,v]) => [rename(k),v])),
    delegation: { ...settings.mcp.builtinCapabilityOptions.subagent_delegation,
      allowedModelIds: settings.mcp.builtinCapabilityOptions.subagent_delegation.allowedModelIds.map(rename),
      preferredModelId: rename(settings.mcp.builtinCapabilityOptions.subagent_delegation.preferredModelId) },
    systemPrompt: settings.systemPrompt, providers: settings.providers,
    cliModelIdByRuntime: settings.chatOptions.cliModelIdByRuntime,
  }
  const bytes = JSON.stringify(settings, null, 2) + '\n'
  const file = path.join(q, 'fixtures', id + '.json')
  fs.writeFileSync(file, bytes)
  cases.push({ id, fixture: file, sha256: sha(bytes), expected, note, lifecycleStatus: 'unrun' })
}
fs.mkdirSync(path.join(q, 'fixtures'), { recursive: true })
add('eligible-nano', raw(), replacements, 'Both seeded aliases migrate; unrelated primary remains GPT-5.')
let s = raw(); s.chatModelId = o4V89.id
add('eligible-o4', s, replacements, 'Disabled o4 remains disabled after replacing its saved selection.')
s = raw(); s.providers[0].apiType = 'openai-compatible'; s.chatModels[1].customParameters = [{key:'max_tokens',value:'64',type:'number'}]
add('held-max-tokens', s, { [o4V89.id]: replacements[o4V89.id] }, 'Do not claim old-model availability.')
s = raw(); s.providers[0].baseUrl = 'https://proxy.example.invalid/v1'
add('held-endpoint', s, {}, 'Custom endpoint does not inherit direct OpenAI authority.')
s = raw(); s.providers[0].presetType = 'openai-compatible'
add('held-provider', s, {}, 'Same ID with a different provider identity stays intact.')
s = raw(); s.chatModels.push({id:replacements[nanoV89.id],providerId:'openai',model:'explicit-deployment',enable:false,name:'Unrelated occupied destination'})
add('held-collision', s, { [o4V89.id]: replacements[o4V89.id] }, 'Occupied Luna ID cannot absorb saved nano.')
s = raw(); s.version = 90; s.chatModels = s.chatModels.map(m => ({...m,id:replacements[m.id]||m.id,model:replacements[m.id] ? replacements[m.id].slice(7) : m.model}));
s.chatModelId = replacements[nanoV89.id]; s.chatTitleModelId = replacements[o4V89.id]
s.continuationOptions.continuationModelId = s.chatModelId; s.continuationOptions.tabCompletionModelId = s.chatTitleModelId
s.assistants[0].modelId = s.chatTitleModelId; s.chatOptions.reasoningLevelByModelId = {[s.chatModelId]:'off',[s.chatTitleModelId]:'high'}
s.mcp.builtinCapabilityOptions.subagent_delegation.allowedModelIds = [s.chatModelId,s.chatTitleModelId,'openai/gpt-5']; s.mcp.builtinCapabilityOptions.subagent_delegation.preferredModelId=s.chatModelId
s.chatModels[1].customParameters=[{key:'max_tokens',value:'64',type:'number'}]
add('explicit-v90', s, {}, 'Observe stored explicit override preservation; no provider request is authorized.')
add('restored-v89', raw(), replacements, 'Separate original valid bytes for recovery; never edit the source fixture.')
const bad = '{"version":89,"chatModels":['
fs.writeFileSync(path.join(q,'fixtures','malformed.txt'),bad)
cases.push({id:'malformed',fixture:path.join(q,'fixtures','malformed.txt'),sha256:sha(bad),expected:{notice:'settings unreadable; save refused; original malformed bytes retained'},lifecycleStatus:'unrun'})
const builtMembers = Object.fromEntries(['main.js','manifest.json','styles.css'].map(file=>[file,{bytes:fs.statSync(file).size,sha256:sha(fs.readFileSync(file))}]))
const manifest = {sealedAt:new Date().toISOString(),sourceHead:'3f25806a7e4b253cb29e73d0a89a4880860a395d',fixtureSource:source,fixtureSourceSha256:sha(fs.readFileSync(source)),runtime,builtMembers,cases,
  actions:['Actual app/plugin load; inspect live settings using supported developer tools','Benign setting change using actual settings UI and receive setSettings/saveData','Graceful close and reopen same vault; compare persisted/live projections','Documented plugin reload or disable/re-enable, then another graceful restart','Malformed isolated vault: observe load notice/save refusal; restore separate valid copy while closed; receive recovery'],
  prohibited:['live inference','API keys or credentials','direct JSON writes as substitute for save lifecycle','sandbox disabling','global installation']}
fs.writeFileSync(path.join(q,'CASE-MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n')
// Only setup copies below; no application lifecycle success is inferred.
for(const c of cases) {
 const vault=path.join(runtime,'vaults',c.id); const plugin=path.join(vault,'.obsidian','plugins','yolo')
 fs.mkdirSync(plugin,{recursive:true})
 for(const file of Object.keys(builtMembers)) fs.copyFileSync(file,path.join(plugin,file))
 fs.copyFileSync(c.fixture,path.join(plugin,'data.json'))
 fs.writeFileSync(path.join(vault,'Synthetic.md'),'# ROOT4958\nDisposable synthetic vault; no customer or synced data.\n')
 fs.writeFileSync(path.join(vault,'.obsidian','community-plugins.json'),'["yolo"]\n')
 fs.writeFileSync(path.join(vault,'.obsidian','app.json'),'{"safeMode":false}\n')
}
console.log(JSON.stringify({cases:cases.length,manifestSha256:sha(fs.readFileSync(path.join(q,'CASE-MANIFEST.json'))),builtMembers}))
