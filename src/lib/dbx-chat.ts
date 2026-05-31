/**
 * @deprecated Re-export shim. The implementation moved to `@/lib/llm` in AI-001
 * (de-duplicated token cache + system prompt). Import from `@/lib/llm` instead.
 */

export {
  chatTreaty,
  askTreaty,
  type Role,
  type Message,
  type ChatOpts,
  type ChatResult,
} from "@/lib/llm/databricks-chat";
export { getToken } from "@/lib/llm/databricks-auth";
