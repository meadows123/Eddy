# AI Chatbot Setup Guide

This guide will help you set up the AI-powered support chatbot for Eddy's Members.

## Overview

The chatbot uses:
- **Groq AI (Llama 3.1)** for AI responses (FREE tier available!)
- **Supabase Edge Functions** for the backend API
- **Supabase Database** for storing chat history
- **React** component for the frontend UI

## Prerequisites

1. Groq API account with API key (FREE - no credit card needed!)
2. Supabase project with Edge Functions enabled
3. Environment variables configured

## Setup Steps

### 1. Database Migration

Run the migration to create the chat tables:

```bash
# Using Supabase CLI
supabase migration up

# Or apply the SQL file directly in Supabase Dashboard
# Go to SQL Editor → New Query → Paste contents of:
# supabase/migrations/20250111000001_chat_system.sql
```

This creates:
- `chat_conversations` table - Stores conversation metadata
- `chat_messages` table - Stores individual messages
- RLS policies for security
- Indexes for performance

### 2. Deploy Supabase Edge Function

Deploy the AI chat function:

```bash
# Using Supabase CLI
supabase functions deploy ai-chat

# Or use the Supabase Dashboard:
# Go to Edge Functions → New Function → Upload the folder
```

### 3. Set Environment Variables

In your Supabase project, go to **Settings → Edge Functions → Secrets** and add:

```
GROQ_API_KEY=your_groq_api_key_here
ENABLE_CHAT_STORAGE=true
```

**Important**: 
- Replace `your_groq_api_key_here` with your actual Groq API key
- `ENABLE_CHAT_STORAGE=true` enables chat history (set to `false` to disable and save storage)

To get a Groq API key (FREE!):
1. Go to https://console.groq.com
2. Sign in or create an account (no credit card required!)
3. Navigate to API Keys section
4. Click "Create API Key"
5. Copy the key (save it securely)

### 4. Frontend Integration

The ChatBot component is already added to `App.jsx`. It will appear as a floating button in the bottom-right corner of all pages.

### 5. Test the Chatbot

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to any page on your site
3. Look for the chat icon in the bottom-right corner
4. Click it to open the chat
5. Send a test message

## Configuration

### Changing the AI Model

To use a different Groq model, edit `supabase/functions/ai-chat/index.ts`:

```typescript
// Current (fast and free)
model: 'llama-3.1-70b-versatile',

// Other free options on Groq:
// - 'llama-3.1-70b-versatile' (current - best balance)
// - 'llama-3.1-8b-instant' (faster, smaller)
// - 'mixtral-8x7b-32768' (good for longer context)
// - 'gemma-7b-it' (alternative option)
```

### Customizing the System Prompt

Edit the `SYSTEM_PROMPT` constant in `supabase/functions/ai-chat/index.ts` to change how the AI behaves:

```typescript
const SYSTEM_PROMPT = `Your custom instructions here...`;
```

### Styling the Chatbot

The chatbot uses your existing brand colors (`brand-burgundy`, `brand-cream`). To customize:

Edit `src/components/ChatBot.jsx` and modify the className values.

## Features

### Current Features

✅ **AI-Powered Responses** - Uses OpenAI for intelligent responses  
✅ **Chat History** - Saves conversations for logged-in users  
✅ **Minimize/Maximize** - Users can minimize the chat window  
✅ **Auto-scroll** - Automatically scrolls to new messages  
✅ **Loading States** - Shows loading indicators  
✅ **Error Handling** - Graceful error messages  
✅ **Responsive Design** - Works on mobile and desktop  

### User Experience

- **Logged-in users**: Chat history is saved and can be retrieved
- **Guest users**: Can still chat, but history isn't saved
- **Conversation continuity**: Maintains context within a conversation
- **Quick responses**: Optimized for fast response times

## Cost Considerations

### Groq Pricing (FREE Tier!)

**Good news!** Groq offers a completely free tier with generous limits:

- **Free Tier**: No credit card required!
- **Rate Limits**: 
  - Requests per minute: Varies (check dashboard)
  - Tokens per minute: Generous limits
  - Daily limits apply but are quite high

**Cost**: $0.00 for free tier usage! 🎉

### Free Tier Limits

The free tier is perfect for:
- Small to medium applications
- Prototyping and development
- Personal projects
- Most production apps with moderate traffic

### When You Might Need Paid

You'll only need to upgrade if:
- You exceed rate limits (very high traffic)
- You need priority support
- You need enterprise features

### Cost Optimization Tips

1. Already using free tier! ✅
2. Limit conversation history (currently 20 messages)
3. Set `max_tokens` to limit response length (currently 500)
4. Monitor usage in Groq dashboard
5. Groq is FAST - responses are typically under 1 second!

## Troubleshooting

### Chatbot Not Appearing

1. Check that `ChatBot` is imported in `App.jsx`
2. Verify the component is rendered in the JSX
3. Check browser console for errors

### "Failed to get AI response" Error

1. Verify `GROQ_API_KEY` is set in Supabase Edge Function secrets
2. Check Groq API key is valid (free tier has rate limits)
3. Check Supabase Edge Function logs for errors
4. Verify the function is deployed correctly
5. Check if you've hit Groq's free tier rate limits

### Messages Not Saving

1. Check user is logged in (history only saves for authenticated users)
2. Verify database migration was run successfully
3. Check RLS policies allow user access
4. Check Supabase logs for database errors

### Slow Responses

1. Check Groq API status (usually very fast!)
2. Groq is optimized for speed - responses are typically < 1 second
3. Check network connection
4. Review Edge Function logs for latency

## Security

### Row Level Security (RLS)

The chat system uses RLS to ensure:
- Users can only see their own conversations
- Users can only create messages in their own conversations
- No cross-user data leakage

### API Key Security

- OpenAI API key is stored in Supabase Edge Function secrets (encrypted)
- Never expose the API key in frontend code
- Use environment variables for all sensitive data

## Monitoring

### View Chat Analytics

You can query chat data in Supabase:

```sql
-- Total conversations
SELECT COUNT(*) FROM chat_conversations;

-- Messages per conversation
SELECT 
  conversation_id,
  COUNT(*) as message_count
FROM chat_messages
GROUP BY conversation_id;

-- Most active users
SELECT 
  user_email,
  COUNT(*) as conversation_count
FROM chat_conversations
WHERE user_email IS NOT NULL
GROUP BY user_email
ORDER BY conversation_count DESC;
```

### Groq Usage Dashboard

Monitor usage and rate limits at:
https://console.groq.com

Note: Free tier shows usage but no charges!

## Future Enhancements

Potential improvements:
- [ ] Admin dashboard for viewing all conversations
- [ ] Chat analytics and insights
- [ ] Support ticket creation from chat
- [ ] Multi-language support
- [ ] Voice input/output
- [ ] File upload support
- [ ] Integration with booking system for direct actions

## Support

If you encounter issues:
1. Check Supabase Edge Function logs
2. Check browser console for frontend errors
3. Verify all environment variables are set (GROQ_API_KEY)
4. Test Groq API key directly
5. Check Groq dashboard for rate limit status
6. Contact support@oneeddy.com

---

**Last Updated**: January 2025  
**Version**: 1.0
