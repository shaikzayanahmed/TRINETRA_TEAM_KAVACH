import { Evidence, Alert, AuditEvent, VirtualFence } from '../types';

const DB_NAME = 'TrinetraTacticalLocalDB_v1';
const DB_VERSION = 3;
const STORE_EVIDENCE = 'evidence';
const STORE_ALERTS = 'alerts';
const STORE_AUDIT = 'audit_logs';
const STORE_FENCES = 'fences';
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 Days Retention Policy

class LocalStorageManager {
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  constructor() {
    if (typeof window !== 'undefined' && window.indexedDB) {
      this.initDB();
    }
  }

  private initDB(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e: any) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_EVIDENCE)) {
            db.createObjectStore(STORE_EVIDENCE, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORE_ALERTS)) {
            db.createObjectStore(STORE_ALERTS, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORE_AUDIT)) {
            db.createObjectStore(STORE_AUDIT, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORE_FENCES)) {
            db.createObjectStore(STORE_FENCES, { keyPath: 'id' });
          }
        };

        req.onsuccess = (e: any) => {
          const db = e.target.result;
          this.pruneOldRecords(db);
          resolve(db);
        };

        req.onerror = () => {
          console.warn('[LocalStorage] IndexedDB initialization note. Using WebStorage fallback.');
          resolve(null);
        };
      } catch (err) {
        console.warn('[LocalStorage] IndexedDB unavailable:', err);
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  private async pruneOldRecords(db: IDBDatabase) {
    try {
      const now = Date.now();
      const tx = db.transaction([STORE_EVIDENCE, STORE_ALERTS], 'readwrite');
      const evStore = tx.objectStore(STORE_EVIDENCE);
      const evReq = evStore.getAll();
      evReq.onsuccess = () => {
        const items: Evidence[] = evReq.result || [];
        for (const item of items) {
          const itemTime = item.timeMs || (item.timestamp ? new Date(item.timestamp).getTime() : 0);
          if (itemTime > 0 && now - itemTime > RETENTION_MS) {
            evStore.delete(item.id);
          }
        }
      };

      const altStore = tx.objectStore(STORE_ALERTS);
      const altReq = altStore.getAll();
      altReq.onsuccess = () => {
        const items: Alert[] = altReq.result || [];
        for (const item of items) {
          const itemTime = item.timestamp ? new Date(item.timestamp).getTime() : 0;
          if (itemTime > 0 && now - itemTime > RETENTION_MS) {
            altStore.delete(item.id);
          }
        }
      };
    } catch (e) {
      console.warn('[LocalStorage] Pruning error:', e);
    }
  }

  // --- EVIDENCE APIs ---
  public async loadAllEvidence(): Promise<Evidence[]> {
    const db = await this.initDB();
    if (db) {
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_EVIDENCE, 'readonly');
          const store = tx.objectStore(STORE_EVIDENCE);
          const req = store.getAll();
          req.onsuccess = () => {
            const items: Evidence[] = req.result || [];
            items.sort((a, b) => {
              const ta = a.timeMs || (a.timestamp ? new Date(a.timestamp).getTime() : 0);
              const tb = b.timeMs || (b.timestamp ? new Date(b.timestamp).getTime() : 0);
              return tb - ta;
            });
            if (items.length > 0) {
              resolve(items);
            } else {
              resolve(this.loadLocalStorage<Evidence>('trinetra_evidence'));
            }
          };
          req.onerror = () => resolve(this.loadLocalStorage<Evidence>('trinetra_evidence'));
        } catch {
          resolve(this.loadLocalStorage<Evidence>('trinetra_evidence'));
        }
      });
    }
    return this.loadLocalStorage<Evidence>('trinetra_evidence');
  }

  public async saveEvidence(evidence: Evidence): Promise<void> {
    const now = Date.now();
    const enriched: Evidence = {
      ...evidence,
      timeMs: evidence.timeMs || now,
      databaseStored: true,
    };

    const db = await this.initDB();
    if (db) {
      try {
        const tx = db.transaction(STORE_EVIDENCE, 'readwrite');
        tx.objectStore(STORE_EVIDENCE).put(enriched);
      } catch (e) {}
    }
    this.saveLocalStorageItem('trinetra_evidence', enriched);
  }

  public async saveAllEvidence(items: Evidence[]): Promise<void> {
    const db = await this.initDB();
    if (db) {
      try {
        const tx = db.transaction(STORE_EVIDENCE, 'readwrite');
        const store = tx.objectStore(STORE_EVIDENCE);
        for (const item of items) {
          store.put(item);
        }
      } catch (e) {}
    }
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('trinetra_evidence', JSON.stringify(items.slice(0, 50)));
      }
    } catch (e) {}
  }

  public async deleteEvidence(id: string): Promise<void> {
    const db = await this.initDB();
    if (db) {
      try {
        const tx = db.transaction(STORE_EVIDENCE, 'readwrite');
        tx.objectStore(STORE_EVIDENCE).delete(id);
      } catch (e) {}
    }
    try {
      const stored = this.loadLocalStorage<Evidence>('trinetra_evidence');
      const filtered = stored.filter((i) => i.id !== id);
      localStorage.setItem('trinetra_evidence', JSON.stringify(filtered));
    } catch (e) {}
  }

  // --- ALERTS APIs ---
  public async loadAllAlerts(): Promise<Alert[]> {
    const db = await this.initDB();
    if (db) {
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_ALERTS, 'readonly');
          const store = tx.objectStore(STORE_ALERTS);
          const req = store.getAll();
          req.onsuccess = () => {
            const items: Alert[] = req.result || [];
            items.sort((a, b) => {
              const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
              const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
              return tb - ta;
            });
            if (items.length > 0) {
              resolve(items);
            } else {
              resolve(this.loadLocalStorage<Alert>('trinetra_alerts'));
            }
          };
          req.onerror = () => resolve(this.loadLocalStorage<Alert>('trinetra_alerts'));
        } catch {
          resolve(this.loadLocalStorage<Alert>('trinetra_alerts'));
        }
      });
    }
    return this.loadLocalStorage<Alert>('trinetra_alerts');
  }

  public async saveAlert(alert: Alert): Promise<void> {
    const db = await this.initDB();
    if (db) {
      try {
        const tx = db.transaction(STORE_ALERTS, 'readwrite');
        tx.objectStore(STORE_ALERTS).put(alert);
      } catch (e) {}
    }
    this.saveLocalStorageItem('trinetra_alerts', alert);
  }

  public async saveAllAlerts(alerts: Alert[]): Promise<void> {
    const db = await this.initDB();
    if (db) {
      try {
        const tx = db.transaction(STORE_ALERTS, 'readwrite');
        const store = tx.objectStore(STORE_ALERTS);
        for (const alt of alerts) {
          store.put(alt);
        }
      } catch (e) {}
    }
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('trinetra_alerts', JSON.stringify(alerts.slice(0, 50)));
      }
    } catch (e) {}
  }

  // --- AUDIT LOGS APIs ---
  public async loadAllAuditLogs(): Promise<AuditEvent[]> {
    const db = await this.initDB();
    if (db) {
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_AUDIT, 'readonly');
          const store = tx.objectStore(STORE_AUDIT);
          const req = store.getAll();
          req.onsuccess = () => {
            const items: AuditEvent[] = req.result || [];
            if (items.length > 0) {
              resolve(items);
            } else {
              resolve(this.loadLocalStorage<AuditEvent>('trinetra_audit_logs'));
            }
          };
          req.onerror = () => resolve(this.loadLocalStorage<AuditEvent>('trinetra_audit_logs'));
        } catch {
          resolve(this.loadLocalStorage<AuditEvent>('trinetra_audit_logs'));
        }
      });
    }
    return this.loadLocalStorage<AuditEvent>('trinetra_audit_logs');
  }

  public async saveAuditLog(log: AuditEvent): Promise<void> {
    const db = await this.initDB();
    if (db) {
      try {
        const tx = db.transaction(STORE_AUDIT, 'readwrite');
        tx.objectStore(STORE_AUDIT).put(log);
      } catch (e) {}
    }
    this.saveLocalStorageItem('trinetra_audit_logs', log);
  }

  public async saveAllAuditLogs(logs: AuditEvent[]): Promise<void> {
    const db = await this.initDB();
    if (db) {
      try {
        const tx = db.transaction(STORE_AUDIT, 'readwrite');
        const store = tx.objectStore(STORE_AUDIT);
        for (const l of logs) {
          store.put(l);
        }
      } catch (e) {}
    }
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('trinetra_audit_logs', JSON.stringify(logs.slice(0, 100)));
      }
    } catch (e) {}
  }

  // --- VIRTUAL FENCES APIs ---
  public async loadAllFences(): Promise<VirtualFence[]> {
    const db = await this.initDB();
    if (db) {
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_FENCES, 'readonly');
          const store = tx.objectStore(STORE_FENCES);
          const req = store.getAll();
          req.onsuccess = () => {
            const items: VirtualFence[] = req.result || [];
            if (items.length > 0) {
              resolve(items);
            } else {
              resolve(this.loadLocalStorage<VirtualFence>('trinetra_virtual_fences'));
            }
          };
          req.onerror = () => resolve(this.loadLocalStorage<VirtualFence>('trinetra_virtual_fences'));
        } catch {
          resolve(this.loadLocalStorage<VirtualFence>('trinetra_virtual_fences'));
        }
      });
    }
    return this.loadLocalStorage<VirtualFence>('trinetra_virtual_fences');
  }

  public async saveAllFences(fences: VirtualFence[]): Promise<void> {
    const db = await this.initDB();
    if (db) {
      try {
        const tx = db.transaction(STORE_FENCES, 'readwrite');
        const store = tx.objectStore(STORE_FENCES);
        for (const f of fences) {
          store.put(f);
        }
      } catch (e) {}
    }
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('trinetra_virtual_fences', JSON.stringify(fences));
      }
    } catch (e) {}
  }

  // --- GLOBAL RESET ---
  public async clearAll(): Promise<void> {
    const db = await this.initDB();
    if (db) {
      try {
        const tx = db.transaction([STORE_EVIDENCE, STORE_ALERTS, STORE_AUDIT, STORE_FENCES], 'readwrite');
        tx.objectStore(STORE_EVIDENCE).clear();
        tx.objectStore(STORE_ALERTS).clear();
        tx.objectStore(STORE_AUDIT).clear();
        tx.objectStore(STORE_FENCES).clear();
      } catch (e) {}
    }
    try {
      localStorage.removeItem('trinetra_evidence');
      localStorage.removeItem('trinetra_alerts');
      localStorage.removeItem('trinetra_audit_logs');
      localStorage.removeItem('trinetra_virtual_fences');
    } catch (e) {}
  }

  // --- Helper Methods ---
  private loadLocalStorage<T>(key: string): T[] {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        }
      }
    } catch (e) {}
    return [];
  }

  private saveLocalStorageItem<T extends { id: string }>(key: string, item: T) {
    try {
      if (typeof window !== 'undefined') {
        const existing = this.loadLocalStorage<T>(key);
        const updated = [item, ...existing.filter((i) => i.id !== item.id)].slice(0, 50);
        localStorage.setItem(key, JSON.stringify(updated));
      }
    } catch (e) {}
  }
}

export const evidenceStorageService = new LocalStorageManager();

