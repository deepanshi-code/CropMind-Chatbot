const db = require("./db");
const app = require("./app");

const PORT = process.env.PORT || 5000;
db.connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
