module.exports = {
  extends: ['stylelint-config-standard'],
  rules: {
    'color-hex-length': 'short',
    'selector-max-id': 0,
    'no-descending-specificity': null,
    'property-no-unknown': true
  },
  ignoreFiles: [
    'node_modules/**',
    'miniprogram_npm/**',
    'cloudfunctions/**/node_modules/**',
    'dist/**'
  ]
};