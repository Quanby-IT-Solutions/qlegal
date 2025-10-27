---
description: Co-locate types with their usage instead of separate type-only files
globs: ["**/*.ts", "**/*.tsx"]
alwaysApply: true
---

# Co-locate Types Rule

## Rule: Avoid Separate Type-Only Files

**Guideline:** Do NOT create separate files that only contain type definitions. Instead, co-locate types with the code that uses them.

### What are Type-Only Files?

Type-only files are files that contain only TypeScript type definitions, interfaces, or enums without any runtime code:

```typescript
// ❌ BAD - Separate type-only file (types/user.types.ts)
export interface User {
	id: string
	name: string
	email: string
}

export type UserRole = "admin" | "user" | "guest"

export interface UserPreferences {
	theme: "light" | "dark"
	notifications: boolean
}
```

### Why Avoid Separate Type-Only Files?

1. **Context Loss**: Types are separated from the code that uses them
2. **Navigation Overhead**: Developers must jump between files to understand types
3. **Maintenance Burden**: Types and implementation can get out of sync
4. **Import Complexity**: Unnecessary import statements for simple types
5. **File Proliferation**: Creates many small files that could be consolidated

### Preferred Approach: Co-locate Types

**✅ GOOD - Types with their usage:**

```typescript
// components/user-profile.tsx
interface User {
	id: string
	name: string
	email: string
}

type UserRole = "admin" | "user" | "guest"

export function UserProfile({ user }: { user: User }) {
	// Component implementation using User type
}
```

**✅ GOOD - Types in the same feature directory:**

```typescript
// features/user-management/api/user.router.ts
interface CreateUserRequest {
	name: string
	email: string
	role: UserRole
}

export const userRouter = createTRPCRouter({
	create: publicProcedure
		.input(
			z.object({
				name: z.string(),
				email: z.string().email(),
				role: z.enum(["admin", "user", "guest"]),
			})
		)
		.mutation(async ({ input }) => {
			// Implementation using CreateUserRequest type
		}),
})
```

**✅ GOOD - Shared types in the same module:**

```typescript
// features/user-management/lib/user.utils.ts
export interface User {
	id: string
	name: string
	email: string
}

export type UserRole = "admin" | "user" | "guest"

export function formatUserName(user: User): string {
	return user.name
}
```

### Exceptions

Separate type files are acceptable only when:

1. **Shared across multiple features** - Types used by 3+ different features
2. **Generated types** - Auto-generated from external APIs or schemas
3. **Database schemas** - Drizzle schema definitions
4. **API contracts** - OpenAPI/Swagger generated types
5. **Third-party integrations** - External service type definitions

### File Organization

- Put types in the same file as the component/function that uses them
- For shared types within a feature, put them in the feature's `lib/` directory
- For truly shared types across features, put them in `core/lib/types/`
- Use descriptive filenames that indicate the primary purpose, not just "types"

### Enforcement

- No `*.types.ts` files should exist
- No `types/` directories with only type definitions
- Types should be defined close to where they're first used
- Import types from the same file or nearby files when possible

---

**Remember:** Types are most valuable when they're close to the code that uses them, making the codebase more maintainable and easier to understand.
