import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../services/firebase';
import { driveService } from '../services/driveService';
import { db as dexieDb, clearUserCache, initUserCache } from '../db/indexedDB';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Firebase Auth State
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(() => driveService.getAccessToken());
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  // PIN Lock State
  const [isLocked, setIsLocked] = useState(false);
  const [pinCode, setPinCode] = useState('1990');
  const [isPinSetup, setIsPinSetup] = useState(true);
  const [loading, setLoading] = useState(true);

  // 1. Listen to Firebase Authentication State Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          setUser(currentUser);
          const savedToken = driveService.getAccessToken();
          if (savedToken) {
            setAccessToken(savedToken);
          }

          // Verify or update user profile in Firestore under patients/{uid}
          try {
            const patientRef = doc(db, 'patients', currentUser.uid);
            const patientSnap = await getDoc(patientRef);
            let profileData = {
              PatientID: currentUser.uid,
              uid: currentUser.uid,
              Name: currentUser.displayName || 'مستخدم سِجِل',
              GuardianEmail: currentUser.email || '',
              PhotoURL: currentUser.photoURL || '',
              UpdatedAt: new Date().toISOString()
            };

            if (!patientSnap.exists()) {
              profileData = {
                ...profileData,
                BirthDate: '1990-01-01',
                Gender: 'Male',
                BloodType: 'O+',
                Height: 175,
                Weight: 75,
                Allergies: '',
                ChronicDiseases: '',
                Surgeries: '',
                EmergencyContactName: '',
                EmergencyContactPhone: '',
                PIN: '1990',
                CreatedAt: new Date().toISOString(),
                _syncStatus: 'synced'
              };
              await setDoc(patientRef, profileData, { merge: true });
            } else {
              profileData = { ...patientSnap.data(), ...profileData };
            }

            // Sync user to IndexedDB cache
            await initUserCache(profileData);
          } catch (fsErr) {
            console.warn('[Sejel Auth] Firestore sync on auth change warning:', fsErr);
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('[Sejel Auth] onAuthStateChanged error:', err);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Load PIN settings from IndexedDB
  useEffect(() => {
    async function loadPinSettings() {
      try {
        const pinSetting = await dexieDb.settings.get('pinCode');
        const lockSetting = await dexieDb.settings.get('pinLocked');
        
        if (pinSetting && pinSetting.value) {
          setPinCode(pinSetting.value);
        }
        
        if (lockSetting && lockSetting.value !== undefined) {
          setIsLocked(lockSetting.value);
        }
      } catch (err) {
        console.error('[Sejel Auth] Error loading PIN settings:', err);
      } finally {
        setLoading(false);
      }
    }

    loadPinSettings();
  }, []);

  /**
   * تسجيل الدخول بحساب Google مع صلاحية Google Drive (drive.file)
   */
  const signInWithGoogle = async () => {
    setAuthLoading(true);
    setAuthError('');

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      const signedInUser = result.user;

      if (token) {
        setAccessToken(token);
        driveService.setAccessToken(token);
      }

      // تخزين بيانات المستخدم في Firestore تحت: patients/{uid}
      const patientRef = doc(db, 'patients', signedInUser.uid);
      const patientSnap = await getDoc(patientRef);
      let profileData = {
        PatientID: signedInUser.uid,
        uid: signedInUser.uid,
        Name: signedInUser.displayName || 'مستخدم سِجِل',
        GuardianEmail: signedInUser.email || '',
        PhotoURL: signedInUser.photoURL || '',
        UpdatedAt: new Date().toISOString()
      };

      if (!patientSnap.exists()) {
        profileData = {
          ...profileData,
          BirthDate: '1990-01-01',
          Gender: 'Male',
          BloodType: 'O+',
          Height: 175,
          Weight: 75,
          Allergies: '',
          ChronicDiseases: '',
          Surgeries: '',
          EmergencyContactName: '',
          EmergencyContactPhone: '',
          PIN: '1990',
          CreatedAt: new Date().toISOString(),
          _syncStatus: 'synced'
        };
        await setDoc(patientRef, profileData, { merge: true });
      } else {
        await setDoc(patientRef, profileData, { merge: true });
        profileData = { ...patientSnap.data(), ...profileData };
      }

      // تنظيف وإعادة تهيئة التخزين المحلي IndexedDB للمستخدم الجديد
      await clearUserCache();
      await initUserCache(profileData);

      setUser(signedInUser);
      return { success: true, user: signedInUser };
    } catch (err) {
      console.error('[Sejel Auth] Google Sign-In error:', err);
      setAuthError(err.message);
      return { success: false, error: err.message };
    } finally {
      setAuthLoading(false);
    }
  };

  /**
   * تسجيل الخروج ومسح الجلسة والتخزين المؤقت المحلي
   */
  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setAccessToken('');
      driveService.setAccessToken(null);
      await clearUserCache();
      return { success: true };
    } catch (err) {
      console.error('[Sejel Auth] Error during logout:', err);
      return { success: false, error: err.message };
    }
  };

  const unlock = (enteredPin, patientBirthYear = null) => {
    // Check direct PIN match
    if (enteredPin === pinCode) {
      setIsLocked(false);
      dexieDb.settings.put({ key: 'pinLocked', value: false });
      return { success: true };
    }
    
    // Check fallback birth year (e.g. 1990)
    if (patientBirthYear && String(patientBirthYear).includes(enteredPin)) {
      setIsLocked(false);
      dexieDb.settings.put({ key: 'pinLocked', value: false });
      return { success: true, note: 'unlocked_by_birth_year' };
    }

    return { success: false, error: 'invalid_pin' };
  };

  const lock = () => {
    setIsLocked(true);
    dexieDb.settings.put({ key: 'pinLocked', value: true });
  };

  const updatePin = async (newPin) => {
    if (!newPin || newPin.length !== 4) {
      return { success: false, error: 'PIN must be exactly 4 digits' };
    }
    setPinCode(newPin);
    await dexieDb.settings.put({ key: 'pinCode', value: newPin });
    return { success: true };
  };

  return (
    <AuthContext.Provider value={{
      user,
      accessToken,
      authLoading,
      authError,
      signInWithGoogle,
      logout,
      isLocked,
      setIsLocked,
      unlock,
      lock,
      pinCode,
      updatePin,
      isPinSetup,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
