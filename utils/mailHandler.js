const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 25,
  secure: false, // Use true for port 465, false for port 587
  auth: {
    user: "6c5fba160b491e",
    pass: "468cd0ceae9e45",
  },
});
module.exports = {
  sendMail: async function (to, url) {
    const info = await transporter.sendMail({
      from: "tranhau5065@gmail.com",
      to: to,
      subject: "reset password URL",
      text: "click vao day de doi pass", // Plain-text version of the message
      html: "click vao <a href=" + url + ">day</a> de doi pass", // HTML version of the message
    });

    console.log("Message sent:", info.messageId);
  },
};
