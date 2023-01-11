const express = require("express");
const app = express();
const port = 3000;
const fs = require("fs");

app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

/**
 * JSDOC
 * @typedef Task
 * @property {string} name
 * @property {bool} completed
 */

/**
 * @type Task[]
 */
let tasks = readJsonFile("tasks.json", []);
let lastIDs = readJsonFile("lastIDs.json", {
  lastTaskId: 0,
  lastUserId: 0,
});

app.get("/", (req, res) => {
  res.send("api doc");
});

app.get("/tasks", (req, res) => {
  res.send(tasks);
});

app.post("/tasks", (req, res) => {
  req.body.id = ++lastIDs.lastTaskId;
  //tasks.push(req.body);
  res.send(req.body);
  writeJsonFile("tasks.json", tasks);
  writeJsonFile("lastIDs.json", lastIDs);
});

app.put("/tasks/:id", (req, res) => {
  let task = tasks.find((task) => task.id == req.params.id);

  if (!task) {
    res.status(404).send({ error: "Task not found" });
    return;
  }

  //remove forbidden values
  delete req.body.id;
  delete req.body.createdAt;

  for (const key in task) {
    //if (!["id", "createdAt"].inlcludes(key))  alternative removal of forbidden values
    task[key] = req.body[key];
  }
  res.send(task);
  writeJsonFile("tasks.json", tasks);
});

app.delete("/tasks/:id", (req, res) => {
  //db.command("DELETE task WHERE name = ':name'", {name: req.params.name})
  let index = tasks.findIndex((task) => task.id == req.params.id);
  if (index != -1) tasks.splice(index, 1);
  res.status(204).send();
  writeJsonFile("tasks.json", tasks);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

function readJsonFile(fileName, defaultValue) {
  try {
    let data = fs.readFileSync("data/" + fileName, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error(err);
    return defaultValue;
  }
}

function writeJsonFile(fileName, data) {
  try {
    fs.writeFileSync("data/" + fileName, JSON.stringify(data));
  } catch (err) {
    console.error(err, data);
  }
}
