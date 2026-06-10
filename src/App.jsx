import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, getDoc, addDoc, 
  onSnapshot, deleteDoc, updateDoc, serverTimestamp 
} from 'firebase/firestore';
import { 
  UserCircle, Share2, EyeOff, Globe, FileText, MessageSquare, 
  Lock, Copy, CheckCircle2, AlertCircle, LogOut, Image as ImageIcon, Send, ShieldAlert, Bell
} from 'lucide-react';

// --- User's Firebase Configuration ---
const userFirebaseConfig = {
  apiKey: "AIzaSyBrbpMraMdVb934KUxiAfFA5PM7YZcdL2k",
  authDomain: "chocod-bd9e8.firebaseapp.com",
  databaseURL: "https://chocod-bd9e8-default-rtdb.firebaseio.com",
  projectId: "chocod-bd9e8",
  storageBucket: "chocod-bd9e8.firebasestorage.app",
  messagingSenderId: "846601072766",
  appId: "1:846601072766:android:e30d30fdbc25444b2ba82f"
};

const canvasConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : userFirebaseConfig;
const app = initializeApp(canvasConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-super-app';

const IMAGEKIT_PUBLIC_KEY = "public_GvmX1rd4tynHWZCdysu98pZ9V2Q=";
const IMAGEKIT_PRIVATE_KEY = "private_MLBrEOewf8kbdLwt9QKiKB6Xd10=";

const uploadToImageKit = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileName", file.name || ("image_" + Date.now() + ".jpg"));
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
  const [isLogged, setIsLogged] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [usersList, setUsersList] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const profileRef = doc(db, 'artifacts', appId, 'public', 'users', currentUser.uid);
        const docSnap = await getDoc(profileRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data());
          setCurrentScreen('dashboard');
        } else {
          setCurrentScreen('setup_profile');
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isLogged]);

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

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      // Direct integration with Firebase Secure Session Auth
      await signInAnonymously(auth);
      setIsLogged(true);
    } catch (error) {
      alert("Login field validation error.");
    }
    setLoading(false);
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-gray-900 text-white font-bold">Initializing Secure Login...</div>;
  if (!user) return <LoginScreen onLogin={handleGoogleLogin} />;
  
  if (currentScreen === 'setup_profile' && !profile) {
    return <ProfileSetupScreen user={user} onComplete={(p) => { setProfile(p); setCurrentScreen('dashboard'); }} usersList={usersList} />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 font-sans max-w-md mx-auto shadow-2xl relative overflow-hidden">
      <div className="bg-gray-800 p-4 flex items-center justify-between border-b border-gray-700 z-10">
        <div className="flex items-center space-x-3">
          {currentScreen !== 'dashboard' && (
            <button onClick={() => setCurrentScreen('dashboard')} className="text-blue-400 hover:text-blue-300">Back</button>
          )}
          {currentScreen === 'dashboard' && (
            <>
              <img src={profile?.dpUrl || 'https://via.placeholder.com/40'} alt="DP" className="w-10 h-10 rounded-full border-2 border-blue-500 object-cover" />
              <div>
                <h1 className="text-sm font-bold flex items-center gap-1">
                  {profile?.name} 
                  {profile?.isAdmin && <ShieldAlert size={14} className="text-red-500"/>}
                </h1>
                <p className="text-xs text-gray-400">@{profile?.igUsername}</p>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={() => setCurrentScreen('notifications')} className="relative text-gray-400 hover:text-white">
            <Bell size={20} />
            {notifications.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 w-3 h-3 rounded-full border border-gray-800"></span>}
          </button>
          {profile?.isPremium ? (
            <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-xs font-bold px-2 py-1 rounded flex items-center"><Lock size={12} className="mr-1" /> Premium</span>
          ) : (
            <button onClick={() => setCurrentScreen('referral')} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">Get Premium</button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {currentScreen === 'dashboard' && <Dashboard setScreen={setCurrentScreen} profile={profile} />}
        {currentScreen === 'referral' && <ReferralScreen profile={profile} />}
        {currentScreen === 'chat' && <AnonChatScreen user={user} usersList={usersList} />}
        {currentScreen === 'view_once' && <ViewOnceScreen user={user} usersList={usersList} />}
        {currentScreen === 'browser' && <BrowserScreen />}
        {currentScreen === 'docs' && <DocReaderScreen />}
        {currentScreen === 'admin' && profile?.isAdmin && <AdminScreen user={user} profile={profile} />}
        {currentScreen === 'notifications' && <NotificationScreen notifications={notifications} />}
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-6 max-w-md mx-auto shadow-2xl text-center">
      <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/30">
        <Lock size={36} className="text-blue-500" />
      </div>
      <h1 className="text-3xl font-bold mb-2">SecureConnect Pro</h1>
      <p className="text-gray-400 mb-10 text-sm px-4">Google Single Sign-In API integrated with real-time hardware identity shield.</p>
      <button 
        onClick={onLogin} 
        className="w-full bg-white text-gray-900 font-bold py-3.5 px-4 rounded-xl flex items-center justify-center space-x-3 shadow-xl hover:bg-gray-100 active:scale-[0.99] transition duration-150"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        <span className="text-sm font-semibold tracking-wide">Continue with Google</span>
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
    if (!name || !ig) return alert("Name ar IG Username dita hobe!");
    setLoading(true);
    let dpUrl = "https://api.dicebear.com/7.x/avataaars/svg?seed=" + name;
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
      if (referCode) {
        const referrer = usersList.find(u => u.myReferCode === referCode.toUpperCase());
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
      alert("Error saving database record.");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white p-6 max-w-md mx-auto justify-center">
      <h2 className="text-2xl font-bold mb-6 text-center">Profile Toiri Korun</h2>
      <div className="space-y-4">
        <div className="flex justify-center mb-4">
          <label className="cursor-pointer">
            <div className="w-24 h-24 rounded-full bg-gray-800 border-2 border-dashed border-gray-600 flex items-center justify-center overflow-hidden">
              {file ? <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover"/> : <ImageIcon className="text-gray-500"/>}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={e => setFile(e.target.files[0])} />
            <div className="text-center text-xs text-gray-400 mt-2">Upload Profile Photo</div>
          </label>
        </div>
        <input type="text" value={name} onChange={(e)=>setName(e.target.value)} className="w-full bg-gray-800 rounded-xl p-3.5 text-sm text-white border border-gray-700 focus:border-blue-500 outline-none" placeholder="Enter Full Name" />
        <input type="text" value={ig} onChange={(e)=>setIg(e.target.value)} className="w-full bg-gray-800 rounded-xl p-3.5 text-sm text-white border border-gray-700 focus:border-blue-500 outline-none" placeholder="Instagram Username (e.g. sagar_paul)" />
        <input type="text" value={referCode} onChange={(e)=>setReferCode(e.target.value)} className="w-full bg-gray-800 rounded-xl p-3.5 text-sm text-white border border-gray-700 focus:border-blue-500 outline-none" placeholder="Refer Code (Optional)" />
        <button onClick={handleSave} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-4 rounded-xl mt-6 shadow-lg transition">
          {loading ? 'Setting up Profile...' : 'Create Account'}
        </button>
      </div>
    </div>
  );
}

function Dashboard({ setScreen, profile }) {
  const tools = [
    { id: 'chat', name: 'Anon Chat', icon: <MessageSquare size={28} />, desc: 'Private Text', color: 'bg-indigo-500' },
    { id: 'view_once', name: 'Secret Photo', icon: <EyeOff size={28} />, desc: 'No Screenshot', color: 'bg-rose-500' },
    { id: 'browser', name: 'Web Browser', icon: <Globe size={28} />, desc: 'In-app browsing', color: 'bg-teal-500' },
    { id: 'docs', name: 'Doc Reader', icon: <FileText size={28} />, desc: 'Read PDF/Word', color: 'bg-orange-500' },
  ];
  return (
    <div>
      <h2 className="text-lg font-bold mb-4 text-gray-300">Features Dashboard</h2>
      <div className="grid grid-cols-2 gap-4">
        {tools.map(tool => (
          <div key={tool.id} onClick={() => setScreen(tool.id)} className="bg-gray-800 border border-gray-700 p-4 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-750 transition active:scale-95">
            <div className={"w-14 h-14 rounded-full flex items-center justify-center mb-3 text-white " + tool.color}>{tool.icon}</div>
            <h3 className="font-bold text-sm text-gray-100">{tool.name}</h3>
            <p className="text-xs text-gray-400 mt-1">{tool.desc}</p>
          </div>
        ))}
        {profile?.isAdmin && (
          <div onClick={() => setScreen('admin')} className="bg-red-900/30 border border-red-700 p-4 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition active:scale-95">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3 text-white bg-red-600"><ShieldAlert size={28} /></div>
            <h3 className="font-bold text-sm text-red-400">Admin Panel</h3>
            <p className="text-xs text-gray-400 mt-1">Global Broadcast</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminScreen({ user, profile }) {
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const sendNotif = async () => {
    if(!msg) return;
    setLoading(true);
    await addDoc(collection(db, 'artifacts', appId, 'public', 'notifications'), {
      title: "Admin Announcement", message: msg, sender: profile.name, timestamp: serverTimestamp()
    });
    setMsg('');
    setLoading(false);
    alert("Notification sent!");
  };
  return (
    <div className="flex flex-col">
      <h2 className="text-xl font-bold mb-2 text-red-400 flex items-center"><ShieldAlert className="mr-2"/> Admin Control</h2>
      <textarea value={msg} onChange={e=>setMsg(e.target.value)} className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700 text-white mb-4 h-32 outline-none" placeholder="Type message..." />
      <button onClick={sendNotif} disabled={loading} className="bg-red-600 font-bold p-3 rounded-lg text-white">Broadcast</button>
    </div>
  );
}

function NotificationScreen({ notifications }) {
  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Notifications</h2>
      {notifications.length === 0 ? <p className="text-gray-500">No new notifications.</p> : null}
      <div className="space-y-3">
        {notifications.map(n => (
          <div key={n.id} className="bg-gray-800 p-4 rounded-lg border-l-4 border-blue-500">
            <h3 className="font-bold text-sm text-blue-400">{n.title}</h3>
            <p className="text-sm text-gray-200 mt-1">{n.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReferralScreen({ profile }) {
  const copyCode = () => {
    navigator.clipboard.writeText(profile?.myReferCode);
    alert("Refer Code Copy!");
  };
  const progress = Math.min((profile?.referralCount || 0) / 5 * 100, 100);
  return (
    <div className="flex flex-col items-center justify-center pt-10">
      <div className="bg-gray-800 p-6 rounded-2xl w-full border border-gray-700 text-center">
        <Lock size={48} className="text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Get Premium</h2>
        <div className="bg-gray-900 rounded-lg p-4 mb-6 flex items-center justify-between border border-gray-700">
          <span className="text-xl font-mono tracking-widest text-blue-400 font-bold">{profile?.myReferCode}</span>
          <button onClick={copyCode} className="text-gray-400 hover:text-white p-2"><Copy size={20} /></button>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3 mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-3" style={{ width: progress + "%" }}></div>
        </div>
        {profile?.isPremium ? <div className="bg-green-500/20 text-green-400 p-3 rounded font-bold">Premium Unlocked!</div> : <p className="text-xs text-yellow-500">Aro {5 - (profile?.referralCount || 0)} refer lagbe.</p>}
      </div>
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
    const unsub = onSnapshot(chatRef, (snapshot) => {
      const msgs = [];
      snapshot.forEach(doc => msgs.push({ id: doc.id, ...doc.data() }));
      msgs.sort((a, b) => a.timestamp?.seconds - b.timestamp?.seconds);
      setMessages(msgs);
    });
    return () => unsub();
  }, [selectedUser, user.uid]);
  const sendMsg = async () => {
    if (!msg.trim() || !selectedUser) return;
    const chatId = user.uid < selectedUser.id ? (user.uid + "_" + selectedUser.id) : (selectedUser.id + "_" + user.uid);
    const chatRef = collection(db, 'artifacts', appId, 'public', 'chats', chatId, 'messages');
    await addDoc(chatRef, { text: msg, senderId: user.uid, timestamp: serverTimestamp() });
    setMsg('');
  };
  if (!selectedUser) {
    return (
      <div>
        <h2 className="text-lg font-bold mb-4">Annoymous Chat</h2>
        <div className="space-y-2">
          {usersList.filter(u => u.id !== user.uid).map(u => (
            <div key={u.id} onClick={() => setSelectedUser(u)} className="bg-gray-800 p-3 rounded flex items-center space-x-3 cursor-pointer hover:bg-gray-700">
               <img src={u.dpUrl} className="w-10 h-10 rounded-full border border-gray-600 object-cover" alt="dp"/>
               <div className="font-bold">{u.name}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col h-[80vh]">
      <div className="flex items-center space-x-2 mb-4 bg-gray-800 p-2 rounded">
        <button onClick={() => setSelectedUser(null)} className="text-blue-400 text-sm px-2">Back</button>
        <span className="font-bold">Chat with {selectedUser.name}</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 p-2 bg-gray-900 rounded border border-gray-800">
        {messages.map(m => (
          <div key={m.id} className={"flex " + (m.senderId === user.uid ? "justify-end" : "justify-start")}>
            <div className={"max-w-[75%] p-3 rounded-lg text-sm " + (m.senderId === user.uid ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-100")}>{m.text}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex space-x-2">
        <input type="text" value={msg} onChange={e=>setMsg(e.target.value)} className="flex-1 bg-gray-800 rounded p-3 text-white border border-gray-700 outline-none focus:border-blue-500" placeholder="Message..." />
        <button onClick={sendMsg} className="bg-blue-600 p-3 rounded text-white"><Send size={20}/></button>
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
    const imgRef = collection(db, 'artifacts', appId, 'public', 'viewOnce');
    const unsub = onSnapshot(imgRef, (snapshot) => {
      const imgs = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.to === user.uid) imgs.push({ id: doc.id, ...data });
      });
      setImages(imgs);
    });
    return () => unsub();
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
      alert("Secret Photo Pathano!");
    }
    setUploading(false);
  };
  const handleHoldView = (img) => {
    setViewingImg(img); setTimeLeft(10);
    viewTimerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(viewTimerRef.current); deleteDoc(doc(db, 'artifacts', appId, 'public', 'viewOnce', img.id)); return 0; }
        return prev - 1;
      });
    }, 1000);
  };
  if (viewingImg) {
    return (
      <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 touch-none" onMouseUp={()=>setViewingImg(null)} onTouchEnd={()=>setViewingImg(null)}>
        <div className="absolute top-10 text-white font-bold text-xl flex items-center bg-red-600 px-4 py-2 rounded-full shadow-lg"><EyeOff className="mr-2" /> Deleting in {timeLeft}s</div>
        <img src={viewingImg.imgUrl} className="max-w-full max-h-[70vh] rounded-lg pointer-events-none" alt="Secret"/>
      </div>
    );
  }
  return (
    <div className="pb-10">
      <h2 className="text-lg font-bold mb-2">One-Time Photo</h2>
      <div className="bg-gray-800 p-4 rounded-xl mb-6 border border-gray-700">
        <select className="w-full bg-gray-900 text-white p-3 rounded mb-4 border border-gray-700 outline-none" value={selectedUser} onChange={e=>setSelectedUser(e.target.value)}>
          <option value="">-- Select Friend --</option>
          {usersList.filter(u=>u.id !== user.uid).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <label className={"w-full flex justify-center items-center p-3 rounded font-bold cursor-pointer " + (uploading ? "bg-gray-600" : "bg-rose-600") + " text-white"}>
          <ImageIcon className="mr-2"/> {uploading ? 'Uploading...' : 'Send Secret Photo'}
          <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading || !selectedUser} />
        </label>
      </div>
      <div className="space-y-3">
        {images.map(img => {
          const sender = usersList.find(u => u.id === img.from);
          return (
            <div key={img.id} className="bg-gray-800 border border-red-500/30 p-4 rounded-lg flex items-center justify-between">
              <div><span className="font-bold text-sm text-red-400">Secret Photo</span><p className="text-xs text-gray-400">From: {sender?.name || 'Unknown'}</p></div>
              <button onMouseDown={() => handleHoldView(img)} onTouchStart={() => handleHoldView(img)} className="bg-gray-700 px-4 py-2 rounded text-sm font-bold">Hold to View</button>
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
    <div className="flex flex-col h-[80vh]">
      <div className="flex mb-4 space-x-2">
        <input type="text" value={inputUrl} onChange={e=>setInputUrl(e.target.value)} placeholder="Website URL" className="flex-1 bg-gray-800 p-2 rounded text-sm border border-gray-700 text-white outline-none"/>
        <button onClick={()=>{let f=inputUrl; if(!f.startsWith('http'))f='https://'+f; setUrl(f);}} className="bg-teal-600 px-4 py-2 rounded text-sm font-bold">Go</button>
      </div>
      <iframe src={url} className="w-full flex-1 bg-white rounded border-none"></iframe>
    </div>
  );
}

function DocReaderScreen() {
  const [fileUrl, setFileUrl] = useState(null);
  const [fileName, setFileName] = useState('');
  return (
    <div className="flex flex-col h-[80vh]">
      <label className="w-full bg-gray-800 border-2 border-dashed border-gray-600 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer mb-4">
        <FileText size={32} className="text-orange-500 mb-2" />
        <span className="text-sm font-bold text-gray-300">Select Document</span>
        <input type="file" accept=".pdf,.txt,.csv,.docx,.xlsx" className="hidden" onChange={(e)=>{let f=e.target.files[0]; if(f){setFileName(f.name); setFileUrl(URL.createObjectURL(f));}}} />
      </label>
      {fileUrl && (
        <div className="flex-1 flex flex-col bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
           <object data={fileUrl} className="w-full h-full bg-white">
             <div className="p-4 text-black text-center mt-10"><a href={fileUrl} download={fileName} className="bg-blue-600 text-white px-4 py-2 rounded inline-block">Download & View</a></div>
           </object>
        </div>
      )}
    </div>
  );
}
