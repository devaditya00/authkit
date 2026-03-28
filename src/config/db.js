const mongoose = require("mongoose");

const connectDB = async () => {
    try{
        const conn = await mongoose.connect(process.env.MONGO_URI, {
           serverSelectionTimeoutMS: 5000, 
        });

        console.log(`MongoDB connected: ${conn.connection.host}`);

        mongoose.connection.on("disconnected", () => {
            console.warn(" MongoDB disconnected");
        });

        mongoose.connection.on("error", (err) => {
            console.error("MongoDB error:", err.message);
        });
    } catch(err) {
        console.error("MongoDB intial connection failed:", err.message);
        process.exit(1);
    }
};

module.exports = connectDB;