// Literal v89 data, independent of the current catalog so regressions cannot
// silently start from already-migrated defaults. Credentials are synthetic.
export const nanoV89 = {
  id: 'openai/gpt-4.1-nano',
  providerId: 'openai',
  model: 'gpt-4.1-nano',
  enable: true,
}
export const o4V89 = {
  id: 'openai/o4-mini',
  providerId: 'openai',
  model: 'o4-mini',
  enable: false,
  reasoningType: 'openai',
}
export const openaiV89 = {
  id: 'openai',
  presetType: 'openai',
  apiType: 'openai-responses',
  apiKey: 'synthetic-not-a-provider-key',
  additionalSettings: { requestTransportMode: 'browser' },
}
export const primaryV89 = {
  id: 'openai/gpt-5',
  providerId: 'openai',
  model: 'gpt-5',
  enable: true,
}
export const selectedV89 = () => ({
  version: 89,
  providers: [structuredClone(openaiV89)],
  chatModels: [structuredClone(primaryV89), { ...nanoV89 }, { ...o4V89 }],
  chatModelId: nanoV89.id,
  chatTitleModelId: o4V89.id,
  continuationOptions: {
    continuationModelId: nanoV89.id,
    tabCompletionModelId: o4V89.id,
    primaryRequestTimeoutMs: 1000,
  },
  assistants: [
    {
      id: 'writer',
      name: 'Writer',
      modelId: o4V89.id,
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: 'other',
      name: 'Other',
      modelId: primaryV89.id,
      createdAt: 2,
      updatedAt: 2,
    },
  ],
  chatOptions: {
    includeCurrentFileContent: true,
    reasoningLevelByModelId: { [nanoV89.id]: 'off', [o4V89.id]: 'high' },
    cliModelIdByRuntime: { codex: 'gpt-4.1-nano' },
  },
  mcp: {
    builtinCapabilityOptions: {
      subagent_delegation: {
        allowedModelIds: [nanoV89.id, o4V89.id, primaryV89.id],
        preferredModelId: nanoV89.id,
        disabled: true,
      },
    },
  },
  systemPrompt: 'Preserve this user setting.',
})
