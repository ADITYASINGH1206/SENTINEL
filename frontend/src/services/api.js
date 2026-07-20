import { supabase } from '../supabaseClient';

export const apiFetch = async (url, options = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    const headers = {
        ...options.headers,
    };
    
    if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const response = await fetch(`http://localhost:8000${url}`, {
        ...options,
        headers,
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
    }
    
    return response.json();
};
