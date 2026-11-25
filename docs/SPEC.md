# StackForge: frontend layihə generatoru

> Layihə adı müvəqqətidir, istədiyin kimi dəyişə bilərsən.
> İlkin prototip: `docs/reference/prototype.html` (yalnız React, tək HTML faylı). Bu sənəd həmin prototipi tam məhsula çevirmək üçün plandır.

## 1. Məqsəd

İstifadəçi brauzerdə framework və alətləri seçir (React, Vue, Svelte, Next.js, Tailwind, Redux, Pinia, TanStack Query və s.), generator isə dərhal işləyən, build olunan layihə yaradır. Nəticə zip kimi yüklənir, sonrakı mərhələdə birbaşa GitHub repo kimi yaradılır, ən sonda isə eyni mühərrik `npx stackforge` CLI kimi də işləyir.

Əsas keyfiyyət tələbi: **yaradılan hər kombinasiya `install`, `build`, `typecheck` və `lint`-dən keçməlidir.** Keçməyən kombinasiyanı UI ümumiyyətlə seçməyə imkan verməməlidir.

## 2. Texniki seçimlər

| Sahə | Seçim | Səbəb |
|---|---|---|
| Monorepo | pnpm workspaces | core, web və cli eyni kodu paylaşır |
| Dil | TypeScript (strict) | modul müqavilələri tiplərlə qorunur |
| Web app | React + Vite + Tailwind | prototiplə eyni yanaşma |
| Kod görünüşü | Shiki | sintaksis rəngləmə |
| Zip | JSZip | tam client-side |
| Test | Vitest (unit + snapshot) | sürətli, Vite ilə uyğun |
| Smoke test | Node skripti + GitHub Actions | real install/build yoxlaması |
| CLI | @clack/prompts | sadə interaktiv suallar |
| GitHub export | Serverless funksiya (Vercel və ya Cloudflare) | OAuth token client-də saxlanmır |

## 3. Qovluq strukturu

```
stackforge/
├─ CLAUDE.md
├─ pnpm-workspace.yaml
├─ docs/
│  ├─ SPEC.md
│  └─ reference/prototype.html
├─ packages/
│  ├─ core/                     # generator mühərriki (UI-dan asılı deyil)
│  │  ├─ src/
│  │  │  ├─ types.ts
│  │  │  ├─ engine/
│  │  │  │  ├─ validate.ts      # uyğunluq və ziddiyyət yoxlaması
│  │  │  │  ├─ resolve.ts       # requires-ları avtomatik əlavə, sıralama
│  │  │  │  └─ generate.ts      # əsas pipeline
│  │  │  ├─ frameworks/
│  │  │  │  └─ <id>/adapter.ts + templates/
│  │  │  ├─ modules/
│  │  │  │  └─ <kateqoriya>/<id>.ts
│  │  │  ├─ versions/known-good.ts
│  │  │  └─ output/zip.ts
│  │  └─ test/
│  └─ cli/                      # Faza 7
├─ apps/
│  ├─ web/                      # seçim UI-ı
│  └─ api/                      # Faza 6: GitHub OAuth + repo yaratma
└─ scripts/
   └─ smoke.ts                  # kombinasiyaları real build edir
```

## 4. Dəstəklənən frameworklər

| id | Ad | Növ | Bundler | Dil |
|---|---|---|---|---|
| `react` | React | SPA | Vite | JS, TS |
| `vue` | Vue 3 | SPA | Vite | JS, TS |
| `svelte` | Svelte 5 | SPA | Vite | JS, TS |
| `solid` | SolidJS | SPA | Vite | JS, TS |
| `preact` | Preact | SPA | Vite | JS, TS |
| `angular` | Angular | SPA | Angular CLI | yalnız TS |
| `next` | Next.js (App Router) | meta | Next | JS, TS |
| `nuxt` | Nuxt | meta | Nuxt | JS, TS |
| `sveltekit` | SvelteKit | meta | Vite | JS, TS |
| `astro` | Astro | meta | Astro | JS, TS |

Qeyd: Angular digərlərindən fərqli build sisteminə malikdir (`angular.json`, öz builder-i). Ona görə ayrıca fazada edilir. Meta-frameworklərdə routing daxilidir (fayl əsaslı), ona görə routing modulları onlarda gizlədilir.

## 5. Modul kataloqu və uyğunluq matrisi

Matris başlanğıc nöqtəsidir. Hər sətri əlavə edərkən rəsmi sənədlərdən yoxla, çünki ekosistemlər tez dəyişir. Şübhəli olanlar `(yoxla)` ilə işarələnib.

Qısaltmalar: R=react, V=vue, S=svelte, So=solid, P=preact, A=angular, N=next, Nu=nuxt, SK=sveltekit, As=astro.

### 5.1 Stil

| Modul | Uyğun | Tələb | Ziddiyyət |
|---|---|---|---|
| `tailwind` | hamısı | | `unocss` |
| `unocss` | R, V, S, So, P, SK, As, Nu | | `tailwind` |
| `sass` | hamısı | | |
| `css-modules` | R, P, So, N, As | | |

Tailwind v4 Vite layihələrində `@tailwindcss/vite` plugini ilə, Next-də PostCSS ilə, Angular-da PostCSS ilə qurulur (yoxla).

### 5.2 UI kitabxanaları

| Modul | Uyğun | Tələb | Ziddiyyət |
|---|---|---|---|
| `shadcn` | R, N | `tailwind`, `ts` | digər UI kitləri |
| `mantine` | R, N | | digər UI kitləri |
| `mui` | R, N | | digər UI kitləri |
| `shadcn-vue` | V, Nu | `tailwind` (TS və JS) | digər UI kitləri |
| `primevue` | V, Nu | (v4, MIT) | digər UI kitləri |
| `vuetify` | V, Nu (v4) | | `tailwind` ilə xəbərdarlıq |
| `shadcn-svelte` | S, SK | `tailwind` (TS və JS) | digər UI kitləri |
| `angular-material` | A | | (Tailwind ilə uyğundur) |

UI kitləri qarşılıqlı ziddiyyətlidir: kateqoriya `single` seçimlidir.

### 5.3 State idarəsi

| Modul | Uyğun | Qeyd |
|---|---|---|
| `redux-toolkit` | R, N | Provider bürüyücüsü |
| `zustand` | R, N | Provider yoxdur |
| `jotai` | R, N | |
| `pinia` | V, Nu | `app.use(createPinia())`, Nuxt-da `@pinia/nuxt`. Pinia 4 `@vue/devtools-api`-ni məcburi peer kimi istəyir; yarn peer-ləri quraşdırmadığı üçün açıq asılılıq kimi əlavə olunur |
| `ngrx` | A | (yoxla: standalone API) |
| `builtin` | S, So, SK, A | Svelte runes, Solid stores, Angular signals: paket yoxdur, nümunə kod əlavə olunur |

Kateqoriya `single` seçimlidir.

### 5.4 Routing (yalnız SPA-lar)

| Modul | Uyğun |
|---|---|
| `react-router` | R (v8: paket `react-router`; `react-router-dom` v7-də qalıb) |
| `tanstack-router` | R |
| `vue-router` | V |
| `solid-router` | So |
| `preact-iso` | P |
| `angular-router` | A (daxili, həmişə aktiv) |

Svelte SPA üçün routing modulu təklif etmirik, UI-da "routing lazımdırsa SvelteKit seç" ipucu göstər.

### 5.5 Data alma

| Modul | Uyğun |
|---|---|
| `tanstack-query` | R, V, S, So, N, Nu, SK (Angular adapteri: yoxla) |
| `swr` | R, N |
| `axios` | hamısı |

### 5.6 Formlar və validasiya

| Modul | Uyğun |
|---|---|
| `zod` | hamısı |
| `react-hook-form` | R, N |
| `vee-validate` | V, Nu |
| `superforms` | SK (tələb: `zod`) |

### 5.7 Test

| Modul | Uyğun |
|---|---|
| `vitest` | hamısı (Angular: `ng test`, `@angular/build:unit-test`) |
| `testing-library` | R, V, S, So, P, N, Nu, A (tələb: `vitest`) |
| `playwright` | hamısı |

### 5.8 Kod keyfiyyəti

| Modul | Uyğun | Ziddiyyət |
|---|---|---|
| `eslint` | hamısı | `biome` |
| `prettier` | hamısı | `biome` |
| `biome` | hamısı | `eslint`, `prettier` |
| `husky-lint-staged` | hamısı | tələb: `eslint` və ya `prettier` və ya `biome`; ziddiyyət: `turborepo` |

### 5.8.1 Alətlər

| Modul | Uyğun | Ziddiyyət |
|---|---|---|
| `turborepo` | hamısı | `husky-lint-staged`, `module-federation` |
| `module-federation` | R | `turborepo` |

### 5.9 Ümumi seçimlər

Dil (JS/TS), paket meneceri (npm, pnpm, yarn, bun), layihə adı, lisenziya faylı (MIT və ya yox), `.editorconfig`, GitHub Actions CI faylı (lint + build).

### 5.10 Framework qeydləri (2026-11, rəsmi scaffold-lardan yoxlanılıb)

| Framework | Əsas | Qeyd |
|---|---|---|
| Svelte | create-vite `svelte(-ts)` | typecheck: `svelte-check` + `tsc -p tsconfig.node.json`. Routing modulu yoxdur, UI SvelteKit ipucu göstərir |
| SvelteKit | `sv create --template minimal` | SvelteKit 3: kit konfiqi `vite.config`-də, `#lib` package.json `imports`-dadır (`$lib` yoxdur). adapter-auto host olmadan deploy olunan çıxış vermir, ona görə adapter-static + `prerender = true` |
| SolidJS | create-vite `solid(-ts)` | Solid **1.9** xətti: npm `latest` 2.0-dır, amma rəsmi şablon 1.x-dədir və Solid 2-nin router/plugin-i ayrı xəttdir |
| Preact | create-vite `preact(-ts)` | Preact 11. `preact-iso` `preact-render-to-string`-i məcburi peer kimi istəyir, açıq asılılıq kimi əlavə olunur |
| Next.js | `create-next-app --empty` | src qovluğu yoxdur. Tailwind PostCSS ilə (`@tailwindcss/postcss`). typecheck: `next typegen && tsc --noEmit`. Redux: `makeStore` + client `StoreProvider` |
| Nuxt | `nuxt/starter` v4 | mənbə `app/`-dadır. Pinia `@pinia/nuxt` modulu ilə. Axios baseURL `runtimeConfig.public` + plugin ilə |
| Astro | create-astro `minimal` | UI framework yoxdur: sayğac custom element-dir. Yalnız `PUBLIC_` env dəyişənləri client-ə çatır. `prettier-plugin-astro`-nun brauzer build-i olmadığı üçün `.astro` faylları əvvəlcədən formatlanmış yazılır (`shared/markup.ts`) |
| Angular | `ng new --defaults` | Angular 22, zoneless, `app.ts` adlandırması. TypeScript dəqiq `>=6.0 <6.1`. typecheck: `ngc -p tsconfig.app.json --noEmit` (`tsc` template-ləri yoxlamır). Tailwind `.postcssrc.json` ilə. Axios baseURL `environment.ts`-də |

Ümumi: Astro, Angular, SvelteKit və Nuxt (`vue-tsc`) TypeScript 7-ni qəbul etmir, ona görə bütün frameworklərdə `typescript ~6.0.3` saxlanılır.

ESLint (`eslint` modulu, flat config, 2026-11 yoxlanılıb):

- ESLint 10 hamısında, **Next.js istisna**: `create-next-app` hələ `eslint ^9` yazır; `eslint-config-next` 10 ilə işləyir, amma daxilindəki `eslint-plugin-react`/`import`/`jsx-a11y` peer-də ≤9 istəyir (xəbərdarlıq, strict-peer-də xəta). Ona görə Next dəstində `eslint ^9`.
- React: create-vite 9.1-dən oxlint-ə keçib; konfiq create-vite 9.0-ın son ESLint şablonudur. Preact: `eslint-config-preact` (2.0) yalnız ESLint 9-u dəstəkləyir və 10-da çökür, ona görə `eslint-plugin-react-hooks` konfiqi istifadə olunur (`preact/hooks` adla tanınır). Solid: `eslint-plugin-solid` (`typescript`/`recommended`).
- Vue: create-vue-nun konfiqi oxlint hissəsi olmadan; TS-də `eslint.config.ts` + `jiti`.
- Svelte/SvelteKit: `sv add eslint` əsasında, amma type-checked qaydalar yoxdur (`ts.configs.recommended`): Vite-in `import.meta.env` indeks imzası `any` verir və type-checked qaydalar axios modulunda xəta çıxarır. SvelteKit JSON-LD `{@html}` bağlanan teqi bölünmüş sətirdən gəlir (svelte-eslint-parser şablondakı `</script>`-i parse edə bilmir); ESLint seçiləndə `svelte/no-at-html-tags` həmin sətirdə söndürülür.
- Nuxt: `@nuxt/eslint` modulu; `eslint.config.mjs` `.nuxt/eslint.config.mjs`-dəki `withNuxt`-u genişləndirir (postinstall `nuxt prepare` yaradır). JS-də də `typescript` lazımdır.
- Angular: `ng add angular-eslint`-in nəticəsi; `lint` skripti `ng lint`, `angular.json`-a `lint` hədəfi və `schematicCollections` adapter tərəfindən yazılır (`model.linter`).
- Prettier seçiləndə `eslint-config-prettier/flat` sonuncu əlavə olunur (Svelte-də üstəlik `svelte.configs.prettier`).

Biome (`biome` modulu, 2.6.8, 2026-11 yoxlanılıb):

- `biome init`-in konfiqi, iki dəyişikliklə: `indentStyle: "space"` (qalan default-lar Prettier 3 ilə eynidir) və `vcs.useIgnoreFile` (`.gitignore` oxunur, `.nuxt`/`.svelte-kit` skan olunmur). `@biomejs/biome` dəqiq versiya ilə pin olunur, çünki `$schema` URL-i versiyanı daşıyır.
- Vue/Nuxt/Svelte/SvelteKit/Astro üçün `html.experimentalFullSupportEnabled` lazımdır (rəsmi status: eksperimental). Onsuz `.svelte` formatı pozulur və template-də işlədilən importlar "unused" görünür. Svelte/Astro-da `indentScriptAndStyle` (Prettier plugin-lərinin default-u).
- Angular template-ləri dəstəklənmir (control-flow bloklarının içi indent olunmur), ona görə HTML formatlayıcı Angular-da sönülüdür. `<a routerLink>` üçün `useValidAnchor` HTML fayllarında söndürülür.
- Tailwind seçiləndə `css.parser.tailwindDirectives`.
- Generator dəyişiklikləri (Prettier-ə təsiri yoxdur):
  - JSX counter düymələrinə `type="button"` (`a11y/useButtonType`).
  - `renderImports` Biome-un organizeImports sırasını izləyir: `node:` → paketlər → alias (`@/`, `~`, `$`, `#`) → nisbi yollar; eyni mənbədən `import type` əvvəl gəlir.
  - Astro markup Biome stilində çap olunur: mətn sığanda inline qalır, sığmayan teq tək atributla da bölünür (`model.formatter`).
  - Next JSON-LD sətrinə `biome-ignore` (səbəbi ilə) əlavə olunur.

Husky + lint-staged (`husky-lint-staged`, husky 9.1.7, lint-staged 17.6.2, 2026-11 yoxlanılıb):

- `prepare: "husky"` və bir sətirlik `.husky/pre-commit` (`lint-staged`). `.git` olmayanda husky xəbərdarlıq yazır və 0 ilə çıxır, ona görə zip-dən açılan layihənin install-u pozulmur. `git init`-dən sonra install bir də işlədilməlidir; README bunu deyir. SvelteKit-in `prepare` skripti saxlanılır (`… && husky`).
- lint-staged konfiqi `package.json`-dadır və seçilmiş alətlərə görə qurulur. ESLint + Prettier-də skriptlər üçün ardıcıl massiv, qalan fayllar üçün inkar glob-u var: üst-üstə düşən glob-lar paralel yazıb yarışır (lint-staged README). ESLint glob-una framework faylları əlavə olunur (`vue`, `svelte`, `astro`, Angular-da `html`).
- lint-staged 17 Node.js ≥22.22.1 istəyir; README-də qeyd olunur.
- `package.json` artıq Prettier-in `json-stringify` parser-i ilə formatlanır (Prettier `package.json`-ı belə yoxlayır: massivlər həmişə sətirlərə bölünür).

Sass (`sass` modulu, `sass` 1.108, 2026-11 yoxlanılıb):

- Qlobal stil faylı `.scss` olur (demo stili Sass dəyişənləri və nesting ilə yazılır), istinad edən yer də yenilənir: entry importu, `nuxt.config` `css`, Astro Layout, `angular.json` `styles`.
- `sass` (saf JS, Next-in default-u) Angular xaricində hamısına dev dependency kimi əlavə olunur. Vite 8 `sass-embedded`-i, sonra `sass`-ı axtarır. Angular-ın `@angular/build` paketi Sass-ı özü gətirir; `ng new --style=scss` kimi `inlineStyleLanguage: "scss"` və komponent schematic-i qurulur.
- Tailwind ilə: Tailwind v4 "preprocessor-larla istifadə üçün nəzərdə tutulmayıb" (tailwindcss.com/docs/compatibility). `.scss`-də yazılan Tailwind girişi xətasız build olunur, amma CSS pozulur (utility-lər yaranmır). Ona görə konflikt yox, xəbərdarlıq var: Tailwind faylı `.css` qalır, Sass isə digər stillər üçün quraşdırılır.

Turborepo (`turborepo` modulu, turbo 2.11.13, 2026-11 yoxlanılıb):

- `create-turbo` quruluşu, amma yalnız kök + `apps/web`. Nümunədəki `packages/ui`, `eslint-config` və `typescript-config` iki tətbiq arasında paylaşmaq üçündür. Bizim framework-lər öz tsconfig-lərini genişləndirir, ona görə onlar yazılmır; `packages/*` glob-u gələcək üçün saxlanılır. Bu, `finalize`-dən sonra fayl yerləşməsini dəyişən addımdır (`model.monorepo`), modul mətn yamamır.
- Kök `package.json`-da `devEngines.packageManager` caret diapazonu ilə yazılır. turbo onsuz işləmir. Dəqiq versiyada npm `EBADDEVENGINES` verir, legacy `packageManager` isə Corepack ilə pnpm-i məcburi dəyişir.
- Kök `.gitignore`-da `.turbo` olmalıdır, yoxsa turbo öz loglarını hash-ləyir və keş heç vaxt tutmur.
- `outputs` framework-ə görədir. Next və SvelteKit-də `typecheck` `build`-dən sonra işləyir, çünki ikisi eyni tip fayllarını yazır və paralel işləyəndə yarışır.
- Strict env rejimi prefikssiz dəyişənləri build-ə ötürmür. SEO ilə Astro/SvelteKit `SITE_URL`-i oxuyur, ona görə `build.env`-ə yazılır.
- `husky-lint-staged` ilə ziddiyyət: hook-lar git kökündən quraşdırılmalıdır, lint-staged isə tətbiqin alətlərini `apps/web`-də işlətməlidir. Bu kombinasiya ayrıca iş tələb edir.

Module Federation (`module-federation` modulu, `@module-federation/vite` 1.25, 2026-11 yoxlanılıb):

- Plugin: `@module-federation/vite`. Vite 5–8 peer-dir, Vite komandası onu tövsiyə edir. `@originjs/vite-plugin-federation` Vite 8-i dəstəkləmir və 2025-dən yenilənmir.
- İki müstəqil layihə yazılır, workspace yoxdur, çünki mikro-frontend-lər ayrıca build və deploy olunur. `host/` (port 5173) seçilmiş bütün modullarla generasiya olunan tətbiqdir. `remote/` (port 5174) `./Counter`-i paylaşır, host onu `lazy(() => import("remote/Counter"))` ilə yükləyir. Hər birinin öz `package.json`-u, `.gitignore`-u və README-si var; kök README iki terminalda işə salmağı izah edir. Ona görə `turborepo` ilə ziddiyyət var, Husky isə host-un öz git kökündə işləyir. `react` və `react-dom` singleton-dur. Portlar `strictPort` ilə sabitdir, çünki host remote-u sabit URL-dən yükləyir.
- Remote-da `base` və `server.origin` remote-un URL-idir. Onlar olmasa remote-un asset-ləri host-un ünvanına görə həll olunur və qırılır.
- `dts: false`. Plugin-in tip paylaşması typecheck zamanı remote-un işləməsini tələb edir və arxa planda broker prosesi qoyur. Host əvəzinə `remotes.d.ts` yazır.
- Remote işləmirsə host səhifəsi ağ qalır: plugin remote entry-ni tətbiq başlamazdan əvvəl yükləyir. README bunu deyir.
- Yoxlanılıb: 3 kombinasiya smoke-da keçir; smoke kökdə `package.json` olmayanda hər layihəni ayrıca install və build edir. Headless Chrome-da iki ayrı `dev` server-lə (və `preview` ilə) host-un öz counter-i (Redux) və remote counter ayrı-ayrı işləyir, Tailwind klassları remote-a da tətbiq olunur.

UI kitləri (2026-11 yoxlanılıb):

- Counter kartını kit çəkir (`model.demo.view`: importlar və markup). Dəyər və handler-lər isə state modulundan gəlir (`CounterSpec`), ona görə istənilən state modulu istənilən kitlə birləşir.
- shadcn-svelte 1.8.1: `init --preset vega` və `add button card` nəticəsi vendored saxlanılır (core fayl sistemi oxumur). Komponentlər `src/lib/components/ui`-dadır, `components.json` sonrakı `add` əmrləri üçün yazılır.
  - Alias hər iki framework-də `#lib`-dir (package.json `imports`). CLI bunu `--lib-alias '#lib'` ilə qəbul edir, ona görə plain Svelte-də sənəddəki Vite/tsconfig `$lib` alias-ı lazım olmur.
  - `utils` artıq `cn` paketindən re-export-dur (clsx/tailwind-merge yoxdur). CLI-nin JS `utils.js`-dəki asılı qalan eslint şərhi silinib. Fayllar həm Prettier, həm Biome organizeImports formasındadır.
  - SvelteKit + ESLint: shadcn Button-u `href` qəbul edir, ona görə `svelte/no-navigation-without-resolve` yalnız `src/lib/components/ui`-da söndürülür.
- Angular Material 22: `ng add` kimi ayrıca `src/material-theme.scss` (`mat.theme`) yaradılır və `angular.json` `styles`-da qlobal faylın əvvəlinə qoyulur. `index.html`-ə Roboto və Material Symbols linkləri əlavə olunur. Animations provider lazım deyil. Tailwind ilə uyğundur: Tailwind v4 `@layer` içindədir, Material isə layer-sizdir.

Vue UI kitləri (2026-11 yoxlanılıb):

- shadcn-vue 2.9.0 (`reka-nova`): komponentlər `components/ui`-da vendored saxlanılır, `@/` alias-ı ilə. Vue root `tsconfig.json`-a `paths` əlavə olunur, çünki CLI alias-ı oradan oxuyur. Nuxt-da `shadcn-nuxt` modulu komponentləri auto-import edir. CLI-nin Google Fonts importu atılıb: "Geist" yükləyir, amma tema "Geist Variable" adını işlədir, ona görə şrift heç vaxt tətbiq olunmur. ESLint: `vue/multi-word-component-names` `src/components/ui`-da söndürülür.
- PrimeVue **v4** (MIT, Aura preset). v5 və `@primeuix/themes` 3 PrimeUI lisenziyasına keçib (açar tələb edir). Tailwind ilə `tailwindcss-primeui` əlavə olunur və `cssLayer` (`theme, base, primevue`) qoyulur ki, Tailwind utility-ləri qalib gəlsin. Nuxt-da `@primevue/nuxt-module` işlədilir; config-dəki `preset: Aura` xam kod kimi yazılır (`raw()`).
- Vuetify **v4**: `createVuetify` plugin-i, `vite-plugin-vuetify` auto-import, `@mdi/font`, tətbiq `<v-app><v-main>` içində (`CounterView.appShell`). Nuxt-da sənəddəki manual qurulum seçilib: `vuetify-nuxt-module` hələ RC-dir və hər build-də `useLayout` təkrar auto-import xəbərdarlığı verir. Testlərdə `createVuetify()` plugin-i quraşdırılır və `vuetify` Vitest-də inline olunur, çünki komponentləri CSS import edir. Tailwind ilə xəbərdarlıq verilir (layer-lər toqquşur).

Vitest (`vitest`, `testing-library` modulları, 2026-11 yoxlanılıb):

- Hər layihəyə counter komponent testi yazılır. Yalnız `vitest` seçiləndə framework-ün öz mount API-si işlədilir: `react-dom/client` + `act`, `preact` + `preact/test-utils`, `solid-js/web`, Svelte `mount`, `@vue/test-utils`, Nuxt `mountSuspended`, Angular `TestBed`, Astro Container API. `testing-library` seçiləndə test `render`/`screen`/`user-event`-ə keçir. Elementlər class ilə yox, teq və mətnlə tapılır, ona görə Tailwind testi pozmur.
- Konfiq rəsmi qurulumlara uyğundur. Vite SPA-larda `vite.config`-də `test` bloku var (TS-də `/// <reference types="vitest/config" />`). Vue-da create-vue kimi `vitest.config` (`mergeConfig`) və `tsconfig.vitest.json`. Next-də Next sənədindəki `vitest.config.mts` (`resolve.tsconfigPaths`; JS-də alias). Nuxt-da `@nuxt/test-utils` `defineVitestProject` (happy-dom). SvelteKit-də `sv add vitest`-in client/server layihələri. Astro-da `getViteConfig`. Angular-da `ng test` (`@angular/build:unit-test`) və `tsconfig.spec.json`.
- Redux və Pinia seçiləndə test counter-i store provider-i və ya plugin-i ilə mount edir: `CounterSpec.testHarness`.
- React `act` mühitini yalnız `IS_REACT_ACT_ENVIRONMENT` ilə tanıyır. Testing Library bunu özü edir; düz `react-dom` testi üçün setup faylı bayrağı qoyur.
- Plain Svelte-də Testing Library-nin `svelteTesting()` plugin-i olmayanda `resolve.conditions: ["browser"]` yalnız Vitest altında qoyulur (Svelte sənədi).
- `testing-library` SvelteKit və Astro-da yoxdur. `sv` SvelteKit üçün brauzer rejimini (`vitest-browser-svelte`) təklif edir. Astro komponentləri serverdə render olunur, interaktivlik isə client skriptindədir.

## 6. Mühərrik dizaynı

### 6.1 Əsas tiplər

```ts
export type FrameworkId =
  | "react" | "vue" | "svelte" | "solid" | "preact" | "angular"
  | "next" | "nuxt" | "sveltekit" | "astro";

export type Language = "js" | "ts";
export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export interface Selection {
  name: string;
  framework: FrameworkId;
  language: Language;
  packageManager: PackageManager;
  modules: string[];            // modul id-ləri
}

export interface Ctx {
  selection: Selection;
  has(moduleId: string): boolean;
  ext: { script: "js" | "ts"; component: string }; // məs. jsx/tsx, vue, svelte
}

// Framework-dən asılı olmayan aralıq model.
// Modullar faylları birbaşa string kimi yamamır, bu modeli dəyişir.
export interface ProjectModel {
  files: Map<string, string>;
  pkg: {
    dependencies: Set<string>;     // yalnız ad; versiya sonra həll olunur
    devDependencies: Set<string>;
    scripts: Record<string, string>;
  };
  entry: {
    imports: ImportSpec[];
    providers: ProviderSpec[];      // React/Preact/Solid: JSX bürüyücü
    appUses: string[];              // Vue: app.use(...)
    setup: string[];                // entry-də əlavə kod sətirləri
  };
  bundler: { plugins: ImportedCall[] };  // vite.config, nuxt.config modules və s.
  styles: { globalImports: string[]; globalCss: string[] };
  routes: RouteSpec[];              // demo səhifələr
  readme: { stack: string[]; sections: { title: string; body: string }[] };
  warnings: string[];
}

export interface Module {
  id: string;
  name: string;
  category: Category;
  description: string;           // UI-da göstərilir (az/en)
  frameworks: FrameworkId[] | "all";
  languages?: Language[];
  requires?: string[];
  conflicts?: string[];
  order?: number;                // provider sırası kimi şeylər üçün
  apply(model: ProjectModel, ctx: Ctx): void;
}

export interface FrameworkAdapter {
  id: FrameworkId;
  name: string;
  kind: "spa" | "meta";
  languages: Language[];
  base(ctx: Ctx): ProjectModel;                  // əsas fayllar və paketlər
  render(model: ProjectModel, ctx: Ctx): void;   // entry, config fayllarını modeldən yazır
}
```

### 6.2 Pipeline

1. **validate**: framework, dil və modul uyğunluğunu yoxla. Səhv olanda aydın mesaj qaytar (`{ ok: false, errors: [...] }`).
2. **resolve**: `requires` olanları avtomatik əlavə et, ziddiyyəti yoxla, modulları `order` və asılılığa görə topoloji sırala.
3. **base**: framework adapteri boş modeli yaradır.
4. **apply**: hər modul modeli dəyişir.
5. **render**: adapter entry faylını (`main.tsx`, `main.ts`, `app.config.ts` və s.), bundler konfiqini və qlobal CSS-i modeldən yazır.
6. **versions**: paket adlarına versiya təyin et (bax 6.3).
7. **finalize**: `package.json`, README, `.gitignore`, paket menecerinə görə əmrlər.
8. **format**: (istəyə görə) `prettier/standalone` ilə bütün faylları formatla.
9. **output**: `Map<path, content>` qaytar. Zip, GitHub və CLI bunu istehlak edir.

`ProjectModel` Faza 1-də bu sahələrlə genişləndirildi: `styles.mode` (`"plain" | "tailwind"`, demo komponentlərin class-larını seçir), `routing` (link komponenti və route outlet-i; routing modulu doldurur), `demo.counter` (sayğac state-i; state modulu doldurur, boş qalsa adapter lokal state istifadə edir). Bunlar sayəsində state və routing modulları `App`/`Counter` fayllarını yamamadan demo kodunu dəyişir. Format addımı default olaraq aktivdir.

Əsas qayda: **modullar heç vaxt başqa modulun yaratdığı faylı mətn axtar-dəyiş ilə yamamamalıdır.** Paylaşılan fayllar (entry, config) yalnız adapterin `render` mərhələsində modeldən yazılır. Bu, kombinasiya sayı artdıqca sistemin çökməməsinin əsas şərtidir.

### 6.3 Versiyalar

`versions/known-good.ts` hər framework üçün birlikdə test olunmuş versiya dəstlərini saxlayır (məs. Next + React + React DOM birlikdə). Default olaraq bunlar istifadə olunur. Versiyalar heç bir başqa faylda hardcode edilməməlidir.

UI-da əlavə olaraq "Ən son versiyalar (eksperimental)" seçimi olur: `https://registry.npmjs.org/<paket>/latest` ilə son versiyanı çəkir, 24 saatlıq yaddaşda saxlayır, alınmasa known-good dəstinə qayıdır.

Həftəlik GitHub Actions işi: known-good dəstlərini son versiyalara qaldırır, smoke testi işlədir, keçərsə avtomatik PR açır.

### 6.4 Şablonlar

Böyük, az dəyişən fayllar `frameworks/<id>/templates/` altında ayrıca fayl kimi saxlanır. Hər şablon mətni `export default` ilə qaytaran `.ts` modulu olur (məs. `templates/plain-css.ts`). Sadə dəyişənlər üçün yalnız `{{name}}` tipli əvəzetmə istifadə olunur, şablon dili əlavə etmirik. Şərti məntiq şablonda yox, TypeScript kodunda olur.

> Dəyişiklik (Faza 1): əvvəlcə `import.meta.glob(..., { query: "?raw" })` planlanmışdı. Bu yalnız Vite altında işləyir, `core` isə smoke skriptində və CLI-da bundler olmadan Node-da da işləməlidir. `.ts` mətn modulları hər üç mühitdə eyni işləyir.

## 7. Web app (apps/web)

Prototipdəki quruluş saxlanılır: solda seçimlər, sağda fayl ağacı və kod.

Funksiyalar:

- Framework seçimi ən yuxarıda; dəyişəndə uyğun olmayan modullar avtomatik çıxarılır və istifadəçiyə qısa bildiriş göstərilir.
- Uyğun olmayan seçimlər deaktiv görünür, üzərinə gələndə səbəbi yazılır ("shadcn/ui Tailwind tələb edir").
- `requires` ilə avtomatik əlavə olunan modullar ayrıca işarələnir.
- Fayl ağacı, Shiki ilə rənglənmiş kod görünüşü, dəyişən faylların işıqlanması (prototipdə olduğu kimi).
- Hazır presetlər: "React + Tailwind + Redux", "Vue + Pinia + Vue Router", "Next.js + shadcn", "SvelteKit + Tailwind" və s.
- Seçim URL-in hash hissəsində saxlanır, link paylaşmaq mümkün olur.
- Zip yükləmə; Faza 6-dan sonra "GitHub-da repo yarat" düyməsi.
- İnterfeys dili: Azərbaycan və İngilis (sadə JSON lüğət).
- İşıqlı və qaranlıq rejim, klaviatura ilə tam idarə, mobil uyğunluq.

## 8. Testlər

**Unit**: hər modulun `apply` funksiyası modeli düzgün dəyişir.

**Validasiya**: matrisdəki hər qayda üçün test (uyğun olmayan seçim rədd edilir, `requires` əlavə olunur, ziddiyyət tutulur).

**Snapshot**: hər framework üçün minimal və "hər şey seçilib" kombinasiyalarının fayl ağacı və əsas faylları snapshot ilə yoxlanır.

**Smoke (`scripts/smoke.ts`)**: kombinasiyaları real olaraq yaradır, müvəqqəti qovluğa yazır, `pnpm install`, `build`, `typecheck` (TS-də), `lint` (seçilibsə) işlədir. Kombinasiya sayı çox olduğu üçün pairwise (cüt-cüt əhatə) seçimi istifadə olunur: hər iki modul cütü ən azı bir dəfə birlikdə yoxlanır. PR-larda kiçik dəst, gecə işində tam pairwise dəst işləyir.

## 9. GitHub export (apps/api)

1. İstifadəçi "GitHub ilə daxil ol" düyməsini basır, GitHub OAuth App axını başlayır.
2. Serverless funksiya `code`-u access token-ə dəyişir; token qısa müddətli httpOnly cookie-də saxlanır, client JS-ə verilmir.
3. Repo yaratma: `POST /user/repos`, sonra Git Data API ilə blob-lar, tree, commit yaradılır və `refs/heads/main` yenilənir (bütün fayllar bir commit-də).
4. Scope: yalnız lazım olan (`public_repo`, private repo seçilərsə `repo`).
5. Rate limit və xəta halları istifadəçiyə aydın göstərilir; repo adı artıq mövcuddursa təklif verilir.

## 10. CLI (packages/cli)

`npx stackforge` interaktiv suallar verir (framework, dil, modullar), `--preset next-shadcn` və ya `--config ./stack.json` ilə qeyri-interaktiv işləyir, eyni `core` paketini istifadə edir, faylları diskə yazır və istəyə görə `git init` + install edir.

## 11. Fazalar və qəbul meyarları

### Faza 1: Təməl
Monorepo, `core` tipləri, validate/resolve/generate pipeline, React adapteri, prototipdəki bütün React modulları yeni arxitekturaya köçürülür. Web app prototipin funksionallığına çatır.
Qəbul: React kombinasiyaları smoke testdən keçir, `pnpm test` yaşıldır.

### Faza 2: Vite SPA-lar
Vue, Svelte, Solid, Preact adapterləri; Pinia, Vue Router, Solid Router, preact-iso; hər framework üçün Tailwind, Sass, Vitest, ESLint/Prettier/Biome.
Qəbul: hər framework üçün ən azı 5 kombinasiya build olur.

### Faza 3: Meta-frameworklər
Next.js, Nuxt, SvelteKit, Astro. Routing modulları bunlarda gizlənir, demo səhifələr fayl əsaslı routing ilə yaradılır.
Qəbul: eyni.

### Faza 4: Angular
Ayrı adapter, `angular.json`, standalone komponentlər, Angular Material, NgRx.
Qəbul: `ng build` keçir.

### Faza 5: UX və versiyalar
Presetlər, URL ilə paylaşma, "ən son versiyalar" rejimi, həftəlik versiya yeniləmə işi, UI kitləri (shadcn, Mantine, MUI, PrimeVue, Vuetify, shadcn-svelte).

### Faza 6: GitHub export
`apps/api`, OAuth, repo yaratma.

### Faza 7: CLI
`packages/cli`, npm-də dərc.

## 12. Hələ açıq olan suallar

- Deploy harada olacaq (Vercel, Cloudflare Pages, Netlify)? Faza 6-dakı API buna görə seçilir.
- Backend seçimi (Express, Hono, Supabase) generatora əlavə olunsunmu? Hazırda kənarda saxlanılıb.
- ~~Monorepo şablonu (Turborepo) çıxış variantı kimi lazımdırmı?~~ `turborepo` modulu kimi əlavə olundu (bax §5.10).
