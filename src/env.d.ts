/// <reference types="vite/client" />

// YAML files are parsed to plain objects at build time (vite.config.ts › yamlPlugin)
declare module '*.yaml' {
  const data: unknown;
  export default data;
}
