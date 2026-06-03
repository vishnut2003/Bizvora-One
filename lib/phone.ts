import { COUNTRIES } from "@/lib/countries";

// Country dial codes keyed by the same ISO codes used in lib/countries.ts.
// Kept Mongoose-free so client components can import it. Multi-digit NANP
// codes (e.g. 1242 Bahamas) are intentional so longest-prefix parsing can
// distinguish them from plain +1.
const DIAL_BY_ISO: Record<string, string> = {
  AF: "93", AL: "355", DZ: "213", AD: "376", AO: "244", AG: "1268",
  AR: "54", AM: "374", AU: "61", AT: "43", AZ: "994", BS: "1242",
  BH: "973", BD: "880", BB: "1246", BY: "375", BE: "32", BZ: "501",
  BJ: "229", BT: "975", BO: "591", BA: "387", BW: "267", BR: "55",
  BN: "673", BG: "359", BF: "226", BI: "257", KH: "855", CM: "237",
  CA: "1", CV: "238", CF: "236", TD: "235", CL: "56", CN: "86",
  CO: "57", KM: "269", CG: "242", CD: "243", CR: "506", CI: "225",
  HR: "385", CU: "53", CY: "357", CZ: "420", DK: "45", DJ: "253",
  DM: "1767", DO: "1809", EC: "593", EG: "20", SV: "503", GQ: "240",
  ER: "291", EE: "372", SZ: "268", ET: "251", FJ: "679", FI: "358",
  FR: "33", GA: "241", GM: "220", GE: "995", DE: "49", GH: "233",
  GR: "30", GD: "1473", GT: "502", GN: "224", GW: "245", GY: "592",
  HT: "509", HN: "504", HU: "36", IS: "354", IN: "91", ID: "62",
  IR: "98", IQ: "964", IE: "353", IL: "972", IT: "39", JM: "1876",
  JP: "81", JO: "962", KZ: "7", KE: "254", KI: "686", KW: "965",
  KG: "996", LA: "856", LV: "371", LB: "961", LS: "266", LR: "231",
  LY: "218", LI: "423", LT: "370", LU: "352", MG: "261", MW: "265",
  MY: "60", MV: "960", ML: "223", MT: "356", MH: "692", MR: "222",
  MU: "230", MX: "52", FM: "691", MD: "373", MC: "377", MN: "976",
  ME: "382", MA: "212", MZ: "258", MM: "95", NA: "264", NR: "674",
  NP: "977", NL: "31", NZ: "64", NI: "505", NE: "227", NG: "234",
  KP: "850", MK: "389", NO: "47", OM: "968", PK: "92", PW: "680",
  PS: "970", PA: "507", PG: "675", PY: "595", PE: "51", PH: "63",
  PL: "48", PT: "351", QA: "974", RO: "40", RU: "7", RW: "250",
  KN: "1869", LC: "1758", VC: "1784", WS: "685", SM: "378", ST: "239",
  SA: "966", SN: "221", RS: "381", SC: "248", SL: "232", SG: "65",
  SK: "421", SI: "386", SB: "677", SO: "252", ZA: "27", KR: "82",
  SS: "211", ES: "34", LK: "94", SD: "249", SR: "597", SE: "46",
  CH: "41", SY: "963", TW: "886", TJ: "992", TZ: "255", TH: "66",
  TL: "670", TG: "228", TO: "676", TT: "1868", TN: "216", TR: "90",
  TM: "993", TV: "688", UG: "256", UA: "380", AE: "971", GB: "44",
  US: "1", UY: "598", UZ: "998", VU: "678", VA: "379", VE: "58",
  VN: "84", YE: "967", ZM: "260", ZW: "263",
};

export type PhoneCountry = { code: string; name: string; dial: string };

// Countries that have a dial code, in the same order as COUNTRIES.
export const PHONE_COUNTRIES: PhoneCountry[] = COUNTRIES.flatMap((c) => {
  const dial = DIAL_BY_ISO[c.code];
  return dial ? [{ code: c.code, name: c.name, dial }] : [];
});

export const DEFAULT_PHONE_COUNTRY = "IN";

const DEFAULT_DIAL = DIAL_BY_ISO[DEFAULT_PHONE_COUNTRY] ?? "91";

// Dial codes longest-first so prefix matching prefers e.g. "1242" over "1".
const COUNTRIES_BY_DIAL_LENGTH = [...PHONE_COUNTRIES].sort(
  (a, b) => b.dial.length - a.dial.length,
);

export function dialForCode(code: string): string {
  return DIAL_BY_ISO[code] ?? DEFAULT_DIAL;
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

// Build the stored value, e.g. ("IN", "98765 43210") -> "+919876543210".
// Returns "" when there is no national number so optional phones stay empty
// rather than collapsing to a bare dial code.
export function combinePhone(code: string, national: string): string {
  const digits = digitsOnly(national);
  if (!digits) return "";
  return `+${dialForCode(code)}${digits}`;
}

// Parse a stored value back into a country + national number for editing.
// "+919876543210" -> { code: "IN", national: "9876543210" }. Falls back to
// the default country for legacy values stored without a leading "+".
export function splitPhone(stored: string | null | undefined): {
  code: string;
  national: string;
} {
  const raw = (stored ?? "").trim();
  if (!raw) return { code: DEFAULT_PHONE_COUNTRY, national: "" };

  if (raw.startsWith("+")) {
    const rest = digitsOnly(raw);
    const match = COUNTRIES_BY_DIAL_LENGTH.find((c) => rest.startsWith(c.dial));
    if (match) {
      return { code: match.code, national: rest.slice(match.dial.length) };
    }
    return { code: DEFAULT_PHONE_COUNTRY, national: rest };
  }

  return { code: DEFAULT_PHONE_COUNTRY, national: digitsOnly(raw) };
}
