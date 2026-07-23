"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatRate } from "@/lib/format";
import type { CabinCard, CabinFeatureProps } from "@/lib/cabins";

/**
 * Cards already fetched this session. Module-level so panning away and back to a cabin
 * re-opens instantly instead of re-hitting the API. The data is a frozen dump, so there
 * is nothing to invalidate within a session.
 */
const cardCache = new Map<string, CabinCard>();

/**
 * Fetches (or replays from cache) the detail for one cabin. The card is keyed by id at
 * the call site, so a new selection remounts this hook and the cache hit lands in the
 * initial state — no loading flash for a cabin already seen.
 */
function useCabinCard(id: string) {
  const [card, setCard] = useState<CabinCard | null>(() => cardCache.get(id) ?? null);

  useEffect(() => {
    if (cardCache.has(id)) return;

    // Guards against a stale response landing after unmount.
    let active = true;

    fetch(`/api/cabins/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: CabinCard | null) => {
        if (!data) return;
        cardCache.set(id, data);
        if (active) setCard(data);
      })
      .catch((err) => console.error("[ember] explore-card fetch failed", err));

    return () => {
      active = false;
    };
  }, [id]);

  return card;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col justify-center">
      <span className="text-label uppercase tracking-wider text-wax-muted">{label}</span>
      <span className="text-body text-wax">{value}</span>
    </div>
  );
}

/**
 * The photo. Its URL rides on the map point, so there is no "still fetching the URL"
 * state to cover — the two cases are: a photo (fade it in once its bytes load) or none
 * (a fair number of cabins have no media on rec.gov → a calm evergreen fill).
 *
 * The fade replaces the old pulsing skeleton, which was most of the visible flicker: the
 * card is remounted per selection (keyed by id), so switching cabins tore the previous
 * photo out instantly and dropped to an animated grey box. Now the new photo's fetch
 * begins at mount and eases up over the card's own evergreen when ready.
 */
function Photo({ imageUrl, name }: { imageUrl: string | null; name: string }) {
  const [loaded, setLoaded] = useState(false);

  if (!imageUrl) return <div className="h-full w-full bg-gradient-to-b from-evergreen to-night" />;

  return (
    <Image
      src={imageUrl}
      alt={name}
      fill
      onLoad={() => setLoaded(true)}
      className={`object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
    />
  );
}

type Props = {
  /** Properties carried on the clicked map dot — renders the headline before the fetch lands. */
  seed: CabinFeatureProps;
};

/**
 * Detail card for the selected cabin on /explore, rendered inside a map popup anchored
 * to the cabin's dot. Opens immediately with the name/area already on the dot, then
 * fills in the photo and facts once `/api/cabins/[id]` responds. The whole card is the
 * link to the cabin page; dismissal is handled by the map (click elsewhere, or Escape).
 *
 * Positioning belongs to the popup, not here — this renders as a plain block so it can
 * sit in any container. The popup's own chrome is neutralised in utilities.css.
 */
export function ExploreCard({ seed }: Props) {
  const card = useCabinCard(seed.id);

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
          {/* Caption comes from the resolver, not from here — see lib/facts.ts */}
          <Fact
            label={card?.capacity?.label ?? "Beds"}
            value={card?.capacity?.value ?? "—"}
          />
          {/* Price rides on the point too, so it paints instantly rather than after the
              detail request; capacity still waits on the API (num_beds isn't in the payload). */}
          <Fact label="Price" value={formatRate(seed.rate) ?? "—"} />
        </div>

        {/* Sits above the stretched link's ::after so it stays independently clickable.
            Rendered only once the URL has loaded — it must never be a dead link, since
            it is the card's only explicit affordance. */}
        {card && (
          <a
            href={card.recGovUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-10 text-label text-center text-smoke transition-colors hover:text-wax"
          >
            Full details on Recreation.gov ↗
          </a>
        )}
      </div>
    </div>
  );
}
