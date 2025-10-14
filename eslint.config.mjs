import antfu from '@antfu/eslint-config'
import nextPlugin from '@next/eslint-plugin-next'
import jsxA11y from 'eslint-plugin-jsx-a11y'

export default antfu(
  {
    formatters: true,
    react: true,
    typescript: true,
  },
  jsxA11y.flatConfigs.recommended,
  {
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },
  {
    rules: {
      'no-console': 'off',
      'unicorn/no-instanceof-builtins': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      'react/no-array-index-key': 'off',
      'react/no-context-provider': 'off',
      'react-refresh/only-export-components': 'off',
      'react-hooks-extra/no-direct-set-state-in-use-effect': 'off',
      'jsx-a11y/no-autofocus': 'off',
    },
  },
)
