import { CustomEditor, DynamicBorder, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Container, Editor, matchesKey, Text, visibleWidth } from "@earendil-works/pi-tui";

type Prefix = "C-x" | "C-c" | "C-h" | "M-x" | "C-h k";

type Binding = {
  key: string;
  label: string;
  description: string;
  run: (editor: any) => void;
};

const WIDGET_ID = "emacs-which-key";

export default function (pi: ExtensionAPI) {
  function ctrl(letter: string): string {
    return `ctrl+${letter}`;
  }

  function alt(letter: string): string {
    return `alt+${letter}`;
  }

  function isPrintable(data: string): boolean {
    return data.length === 1 && data.charCodeAt(0) >= 32;
  }

  function keyMatches(data: string, key: string): boolean {
    if (key.length === 1) return data === key;
    return matchesKey(data, key);
  }

  function isEscape(data: string): boolean {
    return data === "\x1b" || matchesKey(data, "escape");
  }

  function isCtrlG(data: string): boolean {
    return data === "\x07" || matchesKey(data, ctrl("g"));
  }

  function isCancel(data: string): boolean {
    return isEscape(data) || isCtrlG(data);
  }

  function keyLabel(data: string): string {
    const named: Array<[string, string]> = [
      [ctrl("a"), "C-a"],
      [ctrl("b"), "C-b"],
      [ctrl("c"), "C-c"],
      [ctrl("d"), "C-d"],
      [ctrl("e"), "C-e"],
      [ctrl("f"), "C-f"],
      [ctrl("g"), "C-g"],
      [ctrl("h"), "C-h"],
      [ctrl("j"), "C-j"],
      [ctrl("k"), "C-k"],
      [ctrl("l"), "C-l"],
      [ctrl("n"), "C-n"],
      [ctrl("o"), "C-o"],
      [ctrl("p"), "C-p"],
      [ctrl("t"), "C-t"],
      [ctrl("u"), "C-u"],
      [ctrl("v"), "C-v"],
      [ctrl("w"), "C-w"],
      [ctrl("x"), "C-x"],
      [ctrl("y"), "C-y"],
      [alt("b"), "M-b"],
      [alt("d"), "M-d"],
      [alt("f"), "M-f"],
      [alt("y"), "M-y"],
      [alt("x"), "M-x"],
      ["escape", "ESC"],
      ["enter", "RET"],
      ["tab", "TAB"],
      ["backspace", "BACKSPACE"],
      ["delete", "DELETE"],
      ["up", "UP"],
      ["down", "DOWN"],
      ["left", "LEFT"],
      ["right", "RIGHT"],
    ];

    for (const [key, label] of named) {
      if (matchesKey(data, key)) return label;
    }

    if (isPrintable(data)) return data;
    return JSON.stringify(data);
  }

  class EmacsWhichKeyEditor extends CustomEditor {
    private prefix: Prefix | null = null;
    private lastKeyDescription = "";
    private panelVisible = false;
    private readonly ctx: any;

    constructor(tui: any, theme: any, keybindings: any, ctx: any) {
      super(tui, theme, keybindings);
      this.ctx = ctx;
    }

    handleInput(data: string): void {
      if (isCtrlG(data)) {
        this.clearPrefix();
        return;
      }

      if (this.prefix === "C-h k") {
        this.describeKey(data);
        return;
      }

      if (this.prefix) {
        this.dispatchPrefixed(data);
        return;
      }

      if (isEscape(data) && this.panelVisible) {
        this.hidePanel();
        return;
      }

      if (matchesKey(data, ctrl("x"))) {
        this.showPrefix("C-x");
        return;
      }

      if (matchesKey(data, ctrl("c"))) {
        this.showPrefix("C-c");
        return;
      }

      if (matchesKey(data, ctrl("h"))) {
        this.showPrefix("C-h");
        return;
      }

      if (matchesKey(data, alt("x"))) {
        this.openCommandPrompt();
        return;
      }

      if (this.panelVisible) {
        this.hidePanel();
      }

      const translated = this.translateEmacsKey(data);
      if (translated !== undefined) {
        this.editorHandleInput(translated);
        return;
      }

      if (this.isEmacsEditorKey(data)) {
        this.editorHandleInput(data);
        return;
      }

      super.handleInput(data);
    }

    private translateEmacsKey(data: string): string | undefined {
      if (matchesKey(data, ctrl("n"))) return "\x1b[B";
      if (matchesKey(data, ctrl("p"))) return "\x1b[A";
      if (matchesKey(data, ctrl("b"))) return "\x1b[D";
      if (matchesKey(data, ctrl("f"))) return "\x1b[C";
      return undefined;
    }

    private editorHandleInput(data: string): void {
      Editor.prototype.handleInput.call(this, data);
    }

    private isEmacsEditorKey(data: string): boolean {
      return [
        ctrl("a"),
        ctrl("d"),
        ctrl("e"),
        ctrl("j"),
        ctrl("k"),
        ctrl("w"),
        ctrl("y"),
        alt("b"),
        alt("d"),
        alt("f"),
        alt("y"),
      ].some((key) => matchesKey(data, key));
    }

    private showPrefix(prefix: Prefix): void {
      this.prefix = prefix;
      this.renderWhichKey(prefix);
    }

    private clearPrefix(): void {
      this.prefix = null;
      this.hidePanel();
    }

    private hidePanel(): void {
      this.panelVisible = false;
      this.ctx.ui.setWidget(WIDGET_ID, undefined);
    }

    private dispatchPrefixed(data: string): void {
      if (isCancel(data)) {
        this.clearPrefix();
        return;
      }

      const bindings = this.bindingsFor(this.prefix!);
      const binding = bindings.find((candidate) => keyMatches(data, candidate.key));
      if (!binding) {
        this.lastKeyDescription = `${this.prefix} ${keyLabel(data)} is undefined`;
        this.renderWhichKey(this.prefix!);
        this.ctx.ui.notify(this.lastKeyDescription, "warning");
        this.clearPrefix();
        return;
      }

      this.lastKeyDescription = `${this.prefix} ${binding.label}: ${binding.description}`;
      this.clearPrefix();
      binding.run(this);
    }

    private describeKey(data: string): void {
      this.clearPrefix();
      if (isCancel(data)) return;

      const label = keyLabel(data);
      const direct = this.describeDirectKey(data);
      const prefixed = [...this.bindingsFor("C-x"), ...this.bindingsFor("C-c"), ...this.bindingsFor("C-h")]
        .filter((binding) => keyMatches(data, binding.key))
        .map((binding) => `${binding.label}: ${binding.description}`);

      const lines = [
        `Key: ${label}`,
        direct ? `Direct: ${direct}` : undefined,
        ...prefixed.map((text) => `Prefix: ${text}`),
        !direct && prefixed.length === 0 ? "No direct binding known to emacs-which-key." : undefined,
      ].filter((line): line is string => Boolean(line));

      this.setPanel("describe-key", lines);
      this.ctx.ui.notify(lines.join("\n"), "info");
    }

    private describeDirectKey(data: string): string | undefined {
      const descriptions: Array<[string, string]> = [
        [ctrl("a"), "beginning-of-line"],
        [ctrl("b"), "backward-char"],
        [ctrl("c"), "control-c prefix"],
        [ctrl("d"), "delete-char"],
        [ctrl("e"), "end-of-line"],
        [ctrl("f"), "forward-char"],
        [ctrl("g"), "keyboard-quit"],
        [ctrl("h"), "help prefix"],
        [ctrl("j"), "newline"],
        [ctrl("k"), "kill-line"],
        [ctrl("n"), "next-line"],
        [ctrl("p"), "previous-line"],
        [ctrl("w"), "kill-word-backward"],
        [ctrl("x"), "control-x prefix"],
        [ctrl("y"), "yank"],
        [alt("b"), "backward-word"],
        [alt("d"), "kill-word"],
        [alt("f"), "forward-word"],
        [alt("y"), "yank-pop"],
        [alt("x"), "execute-extended-command"],
      ];
      return descriptions.find(([key]) => matchesKey(data, key))?.[1];
    }

    private renderWhichKey(prefix: Prefix): void {
      const bindings = this.bindingsFor(prefix);
      const title = prefix === "M-x" ? "M-x execute-extended-command" : `${prefix} prefix`;
      const maxKey = Math.max(...bindings.map((binding) => visibleWidth(binding.label)), 1);
      const lines = bindings.map((binding) => `${binding.label.padEnd(maxKey)}  ${binding.description}`);
      this.setPanel(title, lines, this.lastKeyDescription || "C-g / ESC  cancel");
    }

    private setPanel(title: string, lines: string[], footer?: string): void {
      this.panelVisible = true;
      this.ctx.ui.setWidget(
        WIDGET_ID,
        (_tui: any, theme: any) => {
          const container = new Container();
          container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));
          container.addChild(new Text(theme.fg("accent", theme.bold(title)), 1, 0));
          container.addChild(new Text(lines.join("\n"), 1, 0));
          if (footer) container.addChild(new Text(theme.fg("dim", footer), 1, 0));
          container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));
          return container;
        },
        { placement: "belowEditor" },
      );
    }

    private bindingsFor(prefix: Prefix): Binding[] {
      if (prefix === "C-h k") return [];

      if (prefix === "C-c") {
        return [
          { key: "h", label: "h", description: "handoff session (/handoff)", run: (editor) => editor.runSlash("/handoff") },
          { key: "r", label: "r", description: "reload Pi resources (/reload)", run: (editor) => editor.runSlash("/reload") },
          { key: "q", label: "q", description: "hide emacs-which-key panel", run: (editor) => editor.hidePanel() },
          { key: "?", label: "?", description: "show this C-c menu", run: (editor) => editor.renderWhichKey("C-c") },
        ];
      }

      if (prefix === "M-x") {
        return [
          { key: "?", label: "?", description: "show this which-key menu", run: (editor) => editor.renderWhichKey("M-x") },
          { key: ctrl("g"), label: "C-g", description: "cancel", run: (editor) => editor.clearPrefix() },
        ];
      }

      if (prefix === "C-h") {
        return [
          { key: "b", label: "b", description: "show Pi hotkeys (/hotkeys)", run: (editor) => editor.runSlash("/hotkeys") },
          { key: "k", label: "k", description: "describe next key", run: (editor) => editor.showPrefix("C-h k") },
          { key: "m", label: "m", description: "show emacs-which-key status", run: (editor) => editor.showStatus() },
          { key: "q", label: "q", description: "hide emacs-which-key panel", run: (editor) => editor.hidePanel() },
          { key: "?", label: "?", description: "show this help menu", run: (editor) => editor.renderWhichKey("C-h") },
        ];
      }

      return [
        { key: ctrl("c"), label: "C-c", description: "quit Pi", run: () => this.ctx.shutdown() },
        { key: ctrl("e"), label: "C-e", description: "open external editor", run: (editor) => editor.forwardKey(ctrl("g")) },
        { key: "b", label: "b", description: "resume/switch session (/resume)", run: (editor) => editor.runSlash("/resume") },
        { key: "k", label: "k", description: "new session (/new)", run: (editor) => editor.runSlash("/new") },
        { key: "t", label: "t", description: "session tree (/tree)", run: (editor) => editor.runSlash("/tree") },
        { key: "f", label: "f", description: "fork session (/fork)", run: (editor) => editor.runSlash("/fork") },
        { key: "s", label: "s", description: "session info (/session)", run: (editor) => editor.runSlash("/session") },
        { key: "m", label: "m", description: "model selector (/model)", run: (editor) => editor.runSlash("/model") },
        { key: "p", label: "p", description: "scoped models (/scoped-models)", run: (editor) => editor.runSlash("/scoped-models") },
        { key: "o", label: "o", description: "toggle tool output", run: (editor) => editor.forwardKey(ctrl("o")) },
        { key: "g", label: "g", description: "keyboard quit / cancel", run: (editor) => editor.clearPrefix() },
        { key: "?", label: "?", description: "show this which-key menu", run: (editor) => editor.renderWhichKey("C-x") },
      ];
    }

    private forwardKey(key: string): void {
      this.clearPrefix();
      const raw: Record<string, string> = {
        [ctrl("o")]: "\x0f",
        [ctrl("g")]: "\x07",
      };
      super.handleInput(raw[key] ?? key);
    }

    private openCommandPrompt(): void {
      if (this.getText().trim().length > 0) {
        this.ctx.ui.notify("M-x left your draft untouched. Clear the editor first to open / command completion.", "warning");
        return;
      }
      this.clearPrefix();
      // Feed '/' through the native editor path instead of setText('/'), so Pi's
      // slash-command autocomplete opens just like when the user types '/'.
      this.editorHandleInput("/");
    }

    private runSlash(command: string): void {
      if (this.getText().trim().length > 0) {
        this.ctx.ui.notify(`Draft is not empty; not running ${command}. Clear the editor and try again.`, "warning");
        return;
      }
      this.setText(command);
      super.handleInput("\r");
    }

    private showStatus(): void {
      this.setPanel("emacs-which-key status", [
        "Enabled: C-x, C-c, C-h prefixes; M-x slash commands.",
        "C-g is keyboard-quit. C-x C-e opens external editor.",
        "This package does not overwrite keybindings.json.",
      ]);
      this.ctx.ui.notify("emacs-which-key is enabled", "info");
    }
  }

  pi.on("session_start", (_event: any, ctx: any) => {
    ctx.ui.setEditorComponent((tui: any, theme: any, keybindings: any) => new EmacsWhichKeyEditor(tui, theme, keybindings, ctx));
    ctx.ui.setStatus("emacs", ctx.ui.theme.fg("accent", "Emacs keys"));
  });

  pi.on("session_shutdown", (_event: any, ctx: any) => {
    ctx.ui.setWidget(WIDGET_ID, undefined);
    ctx.ui.setStatus("emacs", undefined);
    ctx.ui.setEditorComponent(undefined);
  });
}
