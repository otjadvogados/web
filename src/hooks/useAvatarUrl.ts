import { useEffect, useState } from 'react';
import axios from 'axios';
import { getToken } from 'utils/axios';

const API_BASE = import.meta.env.VITE_APP_API_URL || 'http://localhost:22211';

export default function useAvatarUrl(userId?: string | null, avatarFileId?: string | null) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function load() {
      if (!userId) {
        setUrl(null);
        return;
      }
      try {
        const token = getToken();
        
        // Monta URL com versão estável para cache HTTP forte
        const href = new URL(`${API_BASE}/users/${userId}/avatar`);
        if (avatarFileId) {
          href.searchParams.set('v', avatarFileId);
        }

        const res = await axios.get(href.toString(), {
          responseType: 'blob',
          headers: { 
            Accept: 'image/*',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });

        // opcional: sanity check
        if (res.status !== 200 || !(res.data instanceof Blob) || res.data.size === 0) {
          throw new Error(`Avatar HTTP ${res.status} / blob vazio`);
        }

        objectUrl = URL.createObjectURL(res.data);
        if (!cancelled) setUrl(objectUrl);
      } catch (e) {
        console.error('Falha ao carregar avatar:', e);
        if (!cancelled) setUrl(null);
      }
    }

    load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [userId, avatarFileId]);

  return url;
}
