import type { H3Event } from 'h3';
import type { SSRContext as VueSsrContext } from 'vue/server-renderer';

export interface IslandClientResponse {
  html: string;
  props: unknown;
  chunk: string;
  slots?: Record<string, string>;
}

export interface IslandContext {
  id?: string;
  name: string;
  props?: Record<string, any>;
  url?: string;
  components: Record<string, Omit<IslandClientResponse, 'html'>>;
}

export interface SSRContext extends VueSsrContext {
  islandContext?: IslandContext;
  teleports?: Record<string, string>;
  event: H3Event;
}
