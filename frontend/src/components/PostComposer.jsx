import React, { useState, useRef, useCallback } from 'react';
import { Image, FileType2, AlignLeft, Smile, CalendarClock, MapPin, ShieldAlert, ShieldCheck, Loader2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import * as nsfwjs from 'nsfwjs';
import { Web3Context } from '../context/Web3Context';
import { useContext } from 'react';
import { toast } from 'react-toastify';

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
  const { user, dbUser } = useAuth();
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [nsfwStatuses, setNsfwStatuses] = useState([]);
  const [checkingNsfw, setCheckingNsfw] = useState(false);
  const fileInputRef = useRef(null);
  const { account } = useContext(Web3Context);

  const handleFileChange = useCallback(async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    if (files.length + selectedFiles.length > 4) {
      toast.error("You can only upload up to 4 images per post.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setCheckingNsfw(true);
    
    const newFiles = [...files];
    const newStatuses = [...nsfwStatuses];

    for (const selected of selectedFiles) {
      if (selected.type.startsWith('image/')) {
        const result = await checkNsfw(selected);
        if (!result.blocked) {
          newFiles.push(selected);
          newStatuses.push(result);
        } else {
          toast.error(`Image ${selected.name} blocked: ${result.reason}`);
        }
      } else {
        newFiles.push(selected);
        newStatuses.push(null);
      }
    }

    setFiles(newFiles);
    setNsfwStatuses(newStatuses);
    setCheckingNsfw(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [files, nsfwStatuses]);

  const handleRemoveFile = (indexToRemove) => {
    setFiles(files.filter((_, i) => i !== indexToRemove));
    setNsfwStatuses(nsfwStatuses.filter((_, i) => i !== indexToRemove));
  };

  const handleSubmit = async () => {
    if (!content.trim() && files.length === 0) return;
    if (nsfwStatuses.some(s => s?.blocked)) return;
    
    const formData = new FormData();
    formData.append("content", content);
    files.forEach(f => formData.append("media", f));
    if (account) formData.append("walletAddress", account);

    try {
      const data = await apiFetch('/api/v1/posts', {
        method: 'POST',
        body: formData
      });
      if (data.success && onPostSubmit) onPostSubmit();
    } catch(err) { console.error("Failed to create post", err); }
    
    setContent(''); setFiles([]); setNsfwStatuses([]);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleInput = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = (e.target.scrollHeight) + 'px';
    setContent(e.target.value);
  };

  const isSubmitDisabled = (!content.trim() && files.length === 0) || nsfwStatuses.some(s => s?.blocked) || checkingNsfw;

  return (
    <div className="border-b border-gray-200 dark:border-zinc-800 p-4 pb-2">
      <div className="flex gap-4">
        <img src={dbUser?.avatar_url || user?.user_metadata?.avatar_url || "https://api.dicebear.com/7.x/micah/svg?seed=" + (dbUser?.username || user?.email?.split('@')[0])} onError={(e) => { e.target.onerror = null; e.target.src = "https://api.dicebear.com/7.x/micah/svg?seed=" + (dbUser?.username || user?.email?.split('@')[0]); }} alt="Avatar" className="w-10 h-10 bg-gray-200 dark:bg-zinc-700 rounded-full flex-shrink-0" />
        <div className="flex-grow flex flex-col pt-1">
          <textarea 
             className="w-full bg-transparent text-xl outline-none resize-none placeholder-gray-500 dark:placeholder-gray-500 text-gray-900 dark:text-white min-h-[40px] overflow-hidden" 
             placeholder="What is happening?!" 
             value={content} 
             onChange={handleInput} 
          />

          {/* File attachments grid */}
          {files.length > 0 && (
            <div className={`mt-2 grid gap-2 ${files.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {files.map((f, i) => {
                const url = URL.createObjectURL(f);
                return (
                  <div key={i} className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                    <img src={url} alt="upload preview" className="w-full h-auto object-cover max-h-48" />
                    <button 
                      onClick={() => handleRemoveFile(i)}
                      className="absolute top-2 right-2 bg-black/60 hover:bg-red-500/80 text-white rounded-full p-1 transition opacity-0 group-hover:opacity-100"
                    >
                      <X size={16} />
                    </button>
                    {nsfwStatuses[i]?.warning && (
                      <div className="absolute bottom-0 w-full bg-yellow-500/90 text-black text-xs font-bold p-1 text-center flex items-center justify-center gap-1">
                        <ShieldAlert size={12} /> 18+ Warning
                      </div>
                    )}
                    {nsfwStatuses[i]?.safe && (
                      <div className="absolute bottom-0 w-full bg-green-500/90 text-white text-xs font-bold p-1 text-center flex items-center justify-center gap-1">
                        <ShieldCheck size={12} /> Safe
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {checkingNsfw && (
            <div className="mt-2 flex items-center gap-2 text-sm text-yellow-500">
              <Loader2 size={16} className="animate-spin" /> Checking safety...
            </div>
          )}
          
          <div className="border-t border-gray-200 dark:border-zinc-800 pt-3 flex justify-between items-center mt-3">
            <div className="flex gap-1 text-blue-500">
              <input type="file" ref={fileInputRef} style={{display: 'none'}} onChange={handleFileChange} accept="image/*,video/*" multiple />
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
