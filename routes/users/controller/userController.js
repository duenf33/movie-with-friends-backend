const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);

const User = require("../model/User");
const mongoDBErrorHelper = require("../../lib/mongoDBErrorHelper");
module.exports = {
	signUp: async (req, res) => {
		try {
			let salted = await bcrypt.genSalt(10);
			let hashedPassword = await bcrypt.hash(req.body.password, salted);
			let createdUser = new User({
				firstName: req.body.firstName,
				lastName: req.body.lastName,
				email: req.body.email,
				password: hashedPassword,
			});
			let savedUser = await createdUser.save();
			res.json({
				data: savedUser,
			});
		} catch (e) {
			console.log(e.message);
			res.status(500).json(mongoDBErrorHelper(e));
			// res.status(500).json({
			//   message: e.message,
			// });
		}
	},
	login: async (req, res) => {
		try {
			let foundUser = await User.findOne({ email: req.body.email });
			if (!foundUser) {
				// res.status(500).json(mongoDBErrorHelper());
				throw { message: "Email is not registered, please go sign up!" };
			}
			let comparedPassword = await bcrypt.compare(
				req.body.password,
				foundUser.password
			);
			if (!comparedPassword) {
				throw { message: "Check Your Email and Password" };
			} else {
				let jwtToken = jwt.sign(
					{
						email: foundUser.email,
					},
					"mightyhamster",
					{ expiresIn: "1h" }
				);
				res.json({
					jwtToken: jwtToken,
				});
			}
		} catch (e) {
			res.status(500).json(mongoDBErrorHelper(e));
		}
	},
	updateUserPassword: async (req, res) => {
		try {
			let foundUser = await User.findOne({ email: req.body.email });

			if (!foundUser) {
				throw { message: "User not found!!" };
			}

			let comparedPassword = await bcrypt.compare(
				req.body.oldPassword,
				foundUser.password
			);
			console.log(comparedPassword);

			if (!comparedPassword) {
				throw { message: "cannot update your password, check again" };
			}

			let salted = await bcrypt.genSalt(10);
			let hashedNewPassword = await bcrypt.hash(req.body.newPassword, salted);
			await User.findOneAndUpdate(
				{ email: req.body.email },
				{ password: hashedNewPassword },
				{ new: true }
			);
			res.json({
				message: "successfully updated",
				payload: true,
			});
		} catch (error) {
			res.status(500).json(mongoDBErrorHelper(error));
		}
	},

	sendSMSTwilio: async (req, res) => {
		try {
			let sentSMS = await client.messages.create({
				body: `Hey ${req.body.targetUser.nickname},
							I found this cool movie and here is the plot: ${req.body.plot}
							Here is the imdb link: https://www.imdb.com/title/${req.body.imdbID}/
				`,
				from: "+14159961659",
				to: "+16317488195", //req.body.targetUser.mobileNumber
				// free version only able to send message to self.
			});

			res.json(sentSMS);
		} catch (e) {
			res.status(500).json(mongoDBErrorHelper(e));
		}
	},
};
