import { Router } from "express";
import multer from "multer";
import {
  createBanner,
  getAllBanners,
  getBannerById,
  updateBanner,
  deleteBanner,
  getActiveBanners,
} from "../controllers/bannerController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Public routes (no authentication required)
router.get("/", getAllBanners);
router.get("/active", getActiveBanners);
router.get("/:id", getBannerById);

// Protected routes (authentication required)
router.post("/", authenticateToken, upload.single("image"), createBanner);
router.put("/:id", authenticateToken, upload.single("image"), updateBanner);
router.delete("/:id", authenticateToken, deleteBanner);

export default router;
