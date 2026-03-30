export function withStructuredContent<T extends Record<string, unknown>>(value: T): T & {
  structuredContent: T;
} {
  return {
    ...value,
    structuredContent: { ...value },
  };
}
