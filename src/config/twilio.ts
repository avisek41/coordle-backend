import twilio from "twilio";

const accountSid =
  process.env.TWILIO_ACCOUNT_SID || "AC3656d1bb791183d64aadd6f23c7ae11d";
const authToken =
  process.env.TWILIO_AUTH_TOKEN || "74099fc5ed9cfd2387efbcbf5c9d02fd";

if (!accountSid || !authToken) {
  throw new Error(
    "Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables."
  );
}

const client = twilio(accountSid, authToken);

export const sendVerificationCode = async (
  phoneNumber: string,
  code: string
): Promise<boolean> => {
  try {
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!fromNumber) {
      throw new Error("TWILIO_PHONE_NUMBER environment variable not set");
    }

    await client.messages.create({
      body: `Your Coordle verification code is: ${code}. Valid for 10 minutes.`,
      from: fromNumber,
      to: phoneNumber,
    });
    return true;
  } catch (error) {
    console.error("Twilio SMS error:", error);
    return false;
  }
};

export default client;
