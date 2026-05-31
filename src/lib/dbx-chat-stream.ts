/**
 * @deprecated Re-export shim. The implementation moved to `@/lib/llm` in AI-001
 * (de-duplicated token cache shared with the non-streaming client). Import from
 * `@/lib/llm` instead.
 */

export {
  chatTreatyStream,
  type StreamEvent,
  type StreamOpts,
  type Message,
} from "@/lib/llm/databricks-chat";
