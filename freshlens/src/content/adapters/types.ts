export interface SiteAdapter {
  id: string;
  name: string;
  matches(url: string): boolean;
  findAssistantMessages(root: ParentNode): HTMLElement[];
  messageId(el: HTMLElement): string;
  isStreaming(el: HTMLElement): boolean;
  getInputBox(): HTMLElement | null;
  insertPrompt(text: string): boolean;
  getAnchorForOverlay(el: HTMLElement): HTMLElement;
}
