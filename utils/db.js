/**
 * IndexedDB persistence layer for AtCoder Pulse / Analytics.
 * Handles fast local storage of submissions and problem metadata.
 */

const AtCoderDB = {
  dbName: 'AtCoderPulseDB',
  version: 1,
  db: null,
  _openPromise: null,

  async open() {
    if (this.db) return this.db;
    if (this._openPromise) return this._openPromise;

    this._openPromise = new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(this.dbName, this.version);

        request.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('user_cache')) {
            db.createObjectStore('user_cache', { keyPath: 'userId' });
          }
          if (!db.objectStoreNames.contains('meta_cache')) {
            db.createObjectStore('meta_cache', { keyPath: 'key' });
          }
        };

        request.onsuccess = (e) => {
          this.db = e.target.result;
          this._openPromise = null;
          resolve(this.db);
        };

        request.onerror = (e) => {
          console.warn('IndexedDB open error:', e);
          this._openPromise = null;
          reject(e.target ? e.target.error : e);
        };

        request.onblocked = () => {
          console.warn('IndexedDB blocked');
          this._openPromise = null;
        };
      } catch (err) {
        console.warn('IndexedDB exception:', err);
        this._openPromise = null;
        reject(err);
      }
    });

    return this._openPromise;
  },

  async getUserData(userId) {
    try {
      const db = await this.open();
      const cleanId = (userId || '').trim().toLowerCase();
      return new Promise((resolve) => {
        const tx = db.transaction('user_cache', 'readonly');
        const store = tx.objectStore('user_cache');
        const req = store.get(cleanId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch (err) {
      console.warn('getUserData error:', err);
      return null;
    }
  },

  async saveUserData(userId, submissions, lastFetchedEpoch) {
    try {
      const db = await this.open();
      const cleanId = (userId || '').trim().toLowerCase();
      const record = {
        userId: cleanId,
        submissions: submissions || [],
        lastFetchedEpoch: lastFetchedEpoch || 0,
        lastUpdated: Date.now()
      };
      return new Promise((resolve) => {
        const tx = db.transaction('user_cache', 'readwrite');
        const store = tx.objectStore('user_cache');
        const req = store.put(record);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    } catch (err) {
      console.warn('saveUserData error:', err);
      return false;
    }
  },

  async getMeta(key) {
    try {
      const db = await this.open();
      return new Promise((resolve) => {
        const tx = db.transaction('meta_cache', 'readonly');
        const store = tx.objectStore('meta_cache');
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ? req.result.data : null);
        req.onerror = () => resolve(null);
      });
    } catch (err) {
      console.warn('getMeta error:', err);
      return null;
    }
  },

  async saveMeta(key, data) {
    try {
      const db = await this.open();
      return new Promise((resolve) => {
        const tx = db.transaction('meta_cache', 'readwrite');
        const store = tx.objectStore('meta_cache');
        const req = store.put({ key, data, cachedAt: Date.now() });
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    } catch (err) {
      console.warn('saveMeta error:', err);
      return false;
    }
  },

  async clearUser(userId) {
    try {
      const db = await this.open();
      const cleanId = (userId || '').trim().toLowerCase();
      return new Promise((resolve) => {
        const tx = db.transaction('user_cache', 'readwrite');
        const store = tx.objectStore('user_cache');
        const req = store.delete(cleanId);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    } catch (err) {
      return false;
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AtCoderDB;
}
