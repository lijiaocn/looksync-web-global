# LookSync Web

LookSync 的 Web 版试妆站（looksync.app）。**Jekyll 静态站**：布局 / nav / footer / 脚本统一复用，
页面只写正文。前端仍是原生 JS（无 SPA 框架），后端对接 `global/firebase` 的 callable。

## 技术形态

- **Jekyll**：`_layouts/default.html` + `_includes/{head,nav,footer,scripts}`；各页 front matter 声明
  标题、SEO、`nav` 高亮、脚本包（`app` / `shell`）。
- 输出仍是多页 HTML，路径保持 `/download.html` 等（与现有 canonical / sitemap 一致；旧 `/about.html` 重定向到 download）。
- Firebase 走官方 **compat CDN**（11.1.0）+ 经典 `<script>`；业务挂在 `window.LookSync`。
- 部署：GitHub Actions 跑 `jekyll build`，把 `_site/` 上传到 GitHub Pages。

## 本地预览

```bash
cd global/web
bundle install
bundle exec jekyll serve
# 打开 http://127.0.0.1:4000/
```

只想看已构建结果：

```bash
bundle exec jekyll build
python3 -m http.server 8080 --directory _site
```

- 后端环境只由 **`JEKYLL_ENV` / `jekyll.environment`** 决定（注入为 `LookSync.JEKYLL_ENV`），无 URL 参数：
  - `production`（`./run.prod.sh`、`jekyll build` / CI）→ **prod**，无角标
  - `development`（`./run.dev.sh`；注意裸 `jekyll serve` 也默认是这个）→ **dev**，页面左上角 `dev`
  - `emulator`（`./run.emulator.sh`）→ 连本地 Auth/Functions 模拟器（dev 项目），页面左上角 `emulator`

> Google 弹窗登录需 Firebase Console → Authorized domains 含 `looksync.app` 与 `localhost`。
> 不能用 `file://` 打开。

## 页面

| 源文件 | URL | 脚本包 | 登录 | 收录 |
|---|---|---|---|---|
| `index.html` | `/` | app | 仅「开始试妆」 | index |
| `download.html` | `/download.html` | shell | 顶栏账户 | index |
| `about.html` | `/about.html` | — | — | 重定向到 download |
| `purchase.html` | `/purchase.html` | app | 顶栏账户 | index |
| `result.html` | `/result.html?id=` | app | 是 | noindex |
| `profile.html` | `/profile.html` | app | 是 | noindex |
| `history.html` | `/history.html` | app | 是 | noindex |
| `privacy.html` | `/privacy.html` | shell | 顶栏账户 | index |
| `support.html` | `/support.html` | shell | 顶栏账户 | index |

Front matter 常用字段：`title` / `description` / `nav`（`try-on`|`about`|`pricing`）/
`scripts`（`app`|`shell`）/ `page_js` / `extra_css` / `robots` / `canonical`。

## 目录

```
_config.yml
_layouts/default.html
_includes/          # head / nav / footer / scripts / index-head
js/                 # config → services → ui → pages（不变）
assets/             # site.css / app.css / download.css / screenshots
*.html              # 仅 front matter + 页面正文
robots.txt  sitemap.xml
.well-known/
```

分层约束：`pages/*` 只做「取 DOM、拉数据、挂事件、串流程」；后端走 `services/`；
登录门禁只卡在「开始试妆」（`ensureSignedIn()`）。

## 部署

推到 `main` → `.github/workflows/static.yml` → `bundle exec jekyll build` → 部署 `_site`。

## 已知限制

- 购买档位仅展示，「Buy」toast 提示尚未开通。
- 无 feed / admin / Apple / 邮箱登录；仅 Google。
- `result` / `profile` / `history` 均 noindex，且需登录查看。
