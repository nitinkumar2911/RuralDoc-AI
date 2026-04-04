import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    history: [{
    symptoms: [String],
    prediction: String,
    description: String,    // Add this
    precautions: [String],  // Add this
    age: String,
    duration: String,
    date: { type: Date, default: Date.now }
}]
}, { timestamps: true });

export default mongoose.model('User', userSchema);