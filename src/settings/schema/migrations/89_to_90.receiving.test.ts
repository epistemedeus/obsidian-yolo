/* eslint-disable import/no-nodejs-modules -- Jest-only receiving uses disposable data.json files and guards both Node HTTP transports against network egress. */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import * as http from 'node:http'
import * as https from 'node:https'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
/* eslint-enable import/no-nodejs-modules */

import type {
  Response as OpenAIResponse,
  ResponseStreamEvent,
} from 'openai/resources/responses/responses'

import { getChatModelClient } from '../../../core/llm/manager'
import { OpenAICompatibleProvider } from '../../../core/llm/openaiCompatibleProvider'
import { OpenAIResponsesProvider } from '../../../core/llm/openaiResponsesProvider'
import {
  extractYoloDataMeta,
  stampYoloDataMeta,
} from '../../../core/paths/yoloManagedData'
import type { CustomParameter } from '../../../types/custom-parameter.types'
import type { LLMRequestNonStreaming } from '../../../types/llm/request'
import type { LLMResponseStreaming } from '../../../types/llm/response'
import type { LLMProviderApiType } from '../../../types/provider.types'
import { parseYoloSettings } from '../settings'

import {
  nanoV89,
  o4V89,
  openaiV89,
  requestConflictsV89,
  selectedV89,
} from './89_to_90.fixtures'

const replacements = [
  [nanoV89.id, 'gpt-5.6-luna'],
  [o4V89.id, 'gpt-5.6-terra'],
] as const
const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

function healthyResponsesReply(model: string): OpenAIResponse {
  return {
    id: 'resp_local',
    object: 'response',
    created_at: 1,
    model,
    status: 'completed',
    output_text: 'Useful synthetic answer.',
    error: null,
    incomplete_details: null,
    instructions: null,
    metadata: null,
    parallel_tool_calls: true,
    temperature: null,
    top_p: null,
    tool_choice: 'auto',
    tools: [],
    output: [
      {
        type: 'message',
        id: 'msg_local',
        role: 'assistant',
        status: 'completed',
        content: [
          {
            type: 'output_text',
            text: 'Useful synthetic answer.',
            annotations: [],
          },
        ],
      },
    ],
    usage: {
      input_tokens: 10,
      output_tokens: 2,
      total_tokens: 12,
      input_tokens_details: { cached_tokens: 0 },
      output_tokens_details: { reasoning_tokens: 0 },
    },
  }
}
function healthyResponse(model: string, responses: boolean) {
  return responses
    ? healthyResponsesReply(model)
    : {
        id: 'chat_local',
        object: 'chat.completion',
        created: 1,
        model,
        choices: [
          {
            index: 0,
            finish_reason: 'stop',
            message: { role: 'assistant', content: 'Useful synthetic answer.' },
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 },
      }
}

describe('v89 saved selection → real resolver/provider → locked OpenAI SDK', () => {
  let fetchCapture: jest.SpyInstance
  let socketGuards: jest.SpyInstance[]
  let calls: Array<{ url: string; body: Record<string, unknown> }>
  const captureRequest = (
    input: Parameters<typeof fetch>[0],
    init?: RequestInit,
  ) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url
    if (typeof init?.body !== 'string')
      throw new Error('Expected a serialized SDK JSON body')
    const call = { url, body: JSON.parse(init.body) as Record<string, unknown> }
    calls.push(call)
    return call
  }
  beforeEach(() => {
    calls = []
    const noSocket = () => {
      throw new Error('Unexpected network egress in offline receiving')
    }
    socketGuards = [
      jest.spyOn(http, 'request').mockImplementation(noSocket),
      jest.spyOn(https, 'request').mockImplementation(noSocket),
    ]
    // The SDK and production transport stay real. Every HTTP attempt is
    // intercepted in memory; no provider key, socket, or original fetch is used.
    fetchCapture = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const { url, body } = captureRequest(input, init)
        return jsonResponse(
          healthyResponse(String(body.model), url.endsWith('/responses')),
        )
      })
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    try {
      socketGuards.forEach((guard) => expect(guard).not.toHaveBeenCalled())
    } finally {
      jest.restoreAllMocks()
    }
  })

  const resolveSaved = (
    oldId: string,
    apiType: LLMProviderApiType,
    customParameters?: CustomParameter[],
    version = 89,
  ) => {
    const fixture = selectedV89()
    const raw = {
      ...fixture,
      version,
      chatModelId: oldId,
      providers: [{ ...openaiV89, apiType }],
      chatModels: fixture.chatModels.map((m) =>
        m.id === oldId && customParameters ? { ...m, customParameters } : m,
      ),
    }
    const directory = mkdtempSync(join(tmpdir(), 'root4410-b-v89-'))
    try {
      const file = join(directory, 'data.json')
      const bytes = JSON.stringify(
        stampYoloDataMeta(raw, { deviceId: 'synthetic-device', updatedAt: 1 }),
      )
      writeFileSync(file, bytes)
      // The same metadata extraction and parser that main.loadSettings uses.
      const extracted = extractYoloDataMeta(
        JSON.parse(readFileSync(file, 'utf8')),
      )
      const settings = parseYoloSettings(extracted?.raw)
      expect(extracted?.meta).toEqual({
        deviceId: 'synthetic-device',
        updatedAt: 1,
      })
      expect(readFileSync(file, 'utf8')).toBe(bytes)
      return {
        settings,
        ...getChatModelClient({ settings, modelId: settings.chatModelId }),
      }
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  }

  // No provider return is mocked: SSE goes through locked OpenAI SDK decoding
  // and the production Responses adapter, including its usage/failure handling.
  const responsesSSE = (model: string, failed = false) => {
    const events: ResponseStreamEvent[] = failed
      ? [
          {
            type: 'response.failed',
            response: {
              ...healthyResponsesReply(model),
              status: 'failed',
              output: [],
              error: {
                code: 'server_error',
                message: 'Synthetic stream failure',
              },
            },
          },
        ]
      : [
          ...['Useful ', 'synthetic answer.'].map(
            (delta): ResponseStreamEvent => ({
              type: 'response.output_text.delta',
              item_id: 'msg_local',
              output_index: 0,
              content_index: 0,
              delta,
            }),
          ),
          {
            type: 'response.completed',
            response: healthyResponsesReply(model),
          },
        ]
    return new Response(
      events
        .map(
          (event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
        )
        .join(''),
      { headers: { 'content-type': 'text/event-stream' } },
    )
  }
  const collect = async (stream: AsyncIterable<LLMResponseStreaming>) => {
    const chunks: LLMResponseStreaming[] = []
    for await (const chunk of stream) chunks.push(chunk)
    return chunks
  }

  for (const apiType of ['openai-responses', 'openai-compatible'] as const) {
    it.each(replacements)(
      `resolves saved %s to %s over ${apiType} and parses useful output`,
      async (oldId, replacement) => {
        const { settings, model, providerClient } = resolveSaved(oldId, apiType)
        expect(model.id).toBe(`openai/${replacement}`)
        expect(model.providerId).toBe('openai')
        expect(model.model).toBe(replacement)
        expect(settings.providers[0].apiType).toBe(apiType)
        expect(providerClient).toBeInstanceOf(
          apiType === 'openai-responses'
            ? OpenAIResponsesProvider
            : OpenAICompatibleProvider,
        )
        const request: LLMRequestNonStreaming = {
          model: model.model,
          messages: [{ role: 'user', content: 'Return a useful answer.' }],
          max_tokens: 128,
          reasoningLevel: 'high',
        }
        const result = await providerClient.generateResponse(model, request)
        expect(result.choices[0].message.content).toBe(
          'Useful synthetic answer.',
        )
        expect(result.model).toBe(replacement)
        expect(result.usage).toMatchObject({
          prompt_tokens: 10,
          completion_tokens: 2,
          total_tokens: 12,
        })
        const { url, body } = calls[0]
        expect(url).toBe(
          `https://api.openai.com/v1/${apiType === 'openai-responses' ? 'responses' : 'chat/completions'}`,
        )
        expect(body.model).toBe(replacement)
        expect(body).not.toHaveProperty('max_tokens')
        expect(body).not.toHaveProperty('reasoningLevel')
        if (apiType === 'openai-responses') {
          expect(body).toMatchObject({
            reasoning: { effort: 'high' },
            max_output_tokens: 128,
            store: false,
          })
        } else {
          expect(body).toMatchObject({
            reasoning_effort: 'high',
            max_completion_tokens: 128,
          })
          expect(body).not.toHaveProperty('reasoning')
        }
        expect(calls).toHaveLength(1)
        expect(request.max_tokens).toBe(128)
      },
    )
  }

  it.each([401, 400, 429, 500])(
    'propagates HTTP %i and recovers on the same provider',
    async (status) => {
      const { model, providerClient } = resolveSaved(
        nanoV89.id,
        'openai-responses',
      )
      fetchCapture.mockResolvedValueOnce(
        jsonResponse(
          {
            error: {
              message: 'Synthetic provider failure',
              type: 'test_error',
            },
          },
          status,
        ),
      )
      const request = {
        model: model.model,
        messages: [{ role: 'user' as const, content: 'hello' }],
      }
      await expect(
        providerClient.generateResponse(model, request),
      ).rejects.toThrow()
      await expect(
        providerClient.generateResponse(model, request),
      ).resolves.toMatchObject({
        choices: [{ message: { content: 'Useful synthetic answer.' } }],
      })
      expect(fetchCapture).toHaveBeenCalledTimes(2)
    },
  )

  it('propagates network failure and malformed output, then recovers', async () => {
    const { model, providerClient } = resolveSaved(o4V89.id, 'openai-responses')
    const request = {
      model: model.model,
      messages: [{ role: 'user' as const, content: 'hello' }],
    }
    fetchCapture.mockRejectedValueOnce(
      new TypeError('Synthetic network failure'),
    )
    await expect(
      providerClient.generateResponse(model, request),
    ).rejects.toThrow()
    fetchCapture.mockResolvedValueOnce(jsonResponse({ invalid: true }))
    await expect(
      providerClient.generateResponse(model, request),
    ).rejects.toThrow()
    await expect(
      providerClient.generateResponse(model, request),
    ).resolves.toMatchObject({
      choices: [{ message: { content: 'Useful synthetic answer.' } }],
    })
    expect(fetchCapture).toHaveBeenCalledTimes(3)
  })

  it('preserves a same-ID proxy selection and its requested model', async () => {
    const raw = selectedV89()
    raw.providers = [
      { ...openaiV89, baseUrl: 'https://proxy.example/v1' } as typeof openaiV89,
    ]
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    const settings = parseYoloSettings(raw)
    const { model, providerClient } = getChatModelClient({
      settings,
      modelId: settings.chatModelId,
    })
    await providerClient.generateResponse(model, {
      model: model.model,
      messages: [{ role: 'user', content: 'hello' }],
    })
    expect(model.id).toBe(nanoV89.id)
    expect(calls[0]).toMatchObject({
      url: 'https://proxy.example/v1/responses',
      body: { model: 'gpt-4.1-nano' },
    })
  })

  it.each(['openai-responses', 'openai-compatible'] as const)(
    'keeps explicit nonreasoning sampling parameters over %s',
    async (apiType) => {
      const { model, providerClient } = resolveSaved(nanoV89.id, apiType)
      await providerClient.generateResponse(model, {
        model: model.model,
        messages: [{ role: 'user', content: 'hello' }],
        reasoningLevel: 'off',
        temperature: 0.4,
        top_p: 0.8,
      })
      expect(calls[0].body).toMatchObject({ temperature: 0.4, top_p: 0.8 })
      if (apiType === 'openai-responses')
        expect(calls[0].body).toMatchObject({ reasoning: { effort: 'none' } })
      else {
        expect(calls[0].body.reasoning_effort).toBe('none')
        expect(calls[0].body).not.toHaveProperty('reasoning')
      }
    },
  )

  it('keeps unrelated models and custom endpoint request shaping unchanged', async () => {
    for (const [modelName, presetType, baseUrl] of [
      ['gpt-5', 'openai', 'https://api.openai.com/v1'],
      ['gpt-5.6-luna', 'openai', 'https://proxy.example/v1'],
      ['gpt-5.6-terra', 'openai-compatible', 'https://api.openai.com/v1'],
    ]) {
      const settings = parseYoloSettings({
        version: 90,
        providers: [
          { ...openaiV89, presetType, apiType: 'openai-compatible', baseUrl },
        ],
        chatModels: [
          {
            id: 'control',
            model: modelName,
            providerId: 'openai',
            reasoningType: 'openai',
          },
        ],
        chatModelId: 'control',
      })
      const { model, providerClient } = getChatModelClient({
        settings,
        modelId: settings.chatModelId,
      })
      await providerClient.generateResponse(model, {
        model: model.model,
        messages: [{ role: 'user', content: 'hello' }],
        max_tokens: 128,
        reasoningLevel: 'low',
      })
      expect(calls[calls.length - 1].body).toMatchObject({
        model: modelName,
        max_tokens: 128,
        reasoning: { effort: 'low' },
      })
    }
  })

  it.each([
    {
      providerId: 'custom',
      presetType: 'openai-compatible',
      baseUrl: 'https://proxy.example/v1',
      modelName: 'gpt-4.1-nano',
    },
    {
      providerId: 'openai',
      presetType: 'openai-compatible',
      baseUrl: 'https://proxy.example/v1',
      modelName: 'gpt-4.1-nano',
    },
    {
      providerId: 'openai',
      presetType: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      modelName: 'my-deployment',
    },
  ])(
    'resolves a valid same-ID custom record without changing its provider: %j',
    async ({ providerId, presetType, baseUrl, modelName }) => {
      jest.spyOn(console, 'warn').mockImplementation(() => {})
      const settings = parseYoloSettings({
        version: 89,
        providers: [{ ...openaiV89, id: providerId, presetType, baseUrl }],
        chatModels: [{ ...nanoV89, providerId, model: modelName }],
        chatModelId: nanoV89.id,
      })
      const { model, providerClient } = getChatModelClient({
        settings,
        modelId: settings.chatModelId,
      })
      expect(model).toMatchObject({ ...nanoV89, providerId, model: modelName })
      await providerClient.generateResponse(model, {
        model: model.model,
        messages: [{ role: 'user', content: 'hello' }],
      })
      expect(calls[0]).toMatchObject({
        url: `${baseUrl}/responses`,
        body: { model: modelName },
      })
    },
  )

  it.each([false, true])(
    'keeps the resolver first-match identity when duplicate IDs exist (proxy first: %s)',
    (proxyFirst) => {
      jest.spyOn(console, 'warn').mockImplementation(() => {})
      const custom = {
        ...nanoV89,
        providerId: 'proxy',
        model: 'custom-deployment',
      }
      const models = proxyFirst ? [custom, nanoV89] : [nanoV89, custom]
      const settings = parseYoloSettings({
        version: 89,
        providers: [
          openaiV89,
          {
            ...openaiV89,
            id: 'proxy',
            presetType: 'openai-compatible',
            baseUrl: 'https://proxy.example/v1',
          },
        ],
        chatModels: models,
        chatModelId: nanoV89.id,
      })
      expect(settings.chatModelId).toBe(nanoV89.id)
      expect(
        getChatModelClient({ settings, modelId: settings.chatModelId }).model,
      ).toMatchObject(models[0])
      expect(settings.chatModels).toHaveLength(2)
    },
  )

  it('streams through the actual SDK with corrected chat parameters', async () => {
    const { model, providerClient } = resolveSaved(
      o4V89.id,
      'openai-compatible',
    )
    fetchCapture.mockImplementationOnce(async (input, init) => {
      captureRequest(input, init)
      const events = [
        {
          id: 'local',
          object: 'chat.completion.chunk',
          created: 1,
          model: model.model,
          choices: [
            { index: 0, delta: { content: 'Useful ' }, finish_reason: null },
          ],
        },
        {
          id: 'local',
          object: 'chat.completion.chunk',
          created: 1,
          model: model.model,
          choices: [
            { index: 0, delta: { content: 'stream.' }, finish_reason: 'stop' },
          ],
        },
      ]
      return new Response(
        events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('') +
          'data: [DONE]\n\n',
        { headers: { 'content-type': 'text/event-stream' } },
      )
    })
    const stream = await providerClient.streamResponse(model, {
      model: model.model,
      messages: [{ role: 'user', content: 'hello' }],
      stream: true,
      max_tokens: 128,
      reasoningLevel: 'high',
    })
    const text: string[] = []
    for await (const chunk of stream) {
      for (const choice of chunk.choices)
        if (choice.delta.content) text.push(choice.delta.content)
    }
    expect(text.join('')).toBe('Useful stream.')
    expect(calls[0].body).toMatchObject({
      model: 'gpt-5.6-terra',
      stream: true,
      max_completion_tokens: 128,
      reasoning_effort: 'high',
    })
    expect(calls[0].body).not.toHaveProperty('max_tokens')
    expect(calls[0].body).not.toHaveProperty('reasoning')
  })

  for (const [oldId, replacement] of replacements) {
    for (const streaming of [false, true]) {
      it.each(requestConflictsV89)(
        `holds saved ${oldId} request conflict $apiType $key (streaming ${streaming})`,
        async ({ apiType, key, value, type }) => {
          jest.spyOn(console, 'warn').mockImplementation(() => {})
          const { model, providerClient, settings } = resolveSaved(
            oldId,
            apiType,
            [
              { key: ` ${key} `, value: '32', type: 'number' },
              { key: ` ${key} `, value: ` ${value} `, type },
              { key, value: ' ', type },
            ],
          )
          if (streaming)
            fetchCapture.mockImplementationOnce(async (input, init) => {
              const { body } = captureRequest(input, init)
              // Synthetic replies allow capture; no old-model health is asserted.
              if (apiType === 'openai-responses')
                return responsesSSE(String(body.model))
              return new Response('data: [DONE]\n\n', {
                headers: { 'content-type': 'text/event-stream' },
              })
            })
          const request = {
            model: model.model,
            messages: [{ role: 'user' as const, content: 'synthetic capture' }],
            max_tokens: 128,
            reasoningLevel: 'high' as const,
          }
          if (streaming)
            await collect(
              await providerClient.streamResponse(model, {
                ...request,
                stream: true,
              }),
            )
          else await providerClient.generateResponse(model, request)
          // This optional baseline log is synthetic serialized JSON, no headers,
          // custom secrets, credentials or original fetch/socket ever received.
          if (process.env.ROOT4604_CAPTURE === '1')
            console.debug(
              'ROOT4604-WIRE',
              JSON.stringify({ apiType, key, streaming, ...calls[0] }),
            )
          expect(calls[0].body.model).toBe(oldId.slice('openai/'.length))
          expect(settings.chatModelId).toBe(oldId)
          expect(model.id).toBe(oldId)
          expect(calls[0].body.model).not.toBe(replacement)
          const otherId =
            oldId === nanoV89.id
              ? 'openai/gpt-5.6-terra'
              : 'openai/gpt-5.6-luna'
          expect(settings.chatTitleModelId).toBe(
            oldId === o4V89.id ? oldId : otherId,
          )
          expect(settings.continuationOptions.continuationModelId).toBe(
            oldId === nanoV89.id ? oldId : otherId,
          )
          expect(settings.continuationOptions.tabCompletionModelId).toBe(
            oldId === o4V89.id ? oldId : otherId,
          )
          expect(settings.assistants[0].modelId).toBe(
            oldId === o4V89.id ? oldId : otherId,
          )
          expect(settings.chatOptions.reasoningLevelByModelId?.[oldId]).toBe(
            oldId === nanoV89.id ? 'off' : 'high',
          )
          expect(
            settings.chatOptions.reasoningLevelByModelId,
          ).not.toHaveProperty(`openai/${replacement}`)
          expect(
            settings.mcp.builtinCapabilityOptions.subagent_delegation,
          ).toMatchObject({
            allowedModelIds:
              oldId === nanoV89.id
                ? [oldId, otherId, 'openai/gpt-5']
                : [otherId, oldId, 'openai/gpt-5'],
            preferredModelId: oldId === nanoV89.id ? oldId : otherId,
          })
          expect(model.customParameters).toEqual([
            { key: ` ${key} `, value: '32', type: 'number' },
            { key: ` ${key} `, value: ` ${value} `, type },
            { key, value: ' ', type },
          ])
        },
      )
    }
  }

  it('holds the exact saved max_tokens counterexample after real SDK serialization', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    const { model, providerClient, settings } = resolveSaved(
      nanoV89.id,
      'openai-compatible',
      [{ key: 'max_tokens', value: '64', type: 'number' }],
    )
    await providerClient.generateResponse(model, {
      model: model.model,
      messages: [],
      max_tokens: 128,
    })
    if (process.env.ROOT4604_CAPTURE === '1')
      console.debug('ROOT4604-EXACT-WIRE', JSON.stringify(calls[0]))
    expect(calls[0]).toMatchObject({
      url: 'https://api.openai.com/v1/chat/completions',
      body: { model: 'gpt-4.1-nano', max_tokens: 64 },
    })
    expect(settings.chatModelId).toBe(nanoV89.id)
    expect(model).toMatchObject(nanoV89)
  })

  it.each([
    ['openai-compatible', 'max_completion_tokens', '64', 'number'],
    ['openai-responses', 'max_tokens', '64', 'number'],
    ['openai-compatible', 'reasoning_effort', 'low', 'text'],
    ['openai-responses', 'reasoning_effort', 'low', 'text'],
  ] as const)(
    'keeps a compatible saved %s %s customization eligible and effective',
    async (apiType, key, value, type) => {
      const { model, providerClient } = resolveSaved(nanoV89.id, apiType, [
        { key, value, type },
      ])
      expect(model.id).toBe('openai/gpt-5.6-luna')
      const result = await providerClient.generateResponse(model, {
        model: model.model,
        messages: [{ role: 'user', content: 'synthetic' }],
        max_tokens: 128,
        reasoningLevel: 'high',
      })
      expect(result.choices[0].message.content).toBe('Useful synthetic answer.')
      expect(calls[0].body.model).toBe('gpt-5.6-luna')
      if (key === 'reasoning_effort') {
        if (apiType === 'openai-responses')
          expect(calls[0].body.reasoning).toMatchObject({ effort: 'low' })
        else expect(calls[0].body.reasoning_effort).toBe('low')
      } else
        expect(
          calls[0].body[
            apiType === 'openai-responses'
              ? 'max_output_tokens'
              : 'max_completion_tokens'
          ],
        ).toBe(64)
      expect(calls[0].body).not.toHaveProperty('max_tokens')
      if (process.env.ROOT4604_CAPTURE === '1')
        console.debug(
          'ROOT4604-COMPATIBLE-WIRE',
          JSON.stringify({ apiType, key, ...calls[0] }),
        )
    },
  )

  it.each([false, true])(
    'receives corrected unmigrated v89 input (remove conflict: %s)',
    async (remove) => {
      const customization: CustomParameter[] = remove
        ? []
        : [{ key: 'max_completion_tokens', value: '64', type: 'number' }]
      const { model, providerClient } = resolveSaved(
        nanoV89.id,
        'openai-compatible',
        customization,
      )
      expect(model.id).toBe('openai/gpt-5.6-luna')
      const result = await providerClient.generateResponse(model, {
        model: model.model,
        messages: [{ role: 'user', content: 'synthetic' }],
        max_tokens: 128,
      })
      expect(result.choices[0].message.content).toBe('Useful synthetic answer.')
      expect(calls[0].body).toMatchObject({
        model: 'gpt-5.6-luna',
        max_completion_tokens: remove ? 128 : 64,
      })
      expect(calls[0].body).not.toHaveProperty('max_tokens')
    },
  )

  it('retains explicit custom last-write authority for an already configured v90 target', async () => {
    const { settings } = resolveSaved(nanoV89.id, 'openai-compatible')
    settings.chatModels = settings.chatModels.map((m) =>
      m.id === settings.chatModelId
        ? {
            ...m,
            customParameters: [
              { key: ' max_tokens ', value: '64', type: 'number' },
            ],
          }
        : m,
    )
    const loaded = parseYoloSettings(JSON.parse(JSON.stringify(settings)))
    const { model, providerClient } = getChatModelClient({
      settings: loaded,
      modelId: loaded.chatModelId,
    })
    await providerClient.generateResponse(model, {
      model: model.model,
      messages: [],
      max_tokens: 128,
    })
    expect(calls[0].body).toMatchObject({
      model: 'gpt-5.6-luna',
      max_completion_tokens: 128,
      max_tokens: 64,
    })
  })

  it.each(replacements)(
    'receives migrated %s Responses streaming as %s, failures and recovery',
    async (oldId, replacement) => {
      const { model, providerClient, settings } = resolveSaved(
        oldId,
        'openai-responses',
      )
      expect(settings.chatModelId).toBe(`openai/${replacement}`)
      expect(providerClient).toBeInstanceOf(OpenAIResponsesProvider)
      const request = {
        model: model.model,
        messages: [{ role: 'user' as const, content: 'synthetic' }],
        max_tokens: 128,
        reasoningLevel: 'high' as const,
        stream: true as const,
      }
      fetchCapture.mockImplementation(async (input, init) => {
        captureRequest(input, init)
        return responsesSSE(model.model)
      })
      const receive = async () =>
        collect(await providerClient.streamResponse(model, request))
      const assertHealthy = (chunks: LLMResponseStreaming[]) => {
        expect(
          chunks
            .flatMap((chunk) =>
              chunk.choices.map((choice) => choice.delta.content ?? ''),
            )
            .join(''),
        ).toBe('Useful synthetic answer.')
        expect(chunks[chunks.length - 1]).toMatchObject({
          model: replacement,
          usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 },
          choices: [{ finish_reason: 'stop' }],
        })
      }
      assertHealthy(await receive())
      fetchCapture.mockImplementationOnce(async (input, init) => {
        captureRequest(input, init)
        return responsesSSE(model.model, true)
      })
      await expect(receive()).rejects.toThrow('Synthetic stream failure')
      assertHealthy(await receive())
      fetchCapture.mockImplementationOnce(async (input, init) => {
        captureRequest(input, init)
        return jsonResponse(
          {
            error: {
              message: 'Synthetic stream HTTP failure',
              type: 'invalid_request_error',
            },
          },
          401,
        )
      })
      await expect(receive()).rejects.toThrow()
      assertHealthy(await receive())
      expect(calls).toHaveLength(5)
      for (const call of calls) {
        expect(call.url).toBe('https://api.openai.com/v1/responses')
        expect(call.body).toMatchObject({
          model: replacement,
          stream: true,
          max_output_tokens: 128,
          reasoning: { effort: 'high' },
          store: false,
        })
        expect(call.body).not.toHaveProperty('max_tokens')
        expect(call.body).not.toHaveProperty('max_completion_tokens')
        expect(call.body).not.toHaveProperty('reasoning_effort')
      }
      if (process.env.ROOT4604_CAPTURE === '1')
        console.debug(
          'ROOT4604-RESPONSES-STREAM',
          JSON.stringify({
            oldId,
            replacement,
            calls,
            receivedText: 'Useful synthetic answer.',
            receivedUsage: {
              prompt_tokens: 10,
              completion_tokens: 2,
              total_tokens: 12,
            },
            sequence: [
              'healthy',
              'response.failed propagated',
              'healthy recovery',
              'HTTP 401 propagated',
              'healthy recovery',
            ],
          }),
        )
    },
  )
})
