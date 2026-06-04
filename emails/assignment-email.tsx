import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type AssignmentEmailProps = {
  recipientName: string;
  actorName: string;
  // "lead" | "customer" | "project" — used in the copy.
  entityLabel: string;
  entityName: string;
  actionUrl: string;
};

// Brand colors mirror the Tailwind `from-primary to-secondary` gradient used
// across the app (see emails/otp-email.tsx).
const PRIMARY = "#8e51ff";
const SECONDARY = "#e12afb";

export default function AssignmentEmail({
  recipientName,
  actorName,
  entityLabel,
  entityName,
  actionUrl,
}: AssignmentEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {actorName} assigned you a {entityLabel}: {entityName}
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Section
            style={{
              ...header,
              backgroundImage: `linear-gradient(to right, ${PRIMARY}, ${SECONDARY})`,
            }}
          >
            <Text style={brand}>BizvoraOne</Text>
          </Section>

          <Section style={content}>
            <Heading style={headingStyle}>
              You&apos;ve been assigned a {entityLabel}
            </Heading>
            <Text style={paragraph}>
              Hi {recipientName}, {actorName} assigned you the {entityLabel}{" "}
              <strong>{entityName}</strong>. Open it in BizvoraOne to take a
              look.
            </Text>

            <Section style={buttonWrap}>
              <Button
                href={actionUrl}
                style={{
                  ...buttonStyle,
                  backgroundImage: `linear-gradient(to right, ${PRIMARY}, ${SECONDARY})`,
                }}
              >
                Open {entityLabel}
              </Button>
            </Section>

            <Hr style={divider} />

            <Text style={footnoteStyle}>
              You&apos;re receiving this because you were assigned this{" "}
              {entityLabel} in BizvoraOne.
            </Text>
          </Section>
        </Container>

        <Text style={footer}>
          © {new Date().getFullYear()} BizvoraOne. All rights reserved.
        </Text>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  margin: 0,
  padding: "32px 0",
  backgroundColor: "#f4f4f5",
  fontFamily:
    "'Rubik', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

const container: React.CSSProperties = {
  maxWidth: "480px",
  margin: "0 auto",
  backgroundColor: "#ffffff",
  borderRadius: "16px",
  overflow: "hidden",
  border: "1px solid #e4e4e7",
};

const header: React.CSSProperties = {
  padding: "28px 32px",
  textAlign: "center",
};

const brand: React.CSSProperties = {
  margin: 0,
  color: "#ffffff",
  fontSize: "22px",
  fontWeight: 700,
  letterSpacing: "-0.02em",
};

const content: React.CSSProperties = {
  padding: "32px",
};

const headingStyle: React.CSSProperties = {
  margin: "0 0 12px",
  color: "#18181b",
  fontSize: "20px",
  fontWeight: 600,
};

const paragraph: React.CSSProperties = {
  margin: "0 0 24px",
  color: "#52525b",
  fontSize: "14px",
  lineHeight: "22px",
};

const buttonWrap: React.CSSProperties = {
  margin: "0 0 24px",
  textAlign: "center",
};

const buttonStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "12px 28px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 600,
  borderRadius: "10px",
  textDecoration: "none",
};

const divider: React.CSSProperties = {
  margin: "0 0 20px",
  border: "none",
  borderTop: "1px solid #e4e4e7",
};

const footnoteStyle: React.CSSProperties = {
  margin: 0,
  color: "#a1a1aa",
  fontSize: "12px",
  lineHeight: "18px",
};

const footer: React.CSSProperties = {
  margin: "24px auto 0",
  textAlign: "center",
  color: "#a1a1aa",
  fontSize: "11px",
};
