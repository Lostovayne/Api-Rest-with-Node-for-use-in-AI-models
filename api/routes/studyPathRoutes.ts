import { Router } from "express";
import {
  createStudyPath,
  generateImagesForPath,
  getStudyPath,
  getStudyPathModule,
  getStudyPathRequest,
  listStudyPaths,
} from "../controllers/studyPathController";

const router = Router();

router.post("/study-path", createStudyPath);
router.get("/study-paths", listStudyPaths);
router.get("/study-path/:id", getStudyPath);
router.get("/study-path-modules/:id", getStudyPathModule);
router.get("/study-path-requests/:requestId", getStudyPathRequest);
router.post("/generate-images-for-path", generateImagesForPath);

export default router;
