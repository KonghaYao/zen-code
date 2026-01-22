import { useState, useEffect } from 'react';

export function useConfig() {
  const [config, setConfig] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        setConfig(data);
        setLoading(false);
      });
  }, []);

  const updateConfig = async (updates: any) => {
    const response = await fetch('/api/config', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    const newConfig = await response.json();
    setConfig(newConfig);
  };

  return { config, loading, updateConfig };
}
