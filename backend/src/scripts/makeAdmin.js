import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";

async function makeAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const email = "lrgurjar6@gmail.com"; // Use your registered email

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      console.log("User not found. Register first.");
      return;
    }

    user.role = "ADMIN";
    await user.save();

    console.log("Admin role assigned successfully:", user.email);
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

makeAdmin();
