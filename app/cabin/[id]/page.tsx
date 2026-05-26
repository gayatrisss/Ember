type Params = { id: string };

type CampgroundData = {
  campground?: {
    facility_name?: string;
    parent_name?: string;
    facility_type_description?: string;
    facility_description?: string;
    facility_directions_description?: string;
    facility_ada_access?: string;
    facility_latitude?: number;
    facility_longitude?: number;
    facility_email?: string;
    facility_phone?: string;
    facility_reservable?: boolean;
    facility_rules?: Record<string, string>;
    addresses?: Array<{
      facility_street_address_1?: string;
      city?: string;
      state_code?: string;
      postal_code?: string;
      address_type?: string;
    }>;
    links?: Array<{ title?: string; url?: string }>;
    media?: Array<{ url?: string; title?: string; media_type?: string }>;
  };
};

async function fetchCabin(id: string): Promise<CampgroundData | null> {
  try {
    const res = await fetch(
      `https://www.recreation.gov/api/camps/campgrounds/${id}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function Row({ label, value }: { label: string; value?: string | number | boolean | null }) {
  if (value == null || value === "") return null;
  return (
    <div className="py-3 border-b border-white/10 flex gap-6">
      <span className="w-48 shrink-0 text-sm font-mono text-gray-400 uppercase">{label}</span>
      <span className="text-sm text-white break-words">{String(value)}</span>
    </div>
  );
}

export default async function CabinPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const data = await fetchCabin(id);
  const c = data?.campground;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 font-mono">
      <p className="text-xs text-gray-500 mb-2">recreation.gov · facility id: {id}</p>
      <h1 className="text-2xl font-bold mb-8">{c?.facility_name ?? "Unknown facility"}</h1>

      {!c && (
        <p className="text-red-400">No data returned from recreation.gov for this ID.</p>
      )}

      {c && (
        <>
          <section className="mb-8">
            <p className="text-xs text-gray-500 uppercase mb-2">Core</p>
            <Row label="Name" value={c.facility_name} />
            <Row label="Parent" value={c.parent_name} />
            <Row label="Type" value={c.facility_type_description} />
            <Row label="Reservable" value={c.facility_reservable} />
            <Row label="ADA" value={c.facility_ada_access} />
            <Row label="Latitude" value={c.facility_latitude} />
            <Row label="Longitude" value={c.facility_longitude} />
            <Row label="Email" value={c.facility_email} />
            <Row label="Phone" value={c.facility_phone} />
          </section>

          {c.addresses && c.addresses.length > 0 && (
            <section className="mb-8">
              <p className="text-xs text-gray-500 uppercase mb-2">Addresses</p>
              {c.addresses.map((a, i) => (
                <Row
                  key={i}
                  label={a.address_type ?? `address ${i}`}
                  value={[a.facility_street_address_1, a.city, a.state_code, a.postal_code].filter(Boolean).join(", ")}
                />
              ))}
            </section>
          )}

          {c.facility_description && (
            <section className="mb-8">
              <p className="text-xs text-gray-500 uppercase mb-2">Description</p>
              <p
                className="text-sm text-gray-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: c.facility_description }}
              />
            </section>
          )}

          {c.facility_directions_description && (
            <section className="mb-8">
              <p className="text-xs text-gray-500 uppercase mb-2">Directions</p>
              <p
                className="text-sm text-gray-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: c.facility_directions_description }}
              />
            </section>
          )}

          {c.links && c.links.length > 0 && (
            <section className="mb-8">
              <p className="text-xs text-gray-500 uppercase mb-2">Links</p>
              {c.links.map((l, i) => (
                <Row key={i} label={l.title ?? `link ${i}`} value={l.url} />
              ))}
            </section>
          )}

          {c.media && c.media.length > 0 && (
            <section className="mb-8">
              <p className="text-xs text-gray-500 uppercase mb-2">Media ({c.media.length})</p>
              <div className="flex flex-wrap gap-3">
                {c.media.filter((m) => m.media_type === "Image").map((m, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={m.url} alt={m.title ?? ""} className="h-40 rounded object-cover" />
                ))}
              </div>
            </section>
          )}

          <section>
            <p className="text-xs text-gray-500 uppercase mb-2">Raw JSON</p>
            <pre className="text-xs text-gray-400 bg-gray-900 p-4 rounded overflow-auto max-h-96">
              {JSON.stringify(c, null, 2)}
            </pre>
          </section>
        </>
      )}
    </div>
  );
}
