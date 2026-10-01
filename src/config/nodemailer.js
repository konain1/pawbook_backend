const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const sendResetOtpEmail = async (toEmail, otp, username = 'Pet Lover') => {
    const mailOptions = {
        from: `"Pawbook 🐾" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: '🐾 Your Pawbook Password Reset Code',
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #121016; color: #FFFFFF; padding: 32px 20px; text-align: center;">
                <div style="max-width: 480px; margin: 0 auto; background-color: #1E1B24; border-radius: 24px; padding: 32px 24px; border: 1px solid #332B40;">
                    <div style="font-size: 42px; margin-bottom: 8px;">🐾</div>
                    <h1 style="color: #FFFFFF; font-size: 24px; margin: 0 0 8px 0; font-weight: 800;">Password Reset</h1>
                    <p style="color: #A39BA8; font-size: 14px; margin: 0 0 24px 0;">Hello <strong>${username}</strong>, use the verification code below to reset your Pawbook password:</p>
                    
                    <div style="background-color: #2D2738; border-radius: 16px; padding: 18px 24px; display: inline-block; margin: 0 auto 24px auto; border: 2px dashed #E05638; letter-spacing: 8px; font-size: 32px; font-weight: 800; color: #E05638;">
                        ${otp}
                    </div>
                    
                    <p style="color: #A39BA8; font-size: 13px; line-height: 1.5; margin: 0 0 16px 0;">
                        This code is valid for <strong>10 minutes</strong>. If you did not request this password reset, your account is safe and you can safely ignore this email.
                    </p>
                    
                    <div style="border-top: 1px solid #332B40; padding-top: 16px; margin-top: 24px;">
                        <p style="color: #736B7A; font-size: 12px; margin: 0;">Pawbook • Where pet lovers connect 🐾</p>
                    </div>
                </div>
            </div>
        `,
    };

    return transporter.sendMail(mailOptions);
};

module.exports = { transporter, sendResetOtpEmail };
