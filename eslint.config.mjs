import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * ESLint flat configuration for TypeScript project.
 * Uses typescript-eslint recommended rules with strict type checking.
 */
export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Enforce explicit return types for better documentation
      '@typescript-eslint/explicit-function-return-type': 'warn',
      // Allow unused vars prefixed with underscore
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Ensure promises are handled
      '@typescript-eslint/no-floating-promises': 'error',
      // Prefer const assertions
      'prefer-const': 'error',
      // No console in production (except error/warn)
      'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', '*.config.*'],
  }
);
