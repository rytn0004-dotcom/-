export interface SavedMmdFileEntry {
  name: string;
  relativePath: string;
  type: string;
  blob: Blob;
}

export interface SavedMmdRecord {
  id: string;
  name: string;
  savedAt: number;
  totalBytes: number;
  fileCount: number;
  files: SavedMmdFileEntry[];
}

export interface SavedMmdSummary {
  id: string;
  name: string;
  savedAt: number;
  totalBytes: number;
  fileCount: number;
}

const DB_NAME = 'WuWaStudioMmdVault';
const DB_VERSION = 1;
const STORE_NAME = 'mmd_models';

function openMmdDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('此瀏覽器不支援 IndexedDB 本機保存功能'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('無法開啟 MMD 本機模型庫'));
  });
}

/**
 * Saves an imported MMD (.pmx + textures + spa) folder into browser IndexedDB
 * so it persists across page reloads without needing to re-select files.
 */
export async function saveMmdFolderToVault(
  name: string,
  files: FileList | File[],
): Promise<SavedMmdSummary> {
  const fileArr = Array.from(files);
  const kept: SavedMmdFileEntry[] = [];
  let totalBytes = 0;

  for (const f of fileArr) {
    const lower = f.name.toLowerCase();
    // Only persist PMX + image textures + README to keep storage lean & fast
    if (!/\.(pmx|png|jpg|jpeg|webp|bmp|gif|tga|txt)$/.test(lower)) continue;
    totalBytes += f.size;
    kept.push({
      name: f.name,
      relativePath: (f as any).webkitRelativePath || f.name,
      type: f.type || 'application/octet-stream',
      blob: f,
    });
  }

  const normalizedId = name.trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff_-]+/g, '_') || `mmd_${Date.now()}`;
  const record: SavedMmdRecord = {
    id: normalizedId,
    name: name.trim() || 'MMD 模型',
    savedAt: Date.now(),
    totalBytes,
    fileCount: kept.length,
    files: kept,
  };

  const db = await openMmdDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('保存 MMD 模型失敗'));
  });
  db.close();

  return {
    id: record.id,
    name: record.name,
    savedAt: record.savedAt,
    totalBytes: record.totalBytes,
    fileCount: record.fileCount,
  };
}

/**
 * Lists all saved MMD models (metadata only, fast) sorted newest-first.
 */
export async function listSavedMmdModels(): Promise<SavedMmdSummary[]> {
  try {
    const db = await openMmdDb();
    const list = await new Promise<SavedMmdSummary[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = (req.result || []) as SavedMmdRecord[];
        resolve(
          rows
            .map((r) => ({
              id: r.id,
              name: r.name,
              savedAt: r.savedAt,
              totalBytes: r.totalBytes,
              fileCount: r.fileCount,
            }))
            .sort((a, b) => b.savedAt - a.savedAt),
        );
      };
      req.onerror = () => reject(req.error);
    });
    db.close();
    return list;
  } catch {
    return [];
  }
}

/**
 * Loads a saved MMD model from IndexedDB and reconstructs File objects with webkitRelativePath
 * so loadPmxFolderModel can parse it identically to a fresh folder selection.
 */
export async function loadSavedMmdModelFiles(id: string): Promise<{ name: string; files: File[] } | null> {
  const db = await openMmdDb();
  const record = await new Promise<SavedMmdRecord | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result as SavedMmdRecord | undefined);
    req.onerror = () => reject(req.error);
  });
  db.close();

  if (!record || !record.files || record.files.length === 0) return null;

  const files: File[] = record.files.map((entry) => {
    const f = new File([entry.blob], entry.name, { type: entry.type });
    try {
      Object.defineProperty(f, 'webkitRelativePath', {
        value: entry.relativePath,
        writable: false,
      });
    } catch {
      // Ignore if environment disallows redefining property
    }
    return f;
  });

  return { name: record.name, files };
}

/**
 * Deletes a saved MMD model from IndexedDB.
 */
export async function deleteSavedMmdModel(id: string): Promise<void> {
  const db = await openMmdDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
