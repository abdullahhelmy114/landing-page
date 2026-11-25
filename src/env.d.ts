// WebAssembly codecs imported as precompiled modules (Workers cannot compile WebAssembly at run
// time); see src/lib/cms/images/wasm.server.ts.
declare module "*.wasm?module" {
  const wasmModule: WebAssembly.Module;
  export default wasmModule;
}

// Public build-time variables (see .env.example). Declared so they can be read as
// process.env.NEXT_PUBLIC_*, the form Next.js inlines into the build.
declare namespace NodeJS {
  interface ProcessEnv {
    readonly NEXT_PUBLIC_UMAMI_WEBSITE_ID?: string;
    readonly NEXT_PUBLIC_UMAMI_SRC?: string;
  }
}
