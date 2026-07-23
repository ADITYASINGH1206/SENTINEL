import React, { useState, useRef } from 'react';
import { Image, FileType2, AlignLeft, Smile, CalendarClock, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { Web3Context } from '../context/Web3Context';
import { useContext } from 'react';

export default function PostComposer({ onPostSubmit }) {
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  const { user } = useAuth();
  const { account } = useContext(Web3Context);

  const handleSubmit = async () => {
    if (!content.trim() && !file) return;
    
    const formData = new FormData();
    formData.append("content", content);
    if (file) formData.append("media", file);
    if (account) formData.append("walletAddress", account);

    try {
      const data = await apiFetch('/api/v1/posts', {
        method: 'POST',
        body: formData
      });
      if (data.success && onPostSubmit) onPostSubmit();
    } catch(err) { console.error("Failed to create post", err); }
    
    setContent(''); setFile(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleInput = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = (e.target.scrollHeight) + 'px';
    setContent(e.target.value);
  };

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
          {file && <p className="text-sm text-blue-500 font-bold mt-2">Attached: {file.name}</p>}
          
          <div className="border-t border-gray-200 dark:border-zinc-800 pt-3 flex justify-between items-center mt-3">
            <div className="flex gap-1 text-blue-500">
              <input type="file" ref={fileInputRef} style={{display: 'none'}} onChange={(e) => setFile(e.target.files[0])} />
              <button onClick={() => fileInputRef.current?.click()} className="hover:bg-blue-50 dark:hover:bg-blue-500/10 p-2 rounded-full transition" title="Media"><Image size={20} /></button>
              <button className="hover:bg-blue-50 dark:hover:bg-blue-500/10 p-2 rounded-full transition" title="GIF"><FileType2 size={20} /></button>
              <button className="hover:bg-blue-50 dark:hover:bg-blue-500/10 p-2 rounded-full transition hidden sm:block" title="Poll"><AlignLeft size={20} /></button>
              <button className="hover:bg-blue-50 dark:hover:bg-blue-500/10 p-2 rounded-full transition" title="Emoji"><Smile size={20} /></button>
              <button className="hover:bg-blue-50 dark:hover:bg-blue-500/10 p-2 rounded-full transition hidden sm:block" title="Schedule"><CalendarClock size={20} /></button>
              <button className="hover:bg-blue-50 dark:hover:bg-blue-500/10 p-2 rounded-full transition hidden sm:block" title="Location"><MapPin size={20} /></button>
            </div>
            <button onClick={handleSubmit} disabled={!content.trim() && !file} className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-1.5 px-4 rounded-full transition">Post</button>
          </div>
        </div>
      </div>
    </div>
  );
}
