const nodemailer = require('nodemailer');
const pug = require('pug');
const juice = require('juice');
const htmlToText = require('html-to-text');
const promisify = require('es6-promisify');

const transport = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

const generateHTML = (filename, options = {}) => {
  console.log(options);
  // using __dirname to reference the pug file. __dirname will get the current directory wherever the app is running
  const html = pug.renderFile(
    `${__dirname}/../views/email/${filename}.pug`,
    options
  );

  console.log(html);

  const inlined = juice(html); // juice inlines all of our css styles. This is best practice for email html
  return inlined;
};

exports.send = async options => {
  const html = generateHTML(options.filename, options);
  const text = htmlToText.fromString(html);
  const mailOptions = {
    from: 'Eric Hubbard <rehubbard2@gmail.com>',
    to: options.user.email,
    subject: options.subject,
    html,
    text
  };

  const sendMail = promisify(transport.sendMail, transport);
  return sendMail(mailOptions);
};
