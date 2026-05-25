import assert from "node:assert/strict";
import test from "node:test";

import { C_C_GROUP_KEYS_ENV_VAR, buildExtensionCommandGroups, candidateKeysForLabel, commandOwnerLabel } from "../extensions/emacs-which-key.ts";

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

const packageCommand = (name, packageName) => command(name, `/pkg/${name}.ts`, { source: `npm:${packageName}@1.0.0`, origin: "package" });

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
    packageCommand("package-one", "@scope/alpha-package"),
    packageCommand("package-two", "@scope/alpha-package"),
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

test("C-c group key overrides are read from the documented environment variable", () => {
  const previous = process.env[C_C_GROUP_KEYS_ENV_VAR];
  process.env[C_C_GROUP_KEYS_ENV_VAR] = "alpha-package=d";
  try {
    const groups = buildExtensionCommandGroups([packageCommand("package-one", "@scope/alpha-package")]);
    assert.deepEqual(groups.map((group) => [group.key, group.label]), [["d", "alpha-package"]]);
  } finally {
    if (previous === undefined) {
      delete process.env[C_C_GROUP_KEYS_ENV_VAR];
    } else {
      process.env[C_C_GROUP_KEYS_ENV_VAR] = previous;
    }
  }
});

test("explicit C-c group key overrides are assigned before curated known package keys", () => {
  const groups = buildExtensionCommandGroups(
    [
      packageCommand("package-one", "@scope/alpha-package"),
      command("crew-run", "/Users/me/.pi/agent/extensions/pi-crew/index.ts", { baseDir: "/Users/me/.pi/agent/extensions/pi-crew" }),
    ],
    undefined,
    { groupKeyOverrides: "alpha-package=c" },
  );

  assert.deepEqual(
    groups.map((group) => [group.key, group.label]),
    [
      ["c", "alpha-package"],
      ["e", "pi-crew"],
    ],
  );
});

test("curated known package C-c keys are assigned before automatic fallback", () => {
  const groups = buildExtensionCommandGroups([
    command("crew-tools-run", "/Users/me/.pi/agent/extensions/crew-tools/index.ts", { baseDir: "/Users/me/.pi/agent/extensions/crew-tools" }),
    command("crew-run", "/Users/me/.pi/agent/extensions/pi-crew/index.ts", { baseDir: "/Users/me/.pi/agent/extensions/pi-crew" }),
  ]);

  assert.deepEqual(
    groups.map((group) => [group.key, group.label]),
    [
      ["t", "crew-tools"],
      ["c", "pi-crew"],
    ],
  );
});

test("command owner labels come from sourceInfo package or top-level extension", () => {
  assert.equal(commandOwnerLabel(command("crew-run", "/Users/me/.pi/agent/extensions/pi-crew/index.ts", { baseDir: "/Users/me/.pi/agent/extensions/pi-crew" })), "pi-crew");
  assert.equal(commandOwnerLabel(command("pkg-run", "/pkg/index.ts", { source: "npm:@scope/pkg-name@2.0.0", origin: "package" })), "pkg-name");
});
