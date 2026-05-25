# pi-emacs-which-key

Emacs-style editing and prefix-key discoverability for Pi's interactive editor.

## Features

- `C-g` universal cancel / keyboard-quit for this editor extension.
- `C-x`, `C-c`, `C-h`, and `M-x` prefix maps.
- Native Pi TUI which-key panel using `Container`, `Text`, and `DynamicBorder`.
- Emacs movement/editing keys such as `C-n`, `C-p`, `C-a`, `C-e`, `M-f`, `M-b`, `C-k`, `C-y`, `M-y`.

## Key map

- `C-x b` → `/resume`
- `C-x k` → `/new`
- `C-x t` → `/tree`
- `C-x f` → `/fork`
- `C-x s` → `/session`
- `C-x m` → `/model`
- `C-x p` → `/scoped-models`
- `C-x o` → toggle tool output
- `C-x C-e` → external editor
- `C-x C-c` → quit Pi
- `C-c /` → open Pi slash command completion
- `C-c <letter>` → extension/package command submenu (letters are assigned from meaningful extension/package names)
- `C-c r` → `/reload`
- `C-h b` → `/hotkeys`
- `C-h k` → describe next key
- `C-h m` → extension status
- `M-x` → open Pi slash-command completion

## Install

```bash
pi install npm:pi-emacs-which-key
```

Then in Pi:

```text
/reload
```

## Development install

```bash
pi install /path/to/pi-emacs-which-key
```

Or run for one session without installing:

```bash
pi -e /path/to/pi-emacs-which-key/extensions/emacs-which-key.ts
```

## Hierarchical C-c menus

`C-c` keeps Pi utility entries at the top level and groups extension commands by their owning extension/package:

```text
C-c /   native Pi slash-command completion
C-c r   reload Pi resources (/reload)
C-c ?   show the top-level C-c menu
C-c c   pi-crew extension commands, for example
C-c p   pi-permission-system extension commands, for example
```

Group letters come from meaningful extension/package names. If a letter is already used, emacs-which-key tries the next meaningful letter before falling back to the alphabet. Inside a group submenu, `q` goes back to the top-level `C-c` menu and `/` opens native slash completion.

## Optional selector keybindings

The extension handles `C-n` / `C-p` in Pi's editor and slash-command completion. For Pi's other built-in selection dialogs such as `/model` and `/resume`, add this to `~/.pi/agent/keybindings.json` if you want Emacs navigation there too:

```json
{
  "tui.select.up": ["up", "ctrl+p"],
  "tui.select.down": ["down", "ctrl+n"]
}
```

Then run `/reload`.

## Notes

This package uses Pi extension APIs and native Pi TUI components. It is intentionally editor-local: it does not overwrite your global `keybindings.json`.
