import e from "express";
import { body, validationResult } from "express-validator";
import multer from "multer";
import path from "path";
import fs from "fs";

import { UploadFile, DeleteFile } from "./ClounderConfig.js";
import { Connectdb } from "./MongodbConfig.js";
import { ObjectId } from "mongodb";

export const routerChild = e.Router();

// -----------------------------
// 1️⃣ Setup folders
// -----------------------------
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const PROFILE_DIR = path.join(process.cwd(), "profile");
const OTHER_DIR = path.join(process.cwd(), "otherFile");

[UPLOADS_DIR, PROFILE_DIR, OTHER_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// -----------------------------
// 2️⃣ Multer config
// -----------------------------
const upload = multer({ dest: UPLOADS_DIR });
export const uploadFields = upload.fields([
  { name: 'childPhotos', maxCount: 999 },
  { name: 'parentPhotos', maxCount: 999 }
]);

const uploadOtherFile = multer({ dest: OTHER_DIR });
export const uploadOtherFiles = uploadOtherFile.fields([{ name: "otherFile", maxCount: 999 }]);

const UploadProfile = multer({ dest: PROFILE_DIR });
export const multerUploadProfile = UploadProfile.single('uploadProfile');

// -----------------------------
// 3️⃣ Routes
// -----------------------------

// GET all children summary
routerChild.get('/', async (req, res) => {
  let dbInstance = null;
  try {
    dbInstance = await Connectdb();
    if (dbInstance) {
      const childData = dbInstance.collection('Child');
      const childInfo = await childData.find({}).toArray();

      let female = 0;
      let male = 0;
      childInfo.forEach((child) => {
        if (child.gender === 'male') male++;
        else if (child.gender === 'female') female++;
      });

      return res.status(200).json([
        { male, id: 1 },
        { female, id: 2 },
        { totalChild: female + male, id: 3 }
      ]);
    }
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ ok: false, msg: err.message });
  }
});

// CREATE child with photos
routerChild.post('/Create', uploadFields, async (req, res) => {
  const dataField = req.body;
  const dataFields = JSON.parse(dataField.Data);
  const childPhotos = req.files['childPhotos'] || [];
  const parentPhotos = req.files['parentPhotos'] || [];
  
  try {
    const ChildFileUrls = await Promise.all(childPhotos.map(file => UploadFile(file.path)));
    const ParentFileUrls = parentPhotos.length > 0
      ? await Promise.all(parentPhotos.map(file => UploadFile(file.path)))
      : [];

    const dbInstance = await Connectdb();
    if (!dbInstance) throw new Error("Database connection failed");

    const ChildCollection = dbInstance.collection('Child');
    const insertData = { ...dataFields, Childfile: ChildFileUrls };
    if (ParentFileUrls.length > 0) insertData.Parentfile = ParentFileUrls;

    await ChildCollection.insertOne(insertData);

    return res.status(201).json({ msg: "Child data stored successfully", ok: true });

  } catch (error) {
    return res.status(400).json({ msg: error.message, ok: false });
  }
});

// UPDATE child
routerChild.put('/Update', async (req, res) => {
  const { id, data: updateData } = req.body;

  try {
    const dbInstance = await Connectdb();
    if (!dbInstance) throw new Error("Database connection failed");

    const ChildCollection = dbInstance.collection('Child');
    const result = await ChildCollection.updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    return res.status(200).json({ msg: 'Successfully updated', ok: true, result });
  } catch (err) {
    console.log(err.message);
    return res.status(400).json({ msg: err.message, ok: false });
  }
});

// SEARCH child by name
routerChild.get('/SearchByName', async (req, res) => {
  const { search } = req.query;
  if (!search || search.length === 0) return res.status(200).json([]);

  try {
    const dbInstance = await Connectdb();
    const ChildCollection = dbInstance.collection('Child');
const parts = search.trim().split(" ");

// Make sure we have at least 2 parts for first and last name
const firstNameSearch = parts[0] || "";
const lastNameSearch = parts[1] || "";

const result = await ChildCollection.find({
  childFirstName: { $regex: firstNameSearch, $options: "i" },
  childLastName: { $regex: lastNameSearch, $options: "i" }
}).toArray();

    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ msg: err.message, ok: false });
  }
});

// SEARCH child by ID
routerChild.get('/SearchById', async (req, res) => {
  const { searchId } = req.query;
  try {
    const dbInstance = await Connectdb();
    const ChildCollection = dbInstance.collection('Child');
    const result = await ChildCollection.findOne({ _id: new ObjectId(searchId) });

    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ msg: err.message, ok: false });
  }
});

// UPLOAD other files
routerChild.post('/OtherFileCreate', uploadOtherFiles, async (req, res) => {
  const OtherData = JSON.parse(req.body.data);
  const OtherFiles = req.files['otherFile'] || [];
  try {
    const dbInstance = await Connectdb();
    if (!dbInstance) throw new Error("Database connection failed");

    let FileUrls = [];
    if (OtherFiles.length > 0) FileUrls = await Promise.all(OtherFiles.map(file => UploadFile(file.path)));

    const ChildCollection = dbInstance.collection('Child');
    const newData = { title: OtherData.title, description: OtherData.description, files: FileUrls, _id: new ObjectId(), timeStamp: new Date() };

    await ChildCollection.updateOne({ _id: new ObjectId(OtherData.id) }, { $push: { otherChildData: newData } });
    return res.status(200).json({ msg: "Successfully stored other files", ok: true });

  } catch (err) {
    return res.status(400).json({ msg: err.message, ok: false });
  }
});

// DELETE file
routerChild.delete('/delete-file', async (req, res) => {
  const { public_id, id, selectionType } = req.body;
  if (!public_id || !id || !selectionType) return res.status(400).json({ msg: "Missing parameters", ok: false });

  try {
    const deleteResult = await DeleteFile(public_id);
    if (!deleteResult.ok) throw new Error("Cloud deletion failed");

    const dbInstance = await Connectdb();
    const ChildCollection = dbInstance.collection('Child');
    const childData = await ChildCollection.findOne({ _id: new ObjectId(id) });

    if (!childData) return res.status(400).json({ msg: "Child not found", ok: false });

    if (selectionType === 'parent') {
      const updatedParentFiles = childData.Parentfile.filter(f => f.public_id !== public_id);
      await ChildCollection.updateOne({ _id: new ObjectId(id) }, { $set: { Parentfile: updatedParentFiles } });
    } else if (selectionType === 'child') {
      const updatedChildFiles = childData.Childfile.filter(f => f.public_id !== public_id);
      await ChildCollection.updateOne({ _id: new ObjectId(id) }, { $set: { Childfile: updatedChildFiles } });
    }

    return res.status(200).json(deleteResult);

  } catch (err) {
    return res.status(400).json({ msg: err.message, ok: false });
  }
});

// UPLOAD Profile
routerChild.post('/UploadProfile', multerUploadProfile, async (req, res) => {
  const { data } = req.body;
  const file = req.file;
  if (!file) return res.status(400).json({ msg: "No file uploaded", ok: false });

  try {
    const result = await UploadFile(file.path);
    if (!result.ok) throw new Error("Upload failed");

    const Data = JSON.parse(data);
    const dbInstance = await Connectdb();
    const ChildCollection = dbInstance.collection('Child');

    if (Data.type === 'parent') {
      await ChildCollection.updateOne({ _id: new ObjectId(Data.id) }, { $push: { Parentfile: result } });
    } else if (Data.type === 'child') {
      await ChildCollection.updateOne({ _id: new ObjectId(Data.id) }, { $push: { Childfile: result } });
    }

    return res.status(200).json({ msg: 'Successfully uploaded profile', ok: true });

  } catch (err) {
    return res.status(400).json({ msg: err.message, ok: false });
  }
});
