import { BaseMessage } from 'langchain';

export function getBufferMessage(messages: BaseMessage[], humanPrefix = 'Human', aiPrefix = 'AI') {
    const string_messages = [];
    for (const m of messages) {
        let role;
        if (m.type === 'human') role = humanPrefix;
        else if (m.type === 'ai') role = aiPrefix;
        else if (m.type === 'system') role = 'System';
        else if (m.type === 'tool') role = 'Tool';
        else if (m.type === 'generic') {
            /** @ts-ignore */
            role = m.role;
        } else throw new Error(`Got unsupported message type: ${m.type}`);
        const nameStr = m.name ? `${m.name}, ` : '';
        const readableContent = typeof m.content === 'string' ? m.content : JSON.stringify(m.content, null, 2);
        string_messages.push(`${role}: ${nameStr}${readableContent}`);
    }
    return string_messages.join('\n');
}
