export default function Footer() {
  return (
    <footer className="border-t border-sand-dark/60 bg-sand/60">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-foreground/70 sm:px-6">
        <p className="font-semibold text-ocean-dark">The Rusti Shack</p>
        <p className="mt-1">Apo Island, Negros Oriental, Philippines</p>
        <p className="mt-4 text-xs text-foreground/50">
          &copy; {new Date().getFullYear()} The Rusti Shack. Rentals available on the island only.
        </p>
      </div>
    </footer>
  );
}
