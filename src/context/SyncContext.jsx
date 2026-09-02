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

    let syncTimeout = null;

    const handleOnline = () => {
      setIsOnline(true);
      handleSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleDataChanged = () => {
      refreshPendingCount();
      if (navigator.onLine) {
        if (syncTimeout) clearTimeout(syncTimeout);
        syncTimeout = setTimeout(() => {
          handleSync();
        }, 800);
      }
    };

    const handleSyncCompleted = () => {
      refreshPendingCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sejel:data-changed', handleDataChanged);
    window.addEventListener('sejel:sync-completed', handleSyncCompleted);

    // فحص دوري لقائمة الانتظار كل 8 ثوانٍ
    const interval = setInterval(refreshPendingCount, 8000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sejel:data-changed', handleDataChanged);
      window.removeEventListener('sejel:sync-completed', handleSyncCompleted);
      if (syncTimeout) clearTimeout(syncTimeout);
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
