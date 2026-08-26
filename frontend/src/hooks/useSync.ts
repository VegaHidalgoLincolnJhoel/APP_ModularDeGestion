import { useEffect, useState, useCallback } from "react";
import { syncManager, type SyncState } from "../lib/syncManager";

export function useSync(negocioId?: number) {
  const [state, setState] = useState<SyncState>(() => syncManager.getState(negocioId));

  useEffect(() => {
    // Al montar o cambiar negocioId, suscribirse a eventos de red y cola
    const unsubscribe = syncManager.subscribe((newState) => {
      setState(newState);
    }, negocioId);

    return () => {
      unsubscribe();
    };
  }, [negocioId]);

  const syncNow = useCallback(async () => {
    if (negocioId !== undefined) {
      return await syncManager.syncNegocio(negocioId);
    } else {
      await syncManager.syncAll();
      return { success: true, procesados: 0, errores: 0 };
    }
  }, [negocioId]);

  return {
    isOnline: state.isOnline,
    isSyncing: state.isSyncing,
    pendingCount: state.pendingCount,
    lastSyncTime: state.lastSyncTime,
    error: state.lastError,
    syncNow,
  };
}
