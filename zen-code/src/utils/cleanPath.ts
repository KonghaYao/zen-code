export const cleanPath = (path?: string) => {
    return path?.replace(process.cwd(), '.') || path || '';
};
