/**
 * Notify utility tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notify, notifyWithDefaultTitle } from './notify';

// Mock node-notifier
vi.mock('node-notifier', () => ({
    default: {
        notify: vi.fn(),
    },
}));

import notifier from 'node-notifier';

describe('notify', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should accept string message', () => {
        notify('Test message');

        expect(notifier.notify).toHaveBeenCalledTimes(1);
        expect(notifier.notify).toHaveBeenCalledWith({
            title: 'Notification',
            message: 'Test message',
        });
    });

    it('should accept NotifyOptions object', () => {
        notify({
            title: 'Custom Title',
            message: 'Test message',
            sound: false,
        });

        expect(notifier.notify).toHaveBeenCalledTimes(1);
        expect(notifier.notify).toHaveBeenCalledWith({
            title: 'Custom Title',
            message: 'Test message',
            sound: false,
        });
    });

    it('should use default title when not provided', () => {
        notify({
            message: 'Test message',
        });

        expect(notifier.notify).toHaveBeenCalledTimes(1);
        expect(notifier.notify).toHaveBeenCalledWith({
            title: 'Notification',
            message: 'Test message',
            sound: true, // default sound
        });
    });

    it('should pass icon option', () => {
        const iconPath = '/path/to/icon.png';

        notify({
            title: 'Title',
            message: 'Message',
            icon: iconPath,
        });

        expect(notifier.notify).toHaveBeenCalledWith({
            title: 'Title',
            message: 'Message',
            icon: iconPath,
            sound: true,
        });
    });

    it('should enable sound by default', () => {
        notify({
            title: 'Title',
            message: 'Message',
        });

        expect(notifier.notify).toHaveBeenCalledWith(
            expect.objectContaining({
                sound: true,
            }),
        );
    });

    it('should allow disabling sound', () => {
        notify({
            title: 'Title',
            message: 'Message',
            sound: false,
        });

        expect(notifier.notify).toHaveBeenCalledWith(
            expect.objectContaining({
                sound: false,
            }),
        );
    });
});

describe('notifyWithDefaultTitle', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should send notification with default title when not provided', () => {
        notifyWithDefaultTitle('Test message');

        expect(notifier.notify).toHaveBeenCalledTimes(1);
        expect(notifier.notify).toHaveBeenCalledWith({
            title: 'Notification', // notify function defaults to 'Notification'
            message: 'Test message',
            icon: undefined,
            sound: true,
        });
    });

    it('should allow custom title', () => {
        notifyWithDefaultTitle('Test message', 'Custom Title');

        expect(notifier.notify).toHaveBeenCalledTimes(1);
        expect(notifier.notify).toHaveBeenCalledWith({
            title: 'Custom Title',
            message: 'Test message',
            icon: undefined,
            sound: true,
        });
    });
});
