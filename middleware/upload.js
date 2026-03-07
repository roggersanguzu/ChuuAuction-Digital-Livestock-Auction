import multer from "multer";
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
const allowedTypes = /jpeg|jpg|png/;
    const extOk = allowedTypes.test(file.mimetype);
    if (extOk) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (jpeg/jpg/png) are allowed!"));
    }
  },
});
export default upload;

