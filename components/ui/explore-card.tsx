"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { CabinFeatureProps } from "@/lib/cabins";

/**
 * One label/value pair. The value is null when the field came back empty → "—".
 * Everything shown here is already resolved on the server (see CabinFeatureProps), so
 * there is no loading state — the card renders complete the instant a dot is selected.
 */
function Fact({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col justify-center">
      <span className="text-label uppercase tracking-wider text-wax-muted">{label}</span>
      <span className="text-body text-wax">{value ?? "—"}</span>
    </div>
  );
}

/**
 * The photo — the one thing that isn't instant, because it's an external CDN image. Fade
 * it in once its bytes load (over the card's own evergreen); a cabin with no photo gets a
 * calm evergreen→night fill instead.
 */
function Photo({ imageUrl, name }: { imageUrl: string | null; name: string }) {
  const [loaded, setLoaded] = useState(false);

  if (!imageUrl) return <div className="h-full w-full bg-gradient-to-b from-evergreen to-night" />;

  return (
    <Image
      src={imageUrl}
      alt={name}
      fill
      // The card is a fixed 300px (w-copy-wide), so the optimizer serves ~300px (and 2x
      // for retina) instead of the 1440px source — see next.config.ts.
      sizes="300px"
      onLoad={() => setLoaded(true)}
      className={`object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
    />
  );
}

type Props = {
  /** Everything the card renders, carried pre-resolved on the clicked map dot. */
  seed: CabinFeatureProps;
};

/**
 * Detail card for the selected cabin on /explore, rendered inside a map popup anchored to
 * the cabin's dot. Every field comes pre-resolved from the map payload, so the card is
 * complete on selection — only the photo fades in. The whole card links to the Ember
 * page; dismissal is handled by the map (click elsewhere, or Escape).
 *
 * Positioning belongs to the popup, not here — this renders as a plain block so it can
 * sit in any container. The popup's own chrome is neutralised in utilities.css.
 */
export function ExploreCard({ seed }: Props) {
  return (
    // Stretched-link pattern: the container is not a link. The cabin name holds the real
    // link to the Ember page and its ::after spans the whole card, so the entire surface
    // is clickable without nesting the rec.gov anchor inside another <a>.
    <div className="group relative flex w-copy-wide flex-col overflow-hidden rounded-lg bg-evergreen shadow-ember-md transition-shadow hover:shadow-ember-lg">
      {/* rounded-t-lg + overflow-hidden here, not just on the Link, so the photo is
          clipped by its own box. Relying on the ancestor's clip alone leaves the
          antialiased edge sitting on the popup's composited layer boundary (mapbox sets
          will-change: transform), and the basemap bleeds through it as a light hairline.
          Clipped here, any softness blends into the card's own evergreen instead. */}
      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-t-lg bg-evergreen">
        <Photo imageUrl={seed.imageUrl} name={seed.name} />
      </div>

      <div className="flex flex-col gap-6 p-4">
        <div className="flex flex-col gap-1">
          {seed.area && (
            <span className="text-label uppercase tracking-wider text-wax-muted">{seed.area}</span>
          )}
          <h2 className="text-display-fraunces-sm text-wax">
            {/* The stretched link: spans the whole card via ::after, and underlines on
                hover so the card reads as interactive despite having no visible CTA. */}
            <Link
              href={`/cabin/${seed.id}`}
              className="after:absolute after:inset-0 after:content-[''] group-hover:underline underline-offset-4 decoration-1"
            >
              {seed.name}
            </Link>
          </h2>
        </div>

        <div className="flex gap-6 whitespace-nowrap">
          {/* capacityLabel is null only when neither bed count nor occupancy is known
              (~14 cabins); fall back to a neutral "Beds" header over the "—". */}
          <Fact label={seed.capacityLabel ?? "Beds"} value={seed.capacityValue} />
          <Fact label="Price" value={seed.price} />
        </div>

        {/* Sits above the stretched link's ::after (z-10) so it stays independently
            clickable — the card's only explicit affordance. */}
        <a
          href={seed.recGovUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="relative z-10 text-label text-center text-smoke transition-colors hover:text-wax"
        >
          Full details on Recreation.gov ↗
        </a>
      </div>
    </div>
  );
}
