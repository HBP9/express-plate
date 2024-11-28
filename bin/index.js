#!/usr/bin/env node

const { program } = require("commander");
const fs = require("fs");
const path = require("path");
const inquirer = require("inquirer");
const { exec } = require("child_process");
const packageJson = require("../package.json");

program.version(
  packageJson.version,
  "-v, --version",
  "Output the current version"
);

program
  .command("-version")
  .description("Check Package Version")
  .action(() => {
    console.log(`Version: ${packageJson.version}`);
  });

program
  .command("new")
  .description("Create a new folder structure for an Express app")
  .action(() => {
    const folders = [
      "controllers",
      "routes",
      "models",
      "services",
      "middleware",
    ];
    const baseDir = process.cwd();

    folders.forEach((folder) => {
      const dir = path.join(baseDir, folder);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
        console.log(`Created folder: ${folder}`);
      } else {
        console.log(`Folder ${folder} already exists`);
      }
    });

    const filePath = path.join(baseDir, "index.js");
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, "");
      console.log(`Created File: index.js`);
    } else {
      console.log("index.js already exists in the root directory.");
    }
  });

program
  .command("server")
  .description("Creates a basic express server")
  .action(async () => {
    const baseDir = process.cwd();
    const filePath = path.join(baseDir, "index.js");
    const answers = await inquirer.prompt([
      {
        type: "list",
        name: "dbType",
        message: "Choose a database type:",
        choices: ["MongoDB", "MySQL"],
      },
    ]);

    let dbCode = "";

    if (answers.dbType === "MongoDB") {
      dbCode = `
const mongoose = require("mongoose");

// MongoDB Connection
const url = "mongodb+srv://username:password@cluster.mongodb.net/dbname";
mongoose
  .connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("MongoDB is connected successfully.");
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err);
  });
`;
    } else if (answers.dbType === "MySQL") {
      dbCode = `
const mysql = require("mysql2");

// MySQL Connection
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "password",
  database: "dbname",
});

connection.connect((err) => {
  if (err) {
    console.error("MySQL connection failed:", err);
  } else {
    console.log("MySQL is connected successfully.");
  }
});
`;
    }

    const serverCode = `
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 4000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use("/", require("./routes/app")); //Ensure routes folder have app.js

// Database Connection
${dbCode.trim()}

// Start the Server
app.listen(PORT, () => {
  console.log(\`App is Running On Port \${PORT}\`);
});

module.exports = app;
`;

    fs.writeFileSync(filePath, serverCode.trim());
    console.log(
      `Server code with ${answers.dbType} connection written to ${filePath}`
    );
  });

program
  .command("route-s")
  .description("Create a Sample File for routes")
  .action(() => {
    const baseDir = process.cwd();
    const routesDir = path.join(baseDir, "routes");
    const appFilePath = path.join(routesDir, "app.js");

    if (!fs.existsSync(routesDir)) {
      console.error("Error: 'routes' folder does not exist.");
      process.exit(1);
    }

    const appFileContent = `
const express = require("express");
const router = express.Router();

router.use("/route-name", require("./route-file.js")); // route file will have all the APIs

module.exports = router;
`.trim();

    // Create and write to 'app.js' inside the 'routes' folder
    fs.writeFileSync(appFilePath, appFileContent, { encoding: "utf8" });
    console.log("Successfully created 'app.js' in the 'routes' folder.");
  });

program
  .command("model-s")
  .description("Create a Sample File for models")
  .action(async () => {
    const baseDir = process.cwd();
    const modelsDir = path.join(baseDir, "models");

    if (!fs.existsSync(modelsDir)) {
      console.error("Error: 'models' folder does not exist.");
      process.exit(1);
    }

    const answers = await inquirer.prompt([
      {
        type: "list",
        name: "dbType",
        message: "Select the type of database model to create:",
        choices: ["MongoDB", "MySQL"],
      },
      {
        type: "input",
        name: "modelName",
        message: "Enter the model name (e.g., User):",
        validate: (input) => (input ? true : "Model name cannot be empty."),
      },
    ]);

    const { dbType, modelName } = answers;
    const modelFilePath = path.join(modelsDir, `${modelName}.js`);

    let fileContent = "";
    if (dbType === "MongoDB") {
      fileContent = `
const mongoose = require("mongoose");

const ${modelName}Schema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model("${modelName}", ${modelName}Schema);
`.trim();
    } else if (dbType === "MySQL") {
      fileContent = `
const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../config/database"); // Ensure database connection is set up

const ${modelName} = sequelize.define("${modelName}", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, { timestamps: true });

module.exports = ${modelName};
`.trim();
    }

    fs.writeFileSync(modelFilePath, fileContent, { encoding: "utf8" });
    console.log(`Successfully created ${modelName}.js in the 'models' folder.`);
  });

program
  .command("package")
  .description("Install required packages for the Express server")
  .action(() => {
    const packages = ["express", "cors", "mysql2", "sequelize", "mongoose"];

    console.log("Installing server dependencies...");

    exec(`npm install ${packages.join(" ")}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error installing packages: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`Error: ${stderr}`);
        return;
      }
      console.log(stdout);
      console.log("Server dependencies installed successfully!");
    });
  });

program.parse(process.argv);
