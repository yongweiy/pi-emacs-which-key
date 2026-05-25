import assert from "node:assert/strict";
import test from "node:test";

import { buildExtensionCommandGroups, candidateKeysForLabel, commandOwnerLabel } from "../extensions/emacs-which-key.ts";

const command = (name, path, sourceInfo = {}) => ({
  name,
  source: "extension",
  sourceInfo: {
    path,
    source: "local",
    origin: "top-level",
    baseDir: path.replace(/\/[^/]+$/, ""),
    ...sourceInfo,
  },
});

test("candidate keys skip generic pi token and fall through to meaningful letters", () => {
  assert.deepEqual(candidateKeysForLabel("pi-crew").slice(0, 4), ["c", "r", "e", "w"]);
  assert.equal(buildExtensionCommandGroups([command("reload", "/x/reload-helper.ts")]).at(0)?.key, "h");
});

test("extension commands are grouped by extension/package provenance", () => {
  const groups = buildExtensionCommandGroups([
    command("crew-run", "/Users/me/.pi/agent/extensions/pi-crew/index.ts", { baseDir: "/Users/me/.pi/agent/extensions/pi-crew" }),
    command("crew-stop", "/Users/me/.pi/agent/extensions/pi-crew/index.ts", { baseDir: "/Users/me/.pi/agent/extensions/pi-crew" }),
    command("permission-review", "/Users/me/.pi/agent/extensions/pi-permission-system/index.ts", {
      baseDir: "/Users/me/.pi/agent/extensions/pi-permission-system",
    }),
    command("package-one", "/pkg/a.ts", { source: "npm:@scope/alpha-package@1.0.0", origin: "package" }),
    command("package-two", "/pkg/b.ts", { source: "npm:@scope/alpha-package@1.0.0", origin: "package" }),
    { name: "prompt-template", source: "prompt" },
  ]);

  assert.deepEqual(
    groups.map((group) => [group.key, group.label, group.commands.map((entry) => entry.name)]),
    [
      ["a", "alpha-package", ["package-one", "package-two"]],
      ["c", "pi-crew", ["crew-run", "crew-stop"]],
      ["p", "pi-permission-system", ["permission-review"]],
    ],
  );
});

test("command owner labels come from sourceInfo package or top-level extension", () => {
  assert.equal(commandOwnerLabel(command("crew-run", "/Users/me/.pi/agent/extensions/pi-crew/index.ts", { baseDir: "/Users/me/.pi/agent/extensions/pi-crew" })), "pi-crew");
  assert.equal(commandOwnerLabel(command("pkg-run", "/pkg/index.ts", { source: "npm:@scope/pkg-name@2.0.0", origin: "package" })), "pkg-name");
});
