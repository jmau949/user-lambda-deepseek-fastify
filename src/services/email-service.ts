import { SendEmailCommand, SendEmailCommandInput } from "@aws-sdk/client-ses";
import sesClient from "../config/ses";
import { EMAIL_REGEX } from "../config/constants";

interface EmailParams {
  to: string | string[];
  from: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string | string[];
}

/**
 * Validates email address format
 * @param email Email address to validate
 * @returns True if email is valid, false otherwise
 */
function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/**
 * Sends an email using AWS SES
 * @param params Email parameters including recipient, sender, subject, and body
 * @returns Promise that resolves when the email is sent
 * @throws Error if email parameters are invalid or sending fails
 */
export async function sendEmail(params: EmailParams): Promise<void> {
  const { to, from, subject, text, html, replyTo } = params;

  // Validate inputs
  if (!to || (Array.isArray(to) && to.length === 0)) {
    throw new Error("Recipient email address is required");
  }

  if (!from || !isValidEmail(from)) {
    throw new Error("Valid sender email address is required");
  }

  if (!subject) {
    throw new Error("Email subject is required");
  }

  if (!text && !html) {
    throw new Error("Email body (text or HTML) is required");
  }

  // Format recipients as array and validate each email
  const toAddresses = Array.isArray(to) ? to : [to];
  for (const email of toAddresses) {
    if (!isValidEmail(email)) {
      throw new Error(`Invalid recipient email address: ${email}`);
    }
  }

  // Format reply-to addresses if provided and validate each email
  let replyToAddresses: string[] | undefined;
  if (replyTo) {
    replyToAddresses = Array.isArray(replyTo) ? replyTo : [replyTo];
    for (const email of replyToAddresses) {
      if (!isValidEmail(email)) {
        throw new Error(`Invalid reply-to email address: ${email}`);
      }
    }
  }

  const input: SendEmailCommandInput = {
    Destination: {
      ToAddresses: toAddresses,
    },
    Message: {
      Body: {
        Text: {
          Charset: "UTF-8",
          Data: text,
        },
        ...(html && {
          Html: {
            Charset: "UTF-8",
            Data: html,
          },
        }),
      },
      Subject: {
        Charset: "UTF-8",
        Data: subject,
      },
    },
    Source: from,
    ...(replyToAddresses && { ReplyToAddresses: replyToAddresses }),
  };

  const command = new SendEmailCommand(input);

  try {
    await sesClient.send(command);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}
