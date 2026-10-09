import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// Application code renders declaratively. Querying or mutating the DOM by hand is
// banned everywhere except the playback adapter, the one place that has to drive a
// <video> element and the HLS engine.
const domBan = [
  {
    selector:
      'CallExpression[callee.property.name=/^(querySelector|querySelectorAll|getElementById|getElementsByClassName|getElementsByTagName|createElement|appendChild|insertBefore|removeChild|replaceChildren|insertAdjacentHTML)$/]',
    message: 'Do not query or build DOM by hand; render it with React.',
  },
  {
    selector:
      'AssignmentExpression[left.property.name=/^(innerHTML|outerHTML|innerText|textContent)$/]',
    message: 'Do not write DOM content by hand; render it with React.',
  },
  {
    selector: 'JSXAttribute[name.name="dangerouslySetInnerHTML"]',
    message: 'Do not inject HTML.',
  },
]

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', 'e2e'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-restricted-syntax': ['error', ...domBan],
    },
  },
  {
    // The playback adapter drives <video>; main.tsx mounts React on #root.
    files: ['src/features/player/playback/**/*.ts', 'src/main.tsx'],
    rules: { 'no-restricted-syntax': 'off' },
  },
)
