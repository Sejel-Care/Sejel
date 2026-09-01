import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../db/indexedDB';
import { syncEngine } from '../db/syncEngine';

const SyncContext = createContext();

export function SyncProvider({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncResult, setLastSyncResult] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  const refreshPendingCount = async () => {
    try {
      const count = await db.syncQueue.count();
      setPendingCount(count);
    } catch {
      setPendingCount(0);
    }
  };

  useEffect(() => {
    refreshPendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      // تلقائياً نحاول المزامنة عند استعادة الاتصال
      handleSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // فحص دوري لقائمة الانتظار كل 10 ثوانٍ
    const interval = setInterval(refreshPendingCount, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const result = await syncEngine.syncAll();
      setLastSyncResult(result);
      if (result && result.success) {
        setLastSyncTime(new Date());
      }
      await refreshPendingCount();
      return result;
    } catch (err) {
      setLastSyncResult({ success: false, error: err.message });
      return { success: false, error: err.message };
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <SyncContext.Provider value={{
      isOnline,
      isSyncing,
      pendingCount,
      lastSyncResult,
      lastSyncTime,
      triggerSync: handleSync,
      refreshPendingCount
    }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  return useContext(SyncContext);
}
