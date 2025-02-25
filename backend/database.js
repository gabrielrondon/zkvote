import sqlite3 from "sqlite3";
import { open } from "sqlite";

// Initialize database connection
export async function initDB() {
  return open({
    filename: "./votes.db",
    driver: sqlite3.Database
  });
}

// Store encrypted votes persistently
export async function saveVote(encryptedVote) {
  const db = await initDB();
  await db.exec("CREATE TABLE IF NOT EXISTS votes (id INTEGER PRIMARY KEY, C1 TEXT, C2 TEXT)");
  await db.run("INSERT INTO votes (C1, C2) VALUES (?, ?)", [encryptedVote.C1, encryptedVote.C2]);
}

// Retrieve all votes
export async function getVotes() {
  const db = await initDB();
  return db.all("SELECT C1, C2 FROM votes");
}
