# One-Prompt Installer (untuk AI agent di dalam ZCode)

Prompt di bawah ini **dikhususkan untuk ZCode**: kirim ke sebuah AI agent yang berjalan *di
dalam klien ZCode* (asisten ZCode yang dapat mengakses *shell* + CLI `zcode`). Agent akan
memasang, mengaktifkan, dan memverifikasi plugin OpenDesign for ZCode secara end-to-end
tanpa pertanyaan lanjutan — instalasi dengan satu prompt.

> Catatan: agen berjalan **di dalam** ZCode, jadi ia memakai CLI/env `zcode` dan *shell*
> yang tersedia di sesi ZCode. Restart ZCode dilakukan oleh agen (sesi ini akan reload);
> verifikasi dilakukan di sesi ZCode yang baru setelah plugin aktif.

Prompt yang dikirimkan (salin persis):

> Anda adalah seorang *setup agent* di dalam klien ZCode. Pasang dan aktifkan plugin
> "OpenDesign for ZCode" secara end-to-end, tanpa bertanya lagi.
>
> 1. Pastikan CLI `zcode` tersedia (`zcode --version`). Jika tidak ada, hentikan dan
>    laporkan "zcode CLI tidak ditemukan".
> 2. Pasang plugin langsung dari rilis (ZCode mendukung instalasi dari URL zip):
>    ```
>    zcode plugin install https://github.com/syafaatashan/opendesign-zcode-plugin/releases/download/v0.1.0/plugin.zip
>    ```
>    Jika sub-command di atas tidak dikenali, *fallback*: unduh `plugin.zip` +
>    `plugin.zip.sha256` (verifikasi SHA-256), ekstrak ke
>    `~/.zcode/cli/plugins/cache/zcode-plugins-official/opendesign/0.1.0/`, dan pastikan
>    ada entry di `~/.zcode/cli/plugins/installed_plugins.json` dengan
>    `id: "opendesign@zcode-plugins-official"` + `installPath` ke folder di atas
>    (ini cara ZCode mendaftarkan plugin cache).
> 3. Aktifkan plugin untuk pengguna:
>    ```
>    zcode plugin enable opendesign@zcode-plugins-official
>    ```
>    Jika sub-command `enable` tidak ada, buka ZCode Settings → Plugins, toggle
>    `opendesign@zcode-plugins-official` ke ON, atau tandai `enabled: true` pada entry di
>    `installed_plugins.json`.
> 4. **Restart ZCode** (keluar semua jendela, buka kembali) agar MCP server, skill, dan
>    slash command termuat — agen akan reload; lanjutkan verifikasi setelahnya.
> 5. Verifikasi setelah restart: di ZCode, ketik `/opendesign list` (atau periksen
>    `zcode mcp list`) dan pastikan **7 tool OpenDesign** terpapar sebagai
>    `mcp__opendesign__*`, lalu jalankan `get_design_system('mercury')` dan pastikan
>    mengembalikan tokens. Laporkan `CONFIRMED` atau error pertama.

SHA-256 rilis `plugin.zip`: `c10534aea2a1597eea4c12921b507330db316d2196a6dd3a805f9dc471e58d8a`
