import { getDefaultApiTypeForPresetType } from '../../../types/provider.types'
import type { SettingMigration } from '../setting.types'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// Frozen identities, not the moving catalog. Only these seeded aliases are
// covered; dated snapshots and user-created IDs remain explicit user pins.
const REPLACEMENTS = [
  {
    id: 'openai/gpt-4.1-nano',
    model: 'gpt-4.1-nano',
    replacement: 'gpt-5.6-luna',
  },
  { id: 'openai/o4-mini', model: 'o4-mini', replacement: 'gpt-5.6-terra' },
] as const

const isDirectOpenAI = (provider: Record<string, unknown>): boolean => {
  if ((provider.presetType ?? provider.type) !== 'openai') return false
  if (provider.type !== undefined && provider.type !== 'openai') return false
  if (
    provider.apiType !== undefined &&
    provider.apiType !== 'openai-responses' &&
    provider.apiType !== 'openai-compatible'
  )
    return false
  if (provider.baseUrl === undefined) return true
  if (typeof provider.baseUrl !== 'string') return false
  const url = provider.baseUrl.trim().replace(/\/+$/, '')
  return url === '' || url === 'https://api.openai.com/v1'
}

// Match the consumer's active-entry rules without parsing or altering values.
// Empty entries do not undo earlier active writes, including duplicate keys.
const activeCustomKeys = (parameters: unknown): string[] =>
  Array.isArray(parameters)
    ? parameters.flatMap((entry) =>
        isRecord(entry) &&
        typeof entry.key === 'string' &&
        entry.key.trim() !== '' &&
        typeof entry.value === 'string' &&
        entry.value.trim() !== ''
          ? [entry.key.trim()]
          : [],
      )
    : []

const hasUnqualifiedRequestCustomization = (
  keys: string[],
  apiType: unknown,
): boolean =>
  keys.some((key) =>
    apiType === 'openai-compatible'
      ? // These restore fields outside the replacement's Chat request shape
        // after provider shaping. Explicit runtime precedence stays intact.
        ['max_tokens', 'max_output_tokens', 'reasoning'].includes(key)
      : // Responses forwards the Chat field unchanged; its adapter also ignores
        // custom max_output_tokens in favor of ordinary request.max_tokens.
        ['max_completion_tokens', 'max_output_tokens'].includes(key),
  )

// Developer diagnostics contain only fixed catalog IDs/reasons, never user
// labels, endpoints, headers, custom parameters or credentials.
const unresolved = (id: string, reason: string): void =>
  console.warn(
    '[YOLO] Model retirement migration preserved an unresolved entry:',
    id,
    reason,
  )

/**
 * v89→v90: announced retirement of the built-in nano/o4 aliases.
 * Rename a record and its references together only with unambiguous source
 * identity and a free destination ID. Never merge, reseed defaults, or change
 * providers. A collision retains its old ID and selection for manual resolution.
 */
export const migrateFrom89To90: SettingMigration['migrate'] = (data) => {
  const next: Record<string, unknown> = { ...data, version: 90 }
  const models = Array.isArray(data.chatModels) ? data.chatModels : []
  const providers = Array.isArray(data.providers)
    ? data.providers.filter((p) => isRecord(p) && p.id === 'openai')
    : []
  const direct =
    providers.length === 1 &&
    isRecord(providers[0]) &&
    isDirectOpenAI(providers[0])
  const apiType = isRecord(providers[0])
    ? (providers[0].apiType ?? getDefaultApiTypeForPresetType('openai'))
    : undefined
  const renames = new Map<string, string>()

  const chatModels = models.map((raw) => {
    if (!isRecord(raw)) return raw
    const source = REPLACEMENTS.find((entry) => entry.id === raw.id)
    if (!source) return raw
    const replacementId = `openai/${source.replacement}`
    const customKeys = activeCustomKeys(raw.customParameters)
    let reason: string | undefined
    if (!direct) reason = 'provider identity is not uniquely direct OpenAI'
    else if (
      raw.providerId !== 'openai' ||
      raw.model !== source.model ||
      (raw.providerType !== undefined && raw.providerType !== 'openai') ||
      raw.baseUrl !== undefined ||
      customKeys.includes('model')
    )
      reason = 'model identity is customized'
    else if (hasUnqualifiedRequestCustomization(customKeys, apiType))
      reason =
        'saved request customization is incompatible or ambiguous for the replacement API'
    else if (
      models.filter((model) => isRecord(model) && model.id === source.id)
        .length !== 1
    )
      reason = 'duplicate source ID'
    else if (
      models.some((model) => isRecord(model) && model.id === replacementId)
    )
      reason = 'replacement ID already exists'
    else if (
      isRecord(data.chatOptions) &&
      isRecord(data.chatOptions.reasoningLevelByModelId) &&
      Object.prototype.hasOwnProperty.call(
        data.chatOptions.reasoningLevelByModelId,
        replacementId,
      )
    )
      reason = 'replacement reasoning preference already exists'
    if (reason) {
      unresolved(source.id, reason)
      return raw
    }
    renames.set(source.id, replacementId)
    return {
      ...raw,
      id: replacementId,
      model: source.replacement,
      reasoningType: raw.reasoningType ?? 'openai',
    }
  })
  if (Array.isArray(data.chatModels)) next.chatModels = chatModels

  const rename = (value: unknown): unknown =>
    typeof value === 'string' ? (renames.get(value) ?? value) : value
  const references = (
    record: Record<string, unknown>,
    keys: string[],
  ): Record<string, unknown> =>
    Object.fromEntries(
      Object.entries(record).map(([key, value]) => [
        key,
        keys.includes(key) ? rename(value) : value,
      ]),
    )

  for (const source of REPLACEMENTS) {
    if (
      !models.some((model) => isRecord(model) && model.id === source.id) &&
      (data.chatModelId === source.id || data.chatTitleModelId === source.id)
    )
      unresolved(source.id, 'selected source record is missing')
  }
  next.chatModelId = rename(data.chatModelId)
  next.chatTitleModelId = rename(data.chatTitleModelId)
  if (!('chatModelId' in data)) delete next.chatModelId
  if (!('chatTitleModelId' in data)) delete next.chatTitleModelId
  if (isRecord(data.continuationOptions)) {
    next.continuationOptions = references(data.continuationOptions, [
      'continuationModelId',
      'tabCompletionModelId',
    ])
  }
  if (Array.isArray(data.assistants)) {
    next.assistants = data.assistants.map((assistant) =>
      isRecord(assistant) ? references(assistant, ['modelId']) : assistant,
    )
  }
  if (
    isRecord(data.chatOptions) &&
    isRecord(data.chatOptions.reasoningLevelByModelId)
  ) {
    let levels = { ...data.chatOptions.reasoningLevelByModelId }
    for (const [oldId, newId] of renames) {
      if (!Object.prototype.hasOwnProperty.call(levels, oldId)) continue
      const { [oldId]: level, ...rest } = levels
      levels = { ...rest, [newId]: level }
    }
    next.chatOptions = { ...data.chatOptions, reasoningLevelByModelId: levels }
  }
  if (isRecord(data.mcp) && isRecord(data.mcp.builtinCapabilityOptions)) {
    const options = data.mcp.builtinCapabilityOptions
    const delegation = options.subagent_delegation
    if (isRecord(delegation)) {
      next.mcp = {
        ...data.mcp,
        builtinCapabilityOptions: {
          ...options,
          subagent_delegation: {
            ...references(delegation, ['preferredModelId']),
            ...(Array.isArray(delegation.allowedModelIds)
              ? { allowedModelIds: delegation.allowedModelIds.map(rename) }
              : {}),
          },
        },
      }
    }
  }
  return next
}
