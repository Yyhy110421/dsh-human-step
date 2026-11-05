/**
 * dsh-human-step 宿主半身。
 *
 * 两个工具：
 * - plan_human_steps：只读分类，提前标出必须由人完成的步骤。
 * - human_step：调用 DSH 原生 userQuestions 卡片，暂停到用户点“已完成 / 跳过 / 取消”。
 * 设置页走 /human-step/*，历史记录只存标题、类别、状态，不存验证码和密码。
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
  CATEGORIES,
  CATEGORY_IDS,
  CATEGORY_MAP,
  CUSTOM_CATEGORY,
  classifyStep,
  normalizeSettings,
  planHumanSteps,
} from './classify.js'

export const name = 'human-step'
export const inject = ['tools', 'systemPrompt', 'webServer', 'userQuestions']

function dshHome() {
  return process.env.DSH_HOME || join(process.env.USERPROFILE || process.env.HOME || process.cwd(), '.dsh')
}

function settingsFile() {
  return join(dshHome(), 'data', 'human-step.json')
}

function historyFile() {
  return join(dshHome(), 'data', 'human-step-history.json')
}

function atomicWrite(file, text) {
  mkdirSync(dirname(file), { recursive: true })
  const tmp = file + '.tmp'
  writeFileSync(tmp, text, 'utf8')
  renameSync(tmp, file)
}

function readSettings(baseline) {
  let stored = {}
  try {
    stored = JSON.parse(readFileSync(settingsFile(), 'utf8'))
  } catch {
    stored = {}
  }
  return normalizeSettings({ ...(baseline || {}), ...(stored && typeof stored === 'object' ? stored : {}) })
}

function writeSettings(patch, baseline) {
  const next = normalizeSettings({ ...readSettings(baseline), ...(patch || {}) })
  atomicWrite(settingsFile(), JSON.stringify(next, null, 2) + '\n')
  return next
}

function readHistory() {
  try {
    const parsed = JSON.parse(readFileSync(historyFile(), 'utf8'))
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item) => item && typeof item === 'object').slice(0, 200)
  } catch {
    return []
  }
}

function appendHistory(entry, settings) {
  if (settings.recordHistory !== true) return
  const next = [entry, ...readHistory()].slice(0, settings.historyLimit)
  atomicWrite(historyFile(), JSON.stringify(next, null, 2) + '\n')
}

function clearHistory() {
  atomicWrite(historyFile(), '[]\n')
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
      if (raw.length > 1024 * 1024) {
        reject(new Error('请求体过大'))
        req.destroy()
      }
    })
    req.on('end', () => resolve(raw))
    req.on('error', reject)
  })
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

function resolveCategory(args, step, settings) {
  const requested = typeof args.category === 'string' ? args.category.trim() : ''
  if (requested !== '' && CATEGORY_MAP[requested] !== undefined) return CATEGORY_MAP[requested]
  const classified = classifyStep(step, settings)
  if (classified.category !== null && CATEGORY_MAP[classified.category] !== undefined) {
    return CATEGORY_MAP[classified.category]
  }
  if (classified.category === 'custom') return CUSTOM_CATEGORY
  return null
}

function buildQuestion(title, instructions, category) {
  const lines = []
  if (category !== null) lines.push('【' + category.label + '】')
  lines.push(title)
  if (instructions !== '') {
    lines.push('')
    lines.push(instructions)
  }
  lines.push('')
  lines.push('完成后点下面的按钮；这一步需要你本人操作。')
  return lines.join('\n')
}

function selectedLabels(value) {
  if (!Array.isArray(value)) return []
  return value.filter((item) => typeof item === 'string')
}

function statusFromAnswer(selected, custom) {
  if (selected.some((item) => item.includes('取消'))) return 'cancelled'
  if (selected.some((item) => item.includes('跳过'))) return 'skipped'
  if (selected.some((item) => item.includes('完成')) || custom !== '') return 'done'
  return 'skipped'
}

export function apply(ctx, config) {
  const baselineConfig = normalizeSettings(config || {})

  const planTool = {
    name: 'plan_human_steps',
    description:
      '人工步骤计划：把任务拆成步骤，标出哪些步骤必须由用户本人完成（验证码、扫码、电话、邮箱确认、实名/人脸、密钥密码、支付、登录授权、物理操作、人工拍板）。只读，不暂停。' +
      '到真正需要用户操作时，再调用 human_step 弹出原生卡片等待确认。',
    parameters: {
      type: 'object',
      properties: {
        task: {
          type: 'string',
          description: '要完成的任务，一句话即可。',
        },
        steps: {
          type: 'array',
          description: '任务步骤。每步至少给 title；可以补充 detail / instructions。',
          minItems: 1,
          maxItems: 100,
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: '可选步骤 ID；不传会生成 step-1、step-2。' },
              title: { type: 'string', description: '这一步做什么。' },
              detail: { type: 'string', description: '补充说明。' },
              instructions: { type: 'string', description: '具体操作说明。' },
              requiresHuman: {
                type: 'boolean',
                description: '可选：调用方已经知道必须/不必由人完成时直接标记；true 会强制归为人工步骤。',
              },
              category: {
                type: 'string',
                enum: CATEGORY_IDS,
                description: '可选：直接指定人工步骤类别。',
              },
            },
            required: ['title'],
            additionalProperties: false,
          },
        },
      },
      required: ['task', 'steps'],
      additionalProperties: false,
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          task: { type: 'string' },
          total: { type: 'number' },
          humanCount: { type: 'number' },
          steps: { type: 'array', items: { type: 'object', additionalProperties: true } },
          humanSteps: { type: 'array', items: { type: 'object', additionalProperties: true } },
          agentSteps: { type: 'array', items: { type: 'object', additionalProperties: true } },
          text: { type: 'string' },
          error: { type: 'string' },
        },
        additionalProperties: true,
      },
      render: (args, value) => {
        const result = value && typeof value === 'object' ? value : {}
        return [{ type: 'text', text: typeof result.text === 'string' ? result.text : (result.error || '人工步骤计划完成。') }]
      },
    },
    timeoutMs: 30000,
    async execute(rawArgs) {
      const args = rawArgs && typeof rawArgs === 'object' ? rawArgs : {}
      const settings = readSettings(baselineConfig)
      return planHumanSteps(args, settings)
    },
  }

  const stepTool = {
    name: 'human_step',
    description:
      '人工步骤暂停：在 DSH 里弹出原生问题卡片，选项为“已完成，继续 / 跳过这一步 / 取消当前任务”，直到用户点击才返回。' +
      '用在验证码、扫码、电话/短信、邮箱确认、实名/人脸、提供密钥、支付、登录授权、物理操作、必须由人拍板的选择。' +
      '不要代替用户输入验证码或点授权；返回 unavailable 时在对话里请用户完成，不要假装完成。',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: '需要用户完成什么，一句话说清。',
        },
        instructions: {
          type: 'string',
          description: '具体操作说明，例如“打开手机短信，把 6 位验证码填进登录页”。',
        },
        category: {
          type: 'string',
          enum: CATEGORY_IDS,
          description: '可选：人工步骤类别；不传会按标题和说明自动判断。',
        },
      },
      required: ['title'],
      additionalProperties: false,
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          status: { type: 'string', enum: ['done', 'skipped', 'cancelled', 'unavailable'] },
          title: { type: 'string' },
          category: { type: 'string' },
          categoryLabel: { type: 'string' },
          selected: { type: 'array', items: { type: 'string' } },
          custom: { type: 'string' },
          message: { type: 'string' },
          error: { type: 'string' },
          askedAt: { type: 'string' },
        },
        required: ['ok', 'status', 'message'],
        additionalProperties: true,
      },
      render: (args, value) => {
        const result = value && typeof value === 'object' ? value : {}
        return [{ type: 'text', text: typeof result.message === 'string' ? result.message : '人工步骤已结束。' }]
      },
    },
    async execute(rawArgs, exec) {
      const args = rawArgs && typeof rawArgs === 'object' ? rawArgs : {}
      const title = typeof args.title === 'string' ? args.title.trim() : ''
      const instructions = typeof args.instructions === 'string' ? args.instructions.trim() : ''
      if (title === '') {
        return {
          ok: false,
          status: 'unavailable',
          title: '',
          category: '',
          categoryLabel: '',
          selected: [],
          custom: '',
          message: 'human_step 需要 title：请说明要用户完成什么。',
          error: 'title is required',
          askedAt: new Date().toISOString(),
        }
      }

      const settings = readSettings(baselineConfig)
      const step = { title, instructions }
      const category = resolveCategory(args, step, settings)
      const categoryId = category === null ? '' : category.id
      const categoryLabel = category === null ? '' : category.label
      const askedAt = new Date().toISOString()

      if (ctx.userQuestions === undefined || typeof ctx.userQuestions.ask !== 'function') {
        return {
          ok: false,
          status: 'unavailable',
          title,
          category: categoryId,
          categoryLabel,
          selected: [],
          custom: '',
          message:
            '无法弹出人工步骤卡片：当前 DSH 没有可用的 userQuestions 服务。' +
            '请在对话里请用户完成「' + title + '」，不要假装已完成。',
          error: 'userQuestions service unavailable',
          askedAt,
        }
      }

      const request = {
        questions: [
          {
            id: 'human-step',
            header: '需要你完成',
            question: buildQuestion(title, instructions, category),
            options: [
              { label: '已完成，继续', description: '这一步已经做完，agent 继续下一步。' },
              { label: '跳过这一步', description: '不做这一步，继续后面的步骤；不要声称它已完成。' },
              { label: '取消当前任务', description: '停止整个任务，agent 应汇报当前进度。' },
            ],
            multiSelect: false,
          },
        ],
        ...(exec && exec.agent ? { agent: exec.agent } : {}),
        ...(exec && exec.signal ? { signal: exec.signal } : {}),
      }

      try {
        const result = await ctx.userQuestions.ask(request)
        const answers = result && Array.isArray(result.answers) ? result.answers : []
        const answer = answers.find((item) => item && item.id === 'human-step') || answers[0] || {}
        const selected = selectedLabels(answer.selected)
        const custom = typeof answer.custom === 'string' ? answer.custom.trim() : ''
        const status = statusFromAnswer(selected, custom)
        let message = ''
        if (status === 'cancelled') {
          message = '用户取消了当前任务。停止后续步骤，向用户汇报已完成和未完成的部分。'
        } else if (status === 'skipped') {
          message = '用户选择跳过「' + title + '」。继续，但不要声称这一步已完成。'
        } else {
          message = '用户确认「' + title + '」已完成，继续下一步。'
          if (custom !== '') message += ' 用户补充：' + custom
        }
        appendHistory(
          { at: askedAt, title, category: categoryId, status, custom },
          settings,
        )
        return {
          ok: true,
          status,
          title,
          category: categoryId,
          categoryLabel,
          selected,
          custom,
          message,
          askedAt,
        }
      } catch (error) {
        const detail = error && error.message ? String(error.message) : String(error)
        return {
          ok: false,
          status: 'unavailable',
          title,
          category: categoryId,
          categoryLabel,
          selected: [],
          custom: '',
          message:
            '无法弹出人工步骤卡片：' + detail + '。请在对话里请用户完成「' + title + '」，不要假装已完成。',
          error: detail,
          askedAt,
        }
      }
    },
  }

  ctx.tools.register(planTool)
  ctx.tools.register(stepTool)

  try {
    ctx.systemPrompt.section({
      name: 'tool:human-step',
      order: 151,
      text:
        '任务里出现验证码、扫码、电话/短信、邮箱确认、实名/人脸、密钥密码、支付、登录授权、物理操作，或必须由用户拍板的选择时：' +
        '先用 plan_human_steps 标出人工步骤；到那一步必须调用 human_step，等用户在卡片上点“已完成 / 跳过 / 取消”。' +
        '不要代替用户输入验证码、点授权或假装完成；human_step 返回 unavailable 时在对话里请用户完成。' +
        '用户取消时停止并汇报。',
    })
  } catch (error) {
    console.warn('[human-step] system prompt section unavailable:', error && error.message)
  }

  try {
    ctx.inject(['webServer'], (sctx) => {
      const webServer = sctx.webServer
      if (webServer === undefined || typeof webServer.register !== 'function') return

      webServer.register({
        kind: 'exact',
        path: '/human-step/settings',
        handler: async (req, res) => {
          if (req.method === 'GET') {
            sendJson(res, 200, {
              ok: true,
              settings: readSettings(baselineConfig),
              categories: CATEGORIES.map((category) => ({
                id: category.id,
                label: category.label,
                description: category.description,
              })),
              history: readHistory().slice(0, 20),
            })
            return
          }
          if (req.method !== 'POST') {
            sendJson(res, 405, { ok: false, error: 'method not allowed' })
            return
          }
          try {
            const raw = await readBody(req)
            const patch = JSON.parse(raw || '{}')
            const settings = writeSettings(patch, baselineConfig)
            sendJson(res, 200, { ok: true, settings })
          } catch (error) {
            sendJson(res, 400, { ok: false, error: String(error && error.message ? error.message : error) })
          }
        },
      })

      webServer.register({
        kind: 'exact',
        path: '/human-step/history/clear',
        handler: async (req, res) => {
          if (req.method !== 'POST') {
            sendJson(res, 405, { ok: false, error: 'method not allowed' })
            return
          }
          try {
            clearHistory()
            sendJson(res, 200, { ok: true, history: [] })
          } catch (error) {
            sendJson(res, 400, { ok: false, error: String(error && error.message ? error.message : error) })
          }
        },
      })
    })
  } catch (error) {
    console.warn('[human-step] web settings unavailable:', error && error.message)
  }
}
