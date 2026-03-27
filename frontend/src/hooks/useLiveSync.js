import { useEffect } from 'react';

export default function useLiveSync(onUpdate) {
  useEffect(() => {
    const token = localStorage.getItem('lca_hub_token');
    const url = token ? `/api/events-stream?t=${token}` : '/api/events-stream';
    const es = new EventSource(url);
    es.addEventListener('change', () => onUpdate());
    return () => es.close();
  }, []);
}
