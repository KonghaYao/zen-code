#!/usr/bin/env node
import { Command } from 'commander';
import { startServer } from './server/index.js';
import { startClient } from './client/index.js';

const program = new Command();

program.name('zen-tunnel').description('SSH reverse port forwarding tunnel tool').version('0.1.0');

program
    .command('server')
    .description('Start the tunnel control server (run on the public server)')
    .option('-p, --port <number>', 'Control server listen port', '9000')
    .option('-u, --user <username>', 'SSH login username shown in connection hint')
    .action(async (opts) => {
        await startServer({ port: parseInt(opts.port, 10), user: opts.user });
    });

program
    .command('client')
    .description('Connect to tunnel server and establish reverse SSH port forward')
    .requiredOption('-s, --server <host>', 'SSH server hostname or IP, e.g. example.com')
    .requiredOption('-l, --local-port <number>', 'Local service port to expose')
    .requiredOption('-r, --remote-port <number>', 'Port to open on the remote server')
    .option('-u, --user <username>', 'SSH login username (defaults to current OS user)')
    .option('-c, --control-port <number>', 'Control server port', '9000')
    .option('--ssh-port <number>', 'SSH port on the server', '22')
    .option('-i, --identity-file <path>', 'SSH identity file (private key)')
    .action(async (opts) => {
        await startClient({
            server: opts.server,
            user: opts.user,
            localPort: parseInt(opts.localPort, 10),
            remotePort: parseInt(opts.remotePort, 10),
            controlPort: parseInt(opts.controlPort, 10),
            sshPort: parseInt(opts.sshPort, 10),
            identityFile: opts.identityFile,
        });
    });

program.parse();
