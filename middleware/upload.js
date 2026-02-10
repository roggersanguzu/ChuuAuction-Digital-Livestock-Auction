import multer from "multer";

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    console.log(
      `[Upload] Received file: ${file.originalname} (${file.mimetype})`,
    );
    const allowedTypes = /jpeg|jpg|png/;
    const extOk = allowedTypes.test(file.mimetype);
    if (extOk) {
      cb(null, true);
    } else {
      console.error(`[Upload] Rejected file type: ${file.mimetype}`);
      cb(new Error("Only image files (jpeg/jpg/png) are allowed!"));
    }
  },
});

export default upload;
