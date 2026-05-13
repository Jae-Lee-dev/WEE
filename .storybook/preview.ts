import type { Preview } from '@storybook/nextjs-vite'
import { createElement } from 'react'
import '../src/app/styles/globals.css'

const preview: Preview = {
  decorators: [
    (Story) =>
      createElement(
        'div',
        {
          'data-admin-shell': 'compact',
          className: 'min-h-screen bg-gray-100 p-6 text-gray-900',
        },
        createElement(Story),
      ),
  ],
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    },

    nextjs: {
      appDirectory: true,
    }
  },
};

export default preview;
