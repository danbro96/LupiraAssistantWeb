import boundaries from 'eslint-plugin-boundaries';
import tseslint from 'typescript-eslint';

// Purity by construction: token modules may import nothing but each other — no dependencies, no
// generated DTO types, no platform APIs. That is what keeps this package consumable by both a web
// theme and a native one.
export default [
  { ignores: ['node_modules/**'] },
  {
    files: ['src/**/*.ts'],
    languageOptions: { parser: tseslint.parser },
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'tokens', pattern: 'src/**' },
      ],
      'import/resolver': { typescript: { alwaysTryTypes: true } },
    },
    rules: {
      'boundaries/dependencies': ['error', {
        default: 'disallow',
        policies: [
          { from: { element: { type: 'tokens' } }, allow: [{ to: { element: { type: 'tokens' } } }] },
        ],
      }],
      'boundaries/external': ['error', { default: 'disallow', policies: [] }],
    },
  },
];
