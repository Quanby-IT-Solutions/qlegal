---
description: Tailwind CSS size utility preference
globs: ["**/*.tsx", "**/*.jsx", "**/*.ts", "**/*.js"]
alwaysApply: true
---

# Tailwind CSS Size Utility Guidelines

## Rule: Use `size-*` for Square Dimensions

**Guideline 1:** Use Tailwind's `size-*` utility classes instead of separate `w-*` and `h-*` when width and height are the same.

**Examples:**

- `size-4` instead of `w-4 h-4`
- `size-6` instead of `w-6 h-6`
- `size-8` instead of `w-8 h-8`
- `size-12` instead of `w-12 h-12`

**Guideline 2:** Only use separate `w-*` and `h-*` classes when the width and height values are different.

**Guideline 3:** This applies to all size values including responsive variants like `md:size-6`, `lg:size-8`, etc.
