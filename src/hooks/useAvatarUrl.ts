import { useEffect, useState } from 'react';
import axios from 'axios';
import { getToken } from 'utils/axios';

const API_BASE = import.meta.env.VITE_APP_API_URL || 'http://localhost:22211';

export default function useAvatarUrl(userId?: string | null, bust?: number) {
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
        const res = await axios.get(`${API_BASE}/users/${userId}/avatar`, {
          responseType: 'blob',
          headers: { 
            Accept: 'image/*',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          params: bust ? { _: bust } : undefined
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
  }, [userId, bust]);

  return url;
}
