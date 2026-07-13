"use client";

export default function YearSlicer({
  years,
  selected,
  onChange,
}: {
  years: number[];
  selected: number | "all";
  onChange: (value: number | "all") => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange("all")}
        className={`rounded-full px-3 py-1 text-xs font-medium ${
          selected === "all" ? "bg-ocean-dark text-white" : "bg-sand text-foreground/70 hover:bg-sand-dark/60"
        }`}
      >
        All years
      </button>
      {years.map((y) => (
        <button
          key={y}
          type="button"
          onClick={() => onChange(y)}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            selected === y ? "bg-ocean-dark text-white" : "bg-sand text-foreground/70 hover:bg-sand-dark/60"
          }`}
        >
          {y}
        </button>
      ))}
    </div>
  );
}
