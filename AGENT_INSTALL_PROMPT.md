# One-Prompt Installer (for an AI agent inside ZCode)

Send the prompt below to an AI agent running **inside the ZCode client** (a ZCode assistant
with shell + `zcode` CLI access). The agent will install, enable, and verify the OpenDesign for
ZCode plugin end to end with no further questions — installation by a single prompt.

> Note: the agent runs *inside* ZCode, so it uses the CLI/environment available in the ZCode
> session. Restarting ZCode is performed by the agent (this session reloads); verification is
> done in the new session once the plugin is active.

The prompt to send (copy verbatim):

> You are a setup agent inside the ZCode client. Install and enable the "OpenDesign for ZCode"
> plugin end to end, and ask no further questions.
>
> 1. Confirm the `zcode` CLI is available (`zcode --version`). If not, stop and report
>    "zcode CLI not found".
> 2. Install the plugin from the release (ZCode supports installing from a zip URL):
>    ```
>    zcode plugin install https://github.com/syafaatashan/opendesign-zcode-plugin/releases/download/v0.1.0/plugin.zip
>    ```
>    If that subcommand is not recognized, fall back: download `plugin.zip` +
>    `plugin.zip.sha256` (verify the SHA-256), extract into
>    `~/.zcode/cli/plugins/cache/zcode-plugins-official/opendesign/0.1.0/`, and make sure an
>    entry exists in `~/.zcode/cli/plugins/installed_plugins.json` with
>    `id: "opendesign@zcode-plugins-official"` and `installPath` pointing at that folder, so
>    ZCode registers the plugin.
> 3. Enable the plugin for the user:
>    ```
>    zcode plugin enable opendesign@zcode-plugins-official
>    ```
>    If the `enable` subcommand does not exist, toggle it in ZCode Settings → Plugins
>    (`opendesign@zcode-plugins-official` → ON), or set `enabled: true` on the
>    `installed_plugins.json` entry.
> 4. **Restart the ZCode client** (close all windows and relaunch) so the MCP server, skills,
>    and slash commands load — this session reloads; continue verification afterwards.
> 5. After restart, verify: in ZCode run `/opendesign list` (or `zcode mcp list`) and confirm
>    **7 OpenDesign tools** are exposed as `mcp__opendesign__*`, then run
>    `get_design_system('mercury')` and confirm it returns tokens. Report `CONFIRMED` or the
>    first error.

SHA-256 of the release `plugin.zip`: `c10534aea2a1597eea4c12921b507330db316d2196a6dd3a805f9dc471e58d8a`
