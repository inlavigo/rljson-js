import pluginJs from '@eslint/js';
import jsdoc from 'eslint-plugin-jsdoc';
import globals from 'globals';
import tseslint from 'typescript-eslint';
// import eslintPlugin from 'vite-plugin-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ['**/*.{js,mjs,cjs}'] },
  { languageOptions: { globals: { ...globals.browser } } },
  pluginJs.configs.recommended,

  {
    plugins: { jsdoc },
    rules: {
      'no-unused-vars': 'error',
      'no-undef': 'error',
      'no-shadow': 'error',
      'no-redeclare': 'error',
      'no-unused-expressions': 'error',
      'no-unused-labels': 'error',
      'no-undef-init': 'error',
      'no-undefined': 'error',

      // Example JSDoc rules
      'jsdoc/check-alignment': 'error', // Ensure JSDoc comments are aligned correctly
      'jsdoc/check-param-names': 'error', // Ensure parameter names match documentation
      'jsdoc/check-tag-names': 'error', // Ensure JSDoc tags are valid
      'jsdoc/check-types': 'error', // Ensure type names are valid

      'jsdoc/require-description': 'error',
      'jsdoc/require-param-type': 'error',
      'jsdoc/require-returns-type': 'error',
      'jsdoc/require-jsdoc': [
        'error',
        {
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true,
            ArrowFunctionExpression: true,
            FunctionExpression: true,
          },
        },
      ],

      // Typescript rules
      ...tseslint.configs.recommended.rules,
    },
  },
  {
    files: ['**/*.spec.js'], // Match test files
    rules: {
      'jsdoc/require-jsdoc': 'off', // Disable requiring JSDoc
      'jsdoc/require-description': 'off', // Disable requiring a description
    },
  },
];
