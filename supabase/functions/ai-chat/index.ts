import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// System prompt for the AI assistant
const SYSTEM_PROMPT = `You are a helpful customer support assistant for Eddy's Members, a premium venue booking platform in Lagos, Nigeria.

Your role is to help users with:
- Booking questions and assistance
- Account management
- Payment and refund inquiries
- Split payment features
- Venue information
- Technical support
- General platform questions

COMMON QUESTIONS AND ANSWERS:

1. "How do I make a booking?"
   - Browse venues on the platform
   - Select a venue and choose a table
   - Pick your date and time
   - Enter your details and payment information
   - Confirm your booking
   - You'll receive a confirmation email with a QR code for venue entry

2. "How does split payment work?"
   - When checking out, choose "Split Payment" option
   - Enter the number of people splitting the cost
   - Pay your portion
   - Share payment links with others via email
   - Each person pays their share
   - Booking is confirmed once all payments are received

3. "Can I cancel my booking?"
   - Yes! Go to "My Bookings" in your profile
   - Click on the booking you want to cancel
   - Click "Cancel Booking"
   - Full refunds available for cancellations more than 24 hours before booking time
   - For cancellations within 24 hours, contact support@oneeddy.com

4. "How do I update my profile?"
   - Go to your Profile page
   - Click "Edit Profile"
   - Update your information
   - Click "Save Changes"

5. "What are venue credits?"
   - Prepaid funds you can purchase for faster bookings
   - Use credits to pay for bookings instantly
   - Purchase credits from your Wallet section
   - Credits are venue-specific

6. "What is the refund policy?"
   - Full refunds for cancellations made more than 24 hours before booking
   - Cancellations within 24 hours require contacting support
   - Refunds are processed automatically for eligible cancellations

7. "How do I use my referral code?"
   - Enter your referral code during checkout
   - Discounts are applied automatically
   - Referral codes can provide perks and discounts

8. "How do I contact support?"
   - Email: support@oneeddy.com
   - You can also use this chat for assistance
   - For urgent matters, email is the fastest option

GUIDELINES:
- Be friendly, professional, and concise
- Provide step-by-step instructions when helpful
- If you don't know something specific about a user's account or booking, direct them to contact support at support@oneeddy.com
- Always be helpful and aim to resolve issues quickly
- Use Nigerian Naira (₦) when mentioning prices
- Keep responses clear and actionable`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Groq API key from environment
    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    if (!groqApiKey) {
      throw new Error('GROQ_API_KEY is not set')
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from auth header
    const authHeader = req.headers.get('authorization')
    let userId = null
    let userEmail = null

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (!error && user) {
        userId = user.id
        userEmail = user.email
      }
    }

    // Parse request body
    const { message, conversationId, history } = await req.json()

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Get conversation history from database if conversationId exists
    let conversationHistory = history || []
    
    if (conversationId && userId) {
      const { data: messages, error: historyError } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(20) // Last 20 messages for context

      if (!historyError && messages) {
        conversationHistory = messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      }
    }

    // Build messages array for Groq
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory,
      { role: 'user', content: message }
    ]

    // Call Groq API (Free tier available!)
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile', // Fast and free model on Groq
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    if (!groqResponse.ok) {
      const errorData = await groqResponse.text()
      console.error('Groq API error:', errorData)
      throw new Error('Failed to get AI response')
    }

    const aiData = await groqResponse.json()
    const aiMessage = aiData.choices[0]?.message?.content || 'I apologize, but I encountered an error. Please try again or contact support@oneeddy.com'

    // Generate or get conversation ID
    let finalConversationId = conversationId
    if (!finalConversationId && userId) {
      const { data: newConversation, error: convError } = await supabase
        .from('chat_conversations')
        .insert([{
          user_id: userId,
          user_email: userEmail,
        }])
        .select()
        .single()

      if (!convError && newConversation) {
        finalConversationId = newConversation.id
      }
    }

    // Save messages to database if user is authenticated and storage is enabled
    // Set ENABLE_CHAT_STORAGE=false in Supabase secrets to disable storage
    const enableStorage = Deno.env.get('ENABLE_CHAT_STORAGE') !== 'false'
    
    if (enableStorage && userId && finalConversationId) {
      // Save user message
      await supabase
        .from('chat_messages')
        .insert([{
          conversation_id: finalConversationId,
          role: 'user',
          content: message,
          user_id: userId,
        }])

      // Save AI response
      await supabase
        .from('chat_messages')
        .insert([{
          conversation_id: finalConversationId,
          role: 'assistant',
          content: aiMessage,
          user_id: userId,
        }])

      // Update conversation updated_at
      await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', finalConversationId)
    }

    return new Response(
      JSON.stringify({
        message: aiMessage,
        conversationId: finalConversationId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in AI chat function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred while processing your request',
        message: 'I apologize, but I encountered an error. Please try again or contact support@oneeddy.com for assistance.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
