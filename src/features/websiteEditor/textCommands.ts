export const TEXT_COMMAND_EVENT = "website-editor:text-command";
export type TextCommand = "bold" | "italic" | "underline" | "strikeThrough";

export function dispatchTextCommand(elementId: string, command: TextCommand) {
  const dispatch = (target: Window) => {
    const CustomEventConstructor = (target as Window & { CustomEvent: typeof CustomEvent }).CustomEvent;
    target.dispatchEvent(new CustomEventConstructor(TEXT_COMMAND_EVENT, { detail: { elementId, command } }));
  };
  dispatch(window);
  Array.from(document.querySelectorAll("iframe")).forEach((frame) => {
    const view = frame.contentWindow;
    if (view) dispatch(view);
  });
}


