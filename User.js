import e from "express";
import { Connectdb } from "./MongodbConfig.js";
import { ObjectId } from "mongodb";
import { body, validationResult } from "express-validator";
import bcrypt from 'bcrypt';
import multer from "multer";
import { UploadFile } from "./ClounderConfig.js";

export const UserRouter = e.Router();

// ------------------------------
// Multer for profile uploads
// ------------------------------
const uploadProfile = multer({ dest: 'uploads/profile/' }); // Use relative path
const uploadProfileUser = uploadProfile.fields([{ name: 'profile', maxCount: 1 }]);

// ------------------------------
// Password Validation
// ------------------------------
const PasswordValidation = [
    body('newpassword')
        .notEmpty().withMessage("Please enter Password")
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
        .matches(/[A-Z]/).withMessage("Password must contain an uppercase letter")
        .matches(/[0-9]/).withMessage("Password must contain a number")
        .matches(/[@$!%*?&+#-=]/).withMessage('Password must contain a special character')
        .escape()
        .trim()
];

// ------------------------------
// Get user by ID
// ------------------------------
UserRouter.get('/', async (req, res) => {
    const { _id } = req.query;

    try {
        const dbInstance = await Connectdb();
        if (!dbInstance) throw new Error("DB not connected");

        const Userdb = dbInstance.collection('User');
        const user = await Userdb.findOne({ _id: new ObjectId(_id) });

        return res.status(200).json(user);
    } catch (err) {
        console.error(err.message);
        return res.status(400).json({ msg: err.message, ok: false });
    }
});

// ------------------------------
// Update user info
// ------------------------------
UserRouter.put('/Update', async (req, res) => {
    try {
        const userData = req.body;
        const id = userData._id;

        const Data = Object.fromEntries(
            Object.entries(userData).filter(([key]) => key !== '_id')
        );

        const dbInstance = await Connectdb();
        if (!dbInstance) throw new Error("DB not connected");

        const UserData = dbInstance.collection('User');
        await UserData.updateOne({ _id: new ObjectId(id) }, { $set: Data });

        return res.status(200).json({ msg: 'Successfully updated', ok: true });
    } catch (err) {
        return res.status(400).json({ msg: err.message, ok: false });
    }
});

// ------------------------------
// Change Password
// ------------------------------
UserRouter.put('/Password', PasswordValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ msg: errors.array(), ok: false });
        }

        const { id, oldPassword, newpassword, confirmPassword } = req.body;

        if (newpassword !== confirmPassword) {
            return res.status(400).json({ msg: "New and confirm password must match", ok: false });
        }

        const dbInstance = await Connectdb();
        if (!dbInstance) throw new Error("DB not connected");

        const userAuthdb = dbInstance.collection('userAuth');
        const userAuth = await userAuthdb.findOne({ user_id: new ObjectId(id) });
        if (!userAuth) return res.status(404).json({ msg: "User not found", ok: false });

        const match = await bcrypt.compare(oldPassword, userAuth.password);
        if (!match) return res.status(401).json({ msg: "Incorrect old password", ok: false });

        const hashPassword = await bcrypt.hash(newpassword, 10);
        await userAuthdb.updateOne({ user_id: new ObjectId(id) }, { $set: { password: hashPassword } });

        return res.status(200).json({ msg: "Password successfully updated", ok: true });
    } catch (err) {
        console.error(err.message);
        return res.status(400).json({ msg: err.message, ok: false });
    }
});

// ------------------------------
// Update user profile image
// ------------------------------
UserRouter.patch('/updateUserProfile', uploadProfileUser, async (req, res) => {
    try {
        const { id } = req.body;
        if (!req.files || !req.files['profile']) {
            return res.status(400).json({ msg: "No profile file uploaded", ok: false });
        }

        const file = req.files['profile'][0];
        const result = await UploadFile(file.path);
        if (!result.ok) throw new Error("Failed to upload file");

        const dbInstance = await Connectdb();
        if (!dbInstance) throw new Error("DB not connected");

        const userDb = dbInstance.collection('User');
        await userDb.updateOne({ _id: new ObjectId(id) }, { $set: { profile: result } });

        return res.status(200).json({ msg: "Successfully updated user profile", ok: true });
    } catch (err) {
        console.error(err.message);
        return res.status(400).json({ msg: err.message, ok: false });
    }
});
