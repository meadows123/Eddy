-- Add retention policy for chat conversations
-- This will automatically delete old conversations to save storage

-- Function to delete old conversations and their messages
CREATE OR REPLACE FUNCTION cleanup_old_chat_conversations()
RETURNS void AS $$
BEGIN
  -- Delete conversations older than 30 days (adjust as needed)
  -- This also cascades to delete all messages in those conversations
  DELETE FROM chat_conversations
  WHERE updated_at < NOW() - INTERVAL '30 days';
  
  -- Log the cleanup (optional)
  RAISE NOTICE 'Cleaned up old chat conversations';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup (requires pg_cron extension)
-- Note: This requires Supabase Pro plan or you can run manually
-- To run manually, execute: SELECT cleanup_old_chat_conversations();

-- Alternative: Create a trigger that prevents storing too many messages per conversation
CREATE OR REPLACE FUNCTION limit_conversation_messages()
RETURNS TRIGGER AS $$
DECLARE
  message_count INTEGER;
BEGIN
  -- Count messages in this conversation
  SELECT COUNT(*) INTO message_count
  FROM chat_messages
  WHERE conversation_id = NEW.conversation_id;
  
  -- If more than 50 messages, delete the oldest ones (keep last 50)
  IF message_count > 50 THEN
    DELETE FROM chat_messages
    WHERE conversation_id = NEW.conversation_id
    AND id IN (
      SELECT id FROM chat_messages
      WHERE conversation_id = NEW.conversation_id
      ORDER BY created_at ASC
      LIMIT (message_count - 50)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to limit messages per conversation
CREATE TRIGGER limit_messages_per_conversation
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION limit_conversation_messages();

-- Add index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated_at_cleanup 
ON chat_conversations(updated_at) 
WHERE updated_at < NOW() - INTERVAL '30 days';
