import { Request, Response } from "express";
import pool from "../../db";

export const createUser = async (req: Request, res: Response) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: "username is required" });
  }

  const client = await pool.connect();
  try {
    const existing = await client.query(
      "SELECT id, username, created_at FROM users WHERE username = $1",
      [username]
    );

    if (existing.rows.length > 0) {
      return res.status(200).json(existing.rows[0]);
    }

    const result = await client.query(
      "INSERT INTO users (username) VALUES ($1) RETURNING id, username, created_at",
      [username]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    req.log?.error?.(error, "Error creating user");
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
};

export const getUser = async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const client = await pool.connect();
  try {
    const result = await client.query("SELECT id, username, created_at FROM users WHERE id = $1", [
      userId,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    req.log?.error?.(error, "Error fetching user");
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
};
