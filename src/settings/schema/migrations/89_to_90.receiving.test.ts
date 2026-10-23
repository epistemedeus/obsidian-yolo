/* eslint-disable import/no-nodejs-modules -- Jest-only receiving uses disposable data.json files and guards both Node HTTP transports against network egress. */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import * as http from 'node:http'
import * as https from 'node:https'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
/* eslint-enable import/no-nodejs-modules */

import { getChatModelClient } from '../../../core/llm/manager'
import { OpenAICompatibleProvider } from '../../../core/llm/openaiCompatibleProvider'
import { OpenAIResponsesProvider } from '../../../core/llm/openaiResponsesProvider'
import {
  extractYoloDataMeta,
  stampYoloDataMeta,
} from '../../../core/paths/yoloManagedData'
import type { LLMRequestNonStreaming } from '../../../types/llm/request'
import type { LLMProviderApiType } from '../../../types/provider.types'
import { parseYoloSettings } from '../settings'

import { nanoV89, o4V89, openaiV89, selectedV89 } from './89_to_90.fixtures'

const replacements = [
  [nanoV89.id, 'gpt-5.6-luna'],
  [o4V89.id, 'gpt-5.6-terra'],
] as const
const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

function healthyResponse(model: string, responses: boolean) {
  const usage = { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 }
  return responses
    ? {
        id: 'resp_local',
        object: 'response',
        created_at: 1,
        model,
        status: 'completed',
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
        usage: { input_tokens: 10, output_tokens: 2, total_tokens: 12 },
      }
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
        usage,
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

  const resolveSaved = (oldId: string, apiType: LLMProviderApiType) => {
    const raw = selectedV89()
    raw.chatModelId = oldId
    raw.providers = [{ ...openaiV89, apiType }]
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
})
