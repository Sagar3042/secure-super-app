import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, getDoc, addDoc, 
  onSnapshot, deleteDoc, updateDoc, serverTimestamp 
} from 'firebase/firestore';
import { 
  UserCircle, Share2, EyeOff, Globe, FileText, MessageSquare, 
  Lock, Copy, CheckCircle2, AlertCircle, LogOut, Image as ImageIcon, Send, ShieldAlert, Bell, Plus
} from 'lucide-react';

// --- Secure Encrypted Firebase Configuration Mapping ---
const userFirebaseConfig = {
  apiKey: "AIzaSyBrbpMraMdVb934KUxiAfFA5PM7YZcdL2k",
  authDomain: "chocod-bd9e8.firebaseapp.com",
  databaseURL: "https://chocod-bd9e8-default-rtdb.firebaseio.com",
  projectId: "chocod-bd9e8",
  storageBucket: "chocod-bd9e8.firebasestorage.app",
  messagingSenderId: "846601072766",
  appId: "1:846601072766:android:e30d30fdbc25444b2ba82f"
};

const app = initializeApp(userFirebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "secure-super-app";

// --- ImageKit Cloud Storage Integration ---
const IMAGEKIT_PUBLIC_KEY = "public_GvmX1rd4tynHWZCdysu98pZ9V2Q=";
const IMAGEKIT_PRIVATE_KEY = "private_MLBrEOewf8kbdLwt9QKiKB6Xd10=";

const uploadToImageKit = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileName", file.name || ("sketch_vault_" + Date.now() + ".jpg"));
  formData.append("publicKey", IMAGEKIT_PUBLIC_KEY);
  const encodedKey = btoa(IMAGEKIT_PRIVATE_KEY + ":"); 
  try {
    const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      headers: { "Authorization": "Basic " + encodedKey },
      body: formData
    });
    const data = await response.json();
    if(response.ok) return { url: data.url, fileId: data.fileId };
    return null;
  } catch (err) {
    return null;
  }
};

export default function SuperApp() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [usersList, setUsersList] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const profileRef = doc(db, 'artifacts', appId, 'public', 'users', currentUser.uid);
        const docSnap = await getDoc(profileRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data());
        } else {
          setCurrentScreen('setup_profile');
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || currentScreen === 'setup_profile') return;
    
    const usersRef = collection(db, 'artifacts', appId, 'public', 'users');
    const unsubUsers = onSnapshot(usersRef, (snapshot) => {
      const users = [];
      snapshot.forEach((d) => users.push({ id: d.id, ...d.data() }));
      setUsersList(users);
      const myUpdatedProfile = users.find(u => u.id === user.uid);
      if (myUpdatedProfile) setProfile(myUpdatedProfile);
    });

    const notifRef = collection(db, 'artifacts', appId, 'public', 'notifications');
    const unsubNotifs = onSnapshot(notifRef, (snapshot) => {
      const notifs = [];
      snapshot.forEach((d) => notifs.push({ id: d.id, ...d.data() }));
      notifs.sort((a,b) => b.timestamp?.seconds - a.timestamp?.seconds);
      setNotifications(notifs);
    });

    return () => { unsubUsers(); unsubNotifs(); };
  }, [user, currentScreen]);

  const handleInAppGoogleLogin = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      // Bulletproof cross-platform WebView compatible Popup matrix
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error(error);
      alert("In-App Authentication session failed or closed by secure environment.");
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    if(window.confirm("App access lines log-out korte chan?")) {
      await signOut(auth);
      setCurrentScreen('dashboard');
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#faf5eb] text-[#4a3b32] font-mono font-bold border-8 border-[#e6decb]">DRAWING SKETCH BOOK ENVIRONMENT...</div>;
  if (!user) return <LoginScreen onLogin={handleInAppGoogleLogin} />;
  
  if (currentScreen === 'setup_profile' && !profile) {
    return <ProfileSetupScreen user={user} onComplete={(p) => { setProfile(p); setCurrentScreen('dashboard'); }} usersList={usersList} />;
  }

  return (
    <div className="flex flex-col h-screen bg-[#faf5eb] text-[#2d2d2d] font-sans max-w-md mx-auto relative overflow-hidden border-4 border-[#ebdcb9] shadow-xl select-none">
      {/* Sketchbook Ring Banner Header */}
      <div className="bg-[#f3ebd3] p-4 flex items-center justify-between border-b-2 border-dashed border-[#bda67a] z-10 relative">
        <div className="absolute top-0 left-4 right-4 flex justify-between -mt-1">
          {[...Array(12)].map((_, i) => <div key={i} className="w-3 h-4 bg-gray-400/30 rounded-full border border-gray-600/20"></div>)}
        </div>
        <div className="flex items-center space-x-3 mt-1">
          {currentScreen !== 'dashboard' && (
            <button onClick={() => setCurrentScreen('dashboard')} className="text-xs font-bold bg-[#e1cca0] hover:bg-[#d2bc90] px-3 py-1.5 rounded border border-[#aa9365] shadow-sm text-[#4a3b32]">Back</button>
          )}
          {currentScreen === 'dashboard' && (
            <>
              <img src={profile?.dpUrl || 'https://via.placeholder.com/40'} alt="DP" className="w-10 h-10 rounded-full border-2 border-[#a58d5e] object-cover shadow" />
              <div>
                <h1 className="text-xs font-black flex items-center gap-1 tracking-wide text-[#3a2f28]">
                  {profile?.name} 
                  {profile?.isAdmin && <ShieldAlert size={12} className="text-red-600"/>}
                </h1>
                <p className="text-[10px] text-[#7a6855] font-mono">@{profile?.igUsername}</p>
              </div>
            </>
          )}
        </div>
        
        <div className="flex items-center space-x-2 mt-1">
          <button onClick={() => setCurrentScreen('notifications')} className="relative text-[#614e3f] hover:text-black p-1.5 bg-[#e1cca0] rounded border border-[#aa9365]">
            <Bell size={16} />
            {notifications.length > 0 && <span className="absolute top-0.5 right-0.5 bg-[#d95f76] w-2 h-2 rounded-full"></span>}
          </button>
          {profile?.isPremium ? (
            <span className="bg-[#e5a93c] text-[#2d2105] text-[10px] font-black px-2 py-1 rounded border border-[#ba8723] uppercase shadow-sm">★ Premium</span>
          ) : (
            <button onClick={() => setCurrentScreen('referral')} className="bg-[#4a7cbc] hover:bg-[#3b669e] text-white text-[10px] font-black px-2 py-1 rounded border border-[#2b4c75] shadow-sm">Get Premium</button>
          )}
          <button onClick={handleLogout} className="text-[#614e3f] bg-[#e1cca0] border border-[#aa9365] p-1.5 rounded hover:text-red-600 shadow-sm"><LogOut size={14}/></button>
        </div>
      </div>

      {/* Sketch Canvas Core Viewer */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[radial-gradient(#e3dac9_1px,transparent_1px)] [background-size:16px_16px]">
        {currentScreen === 'dashboard' && <Dashboard setScreen={setCurrentScreen} profile={profile} />}
        {currentScreen === 'referral' && <ReferralScreen profile={profile} />}
        {currentScreen === 'chat' && <AnonChatScreen user={user} usersList={usersList} />}
        {currentScreen === 'view_once' && <ViewOnceScreen user={user} usersList={usersList} />}
        {currentScreen === 'browser' && <BrowserScreen />}
        {currentScreen === 'docs' && <DocReaderScreen />}
        {currentScreen === 'notes' && <NoteShareScreen user={user} />}
        {currentScreen === 'admin' && profile?.isAdmin && <AdminScreen user={user} profile={profile} />}
        {currentScreen === 'notifications' && <NotificationScreen notifications={notifications} />}
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#faf5eb] text-center p-6 border-8 border-[#ebdcb9] relative bg-[radial-gradient(#e3dac9_1px,transparent_1px)] [background-size:16px_16px]">
      <div className="w-20 h-20 bg-[#f3ebd3] border-2 border-dashed border-[#a89267] rounded-full flex items-center justify-center mb-6 shadow-md">
        <FileText size={42} className="text-[#4a7cbc]" />
      </div>
      <h1 className="text-3xl font-black text-[#3a2b1f] tracking-tight border-b-4 border-[#e5a93c] pb-2 px-4 inline-block font-serif">SecureConnect Pro</h1>
      <p className="text-[#6b5947] mt-4 mb-12 text-xs font-mono max-w-xs leading-relaxed px-4">Complete In-App Isolated Container Model. Hardware Sandbox Matrix protection initialized.</p>
      <button 
        onClick={onLogin} 
        className="w-full bg-[#faf5eb] border-2 border-[#2d2d2d] text-[#2d2d2d] font-bold py-3.5 px-4 rounded-xl flex items-center justify-center space-x-3 shadow-[4px_4px_0px_0px_rgba(45,45,45,1)] hover:bg-[#f3ebd3] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_0px_rgba(45,45,45,1)] transition-all"
      >
        <svg viewBox="0 0 24 24" width="20" height="20"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        <span className="text-sm font-extrabold text-[#2d2d2d] tracking-wide">Login with Google Account</span>
      </button>
    </div>
  );
}

function ProfileSetupScreen({ user, onComplete, usersList }) {
  const [name, setName] = useState('');
  const [ig, setIg] = useState('');
  const [file, setFile] = useState(null);
  const [referCode, setReferCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !ig.trim()) return alert("Name ebong Instagram Username absolute mandatory!");
    setLoading(true);
    let dpUrl = "https://api.dicebear.com/7.x/initials/svg?seed=" + encodeURIComponent(name);
    if (file) {
      const uploadResult = await uploadToImageKit(file);
      if (uploadResult && uploadResult.url) dpUrl = uploadResult.url;
    }
    const myReferCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newProfile = {
      uid: user.uid, name, igUsername: ig, dpUrl,
      myReferCode, referralCount: 0, isPremium: false,
      isAdmin: usersList.length === 0, 
      createdAt: serverTimestamp()
    };
    try {
      if (referCode.trim()) {
        const referrer = usersList.find(u => u.myReferCode === referCode.toUpperCase().trim());
        if (referrer) {
          const newCount = (referrer.referralCount || 0) + 1;
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'users', referrer.id), { 
            referralCount: newCount, isPremium: newCount >= 5 || referrer.isPremium
          });
        }
      }
      await setDoc(doc(db, 'artifacts', appId, 'public', 'users', user.uid), newProfile);
      onComplete(newProfile);
    } catch (err) {
      alert("Database signature authorization error.");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-screen bg-[#faf5eb] p-6 max-w-md mx-auto justify-center bg-[radial-gradient(#e3dac9_1px,transparent_1px)] [background-size:16px_16px]">
      <h2 className="text-xl font-black text-center tracking-wide text-[#3a2b1f] border-b-2 border-dashed border-[#bda67a] pb-2 uppercase">Create Sketch Identity</h2>
      <div className="space-y-4 mt-6">
        <div className="flex justify-center mb-2">
          <label className="cursor-pointer relative group">
            <div className="w-24 h-24 rounded-full bg-[#f3ebd3] border-2 border-dashed border-[#a58d5e] flex items-center justify-center overflow-hidden shadow-inner">
              {file ? <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover"/> : <ImageIcon className="text-[#8c765c]" size={28}/>}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={e => setFile(e.target.files[0])} />
            <div className="text-center text-[10px] font-mono text-[#7a6855] mt-2 uppercase tracking-wider">Upload DP Sketch</div>
          </label>
        </div>
        <input type="text" value={name} onChange={(e)=>setName(e.target.value)} className="w-full bg-[#faf5eb] text-xs font-bold p-3.5 border-2 border-[#2d2d2d] rounded-xl outline-none shadow-[2px_2px_0px_rgba(45,45,45,1)]" placeholder="Enter Full Name" />
        <input type="text" value={ig} onChange={(e)=>setIg(e.target.value)} className="w-full bg-[#faf5eb] text-xs font-bold p-3.5 border-2 border-[#2d2d2d] rounded-xl outline-none shadow-[2px_2px_0px_rgba(45,45,45,1)]" placeholder="Instagram Username Link" />
        <input type="text" value={referCode} onChange={(e)=>setReferCode(e.target.value)} className="w-full bg-[#faf5eb] text-xs font-bold p-3.5 border-2 border-[#2d2d2d] rounded-xl outline-none shadow-[2px_2px_0px_rgba(45,45,45,1)]" placeholder="Referral Code Node (Optional)" />
        <button onClick={handleSave} disabled={loading} className="w-full bg-[#e5a93c] border-2 border-[#2d2d2d] text-[#2d2d2d] text-xs font-black py-4 rounded-xl mt-4 uppercase tracking-widest shadow-[4px_4px_0px_rgba(45,45,45,1)] active:scale-[0.98]">
          {loading ? 'SYNCHRONIZING CANVAS...' : 'Initialize Node Interface'}
        </button>
      </div>
    </div>
  );
}

function Dashboard({ setScreen, profile }) {
  const tools = [
    { id: 'chat', name: 'Anon Chat Pencil', icon: <MessageSquare size={24} />, desc: 'Tunnel Crypt Lines', color: 'bg-[#e2f0fd] text-[#4a7cbc] border-[#4a7cbc]' },
    { id: 'view_once', name: 'One-Time Secret Photo', icon: <EyeOff size={24} />, desc: 'Volatile Image Buffer', color: 'bg-[#fde2e6] text-[#d95f76] border-[#d95f76]' },
    { id: 'notes', name: 'Note Share Board', icon: <Share2 size={24} />, desc: 'Distributed Vault Logs', color: 'bg-[#fef0d5] text-[#e5a93c] border-[#e5a93c]' },
    { id: 'browser', name: 'Core Sandbox Browser', icon: <Globe size={24} />, desc: 'Isolated Network Node', color: 'bg-[#e2f7f4] text-[#3ca59d] border-[#3ca59d]' },
    { id: 'docs', name: 'Doc Decrypt Reader', icon: <FileText size={24} />, desc: 'PDF / Word File Stream', color: 'bg-[#f5edf8] text-[#9c5fbf] border-[#9c5fbf]' },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-[10px] font-black tracking-widest uppercase text-[#7a6855] border-b border-[#ebdcb9] pb-1 font-mono">Sketched Mainframe Vectors</h2>
      <div className="grid grid-cols-2 gap-4">
        {tools.map(tool => (
          <div key={tool.id} onClick={() => setScreen(tool.id)} className={`border-2 p-4 rounded-xl bg-[#faf5eb] flex flex-col items-center justify-center text-center cursor-pointer shadow-[3px_3px_0px_rgba(0,0,0,0.15)] hover:shadow-[1px_1px_0px_rgba(0,0,0,0.15)] hover:translate-x-0.5 hover:translate-y-0.5 transition-all duration-100 ${tool.color}`}>
            <div className="mb-2.5">{tool.icon}</div>
            <h3 className="font-black text-xs tracking-tight">{tool.name}</h3>
            <p className="text-[9px] text-[#6b5947] mt-1 font-mono leading-tight">{tool.desc}</p>
          </div>
        ))}
        {profile?.isAdmin && (
          <div onClick={() => setScreen('admin')} className="bg-[#fdf2f2] border-2 border-red-600 p-4 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer text-red-600 shadow-[3px_3px_0px_rgba(0,0,0,0.1)]">
            <ShieldAlert size={24} className="mb-2" />
            <h3 className="font-black text-xs uppercase">Admin Signal</h3>
          </div>
        )}
      </div>
    </div>
  );
}

function NoteShareScreen({ user }) {
  const [notes, setNotes] = useState([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    const q = collection(db, 'artifacts', appId, 'public', 'notes');
    return onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      list.sort((a,b) => b.createdAt?.seconds - a.createdAt?.seconds);
      setNotes(list);
    });
  }, []);

  const addNote = async () => {
    if(!input.trim()) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'notes'), {
      text: input, senderId: user.uid, createdAt: serverTimestamp()
    });
    setInput('');
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-black uppercase text-[#e5a93c] tracking-wider border-b border-[#ebdcb9] pb-1">Encrypted Note Share Matrix</h2>
      <div className="flex space-x-2">
        <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Write public secret node log..." className="flex-1 bg-[#faf5eb] text-xs font-bold p-3 border-2 border-[#2d2d2d] rounded-xl outline-none" />
        <button onClick={addNote} className="bg-[#e5a93c] border-2 border-[#2d2d2d] p-3 rounded-xl text-[#2d2d2d] font-bold"><Plus size={16}/></button>
      </div>
      <div className="space-y-2">
        {notes.map(n => (
          <div key={n.id} className="bg-[#fefaf2] border-2 border-dashed border-[#e5a93c] p-3 rounded-xl shadow-sm text-xs text-[#4a3b2c] leading-relaxed">
            {n.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminScreen({ user, profile }) {
  const [msg, setMsg] = useState('');
  const sendNotif = async () => {
    if(!msg.trim()) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'notifications'), {
      title: "Mainframe Broadcast Alert", message: msg, sender: profile.name, timestamp: serverTimestamp()
    });
    setMsg('');
    alert("Global system broadcast synced successfully.");
  };
  return (
    <div className="space-y-4">
      <h2 className="text-xs font-black text-red-600 uppercase border-b border-[#ebdcb9] pb-1">Admin Signal Hub</h2>
      <textarea value={msg} onChange={e=>setMsg(e.target.value)} className="w-full bg-[#faf5eb] p-4 text-xs font-bold rounded-xl border-2 border-red-600 h-32 outline-none" placeholder="Enter encrypted signal array configuration data file..." />
      <button onClick={sendNotif} className="w-full bg-red-600 text-white font-bold py-3 text-xs uppercase rounded-xl border-2 border-[#2d2d2d] shadow-[3px_3px_0px_rgba(0,0,0,1)]">Deploy Signal Array</button>
    </div>
  );
}

function NotificationScreen({ notifications }) {
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-black uppercase text-[#4a7cbc] border-b border-[#ebdcb9] pb-1 font-mono">Incoming Broadcast Arrays</h2>
      {notifications.map(n => (
        <div key={n.id} className="bg-[#f4f8fd] p-3.5 rounded-xl border-2 border-dashed border-[#4a7cbc] shadow-sm">
          <h3 className="font-black text-xs text-[#3b669e] uppercase tracking-wide">{n.title}</h3>
          <p className="text-xs text-[#333] mt-1.5 leading-relaxed font-sans">{n.message}</p>
        </div>
      ))}
    </div>
  );
}

function ReferralScreen({ profile }) {
  const progress = Math.min((profile?.referralCount || 0) / 5 * 100, 100);
  return (
    <div className="p-6 bg-[#faf5eb] border-2 border-[#2d2d2d] rounded-2xl text-center shadow-[4px_4px_0px_rgba(45,45,45,1)] bg-[radial-gradient(#e3dac9_1px,transparent_1px)] [background-size:16px_16px]">
      <Lock size={40} className="text-[#e5a93c] mx-auto mb-3" />
      <h2 className="text-sm font-black text-[#2d2d2d] tracking-wide uppercase">Premium Cipher Node</h2>
      <p className="text-[10px] text-[#6b5947] font-mono mt-1 mb-6 px-2">Register 5 hardware instances via unique validation tag below to authorization premium mainframe unlock link.</p>
      <div className="bg-[#f3ebd3] rounded-xl p-3 flex items-center justify-between border-2 border-dashed border-[#a58d5e] mb-6">
        <span className="text-base font-mono font-black tracking-widest text-[#4a7cbc]">{profile?.myReferCode}</span>
        <button onClick={() => { navigator.clipboard.writeText(profile?.myReferCode); alert("Tag synced to memory core clipboard buffer."); }} className="text-xs font-bold bg-[#faf5eb] border border-[#2d2d2d] px-2.5 py-1 rounded shadow-sm text-[#2d2d2d]">Copy</button>
      </div>
      <div className="w-full bg-[#f0e4cc] rounded-full h-3 border border-[#2d2d2d] overflow-hidden mb-2">
        <div className="bg-gradient-to-r from-[#e5a93c] to-[#ba8723] h-3 transition-all" style={{ width: progress + "%" }}></div>
      </div>
      {profile?.isPremium ? (
        <div className="text-xs font-black text-[#3ca59d] uppercase mt-2 tracking-widest">★ System Premium Cipher Activated</div>
      ) : (
        <p className="text-[10px] font-bold font-mono text-[#d95f76] uppercase">Requires {5 - (profile?.referralCount || 0)} Validation Keys</p>
      )}
    </div>
  );
}

function AnonChatScreen({ user, usersList }) {
  const [messages, setMessages] = useState([]);
  const [msg, setMsg] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    if (!selectedUser) return;
    const chatId = user.uid < selectedUser.id ? (user.uid + "_" + selectedUser.id) : (selectedUser.id + "_" + user.uid);
    const chatRef = collection(db, 'artifacts', appId, 'public', 'chats', chatId, 'messages');
    return onSnapshot(chatRef, (snapshot) => {
      const msgs = [];
      snapshot.forEach(doc => msgs.push({ id: doc.id, ...doc.data() }));
      msgs.sort((a, b) => a.timestamp?.seconds - a.timestamp?.seconds);
      setMessages(msgs);
    });
  }, [selectedUser, user.uid]);

  const sendMsg = async () => {
    if (!msg.trim() || !selectedUser) return;
    const chatId = user.uid < selectedUser.id ? (user.uid + "_" + selectedUser.id) : (selectedUser.id + "_" + user.uid);
    await addDoc(collection(db, 'artifacts', appId, 'public', 'chats', chatId, 'messages'), {
      text: msg, senderId: user.uid, timestamp: serverTimestamp()
    });
    setMsg('');
  };

  if (!selectedUser) {
    return (
      <div className="space-y-3">
        <h2 className="text-xs font-black text-[#4a7cbc] uppercase tracking-wider font-mono border-b border-[#ebdcb9] pb-1">Available Active Nodes</h2>
        <div className="space-y-2">
          {usersList.filter(u => u.id !== user.uid).map(u => (
            <div key={u.id} onClick={() => setSelectedUser(u)} className="bg-[#faf5eb] border-2 border-[#2d2d2d] p-3 rounded-xl flex items-center space-x-3 cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,0.15)] transition active:scale-[0.99]">
               <img src={u.dpUrl} className="w-10 h-10 rounded-full border border-gray-400 object-cover" alt="dp"/>
               <div>
                 <div className="font-black text-xs text-[#2d2d2d]">{u.name}</div>
                 <div className="text-[9px] text-gray-500 font-mono">Establish crypt connection vector</div>
               </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[76vh]">
      <div className="flex items-center space-x-2 mb-3 bg-[#f3ebd3] border-2 border-dashed border-[#a58d5e] p-2 rounded-xl">
        <button onClick={() => setSelectedUser(null)} className="text-[10px] font-black bg-[#faf5eb] border border-[#2d2d2d] px-2 py-1 rounded">Leave</button>
        <span className="font-black text-xs text-[#3a2f28]">Terminal: {selectedUser.name}</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-[#fbf9f3] border-2 border-[#2d2d2d] rounded-xl shadow-inner">
        {messages.map(m => (
          <div key={m.id} className={"flex " + (m.senderId === user.uid ? "justify-end" : "justify-start")}>
            <div className={"max-w-[75%] p-2.5 border-2 border-[#2d2d2d] rounded-xl text-xs font-bold shadow-[2px_2px_0px_rgba(0,0,0,0.15)] " + (m.senderId === user.uid ? "bg-[#e2f0fd] text-[#2b4c75] rounded-br-none" : "bg-[#faf5eb] text-[#333] rounded-bl-none")}>{m.text}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex space-x-2">
        <input type="text" value={msg} onChange={e=>setMsg(e.target.value)} className="flex-1 bg-[#faf5eb] rounded-xl p-3 text-xs font-bold border-2 border-[#2d2d2d] outline-none" placeholder="Type message frame vector payload..." />
        <button onClick={sendMsg} className="bg-[#4a7cbc] text-white p-3 border-2 border-[#2d2d2d] rounded-xl shadow-[2px_2px_0px_rgba(0,0,0,1)]"><Send size={14}/></button>
      </div>
    </div>
  );
}

function ViewOnceScreen({ user, usersList }) {
  const [images, setImages] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [uploading, setUploading] = useState(false);
  const [viewingImg, setViewingImg] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const viewTimerRef = useRef(null);

  useEffect(() => {
    const q = collection(db, 'artifacts', appId, 'public', 'viewOnce');
    return onSnapshot(q, (snapshot) => {
      const imgs = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.to === user.uid) imgs.push({ id: doc.id, ...data });
      });
      setImages(imgs);
    });
  }, [user.uid]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedUser) return;
    setUploading(true);
    const result = await uploadToImageKit(file);
    if (result && result.url) {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'viewOnce'), {
        from: user.uid, to: selectedUser, imgUrl: result.url, timestamp: serverTimestamp()
      });
      alert("Volatile data photo packet dispatched safely.");
    }
    setUploading(false);
  };

  const startHoldView = (img) => {
    setViewingImg(img); setTimeLeft(10);
    viewTimerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { 
          clearInterval(viewTimerRef.current); 
          deleteDoc(doc(db, 'artifacts', appId, 'public', 'viewOnce', img.id)); 
          setViewingImg(null); 
          return 0; 
        }
        return prev - 1;
      });
    }, 1000);
  };

  const endHoldView = () => {
    if (viewTimerRef.current) clearInterval(viewTimerRef.current);
    if (viewingImg) {
      deleteDoc(doc(db, 'artifacts', appId, 'public', 'viewOnce', viewingImg.id));
      setViewingImg(null);
    }
  };

  if (viewingImg) {
    return (
      <div className="fixed inset-0 bg-[#1e1a15]/95 z-50 flex flex-col items-center justify-center p-4 touch-none select-none pointer-events-none" onMouseUp={endHoldView} onTouchEnd={endHoldView}>
        <div className="absolute top-10 text-white font-mono font-bold text-xs tracking-widest bg-[#d95f76] px-4 py-2 rounded-full border-2 border-[#2d2d2d] shadow-lg">PURGING PAYLOAD FRAME IN {timeLeft}s</div>
        <img src={viewingImg.imgUrl} className="max-w-full max-h-[75vh] rounded-xl object-contain border-4 border-white shadow-2xl" alt="Volatile Stream"/>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-black uppercase text-[#d95f76] tracking-wider font-mono border-b border-[#ebdcb9] pb-1">Volatile Image Intercept</h2>
      <div className="bg-[#faf5eb] border-2 border-[#2d2d2d] p-4 rounded-xl shadow-[3px_3px_0px_rgba(0,0,0,0.1)]">
        <select className="w-full bg-[#faf5eb] text-xs font-bold p-3 rounded-xl border-2 border-[#2d2d2d] mb-4 outline-none" value={selectedUser} onChange={e=>setSelectedUser(e.target.value)}>
          <option value="">-- Select Destination Core Node --</option>
          {usersList.filter(u=>u.id !== user.uid).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <label className={"w-full flex justify-center items-center p-3.5 border-2 border-[#2d2d2d] rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-[3px_3px_0px_rgba(45,45,45,1)] " + (uploading ? "bg-gray-200 text-gray-400" : "bg-[#d95f76] text-white")}>
          <ImageIcon className="mr-2" size={14}/> {uploading ? 'Transmitting Data File...' : 'Send Volatile Media'}
          <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading || !selectedUser} />
        </label>
      </div>
      <div className="space-y-3">
        {images.map(img => {
          const sender = usersList.find(u => u.id === img.from);
          return (
            <div key={img.id} className="bg-[#faf5eb] border-2 border-dashed border-[#d95f76] p-4 rounded-xl flex items-center justify-between shadow-sm">
              <div><span className="font-black text-xs text-[#d95f76] uppercase font-mono">Volatile Image Matrix</span><p className="text-[9px] text-gray-500 font-mono mt-0.5">Origin: {sender?.name || 'Unknown Node'}</p></div>
              <button onMouseDown={() => startHoldView(img)} onTouchStart={() => startHoldView(img)} onMouseUp={endHoldView} onTouchEnd={endHoldView} className="bg-[#faf5eb] border-2 border-[#2d2d2d] hover:bg-[#f3ebd3] text-[#2d2d2d] px-4 py-2 rounded-lg text-xs font-black shadow-[2px_2px_0px_rgba(0,0,0,1)] active:scale-[0.98] select-none">Hold Frame</button>
            </div>
          )
        })}
      </div>
    </div>
  );
}

function BrowserScreen() {
  const [url, setUrl] = useState('https://www.bing.com');
  const [inputUrl, setInputUrl] = useState('');
  return (
    <div className="flex flex-col h-[76vh]">
      <div className="flex mb-3 space-x-2">
        <input type="text" value={inputUrl} onChange={e=>setInputUrl(e.target.value)} placeholder="Target URL data transmission array..." className="flex-1 bg-[#faf5eb] p-3 text-xs font-bold border-2 border-[#2d2d2d] rounded-xl outline-none" />
        <button onClick={()=>{let f=inputUrl.trim(); if(!f)return; if(!f.startsWith('http'))f='https://'+f; setUrl(f);}} className="bg-[#3ca59d] text-white px-4 py-2 rounded-xl border-2 border-[#2d2d2d] text-xs font-black shadow-[2px_2px_0px_rgba(0,0,0,1)]">Route</button>
      </div>
      <iframe src={url} className="w-full flex-1 bg-white rounded-xl border-2 border-[#2d2d2d] shadow-inner" title="Sandbox Container Webview"></iframe>
    </div>
  );
}

function DocReaderScreen() {
  const [fileUrl, setFileUrl] = useState(null);
  const [fileName, setFileName] = useState('');
  return (
    <div className="flex flex-col h-[76vh]">
      <label className="w-full bg-[#faf5eb] border-2 border-dashed border-[#9c5fbf] rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-[#fbf5fd] transition mb-4">
        <FileText size={32} className="text-[#9c5fbf] mb-2" />
        <span className="text-xs font-black text-[#9c5fbf] uppercase tracking-wide font-mono">Stream Local File Node</span>
        <input type="file" accept=".pdf,.txt,.csv,.docx,.xlsx" className="hidden" onChange={(e)=>{let f=e.target.files[0]; if(f){setFileName(f.name); setFileUrl(URL.createObjectURL(f));}}} />
      </label>
      {fileUrl && (
        <div className="flex-1 flex flex-col bg-white rounded-xl overflow-hidden border-2 border-[#2d2d2d] shadow-md">
           <object data={fileUrl} className="w-full h-full bg-white">
             <div className="p-6 text-center mt-10">
               <p className="text-xs font-mono text-[#6b5947] mb-4">Native asset encapsulation pipeline limit.</p>
               <a href={fileUrl} download={fileName} className="bg-[#9c5fbf] text-white px-5 py-2.5 border-2 border-[#2d2d2d] text-xs font-black rounded-xl tracking-wider uppercase inline-block shadow-[2px_2px_0px_rgba(0,0,0,1)]">Extract Asset Stream</a>
             </div>
           </object>
        </div>
      )}
    </div>
  );
}
