const TEXT_ENTRY_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export function isTextEntryTarget(element) {
  return TEXT_ENTRY_TAGS.has(element?.tagName) || Boolean(element?.isContentEditable);
}

export function isCommentShortcut(event, activeElement) {
  if (event.key?.toLowerCase() !== 'c') return false;
  if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return false;
  if (isTextEntryTarget(activeElement)) return false;
  return true;
}
