---
description: Prohibition of barrel files (index.ts/js files that re-export)
globs: ["**/*.ts", "**/*.js", "**/*.tsx", "**/*.jsx"]
alwaysApply: true
---

# No Barrel Files Rule

## Rule: Prohibit Barrel Files

**Guideline:** Do NOT create barrel files (index.ts/js files that only re-export from other files).

### What are Barrel Files?

Barrel files are `index.ts` or `index.js` files that only contain re-export statements like:

```typescript
// ❌ BAD - Barrel file
export { ComponentA } from "./component-a"
export { ComponentB } from "./component-b"
export { ComponentC } from "./component-c"
```

### Why Avoid Barrel Files?

1. **Bundle Size**: They can increase bundle size due to tree-shaking issues
2. **Performance**: Can cause unnecessary module loading
3. **Complexity**: Add an extra layer of indirection
4. **Debugging**: Make it harder to trace imports and dependencies
5. **Maintenance**: Require constant updates when adding/removing exports

### Acceptable Alternatives

**✅ GOOD - Direct imports:**

```typescript
import { ComponentA } from "./components/component-a"
import { ComponentB } from "./components/component-b"
import { ComponentC } from "./components/component-c"
```

**✅ GOOD - Named imports from specific files:**

```typescript
import { ComponentA, ComponentB } from "./components/shared-components"
```

### Exceptions

The only acceptable `index.ts` files are:

- Entry points for applications (`app/page.tsx`, `app/layout.tsx`)
- Route handlers (`app/api/route.ts`)
- Configuration files that actually contain logic, not just re-exports

### Enforcement

- No `index.ts` or `index.js` files should exist in component directories
- No `index.ts` or `index.js` files should exist in utility directories
- No `index.ts` or `index.js` files should exist in feature directories
- Import directly from the specific files you need

---

**Remember:** Direct imports are clearer, more performant, and easier to maintain than barrel files.
