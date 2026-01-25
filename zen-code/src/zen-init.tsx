import { render } from 'ink';
import { SetupWizard } from './setup/SetupWizard';
import { initDb } from './chat/store/index';

async function main() {
    await initDb();
    render(<SetupWizard />);
}

main();
