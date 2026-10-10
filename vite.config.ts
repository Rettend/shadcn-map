import solid from 'eslint-plugin-solid/configs/v2'
import { defineConfig } from 'vite-plus'

const generatedFiles = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.svelte-kit/**',
  '**/coverage/**',
]

export default defineConfig({
  lint: {
    // Svelte needs its own parser for template references and rune semantics.
    ignorePatterns: [...generatedFiles, '**/*.svelte', '**/*.svelte.{js,ts}', 'docs/**'],
    plugins: ['typescript', 'unicorn', 'oxc', 'import'],
    jsPlugins: [{ name: 'unocss', specifier: '@unocss/eslint-plugin' }],
    categories: {
      correctness: 'error',
    },
    // Framework checks and native tsc run through the root check script.
    options: {
      typeAware: false,
      typeCheck: false,
    },
    env: {
      browser: true,
      node: true,
    },
    settings: solid.settings,
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-expressions': [
        'error',
        {
          allowShortCircuit: true,
          allowTaggedTemplates: true,
          allowTernary: true,
        },
      ],
      'no-unused-vars': [
        'error',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          caughtErrors: 'none',
          ignoreRestSiblings: true,
          varsIgnorePattern: '^_',
        },
      ],
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': ['error', { destructuring: 'all', ignoreReadBeforeAssign: true }],
      'import/no-duplicates': 'error',
      'typescript/consistent-type-imports': [
        'error',
        {
          disallowTypeAnnotations: false,
          fixStyle: 'separate-type-imports',
          prefer: 'type-imports',
        },
      ],
      'unocss/order': 'warn',
    },
    overrides: [
      {
        files: ['packages/map/src/solid/**', 'packages/playground-solid/src/**'],
        jsPlugins: ['eslint-plugin-solid'],
        rules: {
          ...solid.rules,
          // Type checking handles JSX names; Oxfmt handles element layout.
          'solid/jsx-no-undef': ['error', { typescriptEnabled: true }],
          'solid/self-closing-comp': 'off',
        },
      },
      {
        files: ['packages/map/src/solid/components/Map.tsx'],
        rules: {
          // MapLibre invokes these listeners as event handlers, not computations.
          'solid/reactivity': ['warn', { customReactiveFunctions: ['on'] }],
        },
      },
      {
        files: ['packages/map/src/solid/components/controls/GeolocateControl.tsx'],
        rules: {
          // Native geolocation callbacks read the current props when invoked.
          'solid/reactivity': ['warn', { customReactiveFunctions: ['getCurrentPosition'] }],
        },
      },
      {
        files: ['packages/map/src/solid/components/Marker.tsx'],
        rules: {
          // Marker icon SVG bodies are trusted API input, as in the Svelte adapter.
          'solid/no-innerhtml': 'off',
        },
      },
    ],
  },
  fmt: {
    ignorePatterns: [...generatedFiles, 'docs/**', '**/*.md', '**/*.lock', '**/*.lockb'],
    singleQuote: true,
    semi: false,
    arrowParens: 'avoid',
    svelte: {
      sortOrder: 'none',
    },
    // UnoCSS class order is checked by its linter, not the Tailwind sorter.
    sortTailwindcss: false,
  },
})
