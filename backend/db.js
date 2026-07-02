const { DatabaseSync } = require("node:sqlite");
const path = require("path");

// Define path to cropmind.db database file
const dbPath = path.join(__dirname, "cropmind.db");
const db = new DatabaseSync(dbPath);

// Create the schema if it doesn't already exist
db.exec(`
  CREATE TABLE IF NOT EXISTS crops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    season TEXT NOT NULL,
    water TEXT NOT NULL
  )
`);

// Seed initial data if the table is empty
const countResult = db.prepare("SELECT COUNT(*) AS count FROM crops").get();
if (countResult.count === 0) {
  const insert = db.prepare("INSERT INTO crops (name, season, water) VALUES (?, ?, ?)");
  insert.run("Wheat", "Rabi", "Medium");
  insert.run("Rice", "Kharif", "High");
  console.log("Database seeded successfully with initial crops.");
}

module.exports = {
  getAllCrops: () => {
    return db.prepare("SELECT * FROM crops ORDER BY id DESC").all();
  },

  getCropById: (id) => {
    return db.prepare("SELECT * FROM crops WHERE id = ?").get(id);
  },

  createCrop: (name, season, water) => {
    const info = db.prepare("INSERT INTO crops (name, season, water) VALUES (?, ?, ?)")
      .run(name, season, water);
    return { id: Number(info.lastInsertRowid), name, season, water };
  },

  updateCrop: (id, name, season, water) => {
    const existing = db.prepare("SELECT * FROM crops WHERE id = ?").get(id);
    if (!existing) return null;

    const newName = name !== undefined ? name : existing.name;
    const newSeason = season !== undefined ? season : existing.season;
    const newWater = water !== undefined ? water : existing.water;

    db.prepare("UPDATE crops SET name = ?, season = ?, water = ? WHERE id = ?")
      .run(newName, newSeason, newWater, id);
    return { id: Number(id), name: newName, season: newSeason, water: newWater };
  },

  deleteCrop: (id) => {
    const info = db.prepare("DELETE FROM crops WHERE id = ?").run(id);
    return info.changes > 0;
  },

  searchCrops: (name) => {
    return db.prepare("SELECT * FROM crops WHERE name LIKE ? ORDER BY id DESC")
      .all(`%${name}%`);
  }
};
