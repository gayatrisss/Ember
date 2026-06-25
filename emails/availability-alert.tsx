import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";

// The "a cabin you're watching just opened up" email. Built from Figma node 2948-2034.
// Brand colors are inline (email clients can't take Tailwind utility classes).
export type AvailabilityAlertProps = {
  cabinName: string;
  dateRange: string;
  price: string | null;
  location: string | null;
  bookUrl: string;
  manageUrl: string;
  // Absolute URL to the wordmark PNG (email clients can't load relative paths). Using
  // an image instead of a webfont so the Fraunces wordmark renders identically across
  // clients (most ignore custom fonts).
  logoUrl: string;
};

// Brand tokens (mirror app/theme.css).
const NIGHT = "#0f1510";
const EMBER = "#d45a20";
const WAX = "#ede8dc";
const SMOKE = "#5f7a8a";
const SANS = "'Geist', Helvetica, Arial, sans-serif";

export function AvailabilityAlert({
  cabinName,
  dateRange,
  price,
  location,
  bookUrl,
  manageUrl,
  logoUrl,
}: AvailabilityAlertProps) {
  return (
    <Html>
      <Head />
      <Preview>{`${cabinName} is available — these re-book fast.`}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={headerBand}>
            <Img src={logoUrl} alt="ember" width={149} height={36} style={wordmark} />
          </Section>

          <Section style={card}>
            <Heading style={headline}>
              <span style={{ fontWeight: 700 }}>{cabinName}</span> is available, are you?
            </Heading>

            <DetailRow label="DATES" value={dateRange} />
            {price ? <DetailRow label="PRICE" value={price} /> : null}
            {location ? <DetailRow label="LOCATION" value={location} /> : null}

            <Button href={bookUrl} style={primaryButton}>
              Book on Recreation.gov
            </Button>
            <Button href={manageUrl} style={secondaryButton}>
              Manage alert on Ember
            </Button>

            <Text style={urgency}>⚡ These re-book fast. You have minutes, not hours. ⚡</Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              No longer interested in {cabinName}?{" "}
              <Link href={manageUrl} style={footerLink}>
                Manage your alert on Ember.
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Row style={detailRow}>
      <Column>
        <Text style={detailLabel}>{label}</Text>
      </Column>
      <Column align="right">
        <Text style={detailValue}>{value}</Text>
      </Column>
    </Row>
  );
}

const body: React.CSSProperties = { backgroundColor: "#ffffff", margin: 0, fontFamily: SANS };
const container: React.CSSProperties = { maxWidth: "600px", margin: "0 auto" };

const headerBand: React.CSSProperties = {
  backgroundColor: EMBER,
  padding: "20px 0",
  textAlign: "center",
};
const wordmark: React.CSSProperties = { display: "block", margin: "0 auto" };

const card: React.CSSProperties = { backgroundColor: WAX, padding: "32px" };
const headline: React.CSSProperties = {
  fontFamily: SANS,
  fontSize: "24px",
  lineHeight: 1.3,
  fontWeight: 400,
  color: NIGHT,
  margin: "0 0 28px",
};

const detailRow: React.CSSProperties = { marginBottom: "14px" };
const detailLabel: React.CSSProperties = {
  fontSize: "12px",
  letterSpacing: "0.08em",
  fontWeight: 600,
  color: SMOKE,
  textTransform: "uppercase",
  margin: 0,
};
const detailValue: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 700,
  color: NIGHT,
  textAlign: "right",
  margin: 0,
};

const primaryButton: React.CSSProperties = {
  backgroundColor: NIGHT,
  color: WAX,
  borderRadius: "8px",
  padding: "14px 0",
  display: "block",
  width: "100%",
  textAlign: "center",
  fontWeight: 700,
  fontSize: "16px",
  textDecoration: "none",
  marginTop: "24px",
};
const secondaryButton: React.CSSProperties = {
  backgroundColor: "transparent",
  color: NIGHT,
  border: `1px solid ${NIGHT}`,
  borderRadius: "8px",
  padding: "13px 0",
  display: "block",
  width: "100%",
  textAlign: "center",
  fontWeight: 700,
  fontSize: "16px",
  textDecoration: "none",
  marginTop: "12px",
};

const urgency: React.CSSProperties = {
  textAlign: "center",
  fontSize: "14px",
  color: NIGHT,
  marginTop: "20px",
  marginBottom: 0,
};

const footer: React.CSSProperties = { backgroundColor: "#ffffff", padding: "24px 32px" };
const footerText: React.CSSProperties = {
  fontSize: "13px",
  color: SMOKE,
  textAlign: "center",
  margin: 0,
};
const footerLink: React.CSSProperties = { color: SMOKE, textDecoration: "underline" };

export default AvailabilityAlert;
