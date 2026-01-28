import { beforeEach, describe, expect, it, vi } from "vitest";

const textSpy = vi.hoisted(() => vi.fn().mockReturnThis());

vi.mock("grammy", () => ({
  InlineKeyboard: class {
    text = textSpy;
  },
}));

import {
  createMultyCancelButton,
  parseMultyCancelCallbackData,
} from "./cancel.js";

describe("multy cancel helpers", () => {
  beforeEach(() => {
    textSpy.mockClear();
  });

  it("builds cancel callback with owner id", () => {
    createMultyCancelButton({ runId: "run-1", ownerId: 42 });
    expect(textSpy).toHaveBeenCalledWith(
      "Отменить",
      "multy:cancel:u42:run-1",
    );
  });

  it("parses callback data variants", () => {
    expect(parseMultyCancelCallbackData("multy:cancel:run-1")).toEqual({
      runId: "run-1",
    });
    expect(parseMultyCancelCallbackData("multy:cancel:u123:run-2")).toEqual({
      runId: "run-2",
      ownerId: 123,
    });
    expect(parseMultyCancelCallbackData("multy:cancel:123:run-3")).toEqual({
      runId: "run-3",
      ownerId: 123,
    });
    expect(parseMultyCancelCallbackData("multy:cancel:")).toBeNull();
    expect(parseMultyCancelCallbackData("nope")).toBeNull();
  });
});
