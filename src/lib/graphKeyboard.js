/** Move the roving keyboard focus through nodes followed by connections. */
export function nextGraphItem(items, currentItem, direction) {
  if (items.length < 2 || ![-1, 1].includes(direction)) return null;
  const currentIndex = items.findIndex(
    (item) => item.kind === currentItem.kind && item.id === currentItem.id,
  );
  if (currentIndex === -1) return null;
  const nextIndex = (currentIndex + direction + items.length) % items.length;
  return items[nextIndex];
}
