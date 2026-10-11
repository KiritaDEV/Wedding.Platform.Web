# React + TypeScript + Vite

The Event Media Library supports multi-image selection and drag-and-drop. The frontend runs a sequential queue with one existing backend request per file, so each upload succeeds or fails independently and backend duplicate detection remains authoritative. Its CSS-column masonry layout affects presentation only; Media ordering and domain data are unchanged.

## UI development

Before creating a generic UI control, inspect `src/components/ui` and reuse or extend an existing shared primitive. Do not create page-local variants of buttons, inputs, textareas, tabs, dialogs, badges, or other generic controls unless there is a concrete reason the shared primitive cannot support the requirement.

Reuse shared typography roles for platform/editor chrome when the same semantic role already exists. Do not create page-local typography variants for common page titles, panel titles, helper text, labels, and captions without first checking the shared UI layer. Template renderer typography remains template-owned.

## Website Template boundaries

- The API Template registry is authoritative for availability, compatibility, product metadata, Design defaults/options, and Section Appearance capabilities.
- Design option keys are runtime Template-defined strings. Generic frontend code must not enumerate every Template-specific value; it validates selected values against the options returned with the Website draft.
- A Design key shared by multiple Templates represents intentionally compatible semantic meaning and is preserved during Template switching.
- Frontend renderer registration and Template-local visual adapters own presentation. Unknown renderer keys must remain explicit and must not fall back to another Template.
- Template-specific Design tokens, Appearance interpretation, and Section composition stay inside their Template implementation.
- An Event may exist without a Website. First-time Website initialization requires an explicit Template selection; once created, a Website always has a valid non-null Template and later changes use the Template assignment flow.
- Event date and start time are local wall-clock values at the Event location. `timeZone` is an IANA identifier selected by the user, while `startsAtUtc` is derived by the API and never entered independently. Website Sections consume Event timing and must not duplicate it in Section content.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
