module.exports = {
  root: true,
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['import', 'promise', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:promise/recommended',
    'plugin:import/recommended',
    'plugin:prettier/recommended'
  ],
  rules: {
    'no-unused-vars': ['warn', { args: 'none', ignoreRestSiblings: true }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'eqeqeq': ['error', 'always'],
    'complexity': ['warn', 15],
    'import/order': ['warn', {
      'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      'newlines-between': 'always'
    }],
    'prettier/prettier': 'warn'
  },
  ignorePatterns: [
    'miniprogram_npm/**',
    'node_modules/**',
    'cloudfunctions/**/node_modules/**',
    'dist/**',
    '__*__/**',
    'donutAuthorize__/**',
    'scripts/__pycache__/**'
  ]
};