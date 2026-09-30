const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['public/js/Highmaps/**', 'src/**', 'node_modules/**'] },
  js.configs.recommended,
  { rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } },
  { files: ['**/*.js', 'bin/www'], languageOptions: { sourceType: 'commonjs', globals: globals.node } },
  {
    files: ['public/js/**/*.js'],
    languageOptions: { sourceType: 'script', globals: { ...globals.browser, angular: 'readonly', app: 'writable', $: 'readonly', Highcharts: 'readonly' } },
    rules: { 'no-unused-vars': 'off', 'no-redeclare': 'off' }
  }
];
