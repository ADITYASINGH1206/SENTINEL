import React, { useState, useRef, useCallback } from 'react';
import { Image, FileType2, AlignLeft, Smile, CalendarClock, MapPin, ShieldAlert, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import * as nsfwjs from 'nsfwjs';

// ---------------------------------------------------------------------------
// nsfwjs client-side NSFW pre-check
// ---------------------------------------------------------------------------
let _nsfwModel = null;

async function getNsfwModel() {
  if (!_nsfwModel) {
    console.log('[nsfwjs] Loading NSFW model...');
    _nsfwModel = await nsfwjs.load();
    console.log('[nsfwjs] Model loaded.');
  }
  return _nsfwModel;
}

/**
 * Run nsfwjs on a File. Returns { safe, warning, blocked, predictions }.
 * - blocked: Porn/Hentai > 50% → block upload entirely
 * - warning: Sexy > 70% → allow but show 18+ warning
 * - safe: otherwise
 */
async function checkNsfw(file) {
  const model = await getNsfwModel();

  // Create an image element for nsfwjs
  const img = document.createElement('img');
  const url = URL.createObjectURL(file);
  
  return new Promise((resolve) => {
    img.onload = async () => {
      try {
        const predictions = await model.classify(img);
        console.log('[nsfwjs] Predictions:', predictions);

        const predMap = {};
        predictions.forEach(p => { predMap[p.className] = p.probability; });

        const pornConf = predMap['Porn'] || 0;
        const hentaiConf = predMap['Hentai'] || 0;
        const sexyConf = predMap['Sexy'] || 0;

        if (pornConf > 0.5 || hentaiConf > 0.5) {
          resolve({ safe: false, warning: false, blocked: true, predictions, reason: 'Explicit content detected' });
        } else if (sexyConf > 0.7) {
          resolve({ safe: false, warning: true, blocked: false, predictions, reason: 'This image may contain 18+ content' });
        } else {
          resolve({ safe: true, warning: false, blocked: false, predictions, reason: null });
        }
      } catch (err) {
        console.error('[nsfwjs] Classification error:', err);
        resolve({ safe: true, warning: false, blocked: false, predictions: [], reason: null });
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ safe: true, warning: false, blocked: false, predictions: [], reason: null });
    };
    img.src = url;
  });
}

// ---------------------------------------------------------------------------
// PostComposer
// ---------------------------------------------------------------------------
export default function PostComposer({ onPostSubmit }) {
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [nsfwStatus, setNsfwStatus] = useState(null); // null | { safe, warning, blocked, reason }
  const [checkingNsfw, setCheckingNsfw] = useState(false);
  const fileInputRef = useRef(null);
  const { user } = useAuth();

  const handleFileChange = useCallback(async (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    // Only check images
    if (selected.type.startsWith('image/')) {
      setCheckingNsfw(true);
      setNsfwStatus(null);
      setFile(selected);

      const result = await checkNsfw(selected);
      setNsfwStatus(result);
      setCheckingNsfw(false);

      if (result.blocked) {
        // Clear the file — don't allow upload
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } else {
      // Non-image files skip NSFW check
      setFile(selected);
      setNsfwStatus(null);
    }
  }, []);

  const handleSubmit = async () => {
    if (!content.trim() && !file) return;
    if (nsfwStatus?.blocked) return; // Extra guard
    
    const formData = new FormData();
    formData.append("content", content);
    if (file) formData.append("media", file);

    try {
      const data = await apiFetch('/api/v1/posts', {
        method: 'POST',
        body: formData
      });
      if (data.success && onPostSubmit) onPostSubmit();
    } catch(err) { console.error("Failed to create post", err); }
    
    setContent(''); setFile(null); setNsfwStatus(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleInput = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = (e.target.scrollHeight) + 'px';
    setContent(e.target.value);
  };

  const isSubmitDisabled = (!content.trim() && !file) || nsfwStatus?.blocked || checkingNsfw;

  return (
    <div className="border-b border-gray-200 dark:border-zinc-800 p-4 pb-2">
      <div className="flex gap-4">
        <img src={user?.user_metadata?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + user?.email} alt="Avatar" className="w-10 h-10 bg-gray-200 dark:bg-zinc-700 rounded-full flex-shrink-0" />
        <div className="flex-grow flex flex-col pt-1">
          <textarea 
             className="w-full bg-transparent text-xl outline-none resize-none placeholder-gray-500 dark:placeholder-gray-500 text-gray-900 dark:text-white min-h-[40px] overflow-hidden" 
             placeholder="What is happening?!" 
             value={content} 
             onChange={handleInput} 
          />

          {/* File attachment + NSFW status */}
          {file && (
            <div className="mt-2 flex items-center gap-2">
              <p className="text-sm text-blue-500 font-bold">Attached: {file.name}</p>
              {checkingNsfw && (
                <span className="flex items-center gap-1 text-xs text-yellow-500">
                  <Loader2 size={14} className="animate-spin" /> Checking...
                </span>
              )}
            </div>
          )}

          {/* NSFW warning banner */}
          {nsfwStatus?.warning && (
            <div className="mt-2 p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 flex items-center gap-2">
              <ShieldAlert size={16} className="text-yellow-500 flex-shrink-0" />
              <p className="text-xs text-yellow-700 dark:text-yellow-300">{nsfwStatus.reason}. It will be labeled as 18+ sensitive content.</p>
            </div>
          )}

          {/* NSFW blocked banner */}
          {nsfwStatus?.blocked && (
            <div className="mt-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-2">
              <ShieldAlert size={16} className="text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-700 dark:text-red-300">{nsfwStatus.reason}. This image cannot be uploaded.</p>
            </div>
          )}

          {/* Safe badge (only show after check completes with no issues) */}
          {nsfwStatus?.safe && file && (
            <div className="mt-2 flex items-center gap-1 text-xs text-green-500">
              <ShieldCheck size={14} /> Image passed safety check
            </div>
          )}
          
          <div className="border-t border-gray-200 dark:border-zinc-800 pt-3 flex justify-between items-center mt-3">
            <div className="flex gap-1 text-blue-500">
              <input type="file" ref={fileInputRef} style={{display: 'none'}} onChange={handleFileChange} accept="image/*,video/*" />
              <button onClick={() => fileInputRef.current?.click()} className="hover:bg-blue-50 dark:hover:bg-blue-500/10 p-2 rounded-full transition" title="Media"><Image size={20} /></button>
              <button className="hover:bg-blue-50 dark:hover:bg-blue-500/10 p-2 rounded-full transition" title="GIF"><FileType2 size={20} /></button>
              <button className="hover:bg-blue-50 dark:hover:bg-blue-500/10 p-2 rounded-full transition hidden sm:block" title="Poll"><AlignLeft size={20} /></button>
              <button className="hover:bg-blue-50 dark:hover:bg-blue-500/10 p-2 rounded-full transition" title="Emoji"><Smile size={20} /></button>
              <button className="hover:bg-blue-50 dark:hover:bg-blue-500/10 p-2 rounded-full transition hidden sm:block" title="Schedule"><CalendarClock size={20} /></button>
              <button className="hover:bg-blue-50 dark:hover:bg-blue-500/10 p-2 rounded-full transition hidden sm:block" title="Location"><MapPin size={20} /></button>
            </div>
            <button onClick={handleSubmit} disabled={isSubmitDisabled} className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-1.5 px-4 rounded-full transition">
              {checkingNsfw ? 'Checking...' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
