import { useState, useEffect } from 'react';
import { ApiConfig } from '../types';
import { auth, db, googleProvider } from '../firebase';
import { signInWithPopup, signOut as firebaseSignOut, User, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

const DEFAULT_CONFIG: ApiConfig = {
  githubOwner: '',
  githubRepo: '',
  githubToken: '',
  slackWebhook: '',
  jiraDomain: '',
  jiraEmail: '',
  jiraToken: '',
  jiraProjectKey: '',
  gmailAddress: ''
};

export const useCloudConfig = () => {
  const [user, setUser] = useState<User | null>(null);
  const [config, setConfig] = useState<ApiConfig>(DEFAULT_CONFIG);
  const [isSyncing, setIsSyncing] = useState(true);

  // 1. Listen for Auth Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        // Fallback to local storage if logged out
        const local = localStorage.getItem('cpeof_config');
        if (local) {
          try {
            setConfig(JSON.parse(local));
          } catch (e) { console.error(e); }
        }
        setIsSyncing(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Listen for Firestore Data (Sync Everywhere)
  useEffect(() => {
    if (!user) return;

    setIsSyncing(true);
    // Path: users/{uid}/settings/apiKeys
    const userSettingsRef = doc(db, 'users', user.uid, 'settings', 'apiKeys');

    const unsubscribe = onSnapshot(userSettingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const cloudData = docSnap.data() as Partial<ApiConfig>;
        // Merge cloud data with existing structure to ensure all fields exist
        setConfig(prev => ({ ...prev, ...cloudData }));
        console.log("☁️ Config synced from cloud");
      } else {
        console.log("☁️ No cloud config found, using local/default");
      }
      setIsSyncing(false);
    }, (error) => {
      console.error("Firestore sync error:", error);
      setIsSyncing(false);
    });

    return () => unsubscribe();
  }, [user]);

  // 3. Actions
  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
      alert("Failed to sign in with Google. Check console for details.");
    }
  };

  const handleSignOut = async () => {
    await firebaseSignOut(auth);
    // Reset to defaults or keep local? Resetting is safer for shared devices.
    setConfig(DEFAULT_CONFIG); 
  };

  const saveConfig = async (newConfig: ApiConfig) => {
    // Always update state immediately for UI responsiveness
    setConfig(newConfig);

    if (user) {
      // Save to Cloud
      try {
        const userSettingsRef = doc(db, 'users', user.uid, 'settings', 'apiKeys');
        await setDoc(userSettingsRef, newConfig, { merge: true });
        console.log("✅ Saved to Firestore");
      } catch (e) {
        console.error("Failed to save to cloud", e);
        alert("Failed to save settings to cloud.");
      }
    } else {
      // Save to LocalStorage (Fallback)
      localStorage.setItem('cpeof_config', JSON.stringify(newConfig));
      console.log("💾 Saved to LocalStorage");
    }
  };

  return {
    user,
    config,
    isSyncing,
    signIn: handleSignIn,
    signOut: handleSignOut,
    saveConfig
  };
};