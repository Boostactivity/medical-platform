/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(tabs)` | `/(tabs)/aide` | `/(tabs)/historique` | `/(tabs)/nuit` | `/(tabs)/profil` | `/_sitemap` | `/aide` | `/alerts` | `/auth/login` | `/auth/register` | `/historique` | `/nuit` | `/profil`;
      DynamicRoutes: `/night/${Router.SingleRoutePart<T>}`;
      DynamicRouteTemplate: `/night/[id]`;
    }
  }
}
