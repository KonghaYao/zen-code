import notifier from 'node-notifier';

export const notify = (message: string) => {
    notifier.notify({
        title: 'Zen Code',
        message: message,
    });
};
