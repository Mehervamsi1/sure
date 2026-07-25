import { Controller } from "@hotwired/stimulus";

// Connects to data-controller="category-cascade"
//
// Drives the dependent Parent -> Child category selects on the transaction form.
// Both DS::Select components render every option up front; picking a parent
// narrows the child list client-side from the embedded map, so there is no
// server round trip and no extra route.
//
// A parent on its own is a valid category, so whenever the child is empty the
// parent's id is mirrored into the persisted `category_id` field.
export default class extends Controller {
  static targets = ["parent", "child"];
  static values = { map: Object };

  connect() {
    this.boundOnSelect = this.onSelect.bind(this);
    this.element.addEventListener("dropdown:select", this.boundOnSelect);
    this.syncChildOptions();
  }

  disconnect() {
    this.element.removeEventListener("dropdown:select", this.boundOnSelect);
  }

  onSelect(event) {
    if (this.parentTarget.contains(event.target)) {
      // Parent changed: the previous child no longer belongs to it.
      this.#setValue(this.childTarget, "", this.#placeholderFor(this.childTarget));
      this.syncChildOptions();
      this.#mirrorParentWhenChildEmpty();
    } else if (this.childTarget.contains(event.target)) {
      this.#mirrorParentWhenChildEmpty();
    }
  }

  // Show only the subcategories belonging to the selected parent. With no
  // parent selected (or a parent that has none), the child select is emptied
  // and disabled so it cannot be opened.
  syncChildOptions() {
    const parentId = this.#valueOf(this.parentTarget);
    const allowed = (parentId && this.mapValue[parentId]) || [];

    this.#optionsOf(this.childTarget).forEach((option) => {
      const value = option.dataset.value;
      const visible = value === "" || allowed.includes(value);
      option.classList.toggle("hidden", !visible);
      option.setAttribute("aria-hidden", String(!visible));
    });

    const button = this.childTarget.querySelector("[data-select-target='button']");
    if (button) {
      const empty = allowed.length === 0;
      button.disabled = empty;
      button.classList.toggle("opacity-50", empty);
      button.classList.toggle("cursor-not-allowed", empty);
    }
  }

  // `category_id` is what gets persisted. When no subcategory is chosen the
  // parent is the category, so copy it across.
  #mirrorParentWhenChildEmpty() {
    const childInput = this.#inputOf(this.childTarget);
    if (!childInput) return;

    const selectedChild = this.#optionsOf(this.childTarget).find(
      (option) => option.getAttribute("aria-selected") === "true" && option.dataset.value !== ""
    );

    if (!selectedChild) {
      childInput.value = this.#valueOf(this.parentTarget) || "";
      childInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  #optionsOf(scope) {
    return Array.from(scope.querySelectorAll("[data-select-target='option']"));
  }

  #inputOf(scope) {
    return scope.querySelector("input[type='hidden']");
  }

  #valueOf(scope) {
    const input = this.#inputOf(scope);
    return input ? input.value : "";
  }

  #placeholderFor(scope) {
    const blank = this.#optionsOf(scope).find((option) => option.dataset.value === "");
    return blank ? blank.textContent.trim() : "";
  }

  #setValue(scope, value, label) {
    const input = this.#inputOf(scope);
    if (input) input.value = value;

    const button = scope.querySelector("[data-select-target='button']");
    if (button && label) button.textContent = label;

    this.#optionsOf(scope).forEach((option) => {
      const selected = option.dataset.value === value;
      option.setAttribute("aria-selected", String(selected));
      option.classList.toggle("bg-container-inset", selected);
      const check = option.querySelector(".check-icon");
      if (check) check.classList.toggle("hidden", !selected);
    });
  }
}
