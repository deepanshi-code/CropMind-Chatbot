const crypto = require("crypto");
const mongoose = require("mongoose");
const db = require("../db");

/**
 * Owner-scoped data access that works the same with MongoDB and the in-memory dev store.
 * Every method takes the owner id, so one user can never read or change another's records.
 *
 * @param {string} name        mock collection name
 * @param {mongoose.Model} Model
 */
function ownedCollection(name, Model) {
  const mock = () => db.getMockCollection(name);
  const toPlain = (doc) => (doc && typeof doc.toJSON === "function" ? doc.toJSON() : doc);

  return {
    /** Newest first. */
    async list(owner, { limit = 50 } = {}) {
      if (db.isMock()) {
        return mock().filter((d) => d.owner === owner).slice(-limit).reverse();
      }
      const docs = await Model.find({ owner }).sort({ createdAt: -1 }).limit(limit);
      return docs.map(toPlain);
    },

    async create(owner, data) {
      if (db.isMock()) {
        const now = new Date();
        const doc = { id: `mock-${name}-${crypto.randomUUID()}`, ...data, owner, createdAt: now, updatedAt: now };
        mock().push(doc);
        return doc;
      }
      return toPlain(await Model.create({ ...data, owner }));
    },

    async remove(owner, id) {
      if (db.isMock()) {
        const items = mock();
        const index = items.findIndex((d) => d.id === id && d.owner === owner);
        if (index === -1) return false;
        items.splice(index, 1);
        return true;
      }
      if (!mongoose.isValidObjectId(id)) return false;
      const result = await Model.deleteOne({ _id: id, owner });
      return result.deletedCount === 1;
    },

    async removeAll(owner) {
      if (db.isMock()) {
        db.setMockCollection(name, mock().filter((d) => d.owner !== owner));
        return;
      }
      await Model.deleteMany({ owner });
    },

    /** Finds one record by an arbitrary field match (not owner-scoped; used for device keys). */
    async findBy(field, value) {
      if (db.isMock()) return mock().find((d) => d[field] === value) || null;
      return toPlain(await Model.findOne({ [field]: value }));
    },

    async touch(id, patch) {
      if (db.isMock()) {
        const doc = mock().find((d) => d.id === id);
        if (doc) Object.assign(doc, patch);
        return;
      }
      if (mongoose.isValidObjectId(id)) await Model.updateOne({ _id: id }, patch);
    },
  };
}

module.exports = { ownedCollection };
