# dsh-human-step

给 DSH 加一道“该你动手了”的暂停键。

AI 能开浏览器、跑命令、改文件，但不能替你接短信验证码、扫二维码、刷脸签字、付款或点授权同意。  
这个插件让 agent 在开工前标出必须由人完成的步骤，到那一步弹出 DSH 原生问题卡片，等你点“已完成 / 跳过 / 取消”才继续。

- 仓库：https://github.com/Yyhy110421/dsh-human-step
- 许可证：MIT
- 宿主工具：plan_human_steps、human_step
- 设置页：设置 → 人工步骤

## 它解决什么问题

没有这个插件时，agent 遇到验证码常见的坏行为是：

- 假装自己已经登录，继续往下跑；
- 把“请用户输入验证码”写进计划，然后直接跳过；
- 让用户自己盯着一长串步骤，不知道现在该干什么。

装上以后：

1. 先调用 plan_human_steps，把任务拆成步骤，标出哪些步骤必须由人完成。
2. 跑到人工步骤时调用 human_step，DSH 弹出原生卡片。
3. 用户点“已完成，继续”才继续；点“跳过这一步”会明确标记未完成；点“取消当前任务”会要求 agent 停止并汇报。

## 安装

在 DSH 里打开 设置 → 插件管理器，安装下面任一来源：

    github:Yyhy110421/dsh-human-step

或者本地目录：

    file:E:\DSH\projects\dsh-human-step

装完重启 DSH。用 file: 安装是实体拷贝，改源码后要卸载再装；插件管理器里的“更新”只适用于 npm 注册表插件。

## 用法

### 1. 提前标出人工步骤

工具：plan_human_steps

    {
      "task": "把演示站部署到线上",
      "steps": [
        { "title": "运行 npm test 并修复失败" },
        { "title": "打开手机接收短信验证码并输入" },
        { "title": "在域名控制台点确认解析" },
        { "title": "部署完成后打开首页检查" }
      ]
    }

返回里会带：

- total：总步骤数
- humanCount：必须由人完成的步骤数
- steps：每一步的 requiresHuman、category、reason
- humanSteps / agentSteps：两边的拆分
- text：可读的中文计划

这一步只读，不会暂停，也不会弹窗。

### 2. 到点暂停等用户

工具：human_step

    {
      "title": "输入短信验证码",
      "instructions": "打开手机短信，把 6 位验证码填进登录页，然后回来点“已完成”。",
      "category": "verification_code"
    }

卡片选项：

- **已完成，继续**：用户确认做完了，agent 继续。
- **跳过这一步**：继续后面的步骤，但不允许声称这一步已完成。
- **取消当前任务**：agent 应停止后续步骤，汇报已完成和未完成的部分。

返回 status：

- done
- skipped
- cancelled
- unavailable（当前 DSH 没有可用的 userQuestions 服务，或弹卡片失败；agent 应在对话里请用户完成，不能假装完成）

### 3. 选择类别

| id | 中文 | 典型场景 |
| --- | --- | --- |
| verification_code | 验证码 / 二次验证 | 短信码、邮箱码、2FA、OTP、人机验证 |
| qr | 扫码 | 微信扫码、扫码登录、扫设备码 |
| phone | 电话 / 短信 | 打电话、接听、接收短信、电话确认 |
| email | 邮箱确认 | 打开邮箱、点邮件里的链接、回复邮件 |
| identity | 实名 / 人脸 / 签字 | 身份证、刷脸、活体、手写签名 |
| credential | 密钥 / 密码 | 提供 API Key、Token、密码、私钥 |
| payment | 支付 / 下单 | 付款、转账、购买、充值、确认订单 |
| login | 登录 / 授权 | 登录账号、输入密码、同意授权 |
| physical | 物理操作 | 插拔设备、按按钮、重启、拍照 |
| approval | 人工确认 / 选择 | 必须由用户拍板、选择或批准 |

分类按关键词和少量上下文规则判断，宁可漏判也不硬把普通步骤说成人工。  
调用方可以显式传 requiresHuman: true / false 覆盖分类；也可以传 category 强制指定类别。

## 设置页

设置 → 人工步骤：

- 勾选要自动识别的类别；
- 追加自己的关键词，例如“指纹”“门禁”“纸质签字”“公司 VPN”；
- 决定是否记录历史，以及保留多少条；
- 清空历史。

历史只存标题、类别、状态和时间，不存验证码、密码或用户填写的正文。

设置文件在 DSH_HOME/data/human-step.json，历史在 DSH_HOME/data/human-step-history.json。

## 安全边界

- 不自动输入验证码、密码或支付信息。
- 不替用户点授权、同意或支付按钮。
- 不把验证码、密码写进历史。
- 用户取消时，agent 必须停止并汇报。
- human_step 返回 unavailable 时，agent 必须在对话里请用户完成，不能假装成功。

## 已知限制

- 关键词分类会漏判或误判；显式 requiresHuman / category 优先。
- 停在这里”依赖 DSH 的 userQuestions 服务；某些无 UI 的运行方式可能返回 unavailable。
- 不会监听用户是否真的完成了网页上的操作，只认卡片上的按钮。
- 历史记录是纯文本，不加密；不要在标题或说明里写验证码、密码。

## 开发

    node --check lib/classify.js
    node --check lib/index.js
    node --check client.js
    node test/manual.mjs
    node test/plugin.mjs

目录：

- lib/classify.js：纯分类器，无第三方依赖。
- lib/index.js：宿主工具、设置路由、历史记录。
- client.js：设置页。
- test/manual.mjs：分类器断言。
- test/plugin.mjs：mock ctx 下验证两个工具和弹卡片选项。

## License

MIT © 2026 Yyhy110421
