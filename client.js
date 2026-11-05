/**
 * dsh-human-step 浏览器半身：设置 → 人工步骤。
 *
 * 设置保存在宿主侧（/human-step/settings）；历史只展示标题、类别、状态，
 * 不展示验证码、密码或用户填写的正文。
 */
window.__ModuleLoader__.load({
  id: 'dsh-human-step',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const NS = 'human-step'

    const card = {
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      padding: '4px 2px 20px',
      maxWidth: 760,
      fontSize: 13,
      lineHeight: 1.55,
      color: 'inherit',
    }
    const row = { display: 'flex', flexDirection: 'column', gap: 6 }
    const label = { fontWeight: 600, opacity: 0.9 }
    const hint = { fontSize: 12, opacity: 0.65 }
    const control = {
      minHeight: 32,
      padding: '6px 8px',
      font: 'inherit',
      color: 'inherit',
      background: 'transparent',
      border: '1px solid rgba(127,127,127,0.4)',
      borderRadius: 8,
      boxSizing: 'border-box',
    }
    const area = { ...control, width: '100%', minHeight: 68, resize: 'vertical' }
    const button = {
      alignSelf: 'flex-start',
      padding: '7px 18px',
      font: 'inherit',
      color: 'inherit',
      background: 'rgba(127,127,127,0.14)',
      border: '1px solid rgba(127,127,127,0.45)',
      borderRadius: 8,
      cursor: 'pointer',
    }
    const grid = {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: 10,
    }
    const categoryItem = {
      display: 'flex',
      gap: 8,
      alignItems: 'flex-start',
      padding: '9px 10px',
      border: '1px solid rgba(127,127,127,0.28)',
      borderRadius: 8,
      cursor: 'pointer',
    }
    const historyItem = {
      padding: '9px 10px',
      border: '1px solid rgba(127,127,127,0.25)',
      borderRadius: 8,
      background: 'rgba(127,127,127,0.05)',
    }

    function lines(value) {
      return Array.isArray(value) ? value.join('\n') : ''
    }

    function statusText(value) {
      if (value === 'done') return '已完成'
      if (value === 'skipped') return '已跳过'
      if (value === 'cancelled') return '已取消'
      return String(value || '未知')
    }

    function formatTime(value) {
      if (typeof value !== 'string' || value === '') return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return value
      return date.toLocaleString('zh-CN', { hour12: false })
    }

    function Panel() {
      const [state, setState] = React.useState({
        loading: true,
        saving: false,
        clearing: false,
        categories: [],
        categoryMeta: [],
        extraKeywords: [],
        recordHistory: true,
        historyLimit: 50,
        history: [],
        message: '',
      })

      React.useEffect(() => {
        let alive = true
        fetch('/human-step/settings')
          .then((res) => res.json())
          .then((body) => {
            if (!alive || !body || body.ok !== true || !body.settings) return
            const s = body.settings
            setState((prev) => ({
              ...prev,
              loading: false,
              categories: Array.isArray(s.categories) ? s.categories : [],
              categoryMeta: Array.isArray(body.categories) ? body.categories : prev.categoryMeta,
              extraKeywords: Array.isArray(s.extraKeywords) ? s.extraKeywords : [],
              recordHistory: s.recordHistory !== false,
              historyLimit: typeof s.historyLimit === 'number' ? s.historyLimit : 50,
              history: Array.isArray(body.history) ? body.history : [],
            }))
          })
          .catch(() => {
            if (alive) setState((prev) => ({ ...prev, loading: false, message: '读取设置失败：宿主路由不可用。' }))
          })
        return () => {
          alive = false
        }
      }, [])

      function toggleCategory(id) {
        setState((prev) => {
          const selected = new Set(prev.categories)
          if (selected.has(id)) selected.delete(id)
          else selected.add(id)
          return { ...prev, categories: [...selected] }
        })
      }

      function save() {
        setState((prev) => ({ ...prev, saving: true, message: '' }))
        fetch('/human-step/settings', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            categories: state.categories,
            extraKeywords: state.extraKeywords,
            recordHistory: state.recordHistory,
            historyLimit: Number(state.historyLimit) || 50,
          }),
        })
          .then((res) => res.json())
          .then((body) => {
            if (!body || body.ok !== true) throw new Error((body && body.error) || '保存失败')
            const s = body.settings || {}
            setState((prev) => ({
              ...prev,
              saving: false,
              categories: Array.isArray(s.categories) ? s.categories : prev.categories,
              extraKeywords: Array.isArray(s.extraKeywords) ? s.extraKeywords : prev.extraKeywords,
              recordHistory: s.recordHistory !== false,
              historyLimit: typeof s.historyLimit === 'number' ? s.historyLimit : prev.historyLimit,
              message: '已保存。',
            }))
          })
          .catch((error) => {
            setState((prev) => ({
              ...prev,
              saving: false,
              message: '保存失败：' + String(error && error.message ? error.message : error),
            }))
          })
      }

      function clearHistory() {
        setState((prev) => ({ ...prev, clearing: true, message: '' }))
        fetch('/human-step/history/clear', { method: 'POST' })
          .then((res) => res.json())
          .then((body) => {
            if (!body || body.ok !== true) throw new Error((body && body.error) || '清空失败')
            setState((prev) => ({ ...prev, clearing: false, history: [], message: '历史已清空。' }))
          })
          .catch((error) => {
            setState((prev) => ({
              ...prev,
              clearing: false,
              message: '清空失败：' + String(error && error.message ? error.message : error),
            }))
          })
      }

      const selected = new Set(state.categories)
      const categoryItems = state.categoryMeta.map((category) =>
        h(
          'label',
          { key: category.id, style: categoryItem },
          h('input', {
            type: 'checkbox',
            checked: selected.has(category.id),
            onChange: () => toggleCategory(category.id),
          }),
          h(
            'span',
            { style: { display: 'flex', flexDirection: 'column', gap: 2 } },
            h('strong', { style: { fontWeight: 600 } }, category.label),
            h('span', { style: hint }, category.description),
          ),
        ),
      )

      return h(
        'div',
        { style: card },
        h('div', { style: label }, '人工步骤：该停的时候停下来'),
        h(
          'div',
          { style: hint },
          'agent 能开浏览器、跑命令，但不能替你接短信、扫码、签字或付款。' +
            '开启这些类别后，plan_human_steps 会提前标出人工步骤；到那一步 human_step 会弹出原生卡片，' +
            '等你点“已完成 / 跳过 / 取消”才继续。',
        ),
        h('div', { style: label }, '识别这些类别'),
        categoryItems.length > 0
          ? h('div', { style: grid }, categoryItems)
          : h('div', { style: hint }, state.loading ? '读取类别中…' : '没有读到类别，检查宿主路由。'),
        h(
          'div',
          { style: row },
          h('div', { style: label }, '额外关键词（每行一个）'),
          h('textarea', {
            style: area,
            value: lines(state.extraKeywords),
            onChange: (event) => setState((prev) => ({ ...prev, extraKeywords: event.target.value.split('\n') })),
            placeholder: '例如：指纹、门禁、纸质签字、公司 VPN',
            spellCheck: false,
          }),
          h('div', { style: hint }, '命中任一关键词的步骤会被标成人工步骤；适合补上你行业里的特殊操作。'),
        ),
        h(
          'div',
          { style: row },
          h(
            'label',
            { style: { display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' } },
            h('input', {
              type: 'checkbox',
              checked: state.recordHistory,
              onChange: (event) => setState((prev) => ({ ...prev, recordHistory: event.target.checked })),
            }),
            h('span', null, '记录最近的人工步骤（只记标题、类别、状态，不存验证码和密码）'),
          ),
          h(
            'div',
            { style: { display: 'flex', gap: 10, alignItems: 'center' } },
            h('span', { style: hint }, '保留条数'),
            h('input', {
              type: 'number',
              min: 1,
              max: 200,
              style: { ...control, width: 90 },
              value: state.historyLimit,
              onChange: (event) => setState((prev) => ({ ...prev, historyLimit: Number(event.target.value) || 1 })),
            }),
          ),
        ),
        h(
          'div',
          { style: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' } },
          h('button', { style: button, onClick: save, disabled: state.saving || state.loading }, state.saving ? '保存中…' : '保存设置'),
          h('button', { style: button, onClick: clearHistory, disabled: state.clearing || state.history.length === 0 }, state.clearing ? '清空中…' : '清空历史'),
          h('span', { style: hint }, state.loading ? '读取中…' : state.message),
        ),
        h('div', { style: label }, '最近的人工步骤'),
        state.history.length > 0
          ? h(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              state.history.map((item, index) =>
                h(
                  'div',
                  { key: String(item.at || '') + '-' + String(index), style: historyItem },
                  h('div', { style: { fontWeight: 600 } }, String(item.title || '未命名步骤')),
                  h(
                    'div',
                    { style: hint },
                    statusText(item.status) +
                      (item.category ? ' · ' + String(item.category) : '') +
                      (item.at ? ' · ' + formatTime(item.at) : ''),
                  ),
                ),
              ),
            )
          : h('div', { style: hint }, '还没有记录。'),
        h(
          'div',
          { style: hint },
          '提示：设置里的类别只影响自动识别；human_step 被显式调用时仍然会弹卡片。' +
            '关闭记录后，已有历史不会自动删除，可以点“清空历史”。',
        ),
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('settings.section', () =>
          ctx.slots.register(
            {
              name: 'settings.section',
              id: NS,
              order: 42,
              label: () => '人工步骤',
            },
            Panel,
          ),
        )
      },
    }
  },
})
