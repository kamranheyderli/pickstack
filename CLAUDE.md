# CLAUDE.md

Bu repo frontend layihə generatorudur. Tam plan: `docs/SPEC.md`. İlkin prototip: `docs/reference/prototype.html`.

## Əmrlər

```bash
pnpm install
pnpm dev              # apps/web
pnpm test             # bütün paketlərdə Vitest
pnpm test -u          # snapshot-ları yenilə (yalnız dəyişiklik qəsdən olanda)
pnpm typecheck
pnpm lint
pnpm smoke --quick    # kiçik kombinasiya dəstini real build edir
pnpm smoke            # tam pairwise dəst (uzun çəkir)
```

## İş qaydası

- Hər dəfə SPEC-dəki cari fazadan bir hissə götür, bitir, testləri işlət, sonra növbətiyə keç.
- Faza bitəndə SPEC-dəki qəbul meyarını yoxla və nəticəni qısa yaz.
- Matrisdə `(yoxla)` işarəli və ya əmin olmadığın inteqrasiyalar üçün rəsmi sənədə bax; təxmin etmə. Uyğun gəlmirsə, matrisi yenilə və səbəbini commit mesajında yaz.

## Arxitektura qaydaları

- `packages/core` UI, DOM və Node-a xas API-lərdən asılı olmamalıdır (brauzerdə və CLI-da işləyir).
- Modullar paylaşılan faylları (entry, vite.config, nuxt.config və s.) **mətn kimi yamamır**. Yalnız `ProjectModel`-i dəyişirlər; həmin faylları adapterin `render` funksiyası yazır.
- Paket versiyaları yalnız `packages/core/src/versions/known-good.ts`-də olur.
- Şərti məntiq şablon fayllarında yox, TypeScript kodundadır.
- Yaradılan kod təmiz və idiomatik olmalıdır: istifadəçi onu öz layihəsi kimi davam etdirəcək.

## Yeni modul əlavə etmək

1. `packages/core/src/modules/<kateqoriya>/<id>.ts` yarat, `Module` interfeysini tətbiq et.
2. `frameworks`, `requires`, `conflicts` sahələrini SPEC-dəki matrisə uyğun doldur.
3. Modulu `modules/index.ts` reyestrinə əlavə et.
4. Unit test, validasiya testi və ən azı bir snapshot əlavə et.
5. Smoke dəstinə bu modulu əhatə edən kombinasiya əlavə et və `pnpm smoke --quick` işlət.

## Yeni framework əlavə etmək

1. `packages/core/src/frameworks/<id>/adapter.ts` və `templates/` yarat.
2. `known-good.ts`-ə versiya dəsti əlavə et.
3. Mövcud modulların `frameworks` siyahısını yenilə.
4. Minimal və "hər şey" snapshot-ları, smoke kombinasiyaları əlavə et.

## Kod üslubu

- TypeScript strict, `any` yoxdur.
- Kiçik, təmiz funksiyalar; side effect yalnız `output/` və `apps/` altında.
- UI mətnləri `apps/web/src/i18n/{az,en}.json`-dadır, komponentlərdə hardcode edilmir.
