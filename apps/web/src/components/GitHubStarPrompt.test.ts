import { describe, expect, it, vi } from "vite-plus/test";

import type { toastManager } from "./ui/toast";

const { add, update, openExternal, commands, page, runCommand } = vi.hoisted(() => ({
  runCommand: vi.fn(),
  add: vi.fn<typeof toastManager.add>(),
  update: vi.fn<typeof toastManager.update>(),
  openExternal: vi.fn(async (_url: string) => {}),
  commands: { checkStarred: {}, star: {} },
  page: {
    focused: true,
    activeElement: null as { matches: (selector: string) => boolean } | null,
    events: new EventTarget(),
  },
}));
vi.mock("./ui/toast", () => ({ toastManager: { add, update, close: vi.fn() } }));
vi.mock("../localApi", () => ({ readLocalApi: () => ({ shell: { openExternal } }) }));
vi.mock("../rpc/atomRegistry", () => ({ appAtomRegistry: {} }));
vi.mock("../state/sourceControl", () => ({ sourceControlEnvironment: commands }));
vi.mock("@t3tools/client-runtime/state/runtime", () => ({
  runAtomCommand: runCommand,
}));

const IDLE_MS = 30_000;

function setup({ sent = 0, writable = true } = {}) {
  runCommand.mockClear();
  add.mockReset();
  update.mockReset();
  openExternal.mockClear();
  page.focused = true;
  page.activeElement = null;
  page.events = new EventTarget();
  const store = new Map([["t3code:github-star-prompt:sent", String(sent)]]);
  vi.stubGlobal("document", {
    hasFocus: () => page.focused,
    get activeElement() {
      return page.activeElement;
    },
  });
  vi.stubGlobal("window", {
    addEventListener: page.events.addEventListener.bind(page.events),
    removeEventListener: page.events.removeEventListener.bind(page.events),
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (!writable) throw new Error("QuotaExceededError");
        store.set(key, value);
      },
    },
  });
  return store;
}

// A fresh module import stands in for an app reload; storage survives it.
async function startSession() {
  vi.resetModules();
  const session = await import("./GitHubStarPrompt");
  return {
    // Sends a prompt, then leaves the page idle long enough to ask.
    send: async () => {
      const sent = session.recordPromptSent();
      await vi.advanceTimersByTimeAsync(IDLE_MS);
      await sent;
    },
    sendWithoutWaiting: () => void session.recordPromptSent(),
  };
}

// The toast's handlers ignore their click event.
const click = (props: unknown) => (props as { onClick: () => unknown }).onClick();

describe("recordPromptSent", () => {
  vi.useFakeTimers();

  it("asks only after the focused page is idle", async () => {
    setup({ sent: 5 });
    (await startSession()).sendWithoutWaiting();
    await vi.advanceTimersByTimeAsync(IDLE_MS - 1);
    page.events.dispatchEvent(new Event("keydown"));
    await vi.advanceTimersByTimeAsync(IDLE_MS - 1);
    expect(add).not.toHaveBeenCalled();

    page.focused = false;
    await vi.advanceTimersByTimeAsync(IDLE_MS);
    expect(add).not.toHaveBeenCalled();

    page.focused = true;
    page.activeElement = { matches: (selector) => selector.includes("iframe") };
    page.events.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(IDLE_MS);
    expect(add).not.toHaveBeenCalled();

    page.activeElement = null;
    page.events.dispatchEvent(new Event("pointerdown"));
    await vi.advanceTimersByTimeAsync(IDLE_MS);
    expect(add).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it("asks after five prompts, once per session, and never again once closed", async () => {
    setup();
    let session = await startSession();
    for (let sent = 0; sent < 5; sent++) await session.send();
    expect(add).not.toHaveBeenCalled();

    await session.send();
    await session.send();
    expect(add).toHaveBeenCalledOnce();

    session = await startSession();
    await session.send();
    expect(add).toHaveBeenCalledTimes(2);

    add.mock.lastCall?.[0].onClose?.();
    session = await startSession();
    for (let sent = 0; sent < 10; sent++) await session.send();
    expect(add).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });

  it("never asks when a dismissal could not be saved", async () => {
    setup({ sent: 5, writable: false });
    await (await startSession()).send();
    expect(add).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("honors a dismissal from another tab during the idle wait", async () => {
    const store = setup({ sent: 5 });
    (await startSession()).sendWithoutWaiting();
    store.set("t3code:github-star-prompt:dismissed", "true");
    await vi.advanceTimersByTimeAsync(IDLE_MS);
    expect(add).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
  it("opens GitHub on click without reading or using host account credentials", async () => {
    setup({ sent: 5 });
    await (await startSession()).send();
    click(add.mock.lastCall?.[0].actionProps);
    expect(openExternal).toHaveBeenCalledWith("https://github.com/pingdotgg/t3code");
    expect(runCommand).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
