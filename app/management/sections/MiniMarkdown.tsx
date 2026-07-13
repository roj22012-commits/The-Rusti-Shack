function renderInline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={`${keyPrefix}-${i}`}>{part}</span>
    )
  );
}

export default function MiniMarkdown({ text }: { text: string }) {
  const blocks = text.split(/\n\n+/);
  return (
    <div className="space-y-2">
      {blocks.map((block, bi) => {
        const lines = block.split("\n").filter(Boolean);
        const isTable = lines.length > 1 && lines.every((l) => l.trim().startsWith("|"));
        if (isTable) {
          const rows = lines
            .filter((l) => !/^\|[\s-:|]+\|$/.test(l.trim()))
            .map((l) =>
              l
                .trim()
                .replace(/^\||\|$/g, "")
                .split("|")
                .map((c) => c.trim())
            );
          const [header, ...body] = rows;
          return (
            <table key={bi} className="w-full text-left text-xs">
              <thead className="bg-sand/60">
                <tr>
                  {header.map((h, i) => (
                    <th key={i} className="px-2 py-1 font-medium">
                      {renderInline(h, `${bi}-h-${i}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, ri) => (
                  <tr key={ri} className="border-t border-sand-dark/30">
                    {row.map((c, ci) => (
                      <td key={ci} className="px-2 py-1">
                        {renderInline(c, `${bi}-${ri}-${ci}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        }
        return (
          <p key={bi} className="leading-relaxed">
            {lines.map((line, li) => (
              <span key={li}>
                {renderInline(line, `${bi}-${li}`)}
                {li < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
