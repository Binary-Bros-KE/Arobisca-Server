const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String, required: true
    },
    image: {
        type: String,
        required: true,
        default: null
    },
    imageData: {
        url: String,
        publicId: String,
        width: Number,
        height: Number,
        format: String,
        bytes: Number
    },
    slug: {
        type: String,
        unique: true,
        trim: true
    },
}, { timestamps: true });

// Add pre-save middleware to generate slug
categorySchema.pre('save', function (next) {
    if (this.isModified('name') && !this.slug) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9 -]/g, '') // Remove invalid chars
            .replace(/\s+/g, '-') // Replace spaces with -
            .replace(/-+/g, '-') // Replace multiple - with single -
            .trim();
    }
    next();
});

module.exports = mongoose.model('Category', categorySchema);
