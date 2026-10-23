import { migrateYoloSettingsData, parseYoloSettings } from '../settings'

import { migrateFrom89To90 } from './89_to_90'
import { requestConflictsV89, selectedV89 } from './89_to_90.fixtures'

function freezeDeep<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeDeep)
    Object.freeze(value)
  }
  return value
}

describe('v89 saved request authority during automatic retirement migration', () => {
  let warning: jest.SpyInstance
  beforeEach(() => {
    warning = jest.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => jest.restoreAllMocks())

  it.each(requestConflictsV89)(
    'holds both full records and every reference for $apiType $key',
    ({ apiType, key, value, type }) => {
      const fixture = selectedV89()
      const raw = freezeDeep({
        ...fixture,
        providers: fixture.providers.map((p) => ({ ...p, apiType })),
        chatModels: fixture.chatModels.map((m) => ({
          ...m,
          customParameters: [
            { key: ` ${key} `, value, type },
            { key, value: ' ', type },
          ],
        })),
      })
      const before = JSON.stringify(raw)
      const migrated = migrateYoloSettingsData(raw)
      expect(migrated).toEqual({ ...raw, version: 90 })
      expect(JSON.stringify(migrated)).toBe(
        JSON.stringify({ ...raw, version: 90 }),
      )
      expect(JSON.stringify(migrated.chatModels)).toBe(
        JSON.stringify(raw.chatModels),
      )
      expect(JSON.stringify(raw)).toBe(before)
      expect(migrateFrom89To90(migrated)).toEqual(migrated)
      expect(migrateYoloSettingsData(raw)).toEqual(migrated)
      const parsed = parseYoloSettings(raw)
      expect(parsed.chatModelId).toBe(raw.chatModelId)
      expect(parsed.chatTitleModelId).toBe(raw.chatTitleModelId)
      expect(parsed.chatModels.map((m) => m.id)).toEqual(
        raw.chatModels.map((m) => m.id),
      )
      expect(parseYoloSettings(JSON.parse(JSON.stringify(parsed)))).toEqual(
        parsed,
      )
      expect(warning).toHaveBeenCalledWith(
        '[YOLO] Model retirement migration preserved an unresolved entry:',
        expect.stringMatching(/^openai\/(gpt-4\.1-nano|o4-mini)$/),
        'saved request customization is incompatible or ambiguous for the replacement API',
      )
      expect(JSON.stringify(warning.mock.calls)).not.toContain(value)
      expect(JSON.stringify(warning.mock.calls)).not.toContain(key)
    },
  )

  it.each(['openai-compatible', 'openai-responses'])(
    'ignores inactive fields and retains benign customization over %s',
    (apiType) => {
      const fixture = selectedV89()
      const raw = freezeDeep({
        ...fixture,
        providers: fixture.providers.map((p) => ({ ...p, apiType })),
        chatModels: fixture.chatModels.map((m) => ({
          ...m,
          customParameters: [
            { key: 'max_tokens', value: ' ' },
            { key: 'max_output_tokens', value: '' },
            { key: 'reasoning', value: null },
            { key: 'max_completion_tokens', value: 64 },
            { key: ' ', value: 'private-unused' },
            { key: 'seed', value: '7', type: 'number' },
          ],
        })),
      })
      const result = migrateYoloSettingsData(raw)
      expect(result.chatModelId).toBe('openai/gpt-5.6-luna')
      expect(result.chatTitleModelId).toBe('openai/gpt-5.6-terra')
      const models = result.chatModels as typeof raw.chatModels
      models.forEach((m, index) =>
        expect(m.customParameters).toBe(raw.chatModels[index].customParameters),
      )
      expect(warning).not.toHaveBeenCalled()
    },
  )

  it('uses the owning default Responses API when saved apiType is absent', () => {
    const raw = {
      ...selectedV89(),
      providers: [{ id: 'openai', presetType: 'openai' }],
      chatModels: selectedV89().chatModels.map((m) => ({
        ...m,
        customParameters: [
          { key: 'max_output_tokens', value: '64', type: 'number' },
        ],
      })),
    }
    expect(migrateYoloSettingsData(raw)).toEqual({ ...raw, version: 90 })
    expect(parseYoloSettings(raw).providers[0].apiType).toBe('openai-responses')
  })
})
