import prettierConfig from 'eslint-config-prettier';

export default [
  {
    ignores: [
      'dist',
    ],
    languageOptions: {
      parser: (await import('@typescript-eslint/parser')).default,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': (await import('@typescript-eslint/eslint-plugin')).default,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
    },
    files: ['**/*.ts'],
  },
  prettierConfig,
];
