import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, SkipForward, SkipBack, Search, 
  Music, Music2, Youtube, Library, Settings, 
  Volume2, Heart, ListMusic, Plus, ExternalLink,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './utils';
import { smartSearch, SmartSearchResult } from './services/geminiService';

interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  cover: string;
  duration: number;
  platform: 'spotify' | 'apple_music' | 'youtube' | 'local';
}

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SmartSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'library' | 'search' | 'settings' | 'local'>('library');
  const [spotifyUser, setSpotifyUser] = useState<any>(null);
  const [localTracks, setLocalTracks] = useState<Track[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock data for initial view
  const [recentTracks] = useState<Track[]>([
    {
      id: '1',
      title: 'Midnight City',
      artist: 'M83',
      album: 'Hurry Up, We\'re Dreaming',
      cover: 'https://picsum.photos/seed/m83/400/400',
      duration: 243,
      platform: 'spotify'
    },
    {
      id: '2',
      title: 'Starboy',
      artist: 'The Weeknd',
      album: 'Starboy',
      cover: 'https://picsum.photos/seed/weeknd/400/400',
      duration: 230,
      platform: 'apple_music'
    }
  ]);

  useEffect(() => {
    fetch('/api/spotify/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => setSpotifyUser(data));
  }, []);

  const handleSpotifyLogin = async () => {
    const res = await fetch('/api/auth/spotify/url');
    const { url } = await res.json();
    const popup = window.open(url, 'spotify_auth', 'width=600,height=700');
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.provider === 'spotify') {
        fetch('/api/spotify/me').then(res => res.json()).then(data => setSpotifyUser(data));
      }
    };
    window.addEventListener('message', handleMessage);
  };

  const handleSmartSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setActiveTab('search');
    try {
      const results = await smartSearch(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/local/upload', {
        method: 'POST',
        body: formData,
      });
      const newTrack = await res.json();
      setLocalTracks(prev => [...prev, {
        ...newTrack,
        cover: 'https://picsum.photos/seed/local/400/400',
        duration: 180,
        album: 'Local Uploads'
      }]);
    } catch (error) {
      console.error("Upload failed", error);
    }
  };

  return (
    <div className="relative h-screen w-screen flex overflow-hidden font-sans">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="atmosphere absolute inset-0" />
      </div>

      {/* Sidebar */}
      <nav className="w-64 glass border-r border-white/5 flex flex-col z-10">
        <div className="p-8">
          <h1 className="text-2xl font-serif italic tracking-tight flex items-center gap-2">
            <Music2 className="text-orange-500" />
            Harmony
          </h1>
        </div>

        <div className="flex-1 px-4 space-y-2">
          <SidebarItem 
            icon={<Library size={20} />} 
            label="Library" 
            active={activeTab === 'library'} 
            onClick={() => setActiveTab('library')}
          />
          <SidebarItem 
            icon={<Music size={20} />} 
            label="Local Files" 
            active={activeTab === 'local'} 
            onClick={() => setActiveTab('local')}
          />
          <SidebarItem 
            icon={<Search size={20} />} 
            label="Smart Search" 
            active={activeTab === 'search'} 
            onClick={() => setActiveTab('search')}
          />
          <SidebarItem 
            icon={<Settings size={20} />} 
            label="Settings" 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')}
          />

          <div className="pt-8 pb-4">
            <p className="px-4 text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold">Platforms</p>
          </div>
          <PlatformItem 
            icon={<Music size={16} />} 
            label="Spotify" 
            connected={!!spotifyUser} 
            onClick={handleSpotifyLogin}
          />
          <PlatformItem 
            icon={<Music2 size={16} />} 
            label="Apple Music" 
            connected={false} 
          />
          <PlatformItem 
            icon={<Youtube size={16} />} 
            label="YouTube Music" 
            connected={false} 
          />
        </div>

        <div className="p-6">
          {spotifyUser && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
              <img src={spotifyUser.images?.[0]?.url} className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
              <div className="overflow-hidden">
                <p className="text-xs font-medium truncate">{spotifyUser.display_name}</p>
                <p className="text-[10px] text-white/40">Spotify Connected</p>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative z-10 overflow-hidden">
        {/* Header / Search */}
        <header className="p-8 flex justify-between items-center">
          <form onSubmit={handleSmartSearch} className="relative w-full max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
            <input 
              type="text" 
              placeholder="Ask Gemini to find music..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-12 pr-4 focus:outline-none focus:border-orange-500/50 transition-colors text-sm"
            />
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-white/10 transition-colors">
              <Sparkles size={16} className="text-orange-500" />
            </button>
          </form>
        </header>

        <div className="flex-1 overflow-y-auto px-8 pb-32">
          <AnimatePresence mode="wait">
            {activeTab === 'library' && (
              <motion.div 
                key="library"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                <section>
                  <h2 className="text-4xl font-serif italic mb-6">Recently Played</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {recentTracks.map(track => (
                      <TrackCard key={track.id} track={track} onClick={() => setCurrentTrack(track)} />
                    ))}
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-serif italic">Your Playlists</h2>
                    <button className="text-xs uppercase tracking-widest text-white/40 hover:text-white flex items-center gap-2">
                      <Plus size={14} /> Create New
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PlaylistCard title="Late Night Vibes" count={42} />
                    <PlaylistCard title="Focus & Flow" count={128} />
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'local' && (
              <motion.div 
                key="local"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-4xl font-serif italic">Local Library</h2>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-orange-500 hover:bg-orange-600 px-6 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <Plus size={18} /> Add Files
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="audio/*"
                    onChange={handleFileUpload}
                  />
                </div>

                {localTracks.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {localTracks.map(track => (
                      <TrackCard key={track.id} track={track} onClick={() => setCurrentTrack(track)} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-32 border-2 border-dashed border-white/5 rounded-3xl">
                    <Music size={48} className="mx-auto mb-4 text-white/10" />
                    <p className="text-white/40">No local tracks found. Start by adding some music from your machine.</p>
                  </div>
                )}
              </motion.div>
            )}
            {activeTab === 'search' && (
              <motion.div 
                key="search"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="text-orange-500" />
                  <h2 className="text-3xl font-serif italic">Gemini Smart Search</h2>
                </div>

                {isSearching ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-12 h-12 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-white/40 animate-pulse">Gemini is curating your results...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-4">
                    {searchResults.map((result, i) => (
                      <SearchResultItem key={i} result={result} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 text-white/20">
                    <Search size={48} className="mx-auto mb-4 opacity-10" />
                    <p>Try searching for "Chill electronic music for coding" or "90s hip hop classics"</p>
                  </div>
                )}
              </motion.div>
            )}
            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8 max-w-2xl"
              >
                <h2 className="text-4xl font-serif italic">Settings</h2>
                
                <div className="space-y-6">
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                    <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                      <Settings size={20} className="text-white/40" />
                      Configuration Guide
                    </h3>
                    <div className="space-y-4 text-sm text-white/60 leading-relaxed">
                      <p>To fully enable all platforms, you'll need to set up the following environment variables in your AI Studio secrets:</p>
                      
                      <div className="space-y-3">
                        <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                          <p className="font-mono text-xs text-orange-500 mb-1">SPOTIFY_CLIENT_ID / SECRET</p>
                          <p className="text-[11px]">Get these from the <a href="https://developer.spotify.com/dashboard" target="_blank" className="underline hover:text-white">Spotify Developer Dashboard</a>. Add <code>{window.location.origin}/api/auth/spotify/callback</code> as a redirect URI.</p>
                        </div>
                        
                        <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                          <p className="font-mono text-xs text-pink-500 mb-1">APPLE_MUSIC_DEVELOPER_TOKEN</p>
                          <p className="text-[11px]">Required for MusicKit JS integration. Generate this in your Apple Developer account.</p>
                        </div>

                        <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                          <p className="font-mono text-xs text-red-500 mb-1">YOUTUBE_API_KEY</p>
                          <p className="text-[11px]">Get this from the <a href="https://console.cloud.google.com/" target="_blank" className="underline hover:text-white">Google Cloud Console</a> with YouTube Data API v3 enabled.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                    <h3 className="text-lg font-medium mb-4">Appearance</h3>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-white/60">Atmospheric Background</p>
                      <div className="w-10 h-5 bg-orange-500 rounded-full relative">
                        <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Player Bar */}
      <footer className="fixed bottom-0 left-0 right-0 h-24 glass border-t border-white/5 z-20 px-8 flex items-center justify-between">
        <div className="flex items-center gap-4 w-1/3">
          {currentTrack ? (
            <>
              <img src={currentTrack.cover} className="w-14 h-14 rounded-lg shadow-2xl" referrerPolicy="no-referrer" />
              <div className="overflow-hidden">
                <h4 className="font-medium truncate">{currentTrack.title}</h4>
                <p className="text-xs text-white/40 truncate">{currentTrack.artist}</p>
              </div>
              <button className="ml-2 text-white/40 hover:text-orange-500 transition-colors">
                <Heart size={18} />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-4 opacity-20">
              <div className="w-14 h-14 bg-white/10 rounded-lg" />
              <div className="space-y-2">
                <div className="w-24 h-3 bg-white/10 rounded" />
                <div className="w-16 h-2 bg-white/10 rounded" />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-2 w-1/3">
          <div className="flex items-center gap-6">
            <button className="text-white/40 hover:text-white transition-colors"><SkipBack size={20} /></button>
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
            >
              {isPlaying ? <Pause size={24} fill="black" /> : <Play size={24} fill="black" className="ml-1" />}
            </button>
            <button className="text-white/40 hover:text-white transition-colors"><SkipForward size={20} /></button>
          </div>
          <div className="w-full max-w-md flex items-center gap-3">
            <span className="text-[10px] text-white/40 font-mono">0:00</span>
            <div className="flex-1 h-1 bg-white/10 rounded-full relative group cursor-pointer">
              <div className="absolute inset-0 bg-orange-500 w-1/3 rounded-full group-hover:bg-orange-400" />
              <div className="absolute top-1/2 -translate-y-1/2 left-1/3 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-[10px] text-white/40 font-mono">3:45</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 w-1/3">
          <button className="text-white/40 hover:text-white"><ListMusic size={18} /></button>
          <div className="flex items-center gap-2 w-32">
            <Volume2 size={18} className="text-white/40" />
            <div className="flex-1 h-1 bg-white/10 rounded-full">
              <div className="h-full bg-white/40 w-2/3 rounded-full" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group",
        active ? "bg-white/10 text-white" : "text-white/40 hover:text-white hover:bg-white/5"
      )}
    >
      <span className={cn("transition-colors", active ? "text-orange-500" : "group-hover:text-orange-500/50")}>
        {icon}
      </span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function PlatformItem({ icon, label, connected, onClick }: { icon: React.ReactNode, label: string, connected: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-2 rounded-lg hover:bg-white/5 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <span className="text-white/20 group-hover:text-white/40 transition-colors">{icon}</span>
        <span className="text-xs font-medium text-white/40 group-hover:text-white/60">{label}</span>
      </div>
      <div className={cn(
        "w-1.5 h-1.5 rounded-full",
        connected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-white/10"
      )} />
    </button>
  );
}

const TrackCard: React.FC<{ track: Track, onClick: () => void }> = ({ track, onClick }) => {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      onClick={onClick}
      className="group cursor-pointer"
    >
      <div className="relative aspect-square mb-4 overflow-hidden rounded-2xl shadow-2xl">
        <img src={track.cover} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-transform">
            <Play size={24} fill="white" className="ml-1" />
          </div>
        </div>
        <div className="absolute top-3 right-3">
          {track.platform === 'spotify' && <Music size={14} className="text-emerald-500" />}
          {track.platform === 'apple_music' && <Music2 size={14} className="text-pink-500" />}
        </div>
      </div>
      <h4 className="font-medium truncate group-hover:text-orange-500 transition-colors">{track.title}</h4>
      <p className="text-xs text-white/40 truncate">{track.artist}</p>
    </motion.div>
  );
}

function PlaylistCard({ title, count }: { title: string, count: number }) {
  return (
    <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xl font-serif italic mb-1 group-hover:text-orange-500 transition-colors">{title}</h4>
          <p className="text-xs text-white/40 uppercase tracking-widest">{count} Tracks</p>
        </div>
        <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:border-orange-500/50 transition-colors">
          <Play size={16} className="text-white/40 group-hover:text-orange-500 transition-colors" />
        </div>
      </div>
    </div>
  );
}

const SearchResultItem: React.FC<{ result: SmartSearchResult }> = ({ result }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
          <Music size={20} className="text-white/20" />
        </div>
        <div>
          <h4 className="font-medium">{result.title}</h4>
          <p className="text-xs text-white/40">{result.artist} • <span className="italic text-orange-500/60">{result.reason}</span></p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[10px] uppercase tracking-widest text-white/20 font-bold group-hover:text-white/40 transition-colors">
          {result.platform.replace('_', ' ')}
        </span>
        <button className="p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors">
          <ExternalLink size={16} />
        </button>
      </div>
    </motion.div>
  );
}
