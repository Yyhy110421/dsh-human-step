import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const home = mkdtempSync(join(tmpdir(), 'human-step-test-'))
process.env.DSH_HOME = home

const { apply } = await import('../lib/index.js')

const tools = new Map()
const routes = []
let nextAnswer = { answers: [{ id: 'human-step', selected: ['已完成，继续'] }] }
let lastRequest = null

const ctx = {
  tools: {
    register(tool) {
      tools.set(tool.name, tool)
    },
  },
  systemPrompt: {
    section() {},
  },
  inject(names, callback) {
    callback({
      webServer: {
        register(route) {
          routes.push(route)
        },
      },
    })
  },
  userQuestions: {
    async ask(request) {
      lastRequest = request
      return nextAnswer
    },
  },
}

apply(ctx, { recordHistory: true, historyLimit: 5 })

assert.equal(tools.has('plan_human_steps'), true)
assert.equal(tools.has('human_step'), true)
assert.equal(routes.some((route) => route.path === '/human-step/settings'), true)
assert.equal(routes.some((route) => route.path === '/human-step/history/clear'), true)

const plan = await tools.get('plan_human_steps').execute({
  task: '登录演示',
  steps: [
    { title: '输入短信验证码' },
    { title: '运行测试' },
  ],
})
assert.equal(plan.ok, true)
assert.equal(plan.humanCount, 1)

const done = await tools.get('human_step').execute(
  { title: '输入短信验证码', instructions: '看手机短信', category: 'verification_code' },
  { agent: { id: 'test-agent' } },
)
assert.equal(done.ok, true)
assert.equal(done.status, 'done')
assert.equal(done.category, 'verification_code')
assert.equal(lastRequest.questions[0].id, 'human-step')
assert.equal(lastRequest.questions[0].options.length, 3)
assert.equal(lastRequest.agent.id, 'test-agent')

const historyFile = join(home, 'data', 'human-step-history.json')
const history = JSON.parse(readFileSync(historyFile, 'utf8'))
assert.equal(history.length, 1)
assert.equal(history[0].status, 'done')
assert.equal(history[0].title, '输入短信验证码')

nextAnswer = { answers: [{ id: 'human-step', selected: ['取消当前任务'] }] }
const cancelled = await tools.get('human_step').execute({ title: '支付 100 元' }, {})
assert.equal(cancelled.ok, true)
assert.equal(cancelled.status, 'cancelled')
assert.match(cancelled.message, /停止/)

nextAnswer = { answers: [{ id: 'human-step', selected: [] }] }
const skipped = await tools.get('human_step').execute({ title: '扫码' }, {})
assert.equal(skipped.status, 'skipped')
assert.match(skipped.message, /跳过/)

ctx.userQuestions.ask = async () => {
  throw new Error('no answerer')
}
const unavailable = await tools.get('human_step').execute({ title: '签字' }, {})
assert.equal(unavailable.ok, false)
assert.equal(unavailable.status, 'unavailable')
assert.match(unavailable.message, /no answerer/)

rmSync(home, { recursive: true, force: true })
console.log('plugin tests passed')
