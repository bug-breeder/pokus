import js from '@eslint/js';

export default [
  { ignores: ['node_modules/**', 'dist/**', 'assets/**'] },

  // Device app code (pages, utils, app-service, app.js)
  {
    files: ['**/*.js'],
    ignores: ['lib/**'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        App: 'readonly',
        Page: 'readonly',
        AppService: 'readonly',
        getApp: 'readonly',
        px: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },

  // Node.js scripts in lib/
  {
    files: ['lib/**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        __dirname: 'readonly',
        process: 'readonly',
        console: 'readonly',
      },
    },
  },
];
