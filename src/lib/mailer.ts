import nodemailer from "nodemailer";

export async function sendVerificationEmail(to: string, token: string) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const verifyUrl = `${appUrl}/api/auth/guest/verify-email?token=${token}`;

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  // Check if Gmail credentials are provided and not dummy placeholders
  const isGmailConfigured =
    gmailUser &&
    gmailPass &&
    gmailUser !== "SET_YOUR_GMAIL_USER" &&
    gmailPass !== "SET_YOUR_GMAIL_APP_PASSWORD";

  if (!isGmailConfigured) {
    console.log("----------------------------------------");
    console.log(`[MOCK MAILER] Verification email for: ${to}`);
    console.log(`[MOCK MAILER] Click link to verify email: ${verifyUrl}`);
    console.log("----------------------------------------");
    return { success: true, mock: true, url: verifyUrl };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    await transporter.sendMail({
      from: `"NeraaHotel" <${gmailUser}>`,
      to,
      subject: "Verifikasi Email Anda - NeraaHotel",
      html: `
        <div style="font-family: serif; padding: 20px; background-color: #f4efe6; color: #0d1f15; border-radius: 8px;">
          <h2 style="color: #1d3b2b; border-bottom: 2px solid #c5a880; padding-bottom: 10px;">Verifikasi Email Anda</h2>
          <p>Terima kasih telah mendaftar di <strong>NeraaHotel</strong>.</p>
          <p>Silakan klik tombol di bawah ini untuk memverifikasi alamat email Anda. Tautan ini berlaku selama 24 jam.</p>
          <div style="margin: 30px 0;">
            <a href="${verifyUrl}" style="background-color: #1d3b2b; color: #f4efe6; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 4px; border: 1px solid #c5a880;">
              Verifikasi Email
            </a>
          </div>
          <p style="font-size: 0.9em; color: #555;">Jika tombol tidak berfungsi, Anda juga dapat menyalin tautan berikut ke browser Anda:</p>
          <p style="word-break: break-all; font-size: 0.85em;"><a href="${verifyUrl}" style="color: #a9895c;">${verifyUrl}</a></p>
          <hr style="border: 0; border-top: 1px solid #c5a880; margin-top: 20px;" />
          <p style="font-size: 0.8em; color: #777;">&copy; 2026 NeraaHotel. Elegant Heritage.</p>
        </div>
      `,
    });

    return { success: true, mock: false };
  } catch (error) {
    console.error("Nodemailer failed to send email, falling back to log:", error);
    console.log("----------------------------------------");
    console.log(`[FALLBACK LOG] Verification URL: ${verifyUrl}`);
    console.log("----------------------------------------");
    return { success: true, mock: true, error, url: verifyUrl };
  }
}

export async function sendResetPasswordEmail(to: string, token: string) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  // Check if Gmail credentials are provided and not dummy placeholders
  const isGmailConfigured =
    gmailUser &&
    gmailPass &&
    gmailUser !== "SET_YOUR_GMAIL_USER" &&
    gmailPass !== "SET_YOUR_GMAIL_APP_PASSWORD";

  if (!isGmailConfigured) {
    console.log("----------------------------------------");
    console.log(`[MOCK MAILER] Password reset email for: ${to}`);
    console.log(`[MOCK MAILER] Click link to reset password: ${resetUrl}`);
    console.log("----------------------------------------");
    return { success: true, mock: true, url: resetUrl };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    await transporter.sendMail({
      from: `"NeraaHotel" <${gmailUser}>`,
      to,
      subject: "Atur Ulang Password Anda - NeraaHotel",
      html: `
        <div style="font-family: serif; padding: 20px; background-color: #f4efe6; color: #0d1f15; border-radius: 8px;">
          <h2 style="color: #1d3b2b; border-bottom: 2px solid #c5a880; padding-bottom: 10px;">Atur Ulang Password Anda</h2>
          <p>Kami menerima permintaan untuk mengatur ulang password akun Anda di <strong>NeraaHotel</strong>.</p>
          <p>Silakan klik tombol di bawah ini untuk mereset password Anda. Tautan ini berlaku selama 1 jam.</p>
          <div style="margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #1d3b2b; color: #f4efe6; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 4px; border: 1px solid #c5a880;">
              Atur Ulang Password
            </a>
          </div>
          <p style="font-size: 0.9em; color: #555;">Jika Anda tidak meminta pengaturan ulang password, abaikan saja email ini.</p>
          <p style="font-size: 0.9em; color: #555;">Jika tombol tidak berfungsi, Anda juga dapat menyalin tautan berikut ke browser Anda:</p>
          <p style="word-break: break-all; font-size: 0.85em;"><a href="${resetUrl}" style="color: #a9895c;">${resetUrl}</a></p>
          <hr style="border: 0; border-top: 1px solid #c5a880; margin-top: 20px;" />
          <p style="font-size: 0.8em; color: #777;">&copy; 2026 NeraaHotel. Elegant Heritage.</p>
        </div>
      `,
    });

    return { success: true, mock: false };
  } catch (error) {
    console.error("Nodemailer failed to send password reset email, falling back to log:", error);
    console.log("----------------------------------------");
    console.log(`[FALLBACK LOG] Password Reset URL: ${resetUrl}`);
    console.log("----------------------------------------");
    return { success: true, mock: true, error, url: resetUrl };
  }
}
