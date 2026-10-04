/**
 * Editorial heading: the display face for the statement, the final word set in a serif
 * italic — "I BUILD *systems.*", "BUILDING *toward*". Pass the plain heading text.
 */
export function Editorial({ text }: { text: string }) {
  const words = text.trim().split(/\s+/);
  const last = words.pop() ?? '';
  return (
    <>
      {words.length > 0 && <span className="ed-d">{words.join(' ')} </span>}
      <em className="ed-s">{last.toLowerCase()}</em>
    </>
  );
}
