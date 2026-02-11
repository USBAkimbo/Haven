// ═══════════════════════════════════════════════════════════
// Haven — Multi-Server Manager
// See other Haven servers in your sidebar with live status
// ═══════════════════════════════════════════════════════════

class ServerManager {
  constructor() {
    this.servers = this._load();
    this.statusCache = new Map();
    this.checkInterval = null;
  }

  _load() {
    try {
      return JSON.parse(localStorage.getItem('haven_servers') || '[]');
    } catch { return []; }
  }

  _save() {
    localStorage.setItem('haven_servers', JSON.stringify(this.servers));
  }

  add(name, url) {
    url = url.replace(/\/+$/, '');
    if (!/^https?:\/\//.test(url)) url = 'https://' + url;
    if (this.servers.find(s => s.url === url)) return false;

    this.servers.push({ name, url, addedAt: Date.now() });
    this._save();
    this.checkServer(url);
    return true;
  }

  remove(url) {
    this.servers = this.servers.filter(s => s.url !== url);
    this.statusCache.delete(url);
    this._save();
  }

  getAll() {
    return this.servers.map(s => ({
      ...s,
      status: this.statusCache.get(s.url) || { online: null, name: s.name }
    }));
  }

  async checkServer(url) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`${url}/api/health`, {
        signal: controller.signal,
        mode: 'cors'
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        this.statusCache.set(url, {
          online: true,
          name: data.name || url,
          version: data.version,
          checkedAt: Date.now()
        });
      } else {
        this.statusCache.set(url, { online: false, checkedAt: Date.now() });
      }
    } catch {
      this.statusCache.set(url, { online: false, checkedAt: Date.now() });
    }
  }

  async checkAll() {
    await Promise.allSettled(this.servers.map(s => this.checkServer(s.url)));
  }

  startPolling(intervalMs = 30000) {
    this.checkAll();
    this.checkInterval = setInterval(() => this.checkAll(), intervalMs);
  }

  stopPolling() {
    if (this.checkInterval) clearInterval(this.checkInterval);
  }
}
