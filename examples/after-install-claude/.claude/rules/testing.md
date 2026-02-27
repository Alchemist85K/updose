# Testing Rules

- Always write tests for new components and hooks
- Use `@testing-library/react` — avoid testing implementation details
- Use `userEvent` over `fireEvent`
- Mock API calls with `msw`, not manual fetch mocks
- Test files must be co-located: `Button.tsx` → `Button.test.tsx`
