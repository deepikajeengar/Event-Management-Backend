// Import dependencies
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

// Initialize app
const app = express();

app.use(cors());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI;

// Increase body size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Middleware
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});
const upload = multer({ storage });

mongoose
    .connect(MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('Error connecting to MongoDB:', err));

const EventSchema = new mongoose.Schema({
    name: { type: String, required: true },
    date: { type: Date, required: true },
    location: { type: String, required: true },
    description: { type: String, required: true },
    userId: { type: String, required: true },
    status: { type: String, enum: ['Upcoming', 'Ongoing', 'Completed'], required: true },
    image: { type: String },
});
const Event = mongoose.model('Event', EventSchema);

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String},
    subTitle: { type: String},
});
const User = mongoose.model('User', UserSchema);

// Routes

// User Signup (with password hashing)
app.post('/api/signup', async (req, res) => {
    const { username, password, name } = req.body;
    console.log(req.body)
    // Check if the user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ username, password: hashedPassword, name });
    await newUser.save();

    const token = jwt.sign({ id: newUser._id, username: newUser.username }, JWT_SECRET, {
        expiresIn: '1h',
    });

    res.status(201).json({ token }); // Return JWT token upon successful signup
});

// User Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, {
        expiresIn: '1000h',
    });
    res.json({ token });
});

// Password Update Route
app.put('/api/update-password', authenticate, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    // Find the user by ID
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Compare the current password with the stored hashed password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Current password is incorrect' });

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update the password in the database
    user.password = hashedNewPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
});

// Update User Profile Route
app.put('/api/update-profile', authenticate, upload.single('profileImage'), async (req, res) => {
    const { name, subTitle, description } = req.body;
    const profileImage = req.file ? `/uploads/${req.file.filename}` : undefined;

    // Find the user by ID
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Update user details
    if (subTitle) user.subTitle = subTitle; // Update subTitle if provided
    if (description) user.description = description; // Update description if provided
    if (name) user.name = name; // Update name if provided
    if (profileImage) user.profileImage = profileImage; // Update profile image URL if provided

    // Save the updated user
    await user.save();

    res.json({ message: 'User profile updated successfully', user });
});

// Authentication Middleware
function authenticate(req, res, next) {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ message: 'No token provided' });
    jwt.verify(token.split(' ')[1], JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = user;
        next();
    });
}

// Get Logged-in User
app.get('/api/user', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;  // User ID extracted from JWT
        const user = await User.findById(userId).select('-password');  // Exclude password field

        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Create Event
app.post('/api/events', authenticate, upload.single('image'), async (req, res) => {
    const { name, date, location, status, description } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;
    const event = new Event({ name, date, location, status, image, description, userId: req.user.id });
    await event.save();
    res.status(201).json(event);
});

// Get All Events created by the authenticated user
app.get('/api/my-events', authenticate, async (req, res) => {
    const events = await Event.find({ userId: req.user.id });  // Find events associated with the authenticated user
    res.json(events);
});

// Get All Events
app.get('/api/all-events', authenticate, async (req, res) => {
    const events = await Event.find();
    res.json(events);
});

// Get All Events
app.get('/api/events', authenticate, async (req, res) => {
    try {
        const { page = 1, limit = 10, sort = 'date', order = 'asc', search = '', status } = req.query;

        const query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } },
            ];
        }
        if (status) {
            query.status = status;
        }

        const skip = (page - 1) * limit;
        const sortOrder = order === 'asc' ? 1 : -1;

        const totalEvents = await Event.countDocuments(query);
        const events = await Event.find(query)
            .sort({ [sort]: sortOrder })
            .skip(skip)
            .limit(Number(limit));

        res.status(200).json({
            total: totalEvents,
            page: Number(page),
            limit: Number(limit),
            events,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// GET Event by ID
app.get('/api/events/:id', async (req, res) => {
    try {
        const eventId = req.params.id;

        // Validate ID format (if you're using MongoDB ObjectID)
        if (!eventId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ error: 'Invalid event ID format' });
        }

        // Fetch event from database
        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Return the found event
        res.status(200).json(event);
    } catch (error) {
        console.error('Error fetching event by ID:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Update Event
app.put('/api/events/:id', authenticate, upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const { name, date, location, status, description } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : undefined;
    const updateData = { name, date, location, status, description };
    if (image) updateData.image = image;
    const event = await Event.findByIdAndUpdate(id, updateData, { new: true });
    res.json(event);
});

// Delete Event
app.delete('/api/events/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    await Event.findByIdAndDelete(id);
    res.json({ message: 'Event deleted' });
});

// GET /api/event-analytics
app.get('/api/event-analytics', authenticate, async (req, res) => {
    try {
        // Total events
        const totalEvents = await Event.countDocuments();

        // Events grouped by status
        const eventsByStatus = await Event.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        // Next upcoming event
        const nextEvent = await Event.findOne({ date: { $gte: new Date() } })
            .sort({ date: 1 });

        res.status(200).json({
            totalEvents,
            eventsByStatus,
            nextEvent,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
