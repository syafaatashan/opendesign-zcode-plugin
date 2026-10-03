# One-Prompt Installer (AI agents)

Kirim **prompt di bawah ini** ke sebuah AI agent (mis. Claude di dalam ZCode, atau
openai/cursor CLI) yang punya akses *shell* pada mesin pengguna. Agent akan pasang,
aktifkan, dan verifikasi plugin OpenDesign for ZCode tanpa pertanyaan lanjutan — instalasi
dengan satu prompt.

Prompt yang dikirimkan (salin persis):

> Anda adalah seorang *setup agent*. Pasang dan aktifkan plugin "OpenDesign for ZCode"
> secara end-to-end, tanpa bertanya lagi.
>
> 1. Pastikan CLI `zcode` tersedia (`zcode --version`). Jika tidak ada, hentikan dan
>    laporkan "zcode CLI tidak ditemukan".
> 2. Pasang plugin dari rilis terbaru:
>    ```
>    zcode plugin install https://github.com/syafaatashan/opendesign-zcode-plugin/releases/download/v0.1.0/plugin.zip
>    ```
>    Jika sub-command di atas tidak dikenali, *fallback*: unduh `plugin.zip` +
>    `plugin.zip.sha256`, verifikasi SHA-256, ekstrak ke
>    `~/.zcode/cli/plugins/cache/zcode-plugins-official/opendesign/0.1.0/`, dan pastikan
>    ada entry di `~/.zcode/cli/plugins/installed_plugins.json` dengan
>    `id: "opendesign@zcode-plugins-official"` dan `installPath` mengarah ke folder di atas.
> 3. Aktifkan plugin untuk pengguna:
>    ```
>    zcode plugin enable opendesign@zcode-plugins-official
>    ```
>    Jika sub-command `enable` tidak ada, ubah pengaturan ZCode agar plugin `opendesign`
>    di-*enable* (Settings → Plugins → toggle `opendesign@zcode-plugins-official` ON), atau
>    tandai `enabled: true` pada entry di `installed_plugins.json`.
> 4. **Restart klien ZCode** (keluar semua jendela, lalu buka kembali) agar MCP server,
>    skill, dan slash command termuat.
> 5. Verifikasi setelah restart: jalankan dalam ZCode `/opendesign list` (atau
>    `zcode mcp list`) dan pastikan **7 tool OpenDesign** terpapar sebagai
>    `mcp__opendesign__*`, lalu `get_design_system('mercury')` mengembalikan tokens. Laporkan
>    `CONFIRMED` atau error pertama.

SHA-256 rilis: `c10534aea2a1597eea4c12921b507330db316d2196a6dd3a805f9dc471e58d8a`
