/**
 * Pluggable SMS provider for OTP delivery.
 *
 *   SMS_PROVIDER=dev     – logs the code to the server console (default in development)
 *   SMS_PROVIDER=msg91   – MSG91 (module wiring pending: needs DLT-approved template)
 *   SMS_PROVIDER=twilio  – Twilio Verify / Messaging (pending)
 *
 * Production refuses the dev provider unless ALLOW_DEV_SMS_IN_PRODUCTION=true is set explicitly
 * (only for local production builds / demos, never on the live site).
 */
import { maskPhone } from "../phone";

export interface SmsProvider {
  readonly name: string;
  sendOtp(phoneE164: string, code: string): Promise<void>;
}

export class DevConsoleSmsProvider implements SmsProvider {
  readonly name = "dev";
  async sendOtp(phoneE164: string, code: string) {
    // Server console only. The code is never returned to the browser.
    console.info(`[dev-sms] Oottam login code for ${maskPhone(phoneE164)}: ${code} (valid 5 minutes)`);
  }
}

class NotConfiguredProvider implements SmsProvider {
  constructor(readonly name: string, private readonly envHint: string) {}
  async sendOtp(): Promise<void> {
    throw new Error(`SMS provider "${this.name}" is not configured yet (${this.envHint}).`);
  }
}

export function getSmsProvider(env: NodeJS.ProcessEnv = process.env): SmsProvider {
  const isProd = env.NODE_ENV === "production";
  const choice = (env.SMS_PROVIDER ?? (isProd ? "" : "dev")).toLowerCase();
  switch (choice) {
    case "dev":
      if (isProd && env.ALLOW_DEV_SMS_IN_PRODUCTION !== "true") {
        throw new Error(
          "SMS_PROVIDER=dev is not allowed in production. Configure msg91/twilio, or set ALLOW_DEV_SMS_IN_PRODUCTION=true for a local demo only.",
        );
      }
      return new DevConsoleSmsProvider();
    case "msg91":
      return new NotConfiguredProvider("msg91", "set MSG91_AUTH_KEY, MSG91_TEMPLATE_ID, MSG91_SENDER_ID");
    case "twilio":
      return new NotConfiguredProvider("twilio", "set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID");
    default:
      throw new Error("SMS_PROVIDER must be one of dev | msg91 | twilio");
  }
}
