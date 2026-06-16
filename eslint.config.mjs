import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default tseslint.config(
  // ── Ignore non-source files ────────────────────────────────────────────
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/*.js', '**/*.mjs'],
  },

  // ── TypeScript base (all packages) ────────────────────────────────────
  tseslint.configs.recommended,

  {
    files: ['packages/**/*.ts', 'packages/**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: [
          'packages/backend/tsconfig.eslint.json',
          'packages/frontend/tsconfig.eslint.json',
        ],
      },
    },
    rules: {
      // ── Variables ──────────────────────────────────────────────────────
      'no-var': 'error',
      'prefer-const': 'error',

      // ── Equality ───────────────────────────────────────────────────────
      // Exception: x == null is allowed (checks both null and undefined)
      'eqeqeq': ['error', 'always', { null: 'ignore' }],

      // ── TypeScript ─────────────────────────────────────────────────────
      '@typescript-eslint/no-explicit-any': 'error',

      // import type for type-only imports
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
        fixStyle: 'inline-type-imports',
      }],

      // Unused vars/params: prefix with _ to intentionally skip
      '@typescript-eslint/no-unused-vars': ['error', {
        vars: 'all',
        args: 'all',
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],

      // No wrapper types: String, Boolean, Number
      '@typescript-eslint/no-wrapper-object-types': 'error',

      // Throw Error instances only — never strings or plain objects
      '@typescript-eslint/only-throw-error': 'error',

      // ── Control flow ───────────────────────────────────────────────────
      'default-case': 'error',
      'no-fallthrough': 'error',

      // No for...in — use for...of with Object.keys/values/entries()
      'no-restricted-syntax': ['error', {
        selector: 'ForInStatement',
        message: 'Use for...of with Object.keys/values/entries() instead of for...in.',
      }],
    },
  },

  // ── React (frontend only) ──────────────────────────────────────────────
  {
    files: ['packages/frontend/**/*.{ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',       // not needed with React 17+
      'react/prop-types': 'off',               // TypeScript handles this
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
);
