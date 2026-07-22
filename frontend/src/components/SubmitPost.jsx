import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Send, Loader2 } from 'lucide-react';

export default function SubmitPost({ account, onPostSubmitted }) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!account) {
      toast.error("Please connect your wallet to submit content.");
      return;
    }
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('http://localhost:8000/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: account, content })
      });
      const data = await response.json();
      
      if (data.success) {
        toast.info(`🤖 AI Verdict: ${data.post.aiResult.verdict.toUpperCase()} (Confidence: ${data.post.aiResult.confidence})`);
        setContent('');
        if (onPostSubmitted) onPostSubmitted();
      } else {
        toast.error(data.error || "Failed to submit post.");
      }
    } catch (error) {
      toast.error("Error submitting post: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl shadow-lg mb-6">
      <form onSubmit={handleSubmit}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste an article or link to verify its authenticity..."
          className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors resize-none h-24"
          disabled={isSubmitting}
        />
        <div className="flex justify-end mt-3">
          <button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : <Send size={16} />}
            Submit to Sentinel
          </button>
        </div>
      </form>
    </div>
  );
}
