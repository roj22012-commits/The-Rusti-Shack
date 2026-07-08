import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Apo Island | The Rusti Shack",
  description:
    "How to get to Apo Island, the marine sanctuary that makes it worth the trip, and where The Rusti Shack fits in.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-sm font-medium uppercase tracking-widest text-ocean-dark/70">
        About the island
      </p>
      <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">
        Apo Island
      </h1>

      <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-2xl bg-sand">
        <Image
          src="/images/products/SNK-001-clear-life.jpg"
          alt="Snorkeler over the reef at Apo Island"
          fill
          className="object-cover"
        />
      </div>

      <div className="prose prose-neutral mt-8 max-w-none text-base leading-relaxed text-foreground/90">
        <p>
          Apo Island is a small volcanic island off the southern tip of Negros
          Oriental, in the Philippines. It has been a protected marine
          sanctuary for decades, one of the oldest community-managed marine
          reserves in the country, which is why the reef right off our shack
          still looks the way it did before any of us were born. Green sea
          turtles are the headline act, but the reef wall, the schools of
          jack, and the coral itself are worth the trip on their own.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-ocean-dark">
          Getting here by bangka
        </h2>
        <p>
          Most visitors reach Apo Island the same way locals do: a bangka, an
          outrigger boat, from the mainland. The most common jump-off points
          are Malatapay and Zamboanguita, a short tricycle or habal-habal ride
          south of Dumaguete, with the crossing itself taking well under an
          hour in calm weather. Boats can also be arranged from Dauin. Many
          visitors book a bangka through their resort or a dive shop the day
          before, since it depends on tides and weather.
        </p>
        <p>
          Once you&apos;re on the island, everything is a short walk from the
          landing beach — including us. Look for The Rusti Shack; if you rent
          gear here in person, you can walk straight from the shack into the
          water.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-ocean-dark">
          A note on the sanctuary
        </h2>
        <p>
          There is usually a small marine sanctuary fee collected on arrival,
          which goes directly to protecting the reef you&apos;re about to
          snorkel over. Reef-safe sunscreen is worth packing (we carry it too)
          — the same reef that makes the trip worthwhile is a living thing
          that visitors are asked to help look after.
        </p>
      </div>
    </div>
  );
}
