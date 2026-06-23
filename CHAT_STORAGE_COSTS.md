# Chat Storage Costs & Optimization

## Storage Cost Analysis

### Actual Storage Size

**Per Message:**
- UUID: 16 bytes
- conversation_id: 16 bytes  
- user_id: 16 bytes (nullable)
- role: ~20 bytes
- content: ~200-500 bytes (average message)
- created_at: 8 bytes
- **Total: ~300-600 bytes per message**

**Per Conversation:**
- UUID: 16 bytes
- user_id: 16 bytes
- user_email: ~50 bytes
- timestamps: 16 bytes
- **Total: ~100 bytes per conversation**

### Real-World Examples

**Small App (1,000 users, 10 conversations each):**
- 10,000 conversations × 100 bytes = 1 MB
- 100,000 messages (10 per conversation) × 500 bytes = 50 MB
- **Total: ~51 MB**

**Medium App (10,000 users, 5 conversations each):**
- 50,000 conversations × 100 bytes = 5 MB
- 500,000 messages × 500 bytes = 250 MB
- **Total: ~255 MB**

**Large App (100,000 users, 3 conversations each):**
- 300,000 conversations × 100 bytes = 30 MB
- 3,000,000 messages × 500 bytes = 1.5 GB
- **Total: ~1.53 GB**

### Supabase Storage Costs

**Free Tier:**
- 500 MB database storage included
- Perfect for small to medium apps

**Pro Plan ($25/month):**
- 8 GB database storage included
- Additional storage: $0.125 per GB/month

**Cost Example:**
- 1.53 GB storage = **$0.19/month** (if over free tier)
- Very affordable!

## Storage Optimization Features

We've implemented several optimizations to minimize storage:

### 1. Auto-Deletion Policy ✅

Old conversations are automatically deleted after **30 days** (configurable).

**Migration:** `20250111000002_chat_retention_policy.sql`

To run cleanup manually:
```sql
SELECT cleanup_old_chat_conversations();
```

### 2. Message Limit Per Conversation ✅

Each conversation keeps only the **last 50 messages**. Older messages are automatically deleted when the limit is exceeded.

### 3. Optional Storage ✅

You can completely disable chat storage to save costs:

**In Supabase Dashboard:**
1. Go to **Settings → Edge Functions → Secrets**
2. Add: `ENABLE_CHAT_STORAGE=false`
3. Chat will work but won't save history

**Note:** Without storage, users won't see chat history when they return.

### 4. Guest Users Don't Store ✅

Only authenticated users have their chats stored. Guest users' conversations are not saved.

## Recommended Settings

### For Small Apps (Free Tier)
- ✅ Enable storage (fits in free tier)
- ✅ 30-day retention
- ✅ 50 messages per conversation limit
- **Cost: $0/month**

### For Medium Apps
- ✅ Enable storage
- ✅ 30-day retention (or 14 days to save more)
- ✅ 50 messages per conversation limit
- **Cost: $0-5/month** (usually still free tier)

### For Large Apps (Cost-Conscious)
- Option 1: Disable storage (`ENABLE_CHAT_STORAGE=false`)
  - **Cost: $0/month**
  - Users won't see history
  
- Option 2: Shorter retention (7-14 days)
  - **Cost: ~$0-10/month**
  - Users see recent history only

- Option 3: Lower message limit (20-30 messages)
  - **Cost: ~$0-15/month**
  - Users see recent messages only

## How to Configure

### Change Retention Period

Edit `supabase/migrations/20250111000002_chat_retention_policy.sql`:

```sql
-- Change from 30 days to 14 days
WHERE updated_at < NOW() - INTERVAL '14 days';
```

Then re-run the migration.

### Change Message Limit

Edit the same file:

```sql
-- Change from 50 to 30 messages
IF message_count > 30 THEN
  -- Keep last 30 instead of 50
  LIMIT (message_count - 30)
```

### Disable Storage Completely

1. Go to Supabase Dashboard
2. **Settings → Edge Functions → Secrets**
3. Add: `ENABLE_CHAT_STORAGE=false`
4. Redeploy the Edge Function

## Monitoring Storage

### Check Current Storage Usage

```sql
-- Total conversations
SELECT COUNT(*) FROM chat_conversations;

-- Total messages
SELECT COUNT(*) FROM chat_messages;

-- Storage size estimate
SELECT 
  pg_size_pretty(pg_total_relation_size('chat_conversations')) as conversations_size,
  pg_size_pretty(pg_total_relation_size('chat_messages')) as messages_size;
```

### Check Old Conversations

```sql
-- Conversations older than 30 days
SELECT COUNT(*) 
FROM chat_conversations 
WHERE updated_at < NOW() - INTERVAL '30 days';
```

## Best Practices

1. **Start with storage enabled** - It's very cheap
2. **Monitor usage** - Check monthly
3. **Adjust retention** - Based on actual usage
4. **Use cleanup function** - Run weekly/monthly
5. **Consider disabling** - Only if you have 100k+ users

## Cost Comparison

| Feature | Storage | Cost/Month |
|---------|---------|------------|
| No storage | 0 MB | $0 |
| 30-day retention | ~50-500 MB | $0 (free tier) |
| 14-day retention | ~25-250 MB | $0 (free tier) |
| 7-day retention | ~12-125 MB | $0 (free tier) |

## Conclusion

**Storage costs are minimal!** Even for large apps, chat storage typically costs less than $10/month. The optimizations we've added ensure you only store what's necessary.

**Recommendation:** Keep storage enabled with 30-day retention. It provides a better user experience and costs almost nothing.
