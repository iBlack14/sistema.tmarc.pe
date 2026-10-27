// Mantiene las llamadas existentes y adjunta la sesión sólo al mismo origen.
(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, options = {}) => {
        const url = new URL(input instanceof Request ? input.url : input, location.href);
        if (url.origin === location.origin && (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/'))) {
            const headers = new Headers(input instanceof Request ? input.headers : undefined);
            new Headers(options.headers).forEach((value, key) => headers.set(key, value));
            const token = typeof window.getSecureItem === 'function'
                ? await window.getSecureItem('authToken') : sessionStorage.getItem('authToken');
            if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
            options = { ...options, headers };
        }
        return originalFetch(input, options);
    };
    window.clearApiSession = async () => {
        try { await window.fetch('/api/auth/logout', { method: 'POST', signal: AbortSignal.timeout(5000) }); }
        catch (_) { /* El cierre local continúa si el servidor está desconectado. */ }
    };
})();
