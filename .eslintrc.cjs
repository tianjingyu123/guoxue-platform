const typescriptParser = require.resolve('@typescript-eslint/parser')

module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  parser: typescriptParser,
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  globals: {
    uni: 'readonly',
    getCurrentPages: 'readonly',
    getApp: 'readonly',
    onShow: 'readonly',
    onHide: 'readonly',
    onLoad: 'readonly',
    onReady: 'readonly',
    onUnload: 'readonly',
    onPullDownRefresh: 'readonly',
    onReachBottom: 'readonly',
    UniApp: 'readonly',
    wx: 'readonly',
    plus: 'readonly',
    uniCloud: 'readonly',
  },
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-require-imports': 'off',
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'no-empty': 'warn',
  },
  ignorePatterns: ['node_modules', 'dist', '*.js', '*.d.ts'],
  overrides: [
    {
      files: ['*.vue'],
      parser: 'vue-eslint-parser',
      parserOptions: {
        parser: typescriptParser,
      },
      extends: ['plugin:vue/vue3-recommended'],
      rules: {
        'vue/multi-word-component-names': 'off',
        'vue/require-default-prop': 'off',
        '@typescript-eslint/no-unused-vars': 'warn',
        'no-irregular-whitespace': 'off',
        'no-unreachable': 'off',
        'no-empty': 'off',
      },
    },
    {
      files: ['apps/mobile/src/App.vue'],
      rules: {
        'vue/valid-template-root': 'off',
      },
    },
    {
      files: ['*.spec.ts', '*.test.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': 'off',
        'no-console': 'off',
      },
    },
    {
      files: [
        'apps/mobile/scripts/**/*.ts',
        'apps/server/prisma/**/*.ts',
        'apps/server/scripts/**/*.ts',
        'packages/*/scripts/**/*.ts',
      ],
      rules: {
        'no-console': 'off',
      },
    },
    {
      files: ['apps/server/test/**/*.ts', 'apps/server/test-*.ts'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
        'no-console': 'off',
      },
    },
    {
      files: ['apps/server/prisma/seeds/legal-documents.seed.ts'],
      rules: {
        'no-irregular-whitespace': 'off',
      },
    },
    {
      files: [
        'apps/server/src/common/**/*.ts',
        'apps/server/src/modules/commission/**/*.ts',
        'apps/server/src/modules/settlement/**/*.ts',
        'apps/server/src/modules/fund-approval/**/*.ts',
        'apps/server/src/modules/coin/**/*.ts',
      ],
      excludedFiles: ['*.spec.ts', '*.test.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
      },
    },
  ],
}
