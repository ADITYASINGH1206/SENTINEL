import { supabase } from '../supabaseClient.js';

// Get active conversations for current user
export const getConversations = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Fetch conversations where user is a participant
        const { data: conversations, error: convError } = await supabase
            .from('conversations')
            .select('*')
            .contains('participants', [userId])
            .order('updated_at', { ascending: false });

        if (convError) throw convError;

        // Resolve participant metadata for each conversation
        const enrichedConversations = await Promise.all(conversations.map(async (conv) => {
            const otherParticipantIds = conv.participants.filter(id => id !== userId);
            
            // Get user info for other participants
            const { data: users, error: usersError } = await supabase
                .from('users')
                .select('id, username, display_name, avatar_url')
                .in('id', otherParticipantIds);
            
            return {
                ...conv,
                other_participants: users || []
            };
        }));

        res.json({ success: true, conversations: enrichedConversations });
    } catch (err) {
        console.error('Error fetching conversations:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// Get chat history for a conversation
export const getThread = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;
        
        // Ensure user is in conversation
        const { data: conv, error: convError } = await supabase
            .from('conversations')
            .select('participants')
            .eq('id', conversationId)
            .single();

        if (convError || !conv) throw new Error("Conversation not found");
        if (!conv.participants.includes(userId)) throw new Error("Unauthorized");

        const { data: messages, error: msgError } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (msgError) throw msgError;

        // Fetch senders manually due to missing FK constraint
        const senderIds = [...new Set(messages.map(m => m.sender_id))];
        const { data: users } = await supabase
            .from('users')
            .select('id, username, display_name, avatar_url')
            .in('id', senderIds);
        
        const userMap = {};
        if (users) {
            users.forEach(u => { userMap[u.id] = u; });
        }

        const enrichedMessages = messages.map(m => ({
            ...m,
            sender: userMap[m.sender_id] || { id: m.sender_id, username: 'Unknown', display_name: 'Unknown', avatar_url: null }
        }));

        res.json({ success: true, messages: enrichedMessages });
    } catch (err) {
        console.error('Error fetching thread:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// Send a message
export const sendMessage = async (req, res) => {
    try {
        const { recipientId, content } = req.body;
        const senderId = req.user.id;

        if (!recipientId || !content) {
            return res.status(400).json({ success: false, error: "Missing recipientId or content" });
        }

        // Try to find existing conversation
        let conversationId;
        const { data: existingConv, error: fetchError } = await supabase
            .from('conversations')
            .select('id')
            .contains('participants', [senderId])
            .contains('participants', [recipientId])
            .maybeSingle();

        if (existingConv) {
            conversationId = existingConv.id;
            
            // Update last_message and updated_at
            await supabase
                .from('conversations')
                .update({ last_message: content, updated_at: new Date() })
                .eq('id', conversationId);
        } else {
            // Create new conversation
            const { data: newConv, error: createError } = await supabase
                .from('conversations')
                .insert({ participants: [senderId, recipientId], last_message: content })
                .select('id')
                .single();
                
            if (createError) throw createError;
            conversationId = newConv.id;
        }

        // Insert message
        const { data: message, error: msgError } = await supabase
            .from('messages')
            .insert({ conversation_id: conversationId, sender_id: senderId, content })
            .select('*')
            .single();

        if (msgError) throw msgError;

        // Fetch sender manually due to missing FK constraint
        const { data: user } = await supabase
            .from('users')
            .select('id, username, display_name, avatar_url')
            .eq('id', senderId)
            .single();

        const enrichedMessage = {
            ...message,
            sender: user || { id: senderId, username: 'Unknown', display_name: 'Unknown', avatar_url: null }
        };

        res.json({ success: true, message: enrichedMessage });
    } catch (err) {
        console.error('Error sending message:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};
