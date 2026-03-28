const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 465,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const verifyEmailConnection = async () => {
    try {
        await transporter.verify();
        console.log("Email transporter ready");
    } catch (err) {
        console.warn (" Email transporter failed:", err.message);
    }
};

verifyEmailConnection();

module.exports = transporter;