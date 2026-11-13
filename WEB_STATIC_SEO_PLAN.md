# LookSync Web 静态站重写方案（SEO 优先 · 无框架 · GH Pages 直发）

> 本文是最终决策，不是讨论稿。现有 Vite + React + HashRouter 工程**整体推翻**。
> 目标：一套**纯静态、搜索引擎友好、GitHub Pages 直接上传即发布**的站点，功能仍对接 `global/firebase` 的 callable。
> 英文站为主（与现站一致），功能页下方必须有利于 SEO 的说明/FAQ 等正文。

---

## 0. 为什么推翻现状

现在 [`index.html`](index.html) 的服务端可见正文只有一个空 `<div id="root">` + 一行 `main.tsx`，所有内容靠 React 在客户端渲染，HashRouter 还把路由塞进 `#` 后面。结果：

- 爬虫抓到的 HTML 几乎没有正文，首页 SEO 基本为零；
- `#/result/xxx` 这类 hash 路由对分享、收录都不友好；
- 为了一个「打开即用」的试妆页，背了 React + Router + Vite + TS + `node_modules` 一整套构建链，GH Pages 还得先 `npm ci && npm run build`。

**对一个核心交互并不复杂、且 SEO 是硬指标的产品，这套方案是负资产。** 下面全部重来。

---

## 1. 技术形态（已拍板）

**纯静态 HTML + CSS + 原生 ES Module JS。不保留 Vite，不保留任何前端框架。**

| 项 | 决策 |
|---|---|
| 页面 | 手写多个 `.html`，每个页面都是**服务端可见的完整语义化正文**，不是空壳 |
| 样式 | 原生 CSS，站点共用一个 `assets/site.css` + 每页必要的局部样式 |
| 脚本 | 原生 ES Module（`<script type="module">`），按页一个入口 |
| Firebase | 走官方 **CDN ESM**（`https://www.gstatic.com/firebasejs/<ver>/...`），用 `importmap` 映射裸名，业务代码照常 `import { ... } from "firebase/auth"` |
| 构建 | **无构建**。仓库里是什么，线上就是什么 |
| 部署 | GitHub Pages，workflow 直接把站点目录当 artifact 上传，**不跑 Node、不跑 build** |

### 1.1 为什么不保留 Vite

唯一会让人犹豫的理由是「bare import + tree-shaking + 压缩」。但：

- 我们的依赖只有 Firebase，CDN 版本本身就是生产构建、带 CDN 缓存；
- 页面逻辑体量小，不压缩也无所谓首屏；
- 保留 Vite = 保留 `node_modules`/`package.json`/build step，与「GH Pages 直接发布、不依赖必须构建的 SPA」直接冲突。

**所以不保留。** 用 `importmap` 解决裸名导入即可，不需要打包器。

### 1.2 Firebase CDN 接入方式

每个需要后端的 HTML 头部放一段 `importmap`（版本锁定到现站用的 `11.x`，取 `11.1.0`）：

```html
<script type="importmap">
{
  "imports": {
    "firebase/app":       "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js",
    "firebase/auth":      "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js",
    "firebase/functions": "https://www.gstatic.com/firebasejs/11.1.0/firebase-functions.js"
  }
}
</script>
<script type="module" src="/js/pages/index.js"></script>
```

业务 JS 里就能写 `import { getAuth } from "firebase/auth";`，和现在的 React 版本写法一致，迁移成本最低。

> `importmap` 现代浏览器（Chrome/Edge/Safari/Firefox 近两年版本）全支持，足够覆盖目标用户。不为老浏览器加 polyfill。

---

## 2. 页面地图（已拍板）

每页一个真实 `.html` 文件，路径即 URL，无 hash 路由。

| 文件 | URL | 作用 | 登录 | SEO |
|---|---|---|---|---|
| `index.html` | `/` | **试妆工作台 + 下方 SEO 正文**（主落地页） | 否（仅「开始试妆」时弹登录） | **index，核心** |
| `about.html` | `/about.html` | 原宣传页（保留现有内容与风格） | 否 | index |
| `purchase.html` | `/purchase.html` | 充值档位展示 + 定价说明/FAQ | 否 | index（当定价页） |
| `profile.html` | `/profile.html` | 账户、余额、积分流水、删除账户 | 是 | **noindex** |
| `history.html` | `/history.html` | 我的试妆历史 | 是 | **noindex** |
| `result.html` | `/result.html?id=<syncId>` | 单次试妆结果 + 对比滑块 | 是 | **noindex** |
| `privacy.html` | `/privacy.html` | 隐私政策（**路径与主体内容不变**） | 否 | index |
| `support.html` | `/support.html` | 支持页（**路径与主体内容不变**） | 否 | index |

### 结果页标识：用 `result.html?id=<syncId>`

- Query 参数就够用：利于复制分享链接，JS 直接 `new URLSearchParams(location.search).get("id")` 取值；
- 结果页**不需要被 SEO 收录**（内容是用户私有图、要登录才能看），统一 `noindex`；
- 不引入 `/result/<id>` 这种 path 形式——那在 GH Pages 纯静态下需要 404 回退 trick，没必要。

### 导航关系

- 顶部 `header` 全站统一：品牌回 `/`、`About`、余额/头像（登录后出 `History`/账户入口）；
- 工作台「开始试妆」→ 成功后 `location.href = "/result.html?id=..."`；
- 余额不足 / 点充值 → `/purchase.html`；
- 账户、历史从 header 进；未登录访问 `profile/history/result` 时，页面内提示并给 Google 登录按钮，不做服务端跳转。

---

## 3. `index.html` SEO 结构（已拍板）

**首屏是功能区（工作台），下方是为搜索引擎准备的正文。** 一个页面同时满足「用完即走的功能」和「被搜到」。

### 标题层级（全站唯一一个 H1）

```
H1  Try on any makeup look on your face — online, no app
│
├─ [首屏功能区：试妆工作台]  ← 交互主体，见第 4 节
│
├─ H2  How it works                （3 步，H3 每步）
│     H3 Pick a look
│     H3 Add your photo
│     H3 Choose what to sync & go
│
├─ H2  What you can try on          （Features，H3/列表）
│     makeup · hairstyle · hair color · hats & accessories · overall style
│
├─ H2  Why LookSync                 （卖点：浏览器直用 / 真实到脸上 / 前后对比）
│
├─ H2  Frequently asked questions   （FAQ，配 FAQPage 结构化数据）
│
└─ H2  Ready to try your next look? （CTA，锚回首屏工作台 + App Store）
```

### 关键词方向（英文，承接现站语义）

主词围绕现站已有表达延展，避免堆砌：

- 核心：*virtual makeup try-on*, *try on makeup online*, *see makeup on your face*, *makeup transfer*
- 扩展：*virtual hairstyle try-on*, *try on a new look*, *AI makeup试妆（面向用户的英文自然表述）*
- 长尾进 FAQ：*"Can I try on makeup from a photo?"*, *"Does it work in the browser without an app?"*, *"Is my photo private?"*

**写作遵循 AI 写作原则**：用具体场景和反问，不写「In today's digital era」这类空话；FAQ 答案直给，不绕。

### 首屏与正文的关系

- 首屏工作台**本身就是服务端可见的真实 DOM**（表单、按钮、说明文字都在 HTML 里），不是 JS 注入的空壳；
- JS 只负责「挂事件、拉 content scopes、传图、调 callable」，**不负责渲染首屏结构**；
- 下方 How/Features/FAQ/CTA 是静态正文，首屏即可被爬虫读到。

---

## 4. Web 原生布局原则（已拍板）

**不生搬 iOS 的竖向三步卡 / 小屏三栏。宽屏就用宽屏的玩法。**

### 4.1 工作台（index 首屏）：宽屏「左右对照」双面板

桌面宽屏（≥1024px）把试妆台排成**左右两个大图区并排对照**，中间/下方是控制条：

```
┌─────────────────────────────────────────────────────────────┐
│  H1 + 一句话副标题                                             │
├───────────────────────────┬───────────────────────────────┤
│   参考 Look（Reference）    │     你的照片（Your photo）       │
│   大图投放区 / 点击上传       │     大图投放区 / 点击上传         │
│   [drag & drop]            │     [drag & drop]              │
├───────────────────────────┴───────────────────────────────┤
│  Choose what to sync:  [makeup][hair][hat]...（横向 chips）    │
│                         [ Start try-on ]   1 credit per sync  │
└─────────────────────────────────────────────────────────────┘
```

- 两张源图**并排对照**（参考 vs 自己），符合「照着这个 look 改我自己」的心智，比竖向滚动三步卡更直观；
- 内容范围 chips 横向平铺在下方控制条，不占竖向步骤；
- 大图投放区支持点击选图 **和拖拽上传**（宽屏桌面有鼠标，拖拽是 Web 原生优势）。

### 4.2 响应式断点（3 档，CSS Grid）

| 断点 | 布局 |
|---|---|
| **≥1024px（桌面）** | 工作台左右双面板并排；下方控制条；内容最大宽约 `1200px` 居中 |
| **640–1024px（平板/窄桌面）** | 双面板仍并排但缩小；控制条换行 |
| **<640px（手机）** | 面板竖向堆叠；chips 横向可滚；按钮通栏 |

用 `grid-template-columns: repeat(auto-fit, minmax(...))` + 少量 media query，不写死大量断点。

### 4.3 对比滑块（result）：用宽屏做大幅横向对比

- 结果页 `result.html` 的前后对比，用一个**横向大幅滑块**：左右拖动分隔线，一侧原图、一侧结果，占满宽屏宽度；
- 复用现有 [`CompareSlider`](src/components/CompareSlider.tsx) 的 pointer 事件思路（`pointerdown/move/up` + `setPointerCapture`），但重写为原生 DOM（无 React state，用 CSS 变量 `--pos` 控制裁切宽度和手柄位置）；
- 宽屏下滑块默认更大，鼠标拖拽体验优于手机触摸；
- 另外保留 `Result / Original / Look` 的切换（宽屏下可以并排缩略图直接点）。

### 4.4 视觉风格

沿用现站 [`about.html`](about.html) 的暗色 + 珊瑚/青绿渐变基调（`--coral #ff7b7b` / `--teal #6ad9c9`），保证 index / about / 功能页视觉一致。字体继续用 Figtree + Sora（Google Fonts）。

---

## 5. JS 目录结构（无框架，已拍板）

放在站点根的 `js/` 下，三层：**config / services / ui**，外加每页一个入口 `pages/`。

```
js/
  config/
    firebase-config.js    # prod/dev/emulator 三套配置（搬自 src/config/firebaseConfig.ts）
    env.js                # ?env= → localStorage → 默认 prod（搬自 src/config/env.ts）
  services/               # 唯一后端出口，与现 src/services 一一对应
    firebase.js           # initializeApp + getAuth + getFunctions(us-central1) + emulator 连接
    auth.js               # Google signInWithPopup / signOut / onAuthStateChanged
    callable.js           # call(name, data) 封装 + ApiError 归一
    image.js              # 压缩：宽边 1600、≤1MB、逐步降质（搬自 utils/image.ts）
    upload.js             # 压缩→getUploadUrl→PUT→createReference/createOriginal
    syncs.js              # createSync / getSyncDetail / getMySyncs / deleteMySync / getSyncContentScopes
    user.js               # getMyProfile / getMyBalance / getMyCreditLog / deleteMyAccount
  ui/                     # 可复用 DOM 组件（函数式：传容器+数据，挂事件，返回句柄）
    header.js             # 渲染/挂载顶部 header，含登录态与余额
    toast.js              # 轻提示
    dialog.js             # 确认弹窗（删除账户用）
    image-picker.js       # 点击选图 + 拖拽上传 + 预览
    scope-selector.js     # content scopes 多选 chips
    compare-slider.js     # 原生对比滑块
    auth-state.js         # 订阅登录态 + 缓存余额（取代 React 的 AuthContext）
  pages/
    index.js              # 工作台：拼装 image-picker×2 + scope-selector + start 流程
    purchase.js           # 档位展示，点击 Buy → toast「购买功能尚未开通」
    profile.js            # 账户信息 + 积分流水 + 删除账户
    history.js            # 我的试妆列表
    result.js             # 轮询 getSyncDetail + compare-slider
```

### 分层约束（遵循代码简洁原则）

- **入口薄**：`pages/*.js` 只做「取 DOM、拉数据、挂事件、串流程」，不写底层请求细节；
- **services 是唯一后端出口**：页面与 ui 不直接 `httpsCallable`，一律走 `services/`；
- **登录门禁只卡在「开始试妆」**：和现状一致，`ensureSignedIn()` 已登录直接过，否则弹 Google；
- **余额判断用内存态**：`auth-state.js` 缓存余额，不每次绕持久化；
- 参数平铺传递，不无谓包 options 袋。

### 关键后端契约（照搬，别改）

- 调用名：`httpsCallable(functions, "<ns>-<fn>")`，region `us-central1`；
- 用到的 callable：`images-getUploadUrl` / `references-createReference` / `originals-createOriginal` / `syncs-createSync` / `syncs-getSyncDetail` / `syncs-getMySyncs` / `syncs-deleteMySync` / `syncs-getSyncContentScopes` / `user-getMyProfile` / `user-getMyBalance` / `user-getMyCreditLog` / `user-deleteMyAccount`；
- 上传三步：`compress → getUploadUrl → PUT(signedUrl) → create*`，Web 一律 `isPublic: false`；
- Firebase 配置（**直接搬**，不改值）：prod = `looksync-prod`，dev/emulator = `looksync-dev`，详见 [`src/config/firebaseConfig.ts`](src/config/firebaseConfig.ts)。

---

## 6. SEO 配套（已拍板）

### 6.1 每页 `<head>` 必备

- `<html lang="en">`、唯一 `<title>`、`<meta name="description">`；
- `<link rel="canonical">` 指向自身规范 URL；
- Open Graph（`og:title/description/type/url/image`）+ Twitter Card（`summary_large_image`），OG 图用现有截图 `assets/screenshots/step5-result.jpg`；
- 预连接 Google Fonts（沿用现状）。

### 6.2 语义化

全站用 `header / nav / main / section / article / h1–h3 / footer`，图片必带 `alt` 与 `width/height`（现 about.html 已经这么做，保持）。

### 6.3 结构化数据（JSON-LD）

- `index.html`：`WebApplication`（名称、功能、`applicationCategory`、价格信息指向 purchase）+ `FAQPage`（与页面 FAQ 一一对应）；
- `about.html`：`Organization` / `SoftwareApplication`（关联 App Store）；
- 面包屑可选，不强求。

### 6.4 `robots.txt` 与 `sitemap.xml`（放站点根）

`robots.txt`：

```
User-agent: *
Allow: /
Disallow: /profile.html
Disallow: /history.html
Disallow: /result.html
Sitemap: https://looksync.app/sitemap.xml
```

`sitemap.xml` 只列可收录页：`/`、`/about.html`、`/purchase.html`、`/privacy.html`、`/support.html`。

### 6.5 noindex 名单

`profile.html` / `history.html` / `result.html` 头部加：

```html
<meta name="robots" content="noindex, nofollow">
```

### 6.6 内链

footer 全站统一放 `Try-on(/) · About · Pricing · Support · Privacy` 互链；index 的 How/FAQ/CTA 文案里自然链到 about / purchase。

---

## 7. 从现状迁移（已拍板）

当前 [`global/web`](.) 是 Vite 多入口工程，`public/` 会在 build 时拷进 `dist/`。无构建后，**站点根直接就是发布根**，所以要把 `public/` 的东西提到根，并删掉整条构建链。

### 7.1 删除

- `src/`（整个 React 工程）
- `package.json`、`package-lock.json`、`tsconfig.json`、`vite.config.ts`
- `node_modules/`
- `dist/`（构建产物，不再需要）
- 旧的 `WEB_IMPLEMENTATION_PLAN.md`（被本方案取代）

### 7.2 保留 / 搬移（内容不动，仅挪到站点根）

| 来源 | 目标 | 说明 |
|---|---|---|
| `public/privacy.html` | `/privacy.html` | **路径与主体内容不变** |
| `public/support.html` | `/support.html` | **路径与主体内容不变** |
| `public/.well-known/apple-app-site-association` | `/.well-known/...` | 原样保留 |
| `public/assets/screenshots/*` | `/assets/screenshots/*` | 截图素材复用（工作台占位、about、OG 图、How 步骤图） |
| `public/assets/site.css` | `/assets/site.css` | 站点基础样式，继续作为共用样式 |
| `about.html` | `/about.html` | 原宣传页保留；把内部 `/assets/...` 绝对路径核对一遍（根发布后仍成立） |

> 搬移后所有 `/assets/...`、`/privacy.html` 等绝对路径在 GH Pages 根发布下依然成立，无需改引用。

### 7.3 新增

- `index.html`（重写：工作台 + SEO 正文）
- `purchase.html` / `profile.html` / `history.html` / `result.html`
- `assets/site.css` 的增补样式（工作台/对比滑块/响应式），或新增 `assets/app.css`
- `js/`（第 5 节整套）
- `robots.txt`、`sitemap.xml`
- 重写 `README.md`（去掉 Vite/React 说明，改为静态站说明）

### 7.4 Workflow 改回「直接上传静态文件」

把 [`.github/workflows/static.yml`](.github/workflows/static.yml) 的 Node + `npm ci` + `npm run build` 全部删掉，改成纯上传（path 指向站点目录，无 build）：

```yaml
name: Deploy static content to Pages
on:
  push:
    branches: ["main"]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: "pages"
  cancel-in-progress: false
jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: '.'          # 站点根即发布根，无需构建
      - id: deployment
        uses: actions/deploy-pages@v4
```

> 若该仓库根不等于 `global/web`（web 是独立 git），`path` 填实际站点目录即可。关键是**不再有 build 步骤**。

### 7.5 Firebase Console（部署前提醒，保持现状要求）

Authentication → Settings → Authorized domains 要含生产域名（`looksync.app`）与 `localhost`，否则 Google 弹窗登录失败。

---

## 8. 实现任务拆分（可执行清单）

> 下面是重写阶段的落地顺序。本方案只负责决策，具体编码在后续任务执行。

**A. 清场与骨架**
1. 删除 `src/ dist/ node_modules/ package.json package-lock.json tsconfig.json vite.config.ts` 与旧 `WEB_IMPLEMENTATION_PLAN.md`。
2. 把 `public/` 内容（privacy/support/.well-known/assets）提到站点根，删空 `public/`。
3. 改写 `.github/workflows/static.yml` 为纯上传（第 7.4）。

**B. JS 基座（services/config）**
4. `js/config/firebase-config.js` + `js/config/env.js`：照搬三套配置与环境解析。
5. `js/services/firebase.js`：`importmap` + 初始化 app/auth/functions，emulator 连接。
6. `js/services/callable.js`（`call` + `ApiError`）、`auth.js`、`image.js`、`upload.js`、`syncs.js`、`user.js`。
7. `js/ui/auth-state.js`：登录态订阅 + 余额缓存；`toast.js`、`dialog.js`、`header.js`。

**C. 首页（SEO 核心）**
8. `index.html`：写全语义化 DOM——首屏工作台（双面板 + chips + CTA，静态结构）+ How / Features / Why / FAQ / CTA 正文 + JSON-LD。
9. `js/ui/image-picker.js`、`scope-selector.js`；`js/pages/index.js` 串起上传 + `createSync` + 跳 result。
10. `assets/` 增补工作台与响应式样式。

**D. 其余功能页**
11. `result.html` + `js/ui/compare-slider.js` + `js/pages/result.js`（`?id=` + 轮询）。
12. `purchase.html` + `js/pages/purchase.js`（档位展示，Buy → toast「购买功能尚未开通」）。
13. `profile.html` + `js/pages/profile.js`（资料/流水/删除账户）。
14. `history.html` + `js/pages/history.js`。
15. 给 `profile/history/result` 加 `noindex`。

**E. SEO 配套与收尾**
16. 每页补齐 `title/description/canonical/OG/Twitter`。
17. 新增 `robots.txt`、`sitemap.xml`。
18. 全站内链核对；`/assets` 等绝对路径回归测试。
19. 重写 `README.md`（静态站说明，去 Vite/React）。
20. 本地用任意静态服务器（如 `python3 -m http.server`）起站自测：工作台流程、Google 登录、result 轮询、purchase toast、privacy/support 路径不变。

---

## 决策一句话总结

- **形态**：纯静态 HTML/CSS/原生 ESM + Firebase CDN，**不要 Vite、不要 React**，GH Pages 直接上传不构建。
- **页面**：真实多 HTML（index/about/purchase/profile/history/result + privacy/support），`result.html?id=` 承载结果且 noindex。
- **首页**：首屏工作台（服务端可见）+ 下方 How / Features / Why / FAQ / CTA，唯一 H1，英文关键词承接现站。
- **布局**：宽屏左右双面板对照 + 横向大对比滑块，3 档响应式，拒绝 iOS 竖向三步卡。
- **迁移**：删 React/Vite/node_modules/dist，留并上提 privacy/support/about/assets/.well-known，workflow 改回直接上传。
