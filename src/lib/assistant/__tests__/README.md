# AI Assistant Testing Notes

The AI-powered intent parser (`parseIntentWithAI`) uses Azure OpenAI and cannot be easily unit tested without:
1. Real Azure OpenAI credentials
2. Network calls to Azure
3. Non-deterministic LLM responses

## Testing Strategy

### Manual Testing
Test the assistant via the UI on `/pipeline/[pipelineId]`:
- Send various natural language commands
- Verify correct tool calls and proposals
- Test edge cases and ambiguous requests

### Integration Testing
If integration tests are added in the future, they should:
- Use environment variables for credentials
- Test via the Convex action (`convex/assistant.ts`)
- Verify end-to-end flow with real LLM calls
- Mark as integration tests (separate from unit tests)

### Test Cases to Verify Manually
- Sort commands: "sort by date desc", "sort by name asc then by age desc"
- Remove columns: "remove column notes", "remove columns id, temp, internal"
- Rename: "rename amount to total_amount"
- Deduplicate: "deduplicate", "deduplicate by id and date"
- Filter: "keep rows where age > 21", "remove rows where status contains draft"
- Reorder: "move step 3 up", "move step 2 below 4"
- Parse config: "set sheet Transactions", "rows 10-500", "has headers false"
- Ambiguous/unclear: "do something", "fix it"

## Fallback to Rule-Based Parser
If needed, a simple rule-based parser can be implemented as a fallback when:
- Azure OpenAI is unavailable
- API quota exceeded
- Environment variables not configured

However, the spec (Phase 2) requires LLM-based parsing as the primary implementation.
