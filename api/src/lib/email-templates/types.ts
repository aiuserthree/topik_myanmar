export type EmailLocale = "ko" | "my" | "en";

export type BlockType =
  | "paragraph"
  | "code"
  | "infoTable"
  | "notice"
  | "reasonBox"
  | "steps";

export interface EmailBlock {
  type: BlockType;
  text?: string;
  label?: string;
  value?: string;
  sub?: string;
  mono?: boolean;
  tone?: "info" | "warn" | "negative";
  title?: string;
  reason?: string;
  rows?: [string, string][];
  items?: string[];
  showWhen?: Record<string, string>;
}

export interface EmailCta {
  label: string;
  href: string;
  kind: "primary" | "secondary";
}

export interface LocaleContent {
  subject: string;
  preheader: string;
  eyebrowKo: string;
  eyebrowEn: string;
  indexNo: string;
  h1: string;
  intro: string;
  blocks: EmailBlock[];
  ctas: EmailCta[];
}

export interface EmailTemplateDef {
  key: string;
  templateKey: string;
  subject?: string;
  preheader?: string;
  eyebrowKo?: string;
  eyebrowEn?: string;
  indexNo?: string;
  h1?: string;
  intro?: string;
  blocks?: EmailBlock[];
  ctas?: EmailCta[];
  badge?: string;
  marketing?: boolean;
  variables?: string[];
  i18n?: Partial<Record<EmailLocale, LocaleContent>>;
}

export interface EmailTheme {
  id: string;
  font: string;
  mono: string;
  pageBg: string;
  cardBg: string;
  ink: string;
  body: string;
  sub: string;
  primary: string;
  primaryDark: string;
  onPrimary: string;
  accentTint: string;
  line: string;
  cardRadius: number;
  btnRadius: number;
  codeRadius: number;
  noticeRadius: number;
  cardPad: number;
  outerPad: number;
  headerStyle: "band" | "white" | "minimal";
  headerBg: string;
  headerInk: string;
  topStripe: string;
  eyebrowStyle: "rule" | "pill" | "caps";
  btnStyle: "solid" | "arrow";
  footerStyle: "light" | "dark";
  useEnEyebrow: boolean;
  status: { positive: string; warn: string; negative: string };
  statusTint: { positive: string; warn: string; negative: string };
}

export type TemplateKey =
  | "signup_verify_code"
  | "password_reset"
  | "application_approved"
  | "application_rejected"
  | "photo_rejected"
  | "temp_password"
  | "temp_password_admin"
  | "board_refund_received"
  | "board_admin_new_post"
  | "board_reply"
  | "notice_marketing"
  | "account_status"
  | "member_info_changed"
  | "password_expiry_reminder";

export type EmailVariables = Record<string, string>;
