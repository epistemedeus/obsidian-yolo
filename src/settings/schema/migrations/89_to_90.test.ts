import {
  DEFAULT_CHAT_MODELS,
  DEFAULT_CHAT_MODEL_ID,
  DEFAULT_PROVIDERS,
  OPENAI_PRICES,
} from '../../../constants'
import { resolveKnownMaxContextTokens } from '../../../utils/llm/model-capability-registry'
import { migrateYoloSettingsData, parseYoloSettings } from '../settings'

import {
  nanoV89,
  o4V89,
  openaiV89,
  primaryV89,
  selectedV89,
} from './89_to_90.fixtures'

const lunaId = 'openai/gpt-5.6-luna'
const terraId = 'openai/gpt-5.6-terra'

function freezeDeep<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeDeep)
    Object.freeze(value)
  }
  return value
}

describe('v89 model retirement migration through the normal settings chain', () => {
  let warning: jest.SpyInstance
  beforeEach(() => {
    warning = jest.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => jest.restoreAllMocks())

  it('updates the catalog without changing fresh empty settings or primary chat default', () => {
    expect(parseYoloSettings(null).chatModels).toEqual([])
    expect(DEFAULT_CHAT_MODEL_ID).toBe(primaryV89.id)
    for (const [id, model, enable] of [
      [lunaId, 'gpt-5.6-luna', true],
      [terraId, 'gpt-5.6-terra', false],
    ]) {
      expect(DEFAULT_CHAT_MODELS).toContainEqual(
        expect.objectContaining({
          id,
          model,
          providerId: 'openai',
          enable,
          reasoningType: 'openai',
        }),
      )
      expect(resolveKnownMaxContextTokens(model as string)).toBe(1050000)
    }
    expect(
      DEFAULT_CHAT_MODELS.some((m) => [nanoV89.id, o4V89.id].includes(m.id)),
    ).toBe(false)
    const reset = parseYoloSettings({
      version: 90,
      providers: DEFAULT_PROVIDERS,
      chatModels: DEFAULT_CHAT_MODELS,
      chatModelId: DEFAULT_CHAT_MODEL_ID,
    })
    expect(reset.chatModelId).toBe(primaryV89.id)
    expect(OPENAI_PRICES['gpt-5.6-luna']).toEqual({ input: 0.2, output: 1.2 })
    expect(OPENAI_PRICES['gpt-5.6-terra']).toEqual({ input: 2, output: 12 })
  })

  it('migrates saved selections, reasoning preferences and all owning reference slots', () => {
    const raw = freezeDeep(selectedV89())
    const before = JSON.stringify(raw)
    const result = parseYoloSettings(raw)
    expect(result.chatModels.map((m) => m.id)).toEqual([
      primaryV89.id,
      lunaId,
      terraId,
    ])
    expect(result.chatModels[1]).toMatchObject({
      model: 'gpt-5.6-luna',
      providerId: 'openai',
      enable: true,
      reasoningType: 'openai',
    })
    expect(result.chatModels[2]).toMatchObject({
      model: 'gpt-5.6-terra',
      providerId: 'openai',
      enable: false,
    })
    expect(result.chatModelId).toBe(lunaId)
    expect(result.version).toBe(90)
    expect(result.chatTitleModelId).toBe(terraId)
    expect(result.continuationOptions).toMatchObject({
      continuationModelId: lunaId,
      tabCompletionModelId: terraId,
    })
    expect(result.assistants.map((a) => a.modelId)).toEqual([
      terraId,
      primaryV89.id,
    ])
    expect(result.chatOptions.reasoningLevelByModelId).toEqual({
      [lunaId]: 'off',
      [terraId]: 'high',
    })
    expect(result.chatOptions.cliModelIdByRuntime).toEqual(
      raw.chatOptions.cliModelIdByRuntime,
    )
    expect(result.mcp.builtinCapabilityOptions.subagent_delegation).toEqual({
      allowedModelIds: [lunaId, terraId, primaryV89.id],
      preferredModelId: lunaId,
      disabled: true,
    })
    expect(result.providers).toEqual(raw.providers)
    expect(result.systemPrompt).toBe(raw.systemPrompt)
    expect(JSON.stringify(raw)).toBe(before)
    expect(parseYoloSettings(JSON.parse(JSON.stringify(result)))).toEqual(
      result,
    )
    expect(migrateYoloSettingsData(raw)).toEqual(migrateYoloSettingsData(raw))
    expect(warning).not.toHaveBeenCalled()
  })

  it('preserves labels, tuning, explicit modalities, order, credentials and unrelated selections', () => {
    const raw = {
      ...selectedV89(),
      chatModelId: primaryV89.id,
      chatTitleModelId: primaryV89.id,
      chatModels: [
        {
          ...nanoV89,
          name: 'My classifier',
          enable: false,
          temperature: 0.4,
          topP: 0.8,
          maxContextTokens: 8192,
          modalities: ['text'],
          customParameters: [{ key: 'seed', value: '7', type: 'number' }],
        },
        primaryV89,
      ],
    }
    const result = migrateYoloSettingsData(freezeDeep(raw))
    expect(result.chatModels).toEqual([
      {
        ...raw.chatModels[0],
        id: lunaId,
        model: 'gpt-5.6-luna',
        reasoningType: 'openai',
      },
      primaryV89,
    ])
    expect(result.providers).toBe(raw.providers)
    expect(result.chatModelId).toBe(primaryV89.id)
    expect(result.chatTitleModelId).toBe(primaryV89.id)
  })

  it.each([
    { presetType: 'openai-compatible' },
    { presetType: 'azure-openai' },
    { presetType: 'openai', type: 'openai-compatible' },
    { presetType: 'openai', apiType: 'anthropic' },
    { baseUrl: 'https://proxy.example/v1' },
    { baseUrl: 'https://api.openai.com.evil.example/v1' },
    { baseUrl: 'https://api.openai.com/v1?proxy=true' },
    { baseUrl: 'http://api.openai.com/v1' },
    { baseUrl: 'https://user:secret@api.openai.com/v1' },
  ])(
    'holds a same-ID provider whose identity is customized: %j',
    (overrides) => {
      const raw = {
        ...selectedV89(),
        providers: [{ ...openaiV89, ...overrides }],
      }
      const result = migrateYoloSettingsData(freezeDeep(raw))
      expect(result).toEqual({ ...raw, version: 90 })
      expect(warning).toHaveBeenCalled()
      expect(JSON.stringify(warning.mock.calls)).not.toContain('secret')
    },
  )

  it.each([
    { providerId: 'custom-openai' },
    { model: 'my-deployment' },
    { model: 'gpt-4.1-nano-2025-04-14' },
    { id: 'my-nano' },
    { providerType: 'openai-compatible' },
    { customParameters: [{ key: 'model', value: 'another-model' }] },
    { customParameters: [{ key: ' model ', value: 'another-model' }] },
  ])('preserves a customized model byte-for-byte: %j', (overrides) => {
    const model = { ...nanoV89, ...overrides }
    const raw = {
      version: 89,
      providers: [openaiV89],
      chatModels: [model],
      chatModelId: model.id,
    }
    const result = migrateYoloSettingsData(freezeDeep(raw))
    expect(result).toEqual({ ...raw, version: 90 })
    expect(JSON.stringify(result.chatModels)).toBe(
      JSON.stringify(raw.chatModels),
    )
  })

  it.each(['', 'https://api.openai.com/v1', ' https://api.openai.com/v1/ '])(
    'accepts the exact direct endpoint: %s',
    (baseUrl) => {
      const raw = { ...selectedV89(), providers: [{ ...openaiV89, baseUrl }] }
      expect(parseYoloSettings(raw).chatModelId).toBe(lunaId)
    },
  )

  it('recognizes the provider type alias that the owning schema still accepts', () => {
    const { presetType: _, apiType: __, ...rest } = openaiV89
    expect(
      parseYoloSettings({
        ...selectedV89(),
        providers: [{ ...rest, type: 'openai' }],
      }).chatModelId,
    ).toBe(lunaId)
  })

  it.each([
    [{ ...nanoV89 }, { ...nanoV89, providerId: 'proxy' }],
    [{ ...nanoV89, providerId: 'proxy' }, { ...nanoV89 }],
    [{ ...nanoV89 }, { id: lunaId, providerId: 'proxy', model: 'custom' }],
    [
      { ...nanoV89 },
      { id: lunaId, providerId: 'openai', model: 'gpt-5.6-luna' },
    ],
  ])(
    'holds duplicate source IDs or any replacement ID collision',
    (...chatModels) => {
      const raw = {
        version: 89,
        providers: [openaiV89],
        chatModels,
        chatModelId: nanoV89.id,
      }
      expect(migrateYoloSettingsData(freezeDeep(raw))).toEqual({
        ...raw,
        version: 90,
      })
      expect(warning).toHaveBeenCalled()
    },
  )

  it('does not rewrite a selected missing record or invent a replacement', () => {
    const raw = {
      version: 89,
      providers: [openaiV89],
      chatModels: [primaryV89],
      chatModelId: nanoV89.id,
    }
    expect(migrateYoloSettingsData(freezeDeep(raw))).toEqual({
      ...raw,
      version: 90,
    })
    // The normal loader's existing missing-reference fallback is unchanged.
    expect(parseYoloSettings(raw).chatModelId).toBe(primaryV89.id)
    expect(warning).toHaveBeenCalled()
  })

  it('holds duplicate providers and preserves an absent provider list', () => {
    const raw = {
      version: 89,
      providers: [openaiV89, { ...openaiV89, presetType: 'openai-compatible' }],
      chatModels: [nanoV89],
      chatModelId: nanoV89.id,
    }
    expect(migrateYoloSettingsData(freezeDeep(raw))).toEqual({
      ...raw,
      version: 90,
    })
    const absent = {
      version: 89,
      chatModels: [nanoV89],
      chatModelId: nanoV89.id,
    }
    expect(migrateYoloSettingsData(freezeDeep(absent))).toEqual({
      ...absent,
      version: 90,
    })
  })

  it('runs after the existing v88 migration and is idempotent even if reapplied', () => {
    const raw = {
      ...selectedV89(),
      version: 88,
      providers: [openaiV89, { id: 'other', presetType: 'apimart' }],
    }
    const migrated = migrateYoloSettingsData(freezeDeep(raw))
    expect(migrated.chatModelId).toBe(lunaId)
    expect(migrated.providers).toEqual([
      openaiV89,
      {
        id: 'other',
        presetType: 'openai-compatible',
        baseUrl: 'https://api.apimart.ai/v1',
      },
    ])
    expect(migrateYoloSettingsData({ ...migrated, version: 89 })).toEqual(
      migrated,
    )
  })

  it('holds a migration that would attach a different saved replacement preference', () => {
    const raw = selectedV89()
    const levels = {
      ...raw.chatOptions.reasoningLevelByModelId,
      [lunaId]: 'low',
    }
    const migrated = migrateYoloSettingsData(
      freezeDeep({
        ...raw,
        chatOptions: { ...raw.chatOptions, reasoningLevelByModelId: levels },
      }),
    )
    expect(migrated.chatModelId).toBe(nanoV89.id)
    expect((migrated.chatModels as unknown[])[1]).toEqual(raw.chatModels[1])
    expect(migrated.chatOptions).toMatchObject({
      reasoningLevelByModelId: {
        [nanoV89.id]: 'off',
        [lunaId]: 'low',
        [terraId]: 'high',
      },
    })
    expect(warning).toHaveBeenCalled()
  })

  it.each([
    {},
    { chatModels: null, providers: null },
    { chatModels: [null, 'invalid'] },
  ])('preserves sparse/invalid fields for the owning parser: %j', (fields) => {
    const raw = { version: 89, ...fields }
    expect(migrateYoloSettingsData(freezeDeep(raw))).toEqual({
      ...raw,
      version: 90,
    })
  })
})
