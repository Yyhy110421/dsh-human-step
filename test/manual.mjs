import assert from 'node:assert/strict'
import {
  CATEGORY_IDS,
  classifyStep,
  normalizeSettings,
  planHumanSteps,
} from '../lib/classify.js'

const steps = [
  '读取 README 并整理部署步骤',
  '打开手机接收短信验证码并输入',
  '运行 npm test 并修复失败',
  '打电话给运营商确认套餐',
  '打开手机扫二维码登录 GitHub',
  '点邮件里的确认链接',
  '登录 GitHub 控制台',
  '插入 U 盾并按下确认按钮',
  '需要你确认是否删除旧数据',
  '实现登录功能',
  '提供 API Key',
  '支付 100 元',
  '实现支付功能',
]

const plan = planHumanSteps({ task: '插件发布前的真实场景', steps })
assert.equal(plan.ok, true)
assert.equal(plan.total, 13)
assert.equal(plan.humanCount, 9)
assert.equal(plan.humanSteps.length, 9)
assert.equal(plan.agentSteps.length, 4)

const byTitle = new Map(plan.steps.map((step) => [step.title, step]))
assert.equal(byTitle.get('打开手机接收短信验证码并输入').category, 'verification_code')
assert.equal(byTitle.get('打电话给运营商确认套餐').category, 'phone')
assert.equal(byTitle.get('打开手机扫二维码登录 GitHub').category, 'qr')
assert.equal(byTitle.get('点邮件里的确认链接').category, 'email')
assert.equal(byTitle.get('登录 GitHub 控制台').category, 'login')
assert.equal(byTitle.get('插入 U 盾并按下确认按钮').category, 'physical')
assert.equal(byTitle.get('需要你确认是否删除旧数据').category, 'approval')
assert.equal(byTitle.get('提供 API Key').category, 'credential')
assert.equal(byTitle.get('支付 100 元').category, 'payment')
assert.equal(byTitle.get('实现登录功能').requiresHuman, false)
assert.equal(byTitle.get('实现支付功能').requiresHuman, false)

const noQr = classifyStep('打开手机扫二维码', {
  categories: CATEGORY_IDS.filter((id) => id !== 'qr'),
})
assert.equal(noQr.requiresHuman, false)

const forced = classifyStep({ title: '部署到生产', requiresHuman: true }, {})
assert.equal(forced.requiresHuman, true)
assert.equal(forced.category, 'custom')

const extra = classifyStep('按指纹解锁', { extraKeywords: ['指纹'] })
assert.equal(extra.requiresHuman, true)
assert.equal(extra.category, 'custom')

const empty = planHumanSteps({ task: '空计划', steps: [] })
assert.equal(empty.ok, false)

const normalized = normalizeSettings({ categories: ['qr', 'qr', 'not-a-category'], extraKeywords: [' 指纹 ', '指纹', ''], historyLimit: 999 })
assert.deepEqual(normalized.categories, ['qr'])
assert.deepEqual(normalized.extraKeywords, ['指纹'])
assert.equal(normalized.historyLimit, 200)

console.log(plan.text)
console.log('manual tests passed')
