import { useState } from 'react';

export function useAgent() {
  const [messages, setMessages] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (message: string) => {
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: message },
    ]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/invoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: { messages: [{ role: 'user', content: message }] },
        }),
      });

      const result = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: result.output || 'No response',
        },
      ]);
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Error: Failed to get response',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return { messages, sendMessage, isLoading };
}
