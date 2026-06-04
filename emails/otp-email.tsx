import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type OtpEmailProps = {
  code: string;
  expiresInMinutes: number;
  // Copy is parameterized so the same template serves both password-reset and
  // email-verification. Defaults preserve the original password-reset wording.
  heading?: string;
  intro?: string;
  previewLabel?: string;
  footnote?: string;
};

// Brand colors mirror the Tailwind `from-primary to-secondary` gradient used
// across the app (see components/button.tsx).
const PRIMARY = "#8e51ff";
const SECONDARY = "#e12afb";

export default function OtpEmail({
  code,
  expiresInMinutes,
  heading = "Reset your password",
  intro = "Use the verification code below to reset your password. Enter it on the password reset screen to continue.",
  previewLabel = "password reset code",
  footnote = "Didn't request a password reset? You can safely ignore this email — your password won't change.",
}: OtpEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Your BizvoraOne {previewLabel} is {code}
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
            <Heading style={headingStyle}>{heading}</Heading>
            <Text style={paragraph}>{intro}</Text>

            <Section style={codeWrap}>
              <Text style={codeText}>{code}</Text>
            </Section>

            <Text style={expiry}>
              This code expires in {expiresInMinutes} minutes. For your security,
              don&apos;t share it with anyone.
            </Text>

            <Hr style={divider} />

            <Text style={footnoteStyle}>{footnote}</Text>
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

const codeWrap: React.CSSProperties = {
  margin: "0 0 24px",
  padding: "20px",
  textAlign: "center",
  backgroundColor: "#faf5ff",
  border: "1px solid #ede9fe",
  borderRadius: "12px",
};

const codeText: React.CSSProperties = {
  margin: 0,
  color: PRIMARY,
  fontSize: "36px",
  fontWeight: 700,
  letterSpacing: "10px",
  lineHeight: "44px",
};

const expiry: React.CSSProperties = {
  margin: "0 0 24px",
  color: "#71717a",
  fontSize: "13px",
  lineHeight: "20px",
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
