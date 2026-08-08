"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMail = sendMail;
const nodemailer_1 = __importDefault(require("nodemailer"));
async function sendMail({ to, subject, html }) {
    try {
        const host = process.env.SMTP_HOST;
        const port = Number(process.env.SMTP_PORT || 587);
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
        const from = process.env.SMTP_FROM || 'noreply@iccindustries.com';
        let transporter;
        if (user && pass) {
            transporter = nodemailer_1.default.createTransport({
                host,
                port,
                secure: port === 465,
                auth: {
                    user,
                    pass,
                },
            });
        }
        else {
            // Fallback log mode for local development when SMTP credentials are not set
            console.log(`[EMAIL SERVICE] (Simulated SMTP sending to ${to}):`);
            console.log(`  Subject: ${subject}`);
            console.log(`  From: ${from}`);
            console.log(`  HTML Content Snippet: ${html.substring(0, 150)}...`);
            return true;
        }
        const info = await transporter.sendMail({
            from,
            to,
            subject,
            html,
        });
        console.log(`[EMAIL SERVICE] Email sent successfully to ${to} (MessageId: ${info.messageId})`);
        return true;
    }
    catch (error) {
        console.error(`[EMAIL SERVICE] Failed to send email to ${to}:`, error);
        // Non-blocking return false
        return false;
    }
}
