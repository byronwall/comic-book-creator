/// <reference types="@solidjs/start/env" />

declare module "solid-js" {
  namespace JSX {
    interface ExplicitProperties {
      value: string;
    }
  }
}

export {};
