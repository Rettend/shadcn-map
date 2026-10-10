import js from '@eslint/js'
import unocss from '@unocss/eslint-plugin'
import { defineConfig } from 'eslint/config'
import svelte from 'eslint-plugin-svelte'
import globals from 'globals'
import ts from 'typescript-eslint'

export default defineConfig(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.svelte-kit/**',
      '**/coverage/**',
      'docs/**',
      '**/*.md',
    ],
  },
  {
    files: ['packages/**/*.svelte', 'packages/**/*.svelte.{js,ts}'],
    extends: [
      js.configs.recommended,
      ts.configs.recommended,
      svelte.configs.recommended,
      svelte.configs.prettier,
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        parser: ts.parser,
        extraFileExtensions: ['.svelte'],
      },
    },
    plugins: { unocss },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-undef': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': ['error', { allowInterfaces: 'always' }],
      '@typescript-eslint/no-unused-expressions': [
        'error',
        {
          allowShortCircuit: true,
          allowTaggedTemplates: true,
          allowTernary: true,
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          caughtErrors: 'none',
          ignoreRestSiblings: true,
          varsIgnorePattern: '^(_|\\$\\$Props$|\\$\\$Events$|\\$\\$Slots$)',
        },
      ],
      'svelte/derived-has-same-inputs-outputs': 'error',
      // Native collections and dates are imperative caches or explicitly replaced snapshots.
      'svelte/prefer-svelte-reactivity': 'off',
      'unocss/order': ['warn', { unoFunctions: ['clsx', 'classnames', 'cn'] }],
    },
  },
)
