/**
 * dsh-human-step 分类器。
 *
 * 输入是任务步骤，输出这一步是否必须由人完成。纯函数、零依赖，
 * 只按关键词和少量上下文规则判断；宁可漏判，也不要把普通步骤硬说成人工步骤。
 */

export const CUSTOM_CATEGORY = {
  id: 'custom',
  label: '自定义关键词',
  description: '命中设置里的额外关键词。',
}

export const CATEGORIES = [
  {
    id: 'verification_code',
    label: '验证码 / 二次验证',
    description: '短信、邮箱、动态码、人机验证；必须由人读出或完成。',
    keywords: [
      '验证码', '动态码', '一次性密码', '确认码', '校验码', '安全码',
      '二次验证', '两步验证', '双因素', '2fa', 'mfa', 'otp', 'totp',
      'authenticator', '谷歌验证器', '身份验证器', '人机验证', '滑块验证',
      '图形验证', 'captcha',
    ],
    patterns: [
      /(短信|邮件|手机|邮箱).{0,8}(验证码|确认码|校验码)/i,
    ],
  },
  {
    id: 'qr',
    label: '扫码',
    description: '必须用手机或其他设备扫二维码。',
    keywords: ['二维码', '扫码', '扫一扫', 'qr code', '扫描二维码', 'scan the qr', 'scan qr'],
    patterns: [
      /(扫|扫描).{0,6}(码|二维码)/i,
    ],
  },
  {
    id: 'phone',
    label: '电话 / 短信',
    description: '打电话、接听、接收短信或语音确认。',
    keywords: [
      '打电话', '拨打电话', '致电', '接听电话', '电话确认', '电话联系',
      '接收短信', '查看短信', '短信确认', 'phone call', 'call the', 'call a ',
    ],
    patterns: [
      /(打|拨|接听).{0,6}电话/i,
      /(短信|电话).{0,8}(确认|联系|客服)/i,
    ],
  },
  {
    id: 'email',
    label: '邮箱确认',
    description: '必须打开邮箱、点击邮件里的链接或回复邮件。',
    keywords: [
      '收件箱', '查收邮件', '邮件里的链接', '点击邮件', '回复邮件',
      'check your email', 'check the email', 'open the email', 'email inbox',
    ],
    patterns: [
      /(点击|点开|点|打开|查看|查收).{0,12}(邮箱|邮件|收件箱)/i,
      /click .{0,20}(link )?(in|from) the email/i,
    ],
  },
  {
    id: 'identity',
    label: '实名 / 人脸 / 签字',
    description: '身份证、实名认证、人脸识别、手写签名等必须本人完成的动作。',
    keywords: [
      '实名认证', '实名', '身份证', '人脸识别', '刷脸', '活体检测',
      '手持身份证', '签字', '签名', 'kyc', 'face id', 'face scan',
    ],
    patterns: [
      /(上传|提交|拍摄).{0,8}(身份证|人脸|签名)/i,
    ],
  },
  {
    id: 'credential',
    label: '密钥 / 密码',
    description: '需要用户提供 API Key、Token、密码或私钥。',
    keywords: [],
    patterns: [
      /(提供|输入|填写|粘贴|配置|给我|需要|缺少).{0,12}(api ?key|access token|token|密码|口令|私钥|凭据|secret)/i,
      /(你的|自己的).{0,8}(api ?key|token|密码|私钥)/i,
      /^(重置|修改|设置|输入|填写|提供).{0,10}(密码|口令)/i,
    ],
  },
  {
    id: 'payment',
    label: '支付 / 下单',
    description: '付款、转账、购买、充值或确认订单。',
    keywords: ['付款', '下单', '购买', '转账', '充值', '订购', '银行卡', '信用卡', '支付宝', '微信支付', '余额支付'],
    patterns: [
      /(完成|确认|提交|进行|发起|去|请|需要).{0,8}(订单|支付|付款)/i,
      /(打开|进入|跳到|前往).{0,10}(付款|支付|下单|购买|转账|充值)/i,
      /(付款|支付|下单|购买|转账|充值)\s*[0-9]/i,
      /\b(checkout|place an order)\b/i,
    ],
  },
  {
    id: 'login',
    label: '登录 / 授权',
    description: '需要用户登录账号、输入密码或点击授权同意。',
    keywords: [
      '登录账号', '登录账户', '登录后', '重新登录', '扫码登录', '授权登录',
      '账号密码', '用户名密码', '输入密码', '同意授权',
      'sign in to', 'log in to', 'login to',
    ],
    patterns: [
      /(打开|访问|前往).{0,24}(登录|登陆)/i,
      /(登录|登陆).{0,16}(账号|账户|控制台|后台|网站|github|google|邮箱|系统)/i,
    ],
  },
  {
    id: 'physical',
    label: '物理操作',
    description: '插拔设备、按按钮、重启机器、拍照等必须动手的操作。',
    keywords: [
      '插上', '拔掉', '插入设备', '拔出', '接线', '按下按钮', '长按',
      '重启电脑', '重启设备', '开机', '关机', '拍照', '拍摄照片',
      '连接设备', '插电', '断电', 'u 盾', 'usb 设备',
    ],
    patterns: [
      /(插|拔|按|长按|重启|开机|关机|接|断).{0,10}(电源|线|设备|按钮|机器|电脑|手机|u 盾|usb)/i,
    ],
  },
  {
    id: 'approval',
    label: '人工确认 / 选择',
    description: '必须由用户拍板、选择或批准，agent 不能替用户决定。',
    keywords: [
      '需要你确认', '等你确认', '由你决定', '你来决定',
      '请你选择', '你选择', '等待用户', 'ask the user', 'wait for the user',
      'user must confirm', 'user must approve', 'human approval',
    ],
    patterns: [
      /(需要|等|请|让).{0,8}(你|用户).{0,8}(确认|选择|决定|批准|拍板)/i,
      /\b(ask|wait for) the user\b/i,
      /\buser (must|needs to) (confirm|approve|choose|decide)\b/i,
    ],
  },
]

export const CATEGORY_IDS = CATEGORIES.map((category) => category.id)
export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((category) => [category.id, category]))

export const DEFAULT_SETTINGS = {
  categories: [...CATEGORY_IDS],
  extraKeywords: [],
  recordHistory: true,
  historyLimit: 50,
}

function asString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function uniqueStrings(values) {
  const seen = new Set()
  const result = []
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value)
      result.push(value)
    }
  }
  return result
}

export function normalizeSettings(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const requested = Array.isArray(source.categories) ? source.categories : DEFAULT_SETTINGS.categories
  const categories = uniqueStrings(
    requested.filter((id) => typeof id === 'string' && CATEGORY_MAP[id] !== undefined),
  )
  const extraKeywords = uniqueStrings(
    Array.isArray(source.extraKeywords)
      ? source.extraKeywords
          .filter((item) => typeof item === 'string')
          .map((item) => item.trim())
          .filter((item) => item !== '')
          .slice(0, 100)
          .map((item) => item.slice(0, 80))
      : [],
  )
  const rawLimit = Number(source.historyLimit)
  const historyLimit = Number.isFinite(rawLimit) ? Math.min(200, Math.max(1, Math.trunc(rawLimit))) : 50
  return {
    categories,
    extraKeywords,
    recordHistory: source.recordHistory !== false,
    historyLimit,
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^$()|[\]\\]/g, '\\$&')
}

function keywordHit(text, keyword) {
  const needle = asString(keyword).toLowerCase()
  if (needle === '') return false
  if (/^[a-z0-9][a-z0-9 ._+-]*$/.test(needle)) {
    const pattern = new RegExp('(^|[^a-z0-9])' + escapeRegExp(needle) + '([^a-z0-9]|$)', 'i')
    return pattern.test(text)
  }
  return text.includes(needle)
}

function normalizeStep(step, index) {
  if (typeof step === 'string') {
    return {
      id: 'step-' + String(index + 1),
      title: step.trim() || '步骤 ' + String(index + 1),
      detail: '',
      instructions: '',
      requiresHuman: undefined,
      category: undefined,
    }
  }
  const source = step && typeof step === 'object' ? step : {}
  const title = asString(source.title) || asString(source.name) || asString(source.step) || asString(source.text) || asString(source.action)
  const detail = asString(source.detail) || asString(source.description)
  const instructions = asString(source.instructions) || asString(source.instruction) || asString(source.how)
  const rawCategory = asString(source.category)
  return {
    id: asString(source.id) || 'step-' + String(index + 1),
    title: title || '步骤 ' + String(index + 1),
    detail,
    instructions,
    requiresHuman: typeof source.requiresHuman === 'boolean' ? source.requiresHuman : undefined,
    category: rawCategory !== '' && CATEGORY_MAP[rawCategory] !== undefined ? rawCategory : undefined,
  }
}

export function classifyStep(step, settings, index = 0) {
  const normalized = normalizeStep(step, index)
  const effective = normalizeSettings(settings)
  const text = [normalized.title, normalized.detail, normalized.instructions]
    .filter((part) => part !== '')
    .join(' ')
    .toLowerCase()
  const enabled = new Set(effective.categories)
  const matches = []

  for (const category of CATEGORIES) {
    if (!enabled.has(category.id)) continue
    const hits = []
    for (const keyword of category.keywords || []) {
      if (keywordHit(text, keyword)) hits.push(keyword)
    }
    for (const pattern of category.patterns || []) {
      if (pattern.test(text)) hits.push('规则：' + pattern.source)
    }
    if (hits.length > 0) matches.push({ category, hits: uniqueStrings(hits) })
  }

  for (const keyword of effective.extraKeywords) {
    if (keywordHit(text, keyword)) {
      matches.push({ category: CUSTOM_CATEGORY, hits: [keyword] })
    }
  }

  const seen = new Set()
  const uniqueMatches = matches.filter((match) => {
    if (seen.has(match.category.id)) return false
    seen.add(match.category.id)
    return true
  })

  if (normalized.requiresHuman === false) {
    return {
      ...normalized,
      requiresHuman: false,
      category: null,
      categoryLabel: '',
      categories: [],
      matchedKeywords: [],
      reason: '调用方标记为无需人工。',
    }
  }

  const forced = normalized.category !== undefined ? CATEGORY_MAP[normalized.category] : null
  if (forced !== null) {
    const hits = uniqueMatches.find((match) => match.category.id === forced.id)
    return {
      ...normalized,
      requiresHuman: true,
      category: forced.id,
      categoryLabel: forced.label,
      categories: [forced.id],
      matchedKeywords: hits ? hits.hits : [],
      reason: '调用方指定为人工步骤。',
    }
  }

  if (normalized.requiresHuman === true && uniqueMatches.length === 0) {
    return {
      ...normalized,
      requiresHuman: true,
      category: 'custom',
      categoryLabel: CUSTOM_CATEGORY.label,
      categories: ['custom'],
      matchedKeywords: [],
      reason: '调用方标记为需要人工完成。',
    }
  }

  if (uniqueMatches.length > 0) {
    const primary = uniqueMatches[0]
    return {
      ...normalized,
      requiresHuman: true,
      category: primary.category.id,
      categoryLabel: primary.category.label,
      categories: uniqueMatches.map((match) => match.category.id),
      matchedKeywords: uniqueStrings(uniqueMatches.flatMap((match) => match.hits)),
      reason:
        (normalized.requiresHuman === true ? '调用方标记为需要人工；' : '') +
        '命中类别「' + primary.category.label + '」：' + primary.hits.join('、') + '。',
    }
  }

  return {
    ...normalized,
    requiresHuman: false,
    category: null,
    categoryLabel: '',
    categories: [],
    matchedKeywords: [],
    reason: '没有命中人工步骤关键词；按普通步骤处理。',
  }
}

export function planHumanSteps(input, settings) {
  const source = input && typeof input === 'object' ? input : {}
  const task = asString(source.task)
  const rawSteps = Array.isArray(source.steps) ? source.steps : []
  if (rawSteps.length === 0) {
    return {
      ok: false,
      task,
      error: 'steps 不能为空：至少给一个步骤。',
      total: 0,
      humanCount: 0,
      steps: [],
      humanSteps: [],
      agentSteps: [],
      text: '人工步骤计划失败：steps 不能为空。',
    }
  }
  if (rawSteps.length > 100) {
    return {
      ok: false,
      task,
      error: 'steps 最多 100 个；请先拆分任务。',
      total: rawSteps.length,
      humanCount: 0,
      steps: [],
      humanSteps: [],
      agentSteps: [],
      text: '人工步骤计划失败：steps 最多 100 个。',
    }
  }

  const steps = rawSteps.map((step, index) => classifyStep(step, settings, index))
  const humanSteps = steps.filter((step) => step.requiresHuman === true)
  const agentSteps = steps.filter((step) => step.requiresHuman !== true)
  const text = formatPlanText(task, steps, humanSteps, agentSteps)
  return {
    ok: true,
    task,
    total: steps.length,
    humanCount: humanSteps.length,
    steps,
    humanSteps,
    agentSteps,
    text,
    generatedAt: new Date().toISOString(),
  }
}

export function formatPlanText(task, steps, humanSteps, agentSteps) {
  const lines = []
  lines.push(task === '' ? '人工步骤计划' : '人工步骤计划：' + task)
  lines.push('共 ' + String(steps.length) + ' 步，其中 ' + String(humanSteps.length) + ' 步必须由人完成。')
  if (humanSteps.length > 0) {
    lines.push('')
    lines.push('必须由人完成：')
    for (const step of humanSteps) {
      lines.push('- [' + step.categoryLabel + '] ' + step.title + '（' + step.id + '）')
      lines.push('  原因：' + step.reason)
    }
  }
  if (agentSteps.length > 0) {
    lines.push('')
    lines.push('可以由 agent 完成：')
    for (const step of agentSteps) {
      lines.push('- ' + step.title + '（' + step.id + '）')
    }
  }
  lines.push('')
  lines.push('到人工步骤时必须调用 human_step，等用户在卡片上点“已完成 / 跳过 / 取消”；不要代替用户操作，也不要假装完成。')
  return lines.join('\n')
}
