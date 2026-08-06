// Vite's injected environment must be exposed before the application import
// graph evaluates configuration modules.
if (!(globalThis as any).importMetaEnv) {
  (globalThis as any).importMetaEnv = import.meta.env;
}
