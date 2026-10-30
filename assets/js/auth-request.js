// Tiempo máximo para login, verificación y reenvío, incluyendo la lectura de la respuesta.
(() => {
    window.requestAuth = async (endpoint, payload, timeoutMs = 25000) => {
        const controller = new AbortController();
        let timer;
        const deadline = new Promise((_, reject) => {
            timer = setTimeout(() => {
                const error = new Error('El servidor no respondió a tiempo. Intente nuevamente. Si continúa, contacte a soporte.');
                error.code = 'AUTH_TIMEOUT';
                reject(error);
                controller.abort();
            }, timeoutMs);
        });
        const request = (async () => {
            const response = await fetch(endpoint, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload), signal: controller.signal
            });
            let data;
            try { data = await response.json(); }
            catch (_) { throw new Error(`El servidor devolvió una respuesta inválida (HTTP ${response.status}). Intente nuevamente.`); }
            if (!response.ok || !data || typeof data !== 'object') {
                throw new Error(data?.error || data?.message || `No se pudo completar el acceso (HTTP ${response.status}).`);
            }
            return data;
        })();
        try { return await Promise.race([request, deadline]); }
        catch (error) {
            if (error.code === 'AUTH_TIMEOUT' || error.message && error.name !== 'TypeError') throw error;
            throw new Error('No se pudo conectar con el servidor. Revise su conexión e intente nuevamente.');
        } finally { clearTimeout(timer); }
    };
})();
