# AI Assistant Testing Guide

This guide explains how to test the AI-powered pipeline assistant.

## Prerequisites

1. **Azure OpenAI Credentials**: You must have Azure OpenAI access with a deployed model
2. **Environment Configuration**: Create `.env.local` with:
   ```bash
   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
   AZURE_OPENAI_API_KEY=your-api-key-here
   AZURE_OPENAI_DEPLOYMENT=gpt-4o
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```

## Testing the Assistant

### 1. Navigate to a Pipeline
- Upload a CSV/Excel file
- Create or open a pipeline
- The AI Assistant panel appears on the right side of the screen

### 2. Test Basic Commands

#### Sort Operations
- **Single column**: `sort by date desc`
- **Multiple columns**: `sort by department asc then by salary desc`
- **With nulls**: `sort by age asc, nulls last`

#### Column Operations
- **Remove**: `remove column notes`
- **Remove multiple**: `remove columns id, temp, internal`
- **Rename**: `rename amount to total_amount`

#### Row Operations
- **Filter (keep)**: `keep rows where age > 21`
- **Filter (remove)**: `remove rows where status contains draft`
- **Deduplicate**: `deduplicate`
- **Deduplicate by columns**: `deduplicate by id, date`

#### Step Management
- **Move up**: `move step 3 up`
- **Move down**: `move step 2 down`
- **Move to position**: `move step 2 below 4`

#### Parse Configuration
- **Change sheet**: `set sheet Transactions`
- **Set row range**: `rows 10-500`
- **Set column range**: `columns 2-10`
- **Toggle headers**: `has headers false`

### 3. Expected Behavior

1. **User sends message**: Type command and press Enter or click Send
2. **AI processes**: "Thinking..." spinner appears
3. **Proposal shown**: Assistant displays human-readable summary
4. **Apply button**: Appears for actionable proposals (not clarifications)
5. **User confirms**: Click "Apply" to execute
6. **Preview updates**: Data table refreshes automatically
7. **Success message**: "✓ Applied successfully!" appears

### 4. Test Undo Functionality

1. Apply several commands via the assistant
2. Click the "↺ Undo" button in the header
3. Verify the pipeline reverts to the previous state
4. Multiple undos should work (full history)

### 5. Test Error Cases

#### Ambiguous Requests
- `"do something"` → Should ask for clarification
- `"fix it"` → Should request more specific instructions

#### Invalid Operations
- `"sort by nonexistent_column"` → AI should handle gracefully
- Complex multi-step requests → May need clarification

#### API Errors
- Disconnect network → Should show error message
- Invalid credentials → Should show error message

### 6. Test Edge Cases

- **Empty pipeline**: Commands should work on empty pipelines
- **Large pipelines**: Test with 10+ steps
- **Complex data**: Test with files having many columns (50+)
- **Collapsed panel**: Verify Hide/Show toggle works
- **Disabled state**: Verify assistant disables during data loading

## Common Issues

### Assistant not responding
- Check `.env.local` has correct Azure OpenAI credentials
- Verify deployment name matches your Azure resource
- Check browser console for errors

### Proposals not applying
- Check browser console for errors
- Verify the proposal format matches expected types
- Ensure the pipeline page has data loaded

### Undo not working
- Verify changes were made via the assistant (not manual dialogs)
- Check undo button is enabled (not disabled)

## Expected AI Behavior

### Strong Cases (High Success Rate)
- Simple, direct commands: "sort by X", "remove column Y"
- Standard operations: filter, deduplicate, rename
- Step reordering: "move step N up/down"

### Moderate Cases (May Need Clarification)
- Complex multi-column operations
- Ambiguous column names (e.g., "remove the ID column" when multiple ID columns exist)
- Multi-step requests in one command

### Weak Cases (Usually Requires Clarification)
- Vague requests: "make it better", "clean the data"
- Operations not supported by the system
- Requests outside the assistant's scope

## Manual Test Checklist

- [ ] Sort by single column (asc/desc)
- [ ] Sort by multiple columns
- [ ] Remove single column
- [ ] Remove multiple columns
- [ ] Rename column
- [ ] Deduplicate rows
- [ ] Filter rows (keep where X > Y)
- [ ] Filter rows (remove where X contains Y)
- [ ] Move step up
- [ ] Move step down
- [ ] Move step to specific position
- [ ] Change Excel sheet
- [ ] Set row range
- [ ] Set column range
- [ ] Toggle headers setting
- [ ] Undo last change
- [ ] Multiple consecutive undos
- [ ] Ambiguous request (expect clarification)
- [ ] Invalid request (expect error handling)
- [ ] Collapsed/expanded panel toggle
- [ ] Multiple operations in sequence

## Troubleshooting

### Azure OpenAI API Errors

**401 Unauthorized**
- Check API key is correct
- Verify key has not expired

**404 Not Found**
- Check endpoint URL format
- Verify deployment name exists in your Azure resource

**429 Rate Limit**
- Too many requests in short period
- Wait and try again
- Consider upgrading Azure quota

**500 Internal Server Error**
- Azure OpenAI service issue
- Check Azure portal for service status
- Try again later

## Next Steps

After successful manual testing:
1. Configure Azure OpenAI credentials in production environment
2. Monitor assistant usage and error rates
3. Collect user feedback on natural language understanding
4. Consider adding more example commands to welcome message
5. Add integration tests with mocked AI responses (future enhancement)
