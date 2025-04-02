/** @format */

const express = require("express");
const path = require("path");
const nodemailer = require("nodemailer");
const axios = require("axios"); // You'll need to install axios
const rateLimit = require("express-rate-limit");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({extended: true}));
app.use(express.json());
ape.use(limiter)

// Set view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Configure email transporter
const transporter = nodemailer.createTransport({
	host: process.env.EMAIL_HOST,
	port: process.env.EMAIL_PORT,
	secure: false, // true for 465, false for other ports
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASS,
	},
});

// rate limiter
const limiter = rateLimit ({
	windowsMs: 15 * 60 * 1000, 
	limit: 100, 
	standardHeader: 'draft-8',
	legacyHeaders: false,
})

// Routes
app.get("/", (req, res) => {
	const formSubmitted = req.query.formSubmitted === "true";
	const formError = req.query.formError === "true";
	res.render("index", {
		title: "Digital Arts Technology Training Center Inc.",
		formSubmitted,
		formError,
	});
});

// Contact form submission handler
app.post("/submit-contact", async (req, res) => {
	try {
		const {name, email, phone, program, message, "g-recaptcha-response": recaptchaToken} = req.body;

		console.log("Form submission received");

		// Verify reCAPTCHA
		if (!recaptchaToken) {
			console.error("No reCAPTCHA token provided");
			return res.redirect("/?formError=true");
		}

		console.log("reCAPTCHA token received:", recaptchaToken.substring(0, 10) + "...");

		// Verify with Google reCAPTCHA API
		const recaptchaVerifyUrl = "https://www.google.com/recaptcha/api/siteverify";
		console.log("Verifying with reCAPTCHA API...");

		const recaptchaResponse = await axios.post(recaptchaVerifyUrl, null, {
			params: {
				secret: process.env.RECAPTCHA_SECRET_KEY,
				response: recaptchaToken,
			},
		});

		console.log("reCAPTCHA API response:", recaptchaResponse.data);

		// If verification failed
		if (!recaptchaResponse.data.success) {
			console.error("reCAPTCHA verification failed:", recaptchaResponse.data["error-codes"]);
			return res.redirect("/?formError=true");
		}

		console.log("reCAPTCHA verification successful, sending emails...");

		// Email content
		const mailOptions = {
			from: process.env.EMAIL_USER,
			to: process.env.RECIPIENT_EMAIL,
			subject: `New Contact Form Submission from ${name}`,
			html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Program of Interest:</strong> ${program || "Not specified"}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
		};

		// Send confirmation email to the user
		const confirmationEmail = {
			from: process.env.EMAIL_USER,
			to: email,
			subject: "Thank you for contacting Digital Arts Technology Training Center Inc.",
			html: `
        <h2>Thank You for Contacting Us</h2>
        <p>Dear ${name},</p>
        <p>We have received your inquiry about our ${program || "programs"} and will get back to you shortly.</p>
        <p>Here's a copy of the information you submitted:</p>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Program of Interest:</strong> ${program || "Not specified"}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
        <br>
        <p>Best regards,</p>
        <p>The Digital Arts Technology Training Center Team</p>
      `,
		};

		// Send both emails
		await transporter.sendMail(mailOptions);
		await transporter.sendMail(confirmationEmail);

		console.log("Form submitted and emails sent successfully");
		res.redirect("/?formSubmitted=true");
	} catch (error) {
		console.error("Error processing form submission:", error);
		res.redirect("/?formError=true");
	}
});

// Start server
app.listen(port, () => {
	console.log(`Server running on http://localhost:${port}`);
	console.log(`Using reCAPTCHA site key: ${process.env.RECAPTCHA_SITE_KEY}`);
	console.log(`Using reCAPTCHA secret key: ${process.env.RECAPTCHA_SECRET_KEY.substring(0, 5)}...`);
});
