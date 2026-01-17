import { Text } from 'ink';
import { render } from 'ink';
import { useState } from 'react';

import { useInput } from './utils/use-input';
render(<App />);

function App() {
    const [output, setOutput] = useState<string>('Press any key...\n');

    useInput((input, key, keypress) => {
        const lines = ['\x1b[2J\x1b[H', 'input:', JSON.stringify(input), '', 'key:'];

        const trueKeys = Object.entries(key).filter(([, value]) => value === true);

        for (const [k] of trueKeys) {
            lines.push(`  ${k}: true`);
        }

        if (trueKeys.length === 0) {
            lines.push('  (no true values)');
        }
        lines.push(JSON.stringify(keypress, null, 2));

        setOutput(lines.join('\n'));
    });

    return <Text>{output}</Text>;
}
