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

export interface SSRContext {
  islandContext: IslandContext;
}
