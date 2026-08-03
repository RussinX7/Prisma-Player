/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { I18nProvider } from "@/i18n/I18nProvider";
import AccountMenu from "@/components/dashboard/AccountMenu";

afterEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
});

describe("AccountMenu interaction", () => {
  it("abre o dropdown sem lançar erro no cliente", async () => {
    act(() => {
      createRoot(document.body.appendChild(document.createElement("div"))).render(
        <I18nProvider>
          <AccountMenu />
        </I18nProvider>
      );
    });

    const trigger = document.querySelector('[data-slot="dropdown-menu-trigger"]') as HTMLButtonElement;
    expect(trigger).toBeTruthy();

    const errors: unknown[] = [];
    window.addEventListener("error", (e) => { errors.push(e.error ?? e.message); });

    act(() => {
      trigger.click();
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    const content = document.querySelector('[data-slot="dropdown-menu-content"]');
    console.log("CONTENT PRESENT:", Boolean(content));
    console.log("ERRORS:", errors.length ? String(errors[0]) : "none");
    expect(errors).toHaveLength(0);
  });
});
