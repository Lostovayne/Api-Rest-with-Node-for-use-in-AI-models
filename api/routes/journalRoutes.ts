import { Router } from "express";
import {
  addJournalEntry,
  getJournalEntryHandler,
  listJournal,
} from "../controllers/journalController";

const router = Router();

router.post("/users/:userId/journal", addJournalEntry);
router.get("/users/:userId/journal", listJournal);
router.get("/users/:userId/journal/:entryId", getJournalEntryHandler);

export default router;
